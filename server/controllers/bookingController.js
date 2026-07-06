import { db } from "../config/firebase.js";
import { FieldPath } from "firebase-admin/firestore";
import AppError from "../utils/AppError.js";

const PLATFORM_FEE = 0.15;
const Timestamp = new Date().constructor;

function toDateOnly(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const createBooking = async (req, res, next) => {
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

    const overlapping = await db.collection("bookings")
      .where("vehicleId", "==", vehicleId)
      .where("status", "in", ["paid", "confirmed"])
      .get();

    const hasOverlap = overlapping.docs.some((doc) => {
      const b = doc.data();
      const bPickup = new Date(b.startDate);
      const bReturn = new Date(b.endDate);
      return pickup < bReturn && returnD > bPickup;
    });

    if (hasOverlap) throw new AppError("Vehicle is not available for those dates", 409);

    const hours = (returnD - pickup) / (1000 * 60 * 60);
    const days = Math.max(1, Math.ceil(hours / 24));
    const totalPrice = days * Number(vehicle.pricePerDay);

    const ref = db.collection("bookings").doc();
    await ref.set({
      vehicleId,
      renterId,
      hostId: vehicle.hostId,
      startDate: pickupDateTime,
      endDate: returnDateTime,
      totalPrice,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ id: ref.id, message: "Booking request sent to host" });
  } catch (err) {
    next(err);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;

    let query = db.collection("bookings")
      .where("renterId", "==", req.user.uid)
      .orderBy(FieldPath.documentId());

    if (cursor) query = query.startAfter(cursor);
    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs.slice(0, limit);

    const vehicleIds = [...new Set(docs.map((d) => d.data().vehicleId))];
    const hostIds = [...new Set(docs.map((d) => d.data().hostId))];

    const [vehicleDocs, hostDocs] = await Promise.all([
      vehicleIds.length > 0 ? db.getAll(...vehicleIds.map((id) => db.collection("vehicles").doc(id))) : [],
      hostIds.length > 0 ? db.getAll(...hostIds.map((id) => db.collection("users").doc(id))) : [],
    ]);

    const vehicleMap = Object.fromEntries(vehicleDocs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...d.data() }]));
    const hostMap = Object.fromEntries(hostDocs.filter((d) => d.exists).map((d) => [d.id, d.data().fullName || "Unknown"]));

    const bookings = docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, vehicle: vehicleMap[data.vehicleId] || null, hostName: hostMap[data.hostId] || "Unknown" };
    });

    res.json({
      bookings,
      nextCursor: snap.docs.length > limit ? docs[docs.length - 1]?.id || null : null,
      hasMore: snap.docs.length > limit,
    });
  } catch (err) { next(err); }
};

export const getReceivedBookings = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;

    let query = db.collection("bookings")
      .where("hostId", "==", req.user.uid)
      .orderBy(FieldPath.documentId());

    if (cursor) query = query.startAfter(cursor);
    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs.slice(0, limit);

    const vehicleIds = [...new Set(docs.map((d) => d.data().vehicleId))];
    const renterIds = [...new Set(docs.map((d) => d.data().renterId))];

    const [vehicleDocs, renterDocs] = await Promise.all([
      vehicleIds.length > 0 ? db.getAll(...vehicleIds.map((id) => db.collection("vehicles").doc(id))) : [],
      renterIds.length > 0 ? db.getAll(...renterIds.map((id) => db.collection("users").doc(id))) : [],
    ]);

    const vehicleMap = Object.fromEntries(vehicleDocs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...d.data() }]));
    const renterMap = Object.fromEntries(renterDocs.filter((d) => d.exists).map((d) => [d.id, d.data().fullName || "Unknown"]));

    const bookings = docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, vehicle: vehicleMap[data.vehicleId] || null, renterName: renterMap[data.renterId] || "Unknown" };
    });

    res.json({
      bookings,
      nextCursor: snap.docs.length > limit ? docs[docs.length - 1]?.id || null : null,
      hasMore: snap.docs.length > limit,
    });
  } catch (err) { next(err); }
};

export const acceptBooking = async (req, res, next) => {
  try {
    const ref = db.collection("bookings").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError("Booking not found", 404);

    const booking = doc.data();
    if (booking.hostId !== req.user.uid) throw new AppError("Not authorized", 403);
    if (booking.status !== "pending" && booking.status !== "paid") throw new AppError("Booking is not pending or paid", 400);

    await ref.update({ status: "confirmed", updatedAt: new Date() });
    res.json({ message: "Booking accepted" });
  } catch (err) {
    next(err);
  }
};

