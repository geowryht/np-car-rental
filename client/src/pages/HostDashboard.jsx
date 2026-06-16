import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

export default function HostDashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [earnings, setEarnings] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get("/host/vehicle-status"),
            api.get("/bookings/received"),
            api.get("/host/earnings"),
        ])
            .then(([v, b, e]) => {
                setVehicles(v);
                setBookings(b.bookings || []);
                setEarnings(e);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const pendingCount = bookings.filter((b) => b.status === "pending").length;
    const rentedCount = vehicles.filter((v) => v.currentStatus === "rented").length;
    const availableCount = vehicles.filter((v) => v.currentStatus === "available").length;

    if (loading) {
        return <div className="max-w-7xl mx-auto px-4 py-10 text-primary/70">Loading dashboard...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-gray">Manage your fleet</h1>
                    <p className="mt-2 text-primary/70">Keep your listings organized and ready for renters.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-primary/15 bg-surface p-5">
                    <p className="text-sm text-primary font-medium">Total cars</p>
                    <p className="mt-1 text-3xl font-black text-primary">{vehicles.length}</p>
                </div>
                <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                    <p className="text-sm font-medium text-green-700">Available</p>
                    <p className="mt-1 text-3xl font-black text-green-800">{availableCount}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <p className="text-sm font-medium text-blue-700">Rented</p>
                    <p className="mt-1 text-3xl font-black text-blue-800">{rentedCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <p className="text-sm font-medium text-amber-700">Pending requests</p>
                    <p className="mt-1 text-3xl font-black text-amber-800">{pendingCount}</p>
                </div>
            </div>

            {earnings && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-primary/15 bg-surface p-5">
                        <p className="text-sm text-primary font-medium">Gross income</p>
                        <p className="mt-1 text-2xl font-black text-primary">PHP {earnings.gross?.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-primary/15 bg-surface p-5">
                        <p className="text-sm text-primary font-medium">Platform fee ({earnings.gross > 0 ? Math.round(earnings.fee / earnings.gross * 100) : 0}%)</p>
                        <p className="mt-1 text-2xl font-black text-primary">- PHP {earnings.fee?.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                        <p className="text-sm font-medium text-emerald-700">Net income</p>
                        <p className="mt-1 text-2xl font-black text-emerald-800">PHP {earnings.net?.toLocaleString()}</p>
                    </div>
                </div>
            )}

            <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                    <h2 className="text-xl font-bold text-primary">Vehicle fleet</h2>
                </div>
                <div className="mt-4 space-y-3">
                    {vehicles.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-surface p-4 shadow-sm">
                            <div className="flex items-center gap-4 min-w-0">
                                {v.images?.[0] && (
                                    <img src={typeof v.images[0] === "string" ? v.images[0] : v.images[0].url} alt="" className="h-14 w-20 rounded-xl object-cover" />
                                )}
                                <div className="min-w-0">
                                    <p className="font-bold text-primary">{v.brand} {v.model}</p>
                                    <p className="text-sm text-primary/50">{v.plateNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                                <div className="text-right text-sm">
                                    <p className={`font-semibold ${
                                        v.currentStatus === "rented" ? "text-blue-600" :
                                        v.currentStatus === "available" ? "text-green-600" : "text-primary/50"
                                    }`}>
                                        {v.currentStatus === "rented" ? "Rented" : v.currentStatus === "available" ? "Available" : "Unavailable"}
                                    </p>
                                    {v.currentRenter && <p className="text-primary/50 text-xs">{v.currentRenter}</p>}
                                </div>
                                <p className="text-xs text-gray whitespace-nowrap">Next: {v.nextAvailable}</p>
                            </div>
                        </div>
                    ))}
                    {vehicles.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-8 text-center text-primary/50">
                            <p>No vehicles listed yet.</p>
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
}
