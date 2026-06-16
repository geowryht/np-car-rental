import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { uploadImage } from "../services/cloudinary";

const maxImages = 3;

export default function EditVehicle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        brand: "", model: "", year: "", transmission: "", seatingCapacity: "",
        fuelType: "", plateNumber: "", pricePerDay: "", status: "available", description: "",
    });
    const [existingImages, setExistingImages] = useState([]);
    const [newFiles, setNewFiles] = useState([]);
    const [newPreviews, setNewPreviews] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get(`/vehicles/${id}`)
            .then((vehicle) => {
                setForm({
                    brand: vehicle.brand || "", model: vehicle.model || "", year: vehicle.year || "",
                    transmission: vehicle.transmission || "", seatingCapacity: vehicle.seatingCapacity || "",
                    fuelType: vehicle.fuelType || "", plateNumber: vehicle.plateNumber || "",
                    pricePerDay: vehicle.pricePerDay || "", status: vehicle.status || "available",
                    description: vehicle.description || "",
                });
                setExistingImages(vehicle.images?.map((img) => img.url || img) || []);
                setLoading(false);
            })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, [id]);

    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleImages = (e) => {
        const remaining = maxImages - (existingImages.length + newFiles.length);
        const files = Array.from(e.target.files || []).slice(0, remaining);
        e.target.value = "";
        setError("");
        setNewFiles((prev) => [...prev, ...files]);
        setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    };

    const removeImage = (index) => {
        if (index < existingImages.length) {
            setExistingImages((prev) => prev.filter((_, i) => i !== index));
        } else {
            const newIndex = index - existingImages.length;
            URL.revokeObjectURL(newPreviews[newIndex]);
            setNewFiles((prev) => prev.filter((_, i) => i !== newIndex));
            setNewPreviews((prev) => prev.filter((_, i) => i !== newIndex));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (existingImages.length + newFiles.length === 0) {
            setError("Add at least one photo");
            return;
        }
        setSubmitting(true);
        try {
            const newResults = await Promise.all(newFiles.map((f) => uploadImage(f)));
            const allImages = [...existingImages, ...newResults.map((r) => r.secure_url)];
            await api.put(`/vehicles/${id}`, { ...form, images: allImages });
            newPreviews.forEach((p) => URL.revokeObjectURL(p));
            navigate("/host/cars");
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const allPreviews = [...existingImages, ...newPreviews];

    if (loading) {
        return <div className="max-w-4xl mx-auto px-4 py-10 text-primary/50">Loading vehicle...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            {/* <Link to="/host/cars" className="text-sm font-semibold text-primary/60 hover:text-accent">Back to cars</Link> */}

            <div className="mt-6 rounded-3xl border border-primary/15 bg-surface p-6 shadow-sm">
                <h1 className="text-3xl font-black tracking-tight text-gray">Edit car</h1>
                <p className="mt-2 text-primary/70">Update listing details renters will see.</p>

                {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <input type="text" placeholder="Brand" value={form.brand} onChange={set("brand")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                        <input type="text" placeholder="Model" value={form.model} onChange={set("model")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                        <input type="number" placeholder="Year" value={form.year} onChange={set("year")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                        <select value={form.transmission} onChange={set("transmission")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent">
                            <option value="">Transmission</option>
                            <option value="Automatic">Automatic</option>
                            <option value="Manual">Manual</option>
                        </select>
                        <input type="number" placeholder="Seats" value={form.seatingCapacity} onChange={set("seatingCapacity")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                        <select value={form.fuelType} onChange={set("fuelType")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent">
                            <option value="">Fuel Type</option>
                            <option value="Gasoline">Gasoline</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Electric">Electric</option>
                        </select>
                        <input type="text" placeholder="Plate Number" value={form.plateNumber} onChange={set("plateNumber")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                        <input type="number" placeholder="Price per day (PHP)" value={form.pricePerDay} onChange={set("pricePerDay")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                        <select value={form.status} onChange={set("status")} required className="rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent">
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </div>

                    <textarea placeholder="Description" value={form.description} onChange={set("description")} required className="w-full rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" rows={5} />

                    <div className="rounded-2xl border border-primary/15 bg-background p-5">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="font-bold text-primary">Photos</h2>
                            <span className="text-sm text-gray">{allPreviews.length}/{maxImages}</span>
                        </div>

                        {allPreviews.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {allPreviews.map((url, i) => (
                                    <div key={url} className="relative overflow-hidden rounded-xl border border-primary/15 bg-surface">
                                        <img src={url} alt="" className="h-24 w-full object-cover" />
                                        <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-bold">X</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {allPreviews.length < maxImages && (
                            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-primary/20 bg-surface py-3 text-sm font-semibold text-primary/60 hover:border-accent hover:bg-accent/10">
                                {allPreviews.length > 0 ? "Add more" : "Add photos"}
                                <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleImages} disabled={submitting} className="hidden" />
                            </label>
                        )}
                    </div>

                    <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-primary px-4 py-3 font-bold text-accent hover:bg-primary/90 disabled:opacity-70">
                        {submitting ? "Uploading images..." : "Save Changes"}
                    </button>
                </form>
            </div>

            {submitting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface px-8 py-10 shadow-2xl">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-primary" />
                        <p className="text-sm font-semibold text-dark">Uploading images &amp; saving...</p>
                        <p className="text-xs text-gray">Please do not close this page.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
