import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
    const { user, loading, setAuthModal } = useAuth();

    useEffect(() => {
        if (!loading && !user) setAuthModal("signin");
    }, [loading, user, setAuthModal]);

    if (loading) return null;
    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "admin") return <Navigate to="/" replace />;
    return children;
}
