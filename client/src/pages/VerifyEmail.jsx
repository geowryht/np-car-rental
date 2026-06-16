import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("error");
            setMessage("Missing verification token.");
            return;
        }

        api.get(`/auth/verify-email?token=${token}`)
            .then((data) => {
                setStatus("success");
                setMessage(data.message);
            })
            .catch((err) => {
                setStatus("error");
                setMessage(err.message);
            });
    }, [searchParams]);

    return (
        <div className="max-w-md mx-auto px-4 py-20">
            <div className="rounded-3xl border border-primary/15 bg-surface p-8 text-center shadow-sm">
                {status === "verifying" && (
                    <>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-background text-3xl">
                            ...
                        </div>
                        <h1 className="mt-5 text-2xl font-bold text-primary">Verifying...</h1>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl">
                            ✓
                        </div>
                        <h1 className="mt-5 text-2xl font-bold text-primary">Email verified!</h1>
                        <p className="mt-3 text-primary/60">{message}</p>
                        <Link
                            to="/"
                            className="mt-8 inline-block w-full rounded-2xl bg-accent px-4 py-3 font-bold text-primary hover:bg-accent"
                        >
                            Sign In
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-3xl">
                            ✗
                        </div>
                        <h1 className="mt-5 text-2xl font-bold text-primary">Verification failed</h1>
                        <p className="mt-3 text-primary/60">{message}</p>
                        <Link
                            to="/"
                            className="mt-8 inline-block w-full rounded-2xl bg-primary px-4 py-3 font-bold text-white hover:bg-primary/80"
                        >
                            Back to Home
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
