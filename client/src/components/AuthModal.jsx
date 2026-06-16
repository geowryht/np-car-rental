import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import TermsModal from "../components/TermsModal";

export default function AuthModal({ mode, onClose, onSwitchMode }) {
    const navigate = useNavigate();
    const [signInForm, setSignInForm] = useState({ email: "", password: "" });
    const [signUpForm, setSignUpForm] = useState({ fullName: "", email: "", password: "" });
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [termsModal, setTermsModal] = useState(null);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [forgotStep, setForgotStep] = useState("email");
    const [forgotFullName, setForgotFullName] = useState("");
    const { login, register, resendVerification } = useAuth();

    const isSignIn = mode === "signin";
    const isVerify = mode === "verify";
    const isForgot = mode === "forgot";

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            if (isSignIn) {
                await login(signInForm.email, signInForm.password);
                onClose();
                navigate("/");
            } else {
                await register(signUpForm.fullName, signUpForm.email, signUpForm.password);
                setRegisteredEmail(signUpForm.email);
                onSwitchMode("verify");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setSubmitting(true);
        try {
            const email = registeredEmail || signInForm.email;
            await resendVerification(email);
            setError("");
            alert("Verification email sent. Check your inbox.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await api.post("/auth/forgot-password", { email: forgotEmail });
            setForgotSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <button
                type="button"
                aria-label="Close authentication modal"
                onClick={onClose}
                className="absolute inset-0 bg-dark/45 backdrop-blur-sm"
            />

            <section className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-primary/15">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="mt-1 text-2xl font-bold text-primary">
                            {isForgot ? "Find your account" : isVerify ? "Verify your email" : isSignIn ? "Welcome back" : "Create your account"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-full text-primary/50 hover:bg-accent/10 hover:text-primary"
                        aria-label="Close"
                    >
                        X
                    </button>
                </div>

                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </p>
                )}

                {isForgot ? (
                    forgotSuccess ? (
                        <div className="mt-6 space-y-4 text-center">
                            <p className="text-sm text-dark">A reset link has been sent to <span className="font-semibold">{forgotEmail}</span>.</p>
                            <p className="text-xs text-gray">Check your inbox. The link expires in 15 minutes.</p>
                            <button
                                type="button"
                                onClick={() => { setForgotSuccess(false); setForgotStep("email"); setForgotEmail(""); onSwitchMode("signin"); }}
                                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {forgotStep === "email" ? (
                                <>
                                    <p className="text-sm text-gray">Enter your email to find your account.</p>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-dark">Email</label>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            required
                                            placeholder="your@email.com"
                                            className="w-full rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={submitting || !forgotEmail}
                                        onClick={async () => {
                                            setError("");
                                            setSubmitting(true);
                                            try {
                                                const data = await api.post("/auth/check-email", { email: forgotEmail });
                                                if (data.exists) {
                                                    setForgotFullName(data.fullName);
                                                    setForgotStep("confirm");
                                                } else {
                                                    setError("No account found with that email.");
                                                }
                                            } catch (err) {
                                                setError(err.message);
                                            } finally {
                                                setSubmitting(false);
                                            }
                                        }}
                                        className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {submitting ? "Searching..." : "Find Account"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-dark">
                                        Reset password for <span className="font-semibold">{forgotFullName}</span>?
                                    </p>
                                    <p className="text-xs text-gray">We will send a reset link to <strong>{forgotEmail}</strong>.</p>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setForgotStep("email"); setError(""); }}
                                            className="flex-1 rounded-xl border border-primary/15 px-4 py-3 text-sm font-semibold text-gray transition hover:bg-accent/20"
                                        >
                                            Not you?
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            disabled={submitting}
                                            className="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-70"
                                        >
                                            {submitting ? "Sending..." : "Send Link"}
                                        </button>
                                    </div>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => { setError(""); setForgotSuccess(false); setForgotStep("email"); setForgotEmail(""); onSwitchMode("signin"); }}
                                className="w-full text-sm font-semibold text-gray hover:text-dark"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    )
                ) : isVerify ? (
                    <div className="mt-6 space-y-4">
                        <p className="text-primary/60 leading-relaxed">
                            We sent a verification email to{" "}
                            <span className="font-semibold text-primary">{registeredEmail}</span>.
                            Please check your inbox and click the link to activate your account.
                        </p>

                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={submitting}
                            className="w-full rounded-xl border-2 border-primary/15 px-4 py-3 font-semibold text-primary transition hover:bg-accent/10 disabled:opacity-70"
                        >
                            {submitting ? "Sending..." : "Resend email"}
                        </button>

                        <p className="text-center text-sm text-primary/50">
                            Already verified?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setSignInForm({ ...signInForm, email: registeredEmail });
                                    onSwitchMode("signin");
                                }}
                                className="font-semibold text-primary hover:text-accent"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            {!isSignIn && (
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={signUpForm.fullName}
                                    onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })}
                                    required
                                    className="w-full rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                                />
                            )}

                            <input
                                type="email"
                                placeholder="Email"
                                value={isSignIn ? signInForm.email : signUpForm.email}
                                onChange={(e) => {
                                    if (isSignIn) {
                                        setSignInForm({ ...signInForm, email: e.target.value });
                                    } else {
                                        setSignUpForm({ ...signUpForm, email: e.target.value });
                                    }
                                }}
                                required
                                className="w-full rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                            />

                            <input
                                type="password"
                                placeholder="Password"
                                value={isSignIn ? signInForm.password : signUpForm.password}
                                onChange={(e) => {
                                    if (isSignIn) {
                                        setSignInForm({ ...signInForm, password: e.target.value });
                                    } else {
                                        setSignUpForm({ ...signUpForm, password: e.target.value });
                                    }
                                }}
                                required
                                className="w-full rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                            />

                            {!isSignIn && (
                                <label className="flex items-start gap-2 text-sm text-gray cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="mt-0.5 accent-primary"
                                    />
                                    <span>
                                        I agree to the{" "}
                                        <button type="button" onClick={() => setTermsModal("terms")} className="font-semibold text-primary hover:underline">Terms of Service</button>
                                        {" "}and{" "}
                                        <button type="button" onClick={() => setTermsModal("privacy")} className="font-semibold text-primary hover:underline">Privacy Policy</button>
                                    </span>
                                </label>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || (!isSignIn && !agreedToTerms)}
                                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-accent transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {submitting ? "Please wait..." : isSignIn ? "Sign In" : "Create Account"}
                            </button>
                        </form>

                        {isSignIn && (
                            <p className="mt-3 text-center">
                                <button
                                    type="button"
                                    onClick={() => onSwitchMode("forgot")}
                                    className="text-sm font-medium text-primary hover:text-primary/80"
                                >
                                    Forgot password?
                                </button>
                            </p>
                        )}

                        <p className="mt-5 text-center text-sm text-gray">
                            {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setAgreedToTerms(false);
                                    onSwitchMode(isSignIn ? "signup" : "signin");
                                }}
                                className="font-semibold text-primary hover:text-primary/80"
                            >
                                {isSignIn ? "Sign Up" : "Sign In"}
                            </button>
                        </p>

                        {isSignIn && error?.toLowerCase().includes("verify your email") && (
                            <div className="mt-3 text-center">
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={submitting}
                                    className="text-sm font-semibold text-accent hover:text-accent"
                                >
                                    {submitting ? "Sending..." : "Resend verification email"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {termsModal && (
                <TermsModal
                    type={termsModal}
                    onAgree={() => { setAgreedToTerms(true); setTermsModal(null); }}
                    onDecline={() => setTermsModal(null)}
                />
            )}
        </div>
    );
}
