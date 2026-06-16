import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

export default function HostCars() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadVehicles = () => {
        setLoading(true);
        api.get("/vehicles/mine")
            .then((data) => {
                setVehicles(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadVehicles();
    }, []);

    const handleDelete = async (vehicleId) => {
        const confirmed = window.confirm("Delete this car listing?");
        if (!confirmed) return;

        try {
            await api.delete(`/vehicles/${vehicleId}`);
            setVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-gray">Manage your cars</h1>
                    <p className="mt-2 text-primary/70">Edit details, add new cars, or remove listings.</p>
                </div>

                <Link to="/add-vehicle" className="inline-flex gap-1 items-center px-4 py-3 font-bold text-gray hover:text-gray/80 group">
                    <svg class="w-5 h-5 text-gray group-hover:text-gray/80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" stroke-linejoin="round" strokeWidth="2" d="M5 12h14m-7 7V5" />
                    </svg>
                    List a Car
                </Link>
            </div>

            {error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-accent">{error}</p>}

            {loading ? (
                <div className="rounded-3xl border border-primary/15 bg-surface p-6 text-primary/70 shadow-sm">Loading your cars...</div>
            ) : vehicles.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-primary/20 bg-surface p-8 text-center shadow-sm">
                    <h2 className="text-xl font-bold text-primary">No cars listed yet</h2>
                    <p className="mt-2 text-primary/50">Add your first vehicle to start hosting.</p>
                    <Link to="/add-vehicle" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 font-bold text-accent hover:bg-primary/90">
                        List a Car
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {vehicles.map((vehicle) => (
                        <article key={vehicle.id} className="overflow-hidden rounded-3xl border border-primary/15 bg-surface shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
                                <div className="h-48 bg-gradient-to-br from-primary to-primary/60 sm:h-full">
                                    {(typeof vehicle.images?.[0] === "string" ? vehicle.images[0] : vehicle.images?.[0]?.url) && (
                                        <img
                                            src={typeof vehicle.images[0] === "string" ? vehicle.images[0] : vehicle.images[0].url}
                                            alt={`${vehicle.brand} ${vehicle.model}`}
                                            className="h-full w-full object-cover"
                                        />
                                    )}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray">{vehicle.brand} {vehicle.model}</h2>
                                            <p className="text-sm text-gray">{vehicle.year} • {vehicle.transmission} • {vehicle.seatingCapacity} seats</p>
                                        </div>
                                        <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold capitalize text-primary">
                                            {vehicle.status}
                                        </span>
                                    </div>

                                    <p className="mt-4 text-lg font-black text-primary">
                                        PHP {Number(vehicle.pricePerDay || 0).toLocaleString()} <span className="text-sm font-medium text-primary">/ day</span>
                                    </p>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Link to={`/vehicles/${vehicle.id}`} className="rounded-xl border border-primary/15 px-4 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">
                                            View
                                        </Link>
                                        <Link to={`/host/cars/${vehicle.id}/edit`} className="rounded-xl border border-primary/15 px-4 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10">
                                            Edit
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(vehicle.id)}
                                            className="rounded-xl px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
