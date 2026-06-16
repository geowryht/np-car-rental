import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.jsx";
import Home from "../pages/Home.jsx";
import Profile from "../pages/Profile.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import BecomeHost from "../pages/BecomeHost.jsx";
import AddVehicle from "../pages/AddVehicle.jsx";
import VehicleDetails from "../pages/VehicleDetails.jsx";
import VerifyEmail from "../pages/VerifyEmail.jsx";
import HostDashboard from "../pages/HostDashboard.jsx";
import HostCars from "../pages/HostCars.jsx";
import EditVehicle from "../pages/EditVehicle.jsx";
import MyBookings from "../pages/MyBookings.jsx";
import HostBookings from "../pages/HostBookings.jsx";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import AdminRoute from "../components/AdminRoute.jsx";
import PaymentCallback from "../pages/PaymentCallback.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/become-host" element={<ProtectedRoute><BecomeHost /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/host/dashboard" element={<ProtectedRoute><HostDashboard /></ProtectedRoute>} />
                <Route path="/host/cars" element={<ProtectedRoute><HostCars /></ProtectedRoute>} />
                <Route path="/host/cars/:id/edit" element={<ProtectedRoute><EditVehicle /></ProtectedRoute>} />
                <Route path="/add-vehicle" element={<ProtectedRoute><AddVehicle /></ProtectedRoute>} />
                <Route path="/vehicles/:id" element={<VehicleDetails />} />
                <Route path="/renter/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
                <Route path="/host/bookings" element={<ProtectedRoute><HostBookings /></ProtectedRoute>} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/payment/callback" element={<PaymentCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}
