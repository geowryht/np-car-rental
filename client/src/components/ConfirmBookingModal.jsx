function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${date} at ${time}`;
}

export default function ConfirmBookingModal({ vehicle, pickupDateTime, returnDateTime, hours, days, total, onConfirm, onClose }) {
    const pricePerDay = Number(vehicle.pricePerDay);
    const platformFee = Math.round(total * 0.15);
    const finalTotal = total + platformFee;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-primary/15">
                <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-dark">Confirm Your Booking</h2>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-xl text-gray transition hover:bg-accent/40 hover:text-dark" aria-label="Close">x</button>
                </div>

                <div className="px-6 py-5">
                    <div className="rounded-xl bg-background p-4">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-primary/10">
                                {vehicle.images?.[0] && (
                                    <img src={typeof vehicle.images[0] === "string" ? vehicle.images[0] : vehicle.images[0]?.url} alt="" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-dark">{vehicle.brand} {vehicle.model}</p>
                                <p className="text-sm text-gray">PHP {pricePerDay.toLocaleString()} / day</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray">Pickup</span>
                                <span className="font-semibold text-dark">{formatDateTime(pickupDateTime)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray">Return</span>
                                <span className="font-semibold text-dark">{formatDateTime(returnDateTime)}</span>
                            </div>
                            <div className="flex justify-between border-t border-primary/10 pt-2">
                                <span className="text-gray">Duration</span>
                                <span className="font-semibold text-dark">{hours} hour{hours !== 1 ? "s" : ""} ({days} day{days > 1 ? "s" : ""})</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray">Rate</span>
                            <span className="font-medium text-dark">PHP {pricePerDay.toLocaleString()} x {days} day{days > 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray">Platform fee (15%)</span>
                            <span className="font-medium text-dark">PHP {platformFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-primary/10 pt-2 text-base font-bold">
                            <span className="text-dark">Total</span>
                            <span className="text-primary">PHP {finalTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-semibold text-amber-800">
                            By confirming, your pickup will be at {formatDateTime(pickupDateTime)} and you must return the vehicle by {formatDateTime(returnDateTime)}.
                        </p>
                        <p className="mt-2 text-xs text-amber-700">
                            Late returns will be flagged and both parties will be notified to negotiate directly.
                        </p>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 rounded-full border border-primary/15 px-4 py-2.5 text-sm font-bold text-gray transition hover:bg-accent/20">
                            Cancel
                        </button>
                        <button type="button" onClick={onConfirm} className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90">
                            Confirm &amp; Pay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
