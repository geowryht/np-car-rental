import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date} at ${time}`;
}

export default function PaymentModal({ vehicle, pickupDateTime, returnDateTime, days, total, onClose, onSuccess }) {
    const navigate = useNavigate();
    const [stage, setStage] = useState("confirm");
    const [bookingId, setBookingId] = useState(null);
    const [error, setError] = useState("");
    const pollRef = useRef(null);

    useEffect(() => {
        return () => { if (pollRef.current) clearTimeout(pollRef.current); };
    }, []);

    const handlePay = async () => {
        setStage("creating");
        setError("");
        try {
            const data = await api.post("/payments/create-checkout", {
                vehicleId: vehicle.id,
                pickupDateTime,
                returnDateTime,
            });

            if (data.bookingId) {
                setBookingId(data.bookingId);
                setStage("paying");
                if (data.checkoutUrl) {
                    window.open(data.checkoutUrl, "_blank");
                }
                startPolling(data.bookingId);
            }
        } catch (err) {
            setError(err.message);
            setStage("confirm");
        }
    };

    const startPolling = (id) => {
        let attempts = 0;

        const poll = async () => {
            try {
                const verify = await api.post(`/payments/verify/${id}`);
                if (verify.verified) {
                    setStage("success");
                    if (onSuccess) onSuccess(id);
                    setTimeout(() => navigate("/renter/bookings"), 2000);
                    return;
                }
            } catch { }

            attempts++;
            if (attempts >= 40) {
                setStage("timeout");
            } else {
                pollRef.current = setTimeout(poll, 3000);
            }
        };

        poll();
    };

    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-dark/50 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-primary/15">
                <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-dark">
                        {stage === "success" ? "Payment Confirmed" : "Complete Your Booking"}
                    </h2>
                    {stage !== "paying" && (
                        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-xl text-gray transition hover:bg-accent/40 hover:text-dark" aria-label="Close">x</button>
                    )}
                </div>

                <div className="px-6 py-5">
                    {(stage === "confirm" || stage === "creating") && (
                        <>
                            <div className="rounded-xl bg-background p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-primary/10">
                                        {vehicle.images?.[0] && (
                                            <img src={typeof vehicle.images[0] === "string" ? vehicle.images[0] : vehicle.images[0]?.url} alt="" className="h-full w-full object-cover" />
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
                                <div className="flex justify-between text-sm"><span className="text-gray">Subtotal</span><span className="font-medium text-dark">PHP {total.toLocaleString()}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray">Platform fee (15%)</span><span className="font-medium text-dark">PHP {Math.round(total * 0.15).toLocaleString()}</span></div>
                                <div className="flex justify-between border-t border-primary/10 pt-3 text-base font-bold"><span className="text-dark">Total</span><span className="text-primary">PHP {(total + Math.round(total * 0.15)).toLocaleString()}</span></div>
                            </div>
                            {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                            <button type="button" onClick={handlePay} disabled={stage === "creating"} className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
                                {stage === "creating" ? "Creating booking..." : "Proceed to Payment"}
                            </button>
                            <p className="mt-3 text-center text-xs text-gray">You will be redirected to PayMongo to complete your payment. GCash, Maya, and cards accepted.</p>
                        </>
                    )}

                    {stage === "paying" && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-primary" />
                            <p className="mt-4 font-semibold text-dark">Complete your payment in the new tab</p>
                            <p className="mt-2 text-sm text-gray">We are checking your payment status automatically. This may take a few moments.</p>
                            <p className="mt-4 text-xs text-gray">Do not close this window until payment is confirmed.</p>
                        </div>
                    )}

                    {stage === "success" && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            </div>
                            <p className="mt-4 font-semibold text-dark">Payment Successful</p>
                            <p className="mt-2 text-sm text-gray">Redirecting to your bookings...</p>
                        </div>
                    )}

                    {stage === "timeout" && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100"><span className="text-2xl font-bold text-amber-600">...</span></div>
                            <p className="mt-4 font-semibold text-dark">Still Checking</p>
                            <p className="mt-2 text-sm text-gray">Your payment may still be processing. Check your bookings page for updates.</p>
                            <button type="button" onClick={() => navigate("/renter/bookings")} className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90">View My Bookings</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
