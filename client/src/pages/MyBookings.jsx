import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import ReviewForm from "../components/ReviewForm";

function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date} at ${time}`;
}

const statusColors = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    returned: "bg-blue-100 text-blue-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    cancellation_requested: "bg-orange-100 text-orange-800",
    rejected: "bg-background text-primary/60",
    expired: "bg-gray-100 text-gray-600",
};

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showReview, setShowReview] = useState(null);
    const [reviewedIds, setReviewedIds] = useState(new Set());
    const [page, setPage] = useState({ nextCursor: null, hasMore: false, loadingMore: false });

    const load = async ({ append = false, cursor = "" } = {}) => {
        if (append) setPage((prev) => ({ ...prev, loadingMore: true }));
        else setLoading(true);
        try {
            const endpoint = `/bookings/mine?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
            const data = await api.get(endpoint);
            const loaded = data.bookings;
            setBookings((prev) => append ? [...prev, ...loaded] : loaded);
            setPage({ nextCursor: data.nextCursor, hasMore: data.hasMore, loadingMore: false });
            setLoading(false);

            if (!append) {
                loaded.forEach((b) => {
                    if (b.status === "pending_payment") {
                        api.post(`/payments/verify/${b.id}`).catch(() => {});
                    }
                });
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
            setPage((prev) => ({ ...prev, loadingMore: false }));
        }
    };

    useEffect(() => { load(); }, []);

    const handleCancel = async (id) => {
        if (!confirm("Cancel this booking?")) return;
        try {
            await api.put(`/bookings/${id}/cancel`);
            load();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRequestCancellation = async (id) => {
        if (!confirm("Request to cancel this booking? The host will review your request.")) return;
        try {
            await api.put(`/bookings/${id}/request-cancellation`);
            load();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return <div className="max-w-4xl mx-auto px-4 py-10 text-gray/80">Loading bookings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-black tracking-tight text-gray">My Bookings</h1>
            <p className="mt-2 text-primary/80">Track your rental requests and active bookings.</p>

            {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-primary/80">{error}</p>}

            {bookings.length === 0 ? (
                <div className="mt-8 rounded-2xl border-3 border-dashed border-primary bg-surface p-8 text-center text-primary/80">
                    <p>No bookings yet.</p>
                    <Link to="/" className="mt-3 inline-block font-semibold text-accent hover:text-accent">Browse vehicles</Link>
                </div>
            ) : (
                <div className="mt-8 space-y-4">
                    {bookings.map((b) => (
                        <div key={b.id} className="rounded-3xl border border-primary/15 bg-surface p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {b.vehicle?.images?.[0] && (
                                        <img src={typeof b.vehicle.images[0] === "string" ? b.vehicle.images[0] : b.vehicle.images[0].url} alt="" className="h-16 w-24 rounded-xl object-cover" />
                                    )}
                                    <div>
                                        <p className="font-bold text-primary">{b.vehicle?.brand || "Vehicle"} {b.vehicle?.model || ""}</p>
                                        <p className="text-sm text-gray">Host: {b.hostName}</p>
                                    </div>
                                </div>
                                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusColors[b.status] || "bg-background text-primary/60"}`}>
                                    {b.status}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-primary/80">Pick-up</p>
                                    <p className="font-semibold text-primary">{formatDateTime(b.startDate)}</p>
                                </div>
                                <div>
                                    <p className="text-primary/80">Return</p>
                                    <p className="font-semibold text-primary">{formatDateTime(b.endDate)}</p>
                                </div>
                                <div>
                                    <p className="text-primary/80">Total</p>
                                    <p className="font-semibold text-primary">PHP {b.totalPrice?.toLocaleString()}</p>
                                </div>
                            </div>

                            {["pending", "pending_payment"].includes(b.status) && (
                                <div className="mt-4">
                                    <button type="button" onClick={() => handleCancel(b.id)} className="rounded-xl border border-primary/15 px-4 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">Cancel</button>
                                </div>
                            )}

                            {b.status === "confirmed" && (
                                <div className="mt-4">
                                    <button type="button" onClick={() => handleRequestCancellation(b.id)} className="rounded-xl border border-primary/15 px-4 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">Request Cancellation</button>
                                </div>
                            )}

                            {b.status === "cancellation_requested" && (
                                <div className="mt-4 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700">
                                    Cancellation requested. Waiting for host.
                                </div>
                            )}

                            {b.status === "returned" && !reviewedIds.has(b.id) && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowReview(b.id)}
                                        className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary/90"
                                    >
                                        Rate Host
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {page.hasMore && (
                        <div className="flex justify-center pt-4">
                            <button
                                type="button"
                                disabled={page.loadingMore}
                                onClick={() => load({ append: true, cursor: page.nextCursor })}
                                className="rounded-full border border-primary/15 bg-surface px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {page.loadingMore ? "Loading..." : "Load more bookings"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showReview && (
                <ReviewForm
                    bookingId={showReview}
                    onSubmitted={() => { setShowReview(null); setReviewedIds((prev) => new Set([...prev, showReview])); load(); }}
                    onClose={() => setShowReview(null)}
                />
            )}
        </div>
    );
}