export const rejectBooking = async (req, res, next) => {
  try {
    const ref = db.collection("bookings").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError("Booking not found", 404);

    const booking = doc.data();
    if (booking.hostId !== req.user.uid) throw new AppError("Not authorized", 403);
    const isPaidReject = booking.status === "paid";
    if (booking.status !== "pending" && !isPaidReject) throw new AppError("Booking is not pending or paid", 400);

    if (isPaidReject && booking.paymentId) {
        try {
            const { refundPayment } = await import("../services/paymongo.js");
            await refundPayment(booking.paymentId, booking.totalPrice);
        } catch { }
        await ref.update({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() });
        await db.collection("vehicles").doc(booking.vehicleId).update({ status: "available" });
        return res.json({ message: "Booking rejected and refunded" });
    }

    await ref.update({ status: "rejected", updatedAt: new Date() });
    res.json({ message: "Booking rejected" });
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const ref = db.collection("bookings").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError("Booking not found", 404);

    const booking = doc.data();
    const isRenter = booking.renterId === req.user.uid;
    const isHost = booking.hostId === req.user.uid;

    if (!isRenter && !isHost) throw new AppError("Not authorized", 403);
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      throw new AppError("Booking cannot be cancelled", 400);
    }

    await ref.update({ status: "cancelled", updatedAt: new Date() });
    res.json({ message: "Booking cancelled" });
  } catch (err) {
    next(err);
  }
};

export const requestCancellation = async (req, res, next) => {
    try {
        const ref = db.collection("bookings").doc(req.params.id);
        const doc = await ref.get();
        if (!doc.exists) throw new AppError("Booking not found", 404);
        const booking = doc.data();
        if (booking.renterId !== req.user.uid) throw new AppError("Not authorized", 403);
        if (booking.status !== "confirmed") throw new AppError("Only confirmed bookings can request cancellation", 400);
        await ref.update({ status: "cancellation_requested", updatedAt: new Date() });
        res.json({ message: "Cancellation requested" });
    } catch (err) { next(err); }
};

export const approveCancellation = async (req, res, next) => {
    try {
        const ref = db.collection("bookings").doc(req.params.id);
        const doc = await ref.get();
        if (!doc.exists) throw new AppError("Booking not found", 404);
        const booking = doc.data();
        if (booking.hostId !== req.user.uid) throw new AppError("Not authorized", 403);
        if (booking.status !== "cancellation_requested") throw new AppError("No cancellation request", 400);
        await ref.update({ status: "cancelled", updatedAt: new Date() });
        res.json({ message: "Cancellation approved" });
    } catch (err) { next(err); }
};

export const denyCancellation = async (req, res, next) => {
    try {
        const ref = db.collection("bookings").doc(req.params.id);
        const doc = await ref.get();
        if (!doc.exists) throw new AppError("Booking not found", 404);
        const booking = doc.data();
        if (booking.hostId !== req.user.uid) throw new AppError("Not authorized", 403);
        if (booking.status !== "cancellation_requested") throw new AppError("No cancellation request", 400);
        await ref.update({ status: "confirmed", updatedAt: new Date() });
        res.json({ message: "Cancellation denied" });
    } catch (err) { next(err); }
};

export const getHostEarnings = async (req, res, next) => {
  try {
    const snap = await db.collection("bookings")
      .where("hostId", "==", req.user.uid)
      .where("status", "in", ["confirmed", "completed"])
      .get();

    const earnings = { gross: 0, fee: 0, net: 0, count: 0, byVehicle: {} };

    for (const d of snap.docs) {
      const b = d.data();
      const vDoc = await db.collection("vehicles").doc(b.vehicleId).get();
      const vName = vDoc.exists ? `${vDoc.data().brand} ${vDoc.data().model}` : "Unknown";

      earnings.gross += b.totalPrice;
      earnings.count++;

      if (!earnings.byVehicle[vName]) earnings.byVehicle[vName] = { gross: 0, fee: 0, net: 0, count: 0 };
      earnings.byVehicle[vName].gross += b.totalPrice;
      earnings.byVehicle[vName].count++;
    }

    earnings.fee = Math.round(earnings.gross * PLATFORM_FEE);
    earnings.net = earnings.gross - earnings.fee;

    Object.values(earnings.byVehicle).forEach((v) => {
      v.fee = Math.round(v.gross * PLATFORM_FEE);
      v.net = v.gross - v.fee;
    });

    res.json(earnings);
  } catch (err) {
    next(err);
  }
};

