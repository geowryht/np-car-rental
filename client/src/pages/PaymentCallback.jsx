import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api";

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get("bookingId");
    const [status, setStatus] = useState("checking");
    const pollRef = useRef(null);

    useEffect(() => {
        if (!bookingId) {
            setStatus("error");
            return;
        }

        let attempts = 0;
        const maxAttempts = 40;

        const poll = async () => {
            try {
                const data = await api.get(`/payments/status/${bookingId}`);
                if (data.status === "paid" || data.status === "confirmed") {
                    setStatus("paid");
                    return;
                }
                if (data.status === "refunded" || data.status === "cancelled") {
                    setStatus("failed");
                    return;
                }
            } catch {
            }

            attempts++;
            if (attempts >= maxAttempts) {
                setStatus("timeout");
            } else {
                pollRef.current = setTimeout(poll, 3000);
            }
        };

        poll();

        return () => {
            if (pollRef.current) clearTimeout(pollRef.current);
        };
    }, [bookingId]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-primary/15 bg-surface p-8 text-center shadow-sm">
                {status === "checking" && (
                    <>
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-primary" />
                        <h1 className="text-lg font-bold text-dark">Confirming your payment...</h1>
                        <p className="mt-2 text-sm text-gray">Please wait while we verify your transaction.</p>
                    </>
                )}

                {status === "paid" && (
                    <>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-dark">Payment Successful</h1>
                        <p className="mt-2 text-sm text-gray">Your booking has been confirmed.</p>
                        <Link
                            to="/renter/bookings"
                            className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
                        >
                            View My Bookings
                        </Link>
                    </>
                )}

                {status === "failed" && (
                    <>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <span className="text-2xl font-bold text-red-600">!</span>
                        </div>
                        <h1 className="text-xl font-bold text-dark">Payment Failed</h1>
                        <p className="mt-2 text-sm text-gray">Your payment was not completed. Return to browse other vehicles.</p>
                        <Link
                            to="/"
                            className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
                        >
                            Browse Vehicles
                        </Link>
                    </>
                )}

                {status === "timeout" && (
                    <>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                            <span className="text-2xl font-bold text-amber-600">...</span>
                        </div>
                        <h1 className="text-xl font-bold text-dark">Still Processing</h1>
                        <p className="mt-2 text-sm text-gray">Your payment is taking longer than expected. We will notify you once it is confirmed.</p>
                        <Link
                            to="/renter/bookings"
                            className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
                        >
                            View My Bookings
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <span className="text-2xl font-bold text-red-600">!</span>
                        </div>
                        <h1 className="text-xl font-bold text-dark">Something went wrong</h1>
                        <Link
                            to="/"
                            className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
                        >
                            Go Home
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
