import { useEffect, useRef, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import TermsModal from "../components/TermsModal";
import { useAuth } from "../context/AuthContext";

function getDisplayName(user) {
    return user?.fullName || user?.name?.firstName || "Account";
}

function getAvatarUrl(user) {
    return user?.photoURL || user?.profileImage || user?.avatarUrl || "";
}

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "NP";
}

export default function MainLayout() {
    const [accountOpen, setAccountOpen] = useState(false);
    const [legalModal, setLegalModal] = useState(null);
    const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
    const accountRef = useRef(null);
    const { user, logout, authModal: authMode, setAuthModal: setAuthMode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = location.pathname.startsWith("/admin");
    const publicAuthPages = ["/reset-password", "/verify-email"];
    const hideAuthModal = publicAuthPages.some((r) => location.pathname.startsWith(r));

    const displayName = getDisplayName(user);
    const avatarUrl = getAvatarUrl(user);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (accountRef.current && !accountRef.current.contains(e.target)) {
                setAccountOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setAccountOpen(false);
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-background text-primary flex flex-col">
            <nav className="sticky top-0 z-100 border-b border-primary/15 bg-primary backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center border border-accent rounded-xl bg-primary text-sm font-black text-accent">
                            NP
                        </span>
                        <span className="text-xl text-amber-400 font-bold tracking-tight">Car Rental</span>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            to="/"
                            className=" px-4 py-7 text-sm font-medium flex gap-2 text-accent hover:bg-accent/25"
                        >
                            <svg className="w-6 h-6 text-accent" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M4.37 7.657c2.063.528 2.396 2.806 3.202 3.87 1.07 1.413 2.075 1.228 3.192 2.644 1.805 2.289 1.312 5.705 1.312 6.705M20 15h-1a4 4 0 0 0-4 4v1M8.587 3.992c0 .822.112 1.886 1.515 2.58 1.402.693 2.918.351 2.918 2.334 0 .276 0 2.008 1.972 2.008 2.026.031 2.026-1.678 2.026-2.008 0-.65.527-.9 1.177-.9H20M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            Browse
                        </Link>

                        {user ? (
                            <>
                                {user.role === "admin" && (
                                    <Link
                                        to="/admin"
                                        className="hidden px-4 py-7 text-sm font-medium text-accent hover:bg-accent/25 sm:inline-flex"
                                    >
                                        Admin
                                    </Link>
                                )}

                                {user.role === "renter" && user?.hostInfo?.status !== "pending" && (
                                    <Link
                                        to="/become-host"
                                        className="hidden px-4 py-7 text-sm font-medium flex gap-2 text-accent hover:bg-accent/25 sm:inline-flex"
                                    >
                                        Become a Host
                                    </Link>
                                )}

                                {user.role === "renter" && user?.hostInfo?.status === "pending" && (
                                    <span
                                        className="hidden cursor-not-allowed rounded-full px-4 py-2 text-sm font-medium text-amber-400 sm:inline-flex"
                                    >
                                        Pending host request . . .
                                    </span>
                                )}

                                {user.role === "host" && (
                                    <Link
                                        to="/host/dashboard"
                                        className="hidden px-4 py-7 text-sm font-medium gap-2 text-accent hover:bg-accent/25 sm:inline-flex"
                                    >
                                        <svg className="w-6 h-6 text-accent" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6.025A7.5 7.5 0 1 0 17.975 14H10V6.025Z" />
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 3c-.169 0-.334.014-.5.025V11h7.975c.011-.166.025-.331.025-.5A7.5 7.5 0 0 0 13.5 3Z" />
                                        </svg>
                                        Dashboard
                                    </Link>
                                )}

                                <div className="relative" ref={accountRef}>
                                    <button
                                        type="button"
                                        onClick={() => setAccountOpen((open) => !open)}
                                        className="flex items-center gap-2 rounded-full border border-accent bg-accent shadow-sm transition hover:border-amber-400 hover:shadow-md"
                                        aria-haspopup="menu"
                                        aria-expanded={accountOpen}
                                    >
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={displayName}
                                                className="h-9 w-9 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-accent">
                                                {getInitials(displayName)}
                                            </span>
                                        )}
                                        {/* <span className="hidden max-w-32 truncate text-sm font-semibold sm:inline">
                                            {displayName}
                                        </span>
                                        <span className="text-xs text-primary/40">v</span> */}
                                    </button>

                                    {accountOpen && (
                                        <div
                                            role="menu"
                                            className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-xl"
                                        >
                                            <div className="border-b border-primary/30 p-4">
                                                <p className="text-sm text-primary font-bold">{displayName}</p>
                                                <p className="text-xs capitalize text-gray">{user.role}</p>
                                            </div>

                                            <div className="p-2">
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setAccountOpen(false)}
                                                    className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/80 hover:bg-accent/10 hover:text-primary"
                                                >
                                                    Profile
                                                </Link>

                                                {user.role === "admin" && (
                                                    <Link
                                                        to="/admin"
                                                        onClick={() => setAccountOpen(false)}
                                                        className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/80 hover:bg-accent/10 hover:text-primary"
                                                    >
                                                        Admin
                                                    </Link>
                                                )}

                                                {user.role === "renter" && (
                                                    <>
                                                        <Link
                                                            to="/renter/bookings"
                                                            onClick={() => setAccountOpen(false)}
                                                            className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/80 hover:bg-accent/10 hover:text-primary"
                                                        >
                                                            My Bookings
                                                        </Link>
                                                        {user?.hostInfo?.status !== "pending" && (
                                                            <Link
                                                                to="/become-host"
                                                                onClick={() => setAccountOpen(false)}
                                                                className="block px-4 py-7 text-sm font-medium flex gap-2 text-accent hover:bg-accent/25 sm:hidden"
                                                            >
                                                                Become a Host
                                                            </Link>
                                                        )}
                                                        {user?.hostInfo?.status === "pending" && (
                                                            <span className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/40 sm:hidden">
                                                                Pending host request
                                                            </span>
                                                        )}
                                                    </>
                                                )}

                                                {user.role === "host" && (
                                                    <Link
                                                        to="/host/dashboard"
                                                        onClick={() => setAccountOpen(false)}
                                                        className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/80 hover:bg-accent/10 hover:text-primary sm:hidden"
                                                    >
                                                        Dashboard
                                                    </Link>
                                                )}

                                                {user.role === "host" && (
                                                    <Link
                                                        to="/host/bookings"
                                                        onClick={() => setAccountOpen(false)}
                                                        className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/80 hover:bg-accent/10 hover:text-primary"
                                                    >
                                                        Bookings
                                                    </Link>
                                                )}
                                                {user.role === "host" && (
                                                    <Link
                                                        to="/host/cars"
                                                        onClick={() => setAccountOpen(false)}
                                                        className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/80 hover:bg-accent/10 hover:text-primary"
                                                    >
                                                        Manage Cars
                                                    </Link>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleLogout}
                                                    className="block rounded-xl px-3 py-2 text-sm font-medium text-primary/80 hover:bg-accent/10 hover:text-primary"
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setAuthMode("signin")}
                                    className="px-4 py-7 text-sm font-medium text-accent hover:bg-accent/25"
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAuthMode("signup")}
                                    className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-primary shadow-sm hover:bg-amber-300"
                                >
                                    Sign Up
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {user && user.profileComplete === false && location.pathname !== "/profile" && !profileBannerDismissed && (
                <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-3">
                    <Link to="/profile" className="text-sm font-semibold text-amber-800 hover:text-amber-900">
                        Complete your profile — contact number and address are required before using the platform.
                    </Link>
                    <button
                        type="button"
                        onClick={() => setProfileBannerDismissed(true)}
                        className="shrink-0 text-amber-500 hover:text-amber-700 text-lg leading-none"
                        aria-label="Dismiss"
                    >
                        x
                    </button>
                </div>
            )}

            <main className="flex-1">
                <Outlet />
            </main>

            {!isAdmin && (
            <footer className="border-t border-primary/15 bg-primary py-10 text-center text-sm text-accent/60">
                <div className="flex items-center justify-center gap-6 mb-3">
                    <button type="button" onClick={() => setLegalModal("terms")} className="text-accent/60 transition hover:text-accent">Terms of Service</button>
                    <button type="button" onClick={() => setLegalModal("privacy")} className="text-accent/60 transition hover:text-accent">Privacy Policy</button>
                </div>
                &copy; 2026 NP Car Rental. All rights reserved.
            </footer>
            )}

            {legalModal && (
                <TermsModal
                    type={legalModal}
                    onAgree={() => setLegalModal(null)}
                    onDecline={() => setLegalModal(null)}
                />
            )}

            {!hideAuthModal && authMode && (
                <AuthModal
                    mode={authMode}
                    onClose={() => setAuthMode(null)}
                    onSwitchMode={setAuthMode}
                />
            )}
        </div>
    );
}
