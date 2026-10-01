import { db } from "../config/firebase.js";
import AppError from "../utils/AppError.js";
import { createPaymentLink, verifyWebhookSignature, refundPayment, getLinkStatus } from "../services/paymongo.js";

const PLATFORM_FEE = 0.15;
const PENDING_PAYMENT_TIMEOUT_MINUTES = 30;

function toDateOnly(dateStr) {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const createCheckout = async (req, res, next) => {
    try {
        const { vehicleId, pickupDateTime, returnDateTime } = req.body;
        const renterId = req.user.uid;

        if (!vehicleId || !pickupDateTime || !returnDateTime) {
            throw new AppError("vehicleId, pickupDateTime, and returnDateTime are required", 400);
        }

        const pickup = new Date(pickupDateTime);
        const returnD = new Date(returnDateTime);

        if (isNaN(pickup.getTime()) || isNaN(returnD.getTime())) {
            throw new AppError("Invalid date format", 400);
        }

        if (returnD <= pickup) throw new AppError("Return must be after pickup", 400);
        if (pickup < new Date()) throw new AppError("Pickup cannot be in the past", 400);

        const vehicleDoc = await db.collection("vehicles").doc(vehicleId).get();
        if (!vehicleDoc.exists) throw new AppError("Vehicle not found", 404);

        const vehicle = vehicleDoc.data();
        if (vehicle.hostId === renterId) throw new AppError("You cannot book your own vehicle", 400);
        if (vehicle.status === "rented") throw new AppError("This vehicle is currently rented", 409);

        const overlapping = await db.collection("bookings")
            .where("vehicleId", "==", vehicleId)
            .where("status", "in", ["pending_payment", "pending", "paid", "confirmed", "cancellation_requested"])
            .get();

        const hasOverlap = overlapping.docs.some((doc) => {
            const b = doc.data();
            const bPickup = new Date(b.startDate);
            const bReturn = new Date(b.endDate);
            return pickup < bReturn && returnD > bPickup;
        });

        if (hasOverlap) throw new AppError("Vehicle is not available for those dates", 409);

        const existingPending = await db.collection("bookings")
            .where("vehicleId", "==", vehicleId)
            .where("renterId", "==", renterId)
            .where("status", "==", "pending_payment")
            .get();

        if (!existingPending.empty) {
            const existing = existingPending.docs[0];
            const elapsed = Date.now() - existing.data().createdAt.toDate().getTime();
            if (elapsed < PENDING_PAYMENT_TIMEOUT_MINUTES * 60 * 1000) {
                return res.json({
                    bookingId: existing.id,
                    checkoutUrl: existing.data().checkoutUrl,
                    message: "Complete your payment",
                });
            }
            await existing.ref.update({ status: "expired" });
        }

        const hours = (returnD - pickup) / (1000 * 60 * 60);
        const days = Math.max(1, Math.ceil(hours / 24));
        const totalPrice = days * Number(vehicle.pricePerDay);
        const platformFee = Math.round(totalPrice * PLATFORM_FEE * 100) / 100;
        const hostPayout = totalPrice - platformFee;

        const bookingRef = db.collection("bookings").doc();
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

        const skipPayment = !process.env.PAYMONGO_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY.startsWith("your_");

        if (skipPayment) {
            await bookingRef.set({
                vehicleId,
                renterId,
                hostId: vehicle.hostId,
                startDate: pickupDateTime,
                endDate: returnDateTime,
                totalPrice,
                platformFee,
                hostPayout,
                status: "paid",
                paymentLinkId: "dev_skip",
                checkoutUrl: null,
                paymentMethod: "dev",
                paymentId: "dev_skip",
                paymentStatus: "paid",
                paidAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await vehicleDoc.ref.update({ status: "rented" });

            return res.status(201).json({
                bookingId: bookingRef.id,
                checkoutUrl: `${clientUrl}/payment/callback?bookingId=${bookingRef.id}`,
                message: "Booking created (dev mode)",
            });
        }

        const { linkId, checkoutUrl } = await createPaymentLink({
            amount: totalPrice,
            description: `${vehicle.brand} ${vehicle.model} - ${days} day(s) | bid:${bookingRef.id}`,
            bookingId: bookingRef.id,
        });

        await bookingRef.set({
            vehicleId,
            renterId,
            hostId: vehicle.hostId,
            startDate: pickupDateTime,
            endDate: returnDateTime,
            totalPrice,
            platformFee,
            hostPayout,
            status: "pending_payment",
            paymentLinkId: linkId,
            checkoutUrl,
            paymentMethod: null,
            paymentId: null,
            paymentStatus: "unpaid",
            paidAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await vehicleDoc.ref.update({ status: "rented" });

        res.status(201).json({ bookingId: bookingRef.id, checkoutUrl, message: "Redirecting to payment..." });
    } catch (err) {
        next(err);
    }
};

export const handleWebhook = async (req, res, next) => {
    try {
        let rawBody;
        if (Buffer.isBuffer(req.body)) {
            rawBody = req.body.toString();
        } else if (typeof req.body === "string") {
            rawBody = req.body;
        } else {
            rawBody = JSON.stringify(req.body);
        }

        const signature = req.headers["paymongo-signature"] || "";
        if (!signature || !verifyWebhookSignature(rawBody, signature)) {
            return res.status(400).json({ message: "Invalid signature" });
        }

        const event = JSON.parse(rawBody);
        const { data } = event;

        if (event.type === "payment.paid") {
            const paymentId = data.id;
            const attributes = data.attributes;
            const method = (attributes.source?.type) || (attributes.payments?.[0]?.source?.type || "card");
            const description = attributes.statement_descriptor || attributes.description || "";
            const match = description.match(/bid:(\w+)/);
            const bookingId = match ? match[1] : attributes.reference_number;

            if (!bookingId) return res.status(200).json({ message: "No booking ID found" });

            const bookingRef = db.collection("bookings").doc(bookingId);
            const bookingDoc = await bookingRef.get();

            if (!bookingDoc.exists) return res.status(200).json({ message: "Booking not found" });

            const booking = bookingDoc.data();
            if (booking.status !== "pending_payment") return res.status(200).json({ message: "Already processed" });

            await db.collection("payments").doc(paymentId).set({
                bookingId: bookingId,
                renterId: booking.renterId,
                hostId: booking.hostId,
                amount: attributes.amount / 100,
                method,
                paymongoPaymentId: paymentId,
                status: "paid",
                createdAt: new Date(),
                paidAt: new Date(),
            });

            await bookingRef.update({
                status: "paid",
                paymentMethod: method,
                paymentId,
                paymentStatus: "paid",
                paidAt: new Date(),
                updatedAt: new Date(),
            });

            return res.status(200).json({ message: "Payment processed" });
        }

        res.status(200).json({ message: "Event received" });
    } catch (err) {
        next(err);
    }
};

export const getPaymentStatus = async (req, res, next) => {
    try {
        const doc = await db.collection("bookings").doc(req.params.bookingId).get();
        if (!doc.exists) throw new AppError("Booking not found", 404);
        const booking = doc.data();
        res.json({
            bookingId: req.params.bookingId,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            paymentMethod: booking.paymentMethod,
        });
    } catch (err) {
        next(err);
    }
};

export const verifyPayment = async (req, res, next) => {
    try {
        const doc = await db.collection("bookings").doc(req.params.bookingId).get();
        if (!doc.exists) throw new AppError("Booking not found", 404);
        const booking = doc.data();

        if (booking.status !== "pending_payment") {
            return res.json({ verified: true, status: booking.status });
        }

        if (!booking.paymentLinkId || booking.paymentLinkId === "dev_skip" || booking.paymentLinkId.startsWith("dev_")) {
            return res.json({ verified: false, status: booking.status });
        }

        const result = await getLinkStatus(booking.paymentLinkId);

        if (result.paid) {
            const paymentRecordRef = db.collection("payments").doc(result.paymentId || booking.paymentLinkId);
            await paymentRecordRef.set({
                bookingId: req.params.bookingId,
                renterId: booking.renterId,
                hostId: booking.hostId,
                amount: booking.totalPrice,
                method: result.paymentMethod || "card",
                paymongoPaymentId: result.paymentId || booking.paymentLinkId,
                status: "paid",
                createdAt: new Date(),
                paidAt: new Date(),
            });

            await doc.ref.update({
                status: "paid",
                paymentMethod: result.paymentMethod || "card",
                paymentId: result.paymentId || booking.paymentLinkId,
                paymentStatus: "paid",
                paidAt: new Date(),
                updatedAt: new Date(),
            });

            return res.json({ verified: true, status: "paid" });
        }

        res.json({ verified: false, status: booking.status });
    } catch (err) { next(err); }
};

export const refundBooking = async (req, res, next) => {
    try {
        const bookingRef = db.collection("bookings").doc(req.params.bookingId);
        const doc = await bookingRef.get();
        if (!doc.exists) throw new AppError("Booking not found", 404);

        const booking = doc.data();
        const isHost = booking.hostId === req.user.uid;
        const isAdmin = req.user.role === "admin";
        if (!isHost && !isAdmin) throw new AppError("Not authorized", 403);
        if (booking.status !== "paid") throw new AppError("Booking is not in a refundable state", 400);

        try { await refundPayment(booking.paymentId, booking.totalPrice); } catch { }

        await bookingRef.update({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() });
        await db.collection("vehicles").doc(booking.vehicleId).update({ status: "available" });

        res.json({ message: "Booking refunded" });
    } catch (err) {
        next(err);
    }
};

export const getMyPendingVehicleIds = async (req, res, next) => {
    try {
        const snap = await db.collection("bookings")
            .where("renterId", "==", req.user.uid)
            .where("status", "in", ["pending_payment", "pending", "paid", "confirmed"])
            .get();

        const ids = [...new Set(snap.docs.map((d) => d.data().vehicleId))];
        res.json(ids);
    } catch (err) {
        next(err);
    }
};

export const checkUserPendingBooking = async (req, res, next) => {
    try {
        const snap = await db.collection("bookings")
            .where("renterId", "==", req.user.uid)
            .where("vehicleId", "==", req.params.vehicleId)
            .where("status", "in", ["pending_payment", "pending", "paid", "confirmed"])
            .get();

        if (snap.empty) return res.json({ hasActive: false, status: null, bookingId: null });

        const doc = snap.docs[0];
        res.json({ hasActive: true, status: doc.data().status, bookingId: doc.id });
    } catch (err) {
        next(err);
    }
};
