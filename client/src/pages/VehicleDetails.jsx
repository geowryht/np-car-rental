import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PaymentModal from "../components/PaymentModal";
import ConfirmBookingModal from "../components/ConfirmBookingModal";
import StarRating from "../components/StarRating";
import ReviewCard from "../components/ReviewCard";

function getToday() {
    return new Date().toISOString().split("T")[0];
}

function calcDuration(pickup, ret) {
    if (!pickup || !ret) return { hours: 0, days: 0 };
    const ms = new Date(ret) - new Date(pickup);
    const hours = Math.max(0, ms / (1000 * 60 * 60));
    const days = Math.max(1, Math.ceil(hours / 24));
    return { hours, days };
}

export default function VehicleDetails() {
    const { id } = useParams();
    const { user, setAuthModal } = useAuth();
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pickupDate, setPickupDate] = useState("");
    const [pickupTime, setPickupTime] = useState("08:00");
    const [returnDate, setReturnDate] = useState("");
    const [returnTime, setReturnTime] = useState("08:00");
    const [bookingError, setBookingError] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [userBooking, setUserBooking] = useState(null);
    const [bookingCheckLoading, setBookingCheckLoading] = useState(true);
    const [reviews, setReviews] = useState({ reviews: [], averageRating: 0, count: 0 });
    const [reviewsLoading, setReviewsLoading] = useState(true);

    const today = getToday();

    useEffect(() => {
        Promise.all([
            api.get(`/vehicles/${id}`),
            user
                ? api.get(`/payments/check/${id}`).catch(() => ({ hasActive: false }))
                : Promise.resolve({ hasActive: false }),
        ])
            .then(([vehicleData, bookingData]) => {
                setVehicle(vehicleData);
                setUserBooking(bookingData);
                setLoading(false);
                setBookingCheckLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
                setBookingCheckLoading(false);
            });
    }, [id, user]);

    useEffect(() => {
        api.get(`/reviews/vehicle/${id}`)
            .then(setReviews)
            .catch((err) => { console.error("Review fetch failed:", err); })
            .finally(() => setReviewsLoading(false));
    }, [id]);

    const pickupDateTime = pickupDate && pickupTime ? `${pickupDate}T${pickupTime}` : "";
    const returnDateTime = returnDate && returnTime ? `${returnDate}T${returnTime}` : "";
    const { hours, days } = calcDuration(pickupDateTime, returnDateTime);
    const total = days * Number(vehicle?.pricePerDay || 0);
    const isOwn = user && vehicle && user.id === vehicle.hostId;

    const handleReviewBooking = () => {
        if (!user) { setAuthModal("signin"); return; }
        if (!pickupDate || !returnDate) { setBookingError("Select pick-up and return dates"); return; }
        if (returnDate < pickupDate) { setBookingError("Return date must be on or after pick-up date"); return; }
        if (returnDate === pickupDate && returnTime <= pickupTime) { setBookingError("Return time must be after pick-up time"); return; }
        setBookingError("");
        setShowConfirm(true);
    };

    const handleConfirmAndPay = () => {
        setShowConfirm(false);
        setShowPayment(true);
    };

    if (loading || bookingCheckLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="rounded-2xl border border-primary/15 bg-surface p-6 text-primary/50">
                    Loading vehicle...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="rounded-2xl border border-primary/15 bg-red-50 p-6">
                    <p className="text-red-600">{error}</p>
                    <Link to="/" className="mt-3 inline-flex font-semibold text-primary hover:text-accent">
                        Back to vehicles
                    </Link>
                </div>
            </div>
        );
    }

    const pendingPayment = userBooking?.status === "pending_payment" || userBooking?.status === "pending";
    const isPaidOrConfirmed = userBooking?.status === "paid" || userBooking?.status === "confirmed";
    const isRented = vehicle?.status === "rented";

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="overflow-hidden rounded-3xl border-4 border-white bg-surface h-fit shadow-sm">
                    <div className="h-80 bg-gradient-to-br from-primary to-primary/60">
                        {(typeof vehicle.images?.[0] === "string" ? vehicle.images[0] : vehicle.images?.[0]?.url) && (
                            <img
                                src={typeof vehicle.images[0] === "string" ? vehicle.images[0] : vehicle.images[0].url}
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="h-full w-full object-cover"
                            />
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-px bg-primary/10">
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="h-24 bg-background">
                                {(typeof vehicle.images?.[index] === "string" ? vehicle.images[index] : vehicle.images?.[index]?.url) && (
                                    <img
                                        src={typeof vehicle.images[index] === "string" ? vehicle.images[index] : vehicle.images[index].url}
                                        alt={`${vehicle.brand} ${vehicle.model} ${index + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {!reviewsLoading && reviews.count > 0 && (
                        <div className="px-4 pb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <StarRating rating={Math.round(reviews.averageRating)} size="sm" />
                                <span className="text-sm font-semibold text-dark">{reviews.averageRating}</span>
                                <span className="text-xs text-gray">({reviews.count} review{reviews.count !== 1 ? "s" : ""})</span>
                            </div>
                            {reviews.count > 3 ? (
                                <div className="overflow-hidden">
                                    <div className="review-scroll-inner">
                                        {[...reviews.reviews, ...reviews.reviews].map((review, i) => (
                                            <div key={`${review.id}-${i}`} className="w-72 shrink-0">
                                                <ReviewCard review={review} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    {reviews.reviews.map((review) => (
                                        <div key={review.id} className="w-72 shrink-0">
                                            <ReviewCard review={review} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <aside className="h-fit rounded-3xl border border-primary/15 bg-surface p-6 shadow-sm">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
                        {vehicle.status || "Available"}
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-gray">
                        {vehicle.brand} {vehicle.model}
                    </h1>
                    <p className="mt-1 text-gray">{vehicle.year}</p>

                    {vehicle.hostAddress && (
                        <p className="mt-2 text-sm text-gray font-semibold">
                            {[
                                vehicle.hostAddress.streetAddress,
                                vehicle.hostAddress.barangay,
                                vehicle.hostAddress.cityMunicipality,
                                vehicle.hostAddress.province,
                            ].filter(Boolean).join(", ")}
                        </p>
                    )}

                    <p className="mt-6 text-3xl font-black text-gray">
                        PHP {Number(vehicle.pricePerDay || 0).toLocaleString()}
                        <span className="text-base font-medium text-gray"> / day</span>
                    </p>

                    {isOwn ? (
                        <div className="mt-6 rounded-2xl bg-background p-4 text-center text-sm font-semibold text-primary">
                            This is your listing
                        </div>
                    ) : isRented && !isPaidOrConfirmed ? (
                        <div className="mt-6 rounded-2xl bg-gray-100 p-4 text-center text-sm font-semibold text-gray-600">
                            This vehicle is currently rented.
                        </div>
                    ) : pendingPayment ? (
                        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center text-sm font-semibold text-amber-700">
                            Awaiting payment.<br />
                            <button type="button" onClick={() => setShowPayment(true)} className="mt-1 underline hover:text-amber-800">
                                Complete payment
                            </button>
                        </div>
                    ) : isPaidOrConfirmed ? (
                        <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 p-4 text-center text-sm font-semibold text-green-700">
                            Payment confirmed. Waiting for host to accept.
                        </div>
                    ) : (
                        <>
                            <div className="mt-6 space-y-3">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray">Pick-up date</label>
                                    <input type="date" value={pickupDate} min={today} onChange={(e) => { setPickupDate(e.target.value); setReturnDate(""); }} className="mt-1 w-full rounded-2xl border border-primary/50 bg-white py-3 px-4 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray">Pick-up time</label>
                                    <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="mt-1 w-full rounded-2xl border border-primary/50 bg-white py-3 px-4 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray">Return date</label>
                                    <input type="date" value={returnDate} min={pickupDate || today} onChange={(e) => setReturnDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-primary/50 bg-white py-3 px-4 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-gray">Return time</label>
                                    <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="mt-1 w-full rounded-2xl border border-primary/50 bg-white py-3 px-4 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                                </div>
                            </div>

                            {hours > 0 && (
                                <div className="mt-4 rounded-2xl bg-background p-4 text-sm">
                                    <div className="flex justify-between text-gray">
                                        <span>PHP {Number(vehicle.pricePerDay).toLocaleString()} x {days} day{days > 1 ? "s" : ""}</span>
                                        <span>PHP {total.toLocaleString()}</span>
                                    </div>
                                    {hours > 0 && (
                                        <p className="mt-1 text-xs text-gray">{Math.round(hours)} hour{hours !== 1 ? "s" : ""} total</p>
                                    )}
                                    <div className="mt-2 flex justify-between font-bold text-primary">
                                        <span>Total</span>
                                        <span>PHP {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {bookingError && (
                                <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{bookingError}</p>
                            )}

                            <button
                                type="button"
                                onClick={handleReviewBooking}
                                disabled={!pickupDate || !returnDate}
                                className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 font-bold text-accent transition hover:bg-primary/90 disabled:opacity-70"
                            >
                                Review Booking
                            </button>
                        </>
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-background p-4">
                            <p className="text-gray">Transmission</p>
                            <p className="mt-1 font-bold text-primary">{vehicle.transmission}</p>
                        </div>
                        <div className="rounded-2xl bg-background p-4">
                            <p className="text-gray">Seats</p>
                            <p className="mt-1 font-bold text-primary">{vehicle.seatingCapacity}</p>
                        </div>
                        <div className="rounded-2xl bg-background p-4">
                            <p className="text-gray">Fuel Type</p>
                            <p className="mt-1 font-bold text-primary">{vehicle.fuelType}</p>
                        </div>
                        <div className="rounded-2xl bg-background p-4">
                            <p className="text-gray">Status</p>
                            <p className="mt-1 font-bold capitalize text-primary">{vehicle.status}</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h2 className="font-bold text-primary">Description</h2>
                        <p className="mt-2 leading-7 text-gray">
                            {vehicle.description || "No description provided."}
                        </p>
                    </div>
                </aside>
            </div>

            {showConfirm && (
                <ConfirmBookingModal
                    vehicle={vehicle}
                    pickupDateTime={pickupDateTime}
                    returnDateTime={returnDateTime}
                    hours={Math.round(hours)}
                    days={days}
                    total={total}
                    onConfirm={handleConfirmAndPay}
                    onClose={() => setShowConfirm(false)}
                />
            )}

            {showPayment && (
                <PaymentModal
                    vehicle={vehicle}
                    pickupDateTime={pickupDateTime}
                    returnDateTime={returnDateTime}
                    days={days}
                    total={total}
                    onClose={() => setShowPayment(false)}
                    onSuccess={() => setShowPayment(false)}
                />
            )}
        </div>
    );
}
