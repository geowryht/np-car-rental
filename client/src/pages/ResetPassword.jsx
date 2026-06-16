import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
        if (password !== confirm) { setError("Passwords do not match"); return; }
        setSubmitting(true);
        try {
            await api.post("/auth/reset-password", { token, password });
            setSuccess(true);
            setTimeout(() => navigate("/"), 2500);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
                <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                    <p className="text-sm text-red-700">Invalid reset link. Please request a new password reset.</p>
                    <Link to="/" className="mt-4 inline-block font-semibold text-primary hover:underline">Go Home</Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
                <div className="w-full max-w-sm rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
                    <p className="text-sm font-semibold text-green-700">Password reset successful.</p>
                    <p className="mt-2 text-sm text-green-600">Redirecting to sign in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl border border-primary/15 bg-surface p-8 shadow-sm">
                <h1 className="text-xl font-bold text-dark">Reset Your Password</h1>
                <p className="mt-2 text-sm text-gray">Enter your new password below.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-dark">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="At least 6 characters"
                            className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-dark">Confirm Password</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            placeholder="Re-enter your password"
                            className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        {submitting ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
