import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { uploadImage } from "../services/cloudinary";

const maxImages = 3;

export default function AddVehicle() {
  const [form, setForm] = useState({
    brand: "", model: "", year: "", transmission: "", seatingCapacity: "",
    fuelType: "", plateNumber: "", pricePerDay: "", description: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (selectedFiles.length === 0) {
      setError("Add at least one photo");
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.all(selectedFiles.map((f) => uploadImage(f)));
      await api.post("/vehicles", { ...form, images: results.map((r) => r.secure_url) });
      previews.forEach((p) => URL.revokeObjectURL(p));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []).slice(0, maxImages - selectedFiles.length);
    e.target.value = "";
    setError("");
    setSelectedFiles((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray">List your vehicle</h1>
        <p className="mt-2 max-w-2xl text-primary/70">
          Add clear details and up to three photos so renters can quickly understand your car.
        </p>
      </div>

      {error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-primary/15 bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-primary">Vehicle details</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="text" placeholder="Brand" value={form.brand} onChange={set("brand")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
            <input type="text" placeholder="Model" value={form.model} onChange={set("model")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
            <input type="number" placeholder="Year" value={form.year} onChange={set("year")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
            <select value={form.transmission} onChange={set("transmission")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent">
              <option value="">Transmission</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
            <input type="number" placeholder="Seats" value={form.seatingCapacity} onChange={set("seatingCapacity")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
            <select value={form.fuelType} onChange={set("fuelType")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent">
              <option value="">Fuel Type</option>
              <option value="Gasoline">Gasoline</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric</option>
            </select>
            <input type="text" placeholder="Plate Number" value={form.plateNumber} onChange={set("plateNumber")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
            <input type="number" placeholder="Price per day (PHP)" value={form.pricePerDay} onChange={set("pricePerDay")} required className="rounded-xl rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={set("description")} required className="mt-4 w-full rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" rows={5} />
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-primary/15 bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-primary">Vehicle photos</h2>
                <p className="mt-1 text-sm text-gray">Add up to {maxImages} clear images.</p>
              </div>
              <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-gray">{previews.length}/{maxImages}</span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              {previews.map((url, index) => (
                <div key={url} className="relative overflow-hidden rounded-2xl border border-primary/15 bg-background">
                  <img src={url} alt={`Vehicle ${index + 1}`} className="h-40 w-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-bold text-primary shadow-sm hover:bg-surface">Remove</button>
                </div>
              ))}

              {previews.length < maxImages && (
                <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-background px-5 py-8 text-center transition hover:border-accent hover:bg-accent">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-2xl font-light text-accent">+</span>
                  <span className="mt-3 font-semibold text-primary">Add images</span>
                  <span className="mt-1 text-sm text-primary/50">PNG, JPG, or WEBP</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleImages} className="hidden" />
                </label>
              )}
            </div>
          </section>

          <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-primary px-4 py-3 font-bold text-accent transition hover:bg-primary/90 disabled:opacity-70">
            {submitting ? "Uploading images..." : "List Vehicle"}
          </button>
        </aside>
      </form>

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
