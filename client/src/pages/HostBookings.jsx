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

function calcHours(start, end) {
    if (!start || !end) return 0;
    const ms = new Date(end) - new Date(start);
    return Math.round(ms / (1000 * 60 * 60));
}

function countdownText(paidAt) {
    if (!paidAt) return "";
    const dt = paidAt?.toDate ? paidAt.toDate() : new Date(paidAt);
    const deadline = dt.getTime() + 8 * 60 * 60 * 1000;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return "Expired";
    const h = Math.floor(remaining / (1000 * 60 * 60));
    const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m remaining`;
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

const statusOptions = ["all", "pending", "paid", "confirmed", "returned", "cancellation_requested", "cancelled", "rejected", "expired"];

export default function HostBookings() {
    const [bookings, setBookings] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(null);
    const [reviewedIds, setReviewedIds] = useState(new Set());
    const [page, setPage] = useState({ nextCursor: null, hasMore: false, loadingMore: false });

    const load = async ({ append = false, cursor = "" } = {}) => {
        if (append) setPage((prev) => ({ ...prev, loadingMore: true }));
        else setLoading(true);
        try {
            const endpoint = `/bookings/received?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
            const data = await api.get(endpoint);
            setBookings((prev) => append ? [...prev, ...data.bookings] : data.bookings);
            setPage({ nextCursor: data.nextCursor, hasMore: data.hasMore, loadingMore: false });
            setLoading(false);
        } catch {
            setLoading(false);
            setPage((prev) => ({ ...prev, loadingMore: false }));
        }
    };

    useEffect(() => { load(); }, []);

    const handleAccept = async (id) => {
        try { await api.put(`/bookings/${id}/accept`); load(); }
        catch (err) { alert(err.message); }
    };

    const handleReject = async (id) => {
        try { await api.put(`/bookings/${id}/reject`); load(); }
        catch (err) { alert(err.message); }
    };

    const handleCancel = async (id) => {
        if (!confirm("Cancel this booking?")) return;
        try { await api.put(`/bookings/${id}/cancel`); load(); }
        catch (err) { alert(err.message); }
    };

    const handleReturn = async (id) => {
        try { await api.put(`/bookings/${id}/return`); load(); }
        catch (err) { alert(err.message); }
    };

    const handleApproveCancellation = async (id) => {
        try { await api.put(`/bookings/${id}/approve-cancellation`); load(); }
        catch (err) { alert(err.message); }
    };

    const handleDenyCancellation = async (id) => {
        try { await api.put(`/bookings/${id}/deny-cancellation`); load(); }
        catch (err) { alert(err.message); }
    };

    const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

    if (loading) {
        return <div className="max-w-6xl mx-auto px-4 py-10 text-primary/50">Loading bookings...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            {/* <Link to="/host/dashboard" className="text-sm font-semibold text-primary hover:text-primary/80">← Back to dashboard</Link> */}

            <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray">Bookings</h1>
                    <p className="mt-2 text-primary/70">Manage incoming requests and active rentals.</p>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap">
                {statusOptions.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setFilter(s)}
                        className={` px-4 py-5 text-sm font-semibold capitalize transition ${
                            filter === s ? "bg-primary text-white" : "bg-white text-gray hover:bg-gray-200 border-r border-gray-300"
                        }`}
                    >
                        {s} {s === "all" ? `(${bookings.length})` : `(${bookings.filter((b) => b.status === s).length})`}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="mt-8 rounded-2xl border-2 border-dashed border-primary/50 bg-surface p-8 text-center text-primary/50">
                    No {filter !== "all" ? filter : ""} bookings.
                </div>
            ) : (
                <div className="mt-6 space-y-3">
                    {filtered.map((b) => (
                        <div key={b.id} className="rounded-3xl border border-primary/15 bg-surface p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    {b.vehicle?.images?.[0] && (
                                        <img src={typeof b.vehicle.images[0] === "string" ? b.vehicle.images[0] : b.vehicle.images[0].url} alt="" className="h-14 w-20 rounded-xl object-cover shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-bold text-primary">{b.vehicle?.brand || "Vehicle"} {b.vehicle?.model || ""}</p>
                                        <p className="text-sm text-primary/80">Renter: {b.renterName}</p>
                                    </div>
                                </div>
                                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[b.status] || ""}`}>
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
                            {calcHours(b.startDate, b.endDate) > 0 && (
                                <p className="mt-2 text-xs text-gray">{calcHours(b.startDate, b.endDate)} hour{calcHours(b.startDate, b.endDate) !== 1 ? "s" : ""} total</p>
                            )}

                            {b.status === "pending" && (
                                <div className="mt-4 flex gap-2">
                                    <button type="button" onClick={() => handleAccept(b.id)} className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-500">Release</button>
                                    <button type="button" onClick={() => handleReject(b.id)} className="rounded-xl border border-primary/15 px-5 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">Reject</button>
                                </div>
                            )}

                            {b.status === "paid" && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-semibold text-amber-700">{countdownText(b.paidAt)}</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => handleAccept(b.id)} className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-500">Release</button>
                                        <button type="button" onClick={() => handleReject(b.id)} className="rounded-xl border border-primary/15 px-5 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">Reject</button>
                                    </div>
                                </div>
                            )}

                            {b.status === "confirmed" && (
                                <div className="mt-4 flex gap-2">
                                    {new Date(b.endDate) < new Date() ? (
                                        <button type="button" onClick={() => handleReturn(b.id)} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-500">Mark Returned</button>
                                    ) : (
                                        <button type="button" disabled className="rounded-xl bg-gray-300 px-5 py-2 text-sm font-bold text-gray-500 cursor-not-allowed">Mark Returned</button>
                                    )}
                                    <button type="button" onClick={() => handleCancel(b.id)} className="rounded-xl border border-primary/15 px-5 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">Cancel</button>
                                </div>
                            )}

                            {b.status === "cancellation_requested" && (
                                <div className="mt-4 flex gap-2">
                                    <button type="button" onClick={() => handleApproveCancellation(b.id)} className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-500">Approve Cancellation</button>
                                    <button type="button" onClick={() => handleDenyCancellation(b.id)} className="rounded-xl border border-primary/15 px-5 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">Deny</button>
                                </div>
                            )}

                            {b.status === "cancelled" && (
                                <div className="mt-4">
                                    <button type="button" onClick={() => handleReturn(b.id)} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-500">Mark Returned</button>
                                </div>
                            )}

                            {b.status === "returned" && !reviewedIds.has(b.id) && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowReview(b.id)}
                                        className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary/90"
                                    >
                                        Rate Renter
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {page.hasMore && filter === "all" && (
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
