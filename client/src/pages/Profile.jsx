import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { uploadImage } from "../services/cloudinary";
import { getRegions, getProvincesByRegion, getCitiesByProvince } from "../data/philippines";
import StarRating from "../components/StarRating";
import ReviewCard from "../components/ReviewCard";

const EMPTY_ADDRESS = {
    region: "",
    province: "",
    cityMunicipality: "",
    barangay: "",
    streetAddress: "",
    unitFloorBuilding: "",
    zipCode: "",
};

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "NP";
}

function formatDate(date) {
    if (!date) return "Not available";
    const d = date.toDate ? date.toDate() : new Date(date);
    if (Number.isNaN(d.getTime())) return "Not available";
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatAddress(address) {
    const location = [address.cityMunicipality, address.province].filter(Boolean).join(", ");
    const line = [address.barangay, address.streetAddress, address.unitFloorBuilding, address.zipCode]
        .filter(Boolean)
        .join(", ");
    return { location: location || "No location set", line: line || "No street address set" };
}

function RoleBadge({ role }) {
    return (
        <span className="inline-flex items-center rounded-full bg-accent/30 px-3 py-1 text-xs font-bold capitalize text-primary ring-1 ring-primary/10">
            {role || "renter"}
        </span>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-primary/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray">{label}</p>
            <p className="mt-1 text-sm font-semibold text-dark">{value || "Not set"}</p>
        </div>
    );
}

function ModalShell({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-dark/50 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-primary/15">
                <div className="flex items-center justify-between border-b border-primary/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-dark">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-full text-xl text-gray transition hover:bg-accent/40 hover:text-dark"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function EditProfileModal({ initialProfile, onClose, onSave }) {
    const [draft, setDraft] = useState(initialProfile);
    const [saving, setSaving] = useState(false);

    const setField = (field) => (e) => setDraft({ ...draft, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(draft);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell title="Edit Profile Details" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-dark">Full Name</label>
                    <input
                        type="text"
                        value={draft.fullName}
                        onChange={setField("fullName")}
                        required
                        className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-dark">Contact Number</label>
                    <input
                        type="text"
                        value={draft.contactNumber}
                        onChange={setField("contactNumber")}
                        required
                        className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                    />
                </div>
                <div className="flex justify-end gap-3 border-t border-primary/10 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-5 py-2.5 text-sm font-bold text-gray transition hover:bg-accent/40 hover:text-dark"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

function EditAddressModal({ initialAddress, onClose, onSave }) {
    const [draft, setDraft] = useState(initialAddress);
    const [saving, setSaving] = useState(false);
    const regions = getRegions();
    const provinces = useMemo(() => getProvincesByRegion(draft.region), [draft.region]);
    const cities = useMemo(() => getCitiesByProvince(draft.province), [draft.province]);

    const setField = (field) => (e) => {
        const next = { ...draft, [field]: e.target.value };
        if (field === "region") {
            next.province = "";
            next.cityMunicipality = "";
        }
        if (field === "province") next.cityMunicipality = "";
        setDraft(next);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(draft);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell title="Edit Address" onClose={onClose}>
            <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-dark">Region</label>
                        <select value={draft.region} onChange={setField("region")} required className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent">
                            <option value="">Select Region</option>
                            {regions.map((region) => <option key={region} value={region}>{region}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-dark">Province</label>
                        <select value={draft.province} onChange={setField("province")} required disabled={!draft.region} className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="">Select Province</option>
                            {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-dark">City / Municipality</label>
                    <select value={draft.cityMunicipality} onChange={setField("cityMunicipality")} required disabled={!draft.province} className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Select City / Municipality</option>
                        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-dark">Barangay</label>
                        <input type="text" value={draft.barangay} onChange={setField("barangay")} required className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-dark">Zip Code</label>
                        <input type="text" value={draft.zipCode} onChange={setField("zipCode")} required className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                    </div>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-dark">Street Address</label>
                    <input type="text" value={draft.streetAddress} onChange={setField("streetAddress")} required className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-dark">Unit/Floor/Building</label>
                    <input type="text" value={draft.unitFloorBuilding} onChange={setField("unitFloorBuilding")} className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent" />
                </div>
                <div className="flex justify-end gap-3 border-t border-primary/10 pt-4">
                    <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-bold text-gray transition hover:bg-accent/40 hover:text-dark">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
                        {saving ? "Saving..." : "Save Address"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

export default function Profile() {
    const { user, updateUser } = useAuth();
    const [profile, setProfile] = useState({ fullName: "", contactNumber: "" });
    const [address, setAddress] = useState(EMPTY_ADDRESS);
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState({ avatar: false, cover: false });
    const [editingProfile, setEditingProfile] = useState(false);
    const [editingAddress, setEditingAddress] = useState(false);
    const [userReviews, setUserReviews] = useState({ reviews: [], averageRating: 0, count: 0 });

    const coverInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const initials = getInitials(profile.fullName || user?.fullName || "");
    const hostStatus = user?.hostInfo?.status;
    const isHost = user?.role === "host";
    const formattedAddress = formatAddress(address);
    const profileIncomplete = !profile.contactNumber || !address.region;

    useEffect(() => {
        api.get("/profile").then((data) => {
            setProfile({ fullName: data.fullName || "", contactNumber: data.contactNumber || "" });
            setAddress({ ...EMPTY_ADDRESS, ...(data.address || {}) });
        });
    }, []);

    useEffect(() => {
        if (user?.id) {
            api.get(`/reviews/user/${user.id}`)
                .then(setUserReviews)
                .catch(() => {});
        }
    }, [user?.id]);

    const showMessage = (text) => {
        setMessage(text);
        setTimeout(() => setMessage(""), 3000);
    };

    const saveProfile = async (nextProfile) => {
        await api.put("/profile", { ...nextProfile, address });
        setProfile(nextProfile);
        updateUser({ fullName: nextProfile.fullName, contactNumber: nextProfile.contactNumber });
        setEditingProfile(false);
        showMessage("Profile updated!");
    };

    const saveAddress = async (nextAddress) => {
        await api.put("/profile", { ...profile, address: nextAddress });
        setAddress(nextAddress);
        updateUser({ address: nextAddress });
        setEditingAddress(false);
        showMessage("Address updated!");
    };

    const handlePhotoUpload = async (type, file) => {
        setUploading((prev) => ({ ...prev, [type]: true }));
        try {
            const { secure_url, public_id } = await uploadImage(file);
            await api.put("/profile/photo", { type, imageUrl: secure_url, publicId: public_id });
            const key = type === "avatar" ? "photoURL" : "coverURL";
            updateUser({ [key]: secure_url });
            showMessage(type === "avatar" ? "Profile photo updated!" : "Cover photo updated!");
        } catch {
            showMessage("Failed to upload photo");
        } finally {
            setUploading((prev) => ({ ...prev, [type]: false }));
        }
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            {message && (
                <div className="fixed right-4 top-24 z-50 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-lg">
                    {message}
                </div>
            )}

            {profileIncomplete && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4">
                    <p className="text-sm font-bold text-amber-800">Complete your profile</p>
                    <p className="mt-1 text-sm text-amber-700">
                        Your contact number and address are required to use the platform. Please fill in the fields below.
                    </p>
                </div>
            )}

            <section className="overflow-hidden rounded-3xl border border-primary/15 bg-surface shadow-sm">
                <div className="group relative h-44 overflow-hidden bg-primary lg:h-64">
                    {user?.coverURL ? (
                        <img src={user.coverURL} alt="Cover" className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.22),transparent_28rem),linear-gradient(135deg,#1C4F9C,#0f2f63)]" />
                    )}
                    <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploading.cover}
                        className="absolute right-4 top-4 rounded-lg bg-white/95 px-4 py-2 text-xs font-bold text-dark shadow-sm transition hover:bg-white disabled:opacity-60 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                        {uploading.cover ? "Uploading..." : "Edit cover photo"}
                    </button>
                </div>

                <div className="px-5 pb-6 sm:px-8">
                    <div className="flex flex-col gap-4 border-b border-primary/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="group relative -mt-16 h-32 w-32 shrink-0 overflow-hidden rounded-full bg-primary ring-4 ring-surface sm:h-36 sm:w-36">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={profile.fullName || "Profile"} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-4xl font-black text-accent">
                                        {initials}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={uploading.avatar}
                                    className="absolute inset-x-0 bottom-0 bg-dark/70 px-2 py-3 text-xs font-bold text-white transition hover:bg-dark/85 disabled:opacity-60 lg:translate-y-full lg:group-hover:translate-y-0"
                                >
                                    {uploading.avatar ? "Uploading..." : "Edit photo"}
                                </button>
                            </div>

                            <div className="min-w-0 pb-1">
                                <h1 className="truncate text-3xl font-black text-dark">{profile.fullName || user?.fullName || "User"}</h1>
                                <p className="mt-1 truncate text-sm font-medium text-gray">{user?.email}</p>
                                <div className="mt-2">
                                    <RoleBadge role={user?.role} />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setEditingProfile(true)}
                            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
                        >
                            Edit profile
                        </button>
                    </div>
                </div>
            </section>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
                <main className="space-y-6">
                    <section className="rounded-2xl border border-primary/15 bg-surface p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-dark">Contact Info</h2>
                                <p className="mt-1 text-sm text-gray">Basic details people use to identify and contact you.</p>
                            </div>
                            <button type="button" onClick={() => setEditingProfile(true)} className="rounded-full bg-accent/60 px-4 py-2 text-sm font-bold text-primary transition hover:bg-accent">
                                Edit
                            </button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <InfoRow label="Full name" value={profile.fullName} />
                            <InfoRow label="Contact number" value={profile.contactNumber} />
                            <div className="sm:col-span-2">
                                <InfoRow label="Email" value={user?.email} />
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-primary/15 bg-surface p-6">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-dark">Address</h2>
                                <p className="mt-1 text-sm text-gray">Your saved pickup and account location details.</p>
                            </div>
                            <button type="button" onClick={() => setEditingAddress(true)} className="rounded-full bg-accent/60 px-4 py-2 text-sm font-bold text-primary transition hover:bg-accent">
                                Edit
                            </button>
                        </div>
                        <div className="rounded-2xl bg-white p-5 ring-1 ring-primary/10">
                            <p className="text-base font-bold text-dark">{formattedAddress.location}</p>
                            <p className="mt-2 text-sm leading-6 text-gray">{formattedAddress.line}</p>
                            {address.region && <p className="mt-2 text-xs font-semibold text-primary/70">{address.region}</p>}
                        </div>
                    </section>
                </main>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-primary/15 bg-surface p-6">
                        <h2 className="mb-5 text-lg font-bold text-dark">Intro</h2>
                        <div className="space-y-3">
                            <InfoRow label="Role" value={user?.role} />
                            <InfoRow label="Member since" value={formatDate(user?.createdAt)} />
                            <InfoRow label="Location" value={formattedAddress.location} />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-primary/15 bg-surface p-6">
                        <h2 className="mb-5 text-lg font-bold text-dark">Host Status</h2>
                        {isHost ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                                    Approved host account
                                </div>
                                <Link to="/host/dashboard" className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-primary/90">
                                    Go to Dashboard
                                </Link>
                            </div>
                        ) : hostStatus === "pending" ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                    Your host application is <strong>under review</strong>.
                                </div>
                                <div className="flex items-center gap-2 text-sm text-primary/60">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-primary" />
                                    Pending approval
                                </div>
                            </div>
                        ) : hostStatus === "rejected" ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    Your application was <strong>rejected</strong>.
                                </div>
                                <Link to="/become-host" className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-primary/90">
                                    Submit New Application
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray">You are not a host yet.</p>
                                <Link to="/become-host" className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-primary/90">
                                    Become a Host
                                </Link>
                            </div>
                        )}
                    </section>

                    {userReviews.count > 0 && (
                        <section className="rounded-2xl border border-primary/15 bg-surface p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <StarRating rating={Math.round(userReviews.averageRating)} size="sm" />
                                <span className="text-sm font-semibold text-dark">{userReviews.averageRating}</span>
                                <span className="text-xs text-gray">({userReviews.count})</span>
                            </div>
                            <div className="space-y-3">
                                {userReviews.reviews.slice(0, 3).map((review) => (
                                    <ReviewCard key={review.id} review={review} />
                                ))}
                            </div>
                        </section>
                    )}
                </aside>
            </div>

            <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload("cover", file);
                    e.target.value = "";
                }}
            />
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload("avatar", file);
                    e.target.value = "";
                }}
            />

            {editingProfile && (
                <EditProfileModal
                    initialProfile={profile}
                    onClose={() => setEditingProfile(false)}
                    onSave={saveProfile}
                />
            )}

            {editingAddress && (
                <EditAddressModal
                    initialAddress={address}
                    onClose={() => setEditingAddress(false)}
                    onSave={saveAddress}
                />
            )}
        </div>
    );
}