export const getHostVehicleStatus = async (req, res, next) => {
  try {
    const vehiclesSnap = await db.collection("vehicles")
      .where("hostId", "==", req.user.uid)
      .get();

    const today = toDateOnly(new Date().toISOString().split("T")[0]);

    const vehicles = await Promise.all(vehiclesSnap.docs.map(async (d) => {
      const v = { id: d.id, ...d.data() };

      const bookingsSnap = await db.collection("bookings")
        .where("vehicleId", "==", d.id)
        .where("status", "==", "confirmed")
        .get();

      let currentRenter = null;
      let nextAvailable = null;

      for (const bd of bookingsSnap.docs) {
        const b = bd.data();
        const bStart = toDateOnly(b.startDate);
        const bEnd = toDateOnly(b.endDate);

        if (today >= bStart && today <= bEnd) {
          const userDoc = await db.collection("users").doc(b.renterId).get();
          currentRenter = userDoc.exists ? userDoc.data().fullName : "Unknown";
        }

        const afterToday = bEnd >= today;
        if (afterToday) {
          const candidate = new Date(bEnd.getTime() + 86400000).toISOString().split("T")[0];
          if (!nextAvailable || candidate < nextAvailable) nextAvailable = candidate;
        }
      }

      v.currentStatus = currentRenter ? "rented" : (v.status === "available" ? "available" : "unavailable");
      v.currentRenter = currentRenter;
      v.nextAvailable = nextAvailable || "Now";

      return v;
    }));

    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

export const returnBooking = async (req, res, next) => {
    try {
        const ref = db.collection("bookings").doc(req.params.id);
        const doc = await ref.get();
        if (!doc.exists) throw new AppError("Booking not found", 404);
        const booking = doc.data();
        if (booking.hostId !== req.user.uid) throw new AppError("Not authorized", 403);
        if (booking.status !== "confirmed" && booking.status !== "cancelled") throw new AppError("Booking is not confirmed or cancelled", 400);

        await ref.update({ status: "returned", updatedAt: new Date() });
        await db.collection("vehicles").doc(booking.vehicleId).update({ status: "available" });

        try {
            const { sendReviewRequestEmail } = await import("../utils/email.js");
            const renterDoc = await db.collection("users").doc(booking.renterId).get();
            const vehicleDoc = await db.collection("vehicles").doc(booking.vehicleId).get();
            if (renterDoc.exists) {
                const renter = renterDoc.data();
                const vehicleName = vehicleDoc.exists
                    ? `${vehicleDoc.data().brand} ${vehicleDoc.data().model}`
                    : "the vehicle";
                await sendReviewRequestEmail(renter.email, renter.fullName, vehicleName, booking.vehicleId);
            }
        } catch { }

        res.json({ message: "Vehicle marked as returned" });
    } catch (err) {
        next(err);
    }
};

export const expireUnconfirmed = async () => {
    try {
        const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000);
        const snap = await db.collection("bookings")
            .where("status", "==", "paid")
            .get();

        for (const doc of snap.docs) {
            const booking = doc.data();
            const paidAt = booking.paidAt?.toDate ? booking.paidAt.toDate() : new Date(booking.paidAt);
            if (paidAt < cutoff) {
                const devMode = !process.env.PAYMONGO_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY.startsWith("your_");
                if (!devMode && booking.paymentId && booking.paymentId !== "dev_skip") {
                    try {
                        const { refundPayment } = await import("../services/paymongo.js");
                        await refundPayment(booking.paymentId, booking.totalPrice);
                    } catch { }
                }
                await doc.ref.update({ status: "expired", paymentStatus: "refunded", updatedAt: new Date() });
                await db.collection("vehicles").doc(booking.vehicleId).update({ status: "available" });
            }
        }
    } catch { }
};

export const checkOverdueBookings = async () => {
    try {
        const now = new Date();
        const snap = await db.collection("bookings")
            .where("status", "==", "confirmed")
            .get();

        for (const doc of snap.docs) {
            const booking = doc.data();
            const returnTime = new Date(booking.endDate);
            if (returnTime < now && !booking.overdue) {
                await doc.ref.update({ overdue: true, overdueDetectedAt: now });
                try {
                    const { sendOverdueNotice } = await import("../utils/email.js");
                    const hostDoc = await db.collection("users").doc(booking.hostId).get();
                    const renterDoc = await db.collection("users").doc(booking.renterId).get();
                    const vehicleDoc = await db.collection("vehicles").doc(booking.vehicleId).get();
                    const vehicleName = vehicleDoc.exists
                        ? `${vehicleDoc.data().brand} ${vehicleDoc.data().model}`
                        : "the vehicle";
                    if (renterDoc.exists) {
                        await sendOverdueNotice(renterDoc.data().email, hostDoc.exists ? hostDoc.data().fullName : "Host", vehicleName);
                    }
                    if (hostDoc.exists) {
                        await sendOverdueNotice(hostDoc.data().email, renterDoc.exists ? renterDoc.data().fullName : "Renter", vehicleName);
                    }
                } catch { }
            }
        }
    } catch { }
};
