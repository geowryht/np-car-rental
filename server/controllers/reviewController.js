import { db } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

export const createReview = async (req, res, next) => {
    try {
        const { bookingId, rating, comment } = req.body;
        const reviewerId = req.user.uid;
        if (!bookingId || !rating || !comment) throw new AppError("bookingId, rating, and comment are required", 400);
        const r = Number(rating);
        if (!Number.isInteger(r) || r < 1 || r > 5) throw new AppError("Rating must be an integer between 1 and 5", 400);
        const bookingDoc = await db.collection("bookings").doc(bookingId).get();
        if (!bookingDoc.exists) throw new AppError("Booking not found", 404);
        const booking = bookingDoc.data();
        if (booking.status !== "returned") throw new AppError("You can only review returned bookings", 400);
        const isRenter = booking.renterId === reviewerId;
        const isHost = booking.hostId === reviewerId;
        if (!isRenter && !isHost) throw new AppError("Not authorized", 403);
        const targetUserId = isRenter ? booking.hostId : booking.renterId;
        const existing = await db.collection("reviews").where("bookingId", "==", bookingId).where("reviewerId", "==", reviewerId).get();
        if (!existing.empty) throw new AppError("You have already reviewed this booking", 400);
        const ref = db.collection("reviews").doc();
        await ref.set({ bookingId, reviewerId, reviewerRole: isRenter ? "renter" : "host", targetUserId, vehicleId: booking.vehicleId, rating: r, comment: comment.trim(), createdAt: new Date() });
        res.status(201).json({ id: ref.id, message: "Review submitted" });
    } catch (err) { next(err); }
};

export const getVehicleReviews = async (req, res, next) => {
    try {
        const snap = await db.collection("reviews").where("vehicleId", "==", req.params.vehicleId).where("reviewerRole", "==", "renter").get();
        const reviews = await Promise.all(snap.docs.map(async (d) => {
            const review = { id: d.id, ...d.data() };
            const userDoc = await db.collection("users").doc(review.reviewerId).get();
            review.reviewerName = userDoc.exists ? (userDoc.data().fullName || "Unknown") : "Unknown";
            return review;
        }));
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const avg = reviews.length > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0;
        res.json({ reviews, averageRating: avg, count: reviews.length });
    } catch (err) { next(err); }
};

export const getUserReviews = async (req, res, next) => {
    try {
        const snap = await db.collection("reviews").where("targetUserId", "==", req.params.userId).get();
        const reviews = await Promise.all(snap.docs.map(async (d) => {
            const review = { id: d.id, ...d.data() };
            const userDoc = await db.collection("users").doc(review.reviewerId).get();
            review.reviewerName = userDoc.exists ? (userDoc.data().fullName || "Unknown") : "Unknown";
            return review;
        }));
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const avg = reviews.length > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0;
        res.json({ reviews, averageRating: avg, count: reviews.length });
    } catch (err) { next(err); }
};

export const checkReviewExists = async (req, res, next) => {
    try {
        const snap = await db.collection("reviews").where("bookingId", "==", req.params.bookingId).where("reviewerId", "==", req.user.uid).get();
        res.json({ reviewed: !snap.empty, reviewId: snap.empty ? null : snap.docs[0].id });
    } catch (err) { next(err); }
};
