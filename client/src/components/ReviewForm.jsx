import { useState } from "react";
import { api } from "../services/api";
import StarRating from "./StarRating";

export default function ReviewForm({ bookingId, onSubmitted, onClose }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) { setError("Select a rating"); return; }
        if (!comment.trim()) { setError("Write a comment"); return; }
        setSubmitting(true);
        setError("");
        try {
            await api.post("/reviews", { bookingId, rating, comment: comment.trim() });
            onSubmitted?.();
            onClose?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-primary/15">
                <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-dark">Write a Review</h2>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-xl text-gray transition hover:bg-accent/40 hover:text-dark" aria-label="Close">x</button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-dark">Your rating</p>
                        <StarRating rating={rating} onRate={setRating} size="lg" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-dark">Comment</label>
                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} required className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" placeholder="Share your experience..." />
                    </div>
                    {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end gap-3 border-t border-primary/10 pt-4">
                        <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-bold text-gray transition hover:bg-accent/40 hover:text-dark">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">{submitting ? "Submitting..." : "Submit Review"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
