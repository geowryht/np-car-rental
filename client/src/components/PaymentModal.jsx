import { useState } from "react";
import { api } from "../services/api";

function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date} at ${time}`;
}

export default function PaymentModal({ vehicle, pickupDateTime, returnDateTime, days, total, onClose, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handlePay = async () => {
        setSubmitting(true);
        setError("");
        try {
            const data = await api.post("/payments/create-checkout", {
                vehicleId: vehicle.id,
                pickupDateTime,
                returnDateTime,
            });

            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
            if (onSuccess) onSuccess(data.bookingId);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-dark/50 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-primary/15">
                <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-dark">Complete Your Booking</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-full text-xl text-gray transition hover:bg-accent/40 hover:text-dark"
                        aria-label="Close"
                    >
                        x
                    </button>
                </div>

                <div className="px-6 py-5">
                    <div className="rounded-xl bg-background p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-primary/10">
                                {vehicle.images?.[0] && (
                                    <img
                                        src={typeof vehicle.images[0] === "string" ? vehicle.images[0] : vehicle.images[0]?.url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-dark">{vehicle.brand} {vehicle.model}</p>
                                <p className="text-sm text-gray">{formatDateTime(pickupDateTime)} to {formatDateTime(returnDateTime)}</p>
                                <p className="text-sm text-gray">{days} day{days > 1 ? "s" : ""} x PHP {Number(vehicle.pricePerDay).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray">Subtotal</span>
                            <span className="font-medium text-dark">PHP {total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray">Platform fee (15%)</span>
                            <span className="font-medium text-dark">PHP {Math.round(total * 0.15).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-primary/10 pt-3 text-base font-bold">
                            <span className="text-dark">Total</span>
                            <span className="text-primary">PHP {(total + Math.round(total * 0.15)).toLocaleString()}</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handlePay}
                        disabled={submitting}
                        className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        {submitting ? "Redirecting to payment..." : "Proceed to Payment"}
                    </button>

                    <p className="mt-3 text-center text-xs text-gray">
                        You will be redirected to PayMongo to complete your payment securely.
                        GCash, Maya, and cards accepted.
                    </p>
                </div>
            </div>
        </div>
    );
}
