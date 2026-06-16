import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { uploadImage } from "../services/cloudinary";
import { resizeImage } from "../utils/resizeImage";
import { getCitiesByProvince, getProvincesByRegion, getRegions } from "../data/philippines";

const idTypes = [
    "Driver's License",
    "Philippine Passport",
    "UMID",
    "SSS ID",
    "GSIS ID",
    "PRC ID",
    "Voter's ID",
    "PhilHealth ID",
    "Postal ID",
    "National ID",
];

const initialForm = {
    name: {
        prefix: "",
        firstName: "",
        middleName: "",
        lastName: "",
    },
    contactNumber: "",
    address: {
        region: "",
        province: "",
        cityMunicipality: "",
        barangay: "",
        streetAddress: "",
        unitFloorBuilding: "",
        zipCode: "",
    },
    validId: {
        idType: "",
        idNumber: "",
        fileName: "",
    },
    selfieWithId: {
        fileName: "",
    },
};

export default function BecomeHost() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selfieSource, setSelfieSource] = useState("photos");
    const [selfiePickerOpen, setSelfiePickerOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [selfiePreview, setSelfiePreview] = useState("");
    const [idUploadResult, setIdUploadResult] = useState(null);
    const [selfieUploadResult, setSelfieUploadResult] = useState(null);
    const [uploadingDocs, setUploadingDocs] = useState(false);
    const photoInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const regions = getRegions();

    const provinces = useMemo(
        () => getProvincesByRegion(form.address.region),
        [form.address.region]
    );

    const cities = useMemo(
        () => getCitiesByProvince(form.address.province),
        [form.address.province]
    );

    const uploadAndRecord = useCallback(async (file, imageType) => {
        const resized = await resizeImage(file);
        const { secure_url, public_id } = await uploadImage(resized);
        const res = await api.post("/uploads/record", { imageUrl: secure_url, publicId: public_id, imageType });
        return { recordId: res.recordId, imageUrl: secure_url, publicId: public_id };
    }, []);

    const updateName = (field, value) => {
        setForm({
            ...form,
            name: { ...form.name, [field]: value },
        });
    };

    const updateAddress = (field, value) => {
        const nextAddress = { ...form.address, [field]: value };

        if (field === "region") {
            nextAddress.province = "";
            nextAddress.cityMunicipality = "";
        }

        if (field === "province") {
            nextAddress.cityMunicipality = "";
        }

        setForm({ ...form, address: nextAddress });
    };

    const updateValidId = (field, value) => {
        setForm({
            ...form,
            validId: { ...form.validId, [field]: value },
        });
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
        }
    };

    const startCamera = async () => {
        try {
            setError("");

            if (!navigator.mediaDevices?.getUserMedia) {
                setError("Camera is not supported by this browser.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false,
            });

            setCameraStream(stream);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch {
            setError("Camera permission was denied or the camera is unavailable.");
        }
    };

    const resetSelfie = () => {
        setForm((current) => ({
            ...current,
            selfieWithId: { fileName: "" },
        }));
        setSelfiePreview("");
    };

    const openPhotoPicker = () => {
        stopCamera();
        setSelfieSource("photos");
        setSelfiePickerOpen(false);
        photoInputRef.current?.click();
    };

    const openCameraCapture = async () => {
        resetSelfie();
        setSelfieSource("camera");
        setSelfiePickerOpen(false);
        await startCamera();
    };

    const captureSelfieFromCamera = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const fileName = `selfie-with-id-${Date.now()}.jpg`;

        const blob = await (await fetch(imageDataUrl)).blob();
        const selfieFile = new File([blob], fileName, { type: "image/jpeg" });

        setSelfiePreview(imageDataUrl);
        setForm((current) => ({
            ...current,
            selfieWithId: { fileName },
        }));
        stopCamera();

        setUploadingDocs(true);
        try {
            const result = await uploadAndRecord(selfieFile, "selfieWithId");
            setSelfieUploadResult(result);
        } catch {
            setError("Failed to upload selfie. Please try again.");
        } finally {
            setUploadingDocs(false);
        }
    };

    const goToReview = async (e) => {
        e.preventDefault();
        setError("");

        if (!idUploadResult) {
            setError("Please upload your government ID photo.");
            return;
        }
        if (!selfieUploadResult) {
            setError("Please add or take a selfie holding the physical ID.");
            return;
        }

        setStep(2);
    };

    const handleSubmit = async () => {
        if (submitting) return;

        try {
            setError("");
            setSubmitting(true);

            await api.post("/profile/become-host", {
                ...form,
                validId: { ...form.validId, imageUrl: idUploadResult.imageUrl },
                selfieWithId: { ...form.selfieWithId, imageUrl: selfieUploadResult.imageUrl },
                imageRecordIds: { validId: idUploadResult.recordId, selfieWithId: selfieUploadResult.recordId },
            });
            const profile = await api.get("/profile");
            updateUser(profile);
            setSubmitted(true);
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [cameraStream]);

    if (user?.role === "host") {
        return <Navigate to="/host/dashboard" replace />;
    }

    const hostStatus = user?.hostInfo?.status;

    if (hostStatus === "pending") {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12 text-center">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
                    <p className="text-lg font-bold text-amber-800">Application Under Review</p>
                    <p className="mt-2 text-amber-700">
                        Your host application has been submitted and is waiting for admin approval. We will notify you once a decision has been made.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {uploadingDocs && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
                    <div className="rounded-2xl bg-surface px-8 py-6 text-center shadow-2xl">
                        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                        <p className="font-semibold text-primary">Uploading documents...</p>
                        <p className="mt-1 text-sm text-primary/50">This will only take a moment</p>
                    </div>
                </div>
            )}
        <div className="max-w-3xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-2 text-dark">Become a Host</h1>
            <p className="text-primary/70 mb-6">
                Submit your legal identity, complete Philippine address, and ID verification details.
            </p>

            {error && <p className="mb-4 text-red-600">{error}</p>}

            {hostStatus === "rejected" && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Your previous application was rejected. You may submit a new one.
                </div>
            )}

            {submitted ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
                    <p className="text-lg font-bold text-green-800">Application Submitted!</p>
                    <p className="mt-2 text-green-700">
                        We have received your host application. An admin will review your documents. You will receive a confirmation once approved.
                    </p>
                </div>
            ) : step === 1 && (
                <form onSubmit={goToReview} className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">Legal Name</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <input
                                type="text"
                                placeholder="First Name"
                                value={form.name.firstName}
                                onChange={(e) => updateName("firstName", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />

                            <input
                                type="text"
                                placeholder="Middle Name"
                                value={form.name.middleName}
                                onChange={(e) => updateName("middleName", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />

                            <input
                                type="text"
                                placeholder="Last Name"
                                value={form.name.lastName}
                                onChange={(e) => updateName("lastName", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />

                            <select
                                value={form.name.prefix}
                                onChange={(e) => updateName("prefix", e.target.value)}
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            >
                                <option value="">Prefix (optional)</option>
                                <option value="Mr.">Mr.</option>
                                <option value="Ms.">Ms.</option>
                                <option value="Mrs.">Mrs.</option>
                                <option value="Dr.">Dr.</option>
                                <option value="Atty.">Atty.</option>
                            </select>
                        </div>

                        <input
                            type="text"
                            placeholder="Contact Number"
                            value={form.contactNumber}
                            onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                            required
                            className="w-full max-w-90 border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                        />
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">Owner House or Business Address</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select
                                value={form.address.region}
                                onChange={(e) => updateAddress("region", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            >
                                <option value="">Region</option>
                                {regions.map((region) => (
                                    <option key={region} value={region}>{region}</option>
                                ))}
                            </select>

                            <select
                                value={form.address.province}
                                onChange={(e) => updateAddress("province", e.target.value)}
                                required
                                disabled={!form.address.region}
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            >
                                <option value="">Province</option>
                                {provinces.map((province) => (
                                    <option key={province} value={province}>{province}</option>
                                ))}
                            </select>

                            <select
                                value={form.address.cityMunicipality}
                                onChange={(e) => updateAddress("cityMunicipality", e.target.value)}
                                required
                                disabled={!form.address.province}
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            >
                                <option value="">City/Municipality</option>
                                {cities.map((city) => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Barangay"
                                value={form.address.barangay}
                                onChange={(e) => updateAddress("barangay", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />

                            <input
                                type="text"
                                placeholder="House No., Street, Subdivision"
                                value={form.address.streetAddress}
                                onChange={(e) => updateAddress("streetAddress", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />

                            <input
                                type="text"
                                placeholder="Unit/Floor/Building (optional)"
                                value={form.address.unitFloorBuilding}
                                onChange={(e) => updateAddress("unitFloorBuilding", e.target.value)}
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />

                            <input
                                type="text"
                                placeholder="Zip Code"
                                value={form.address.zipCode}
                                onChange={(e) => updateAddress("zipCode", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">Identity Verification</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select
                                value={form.validId.idType}
                                onChange={(e) => updateValidId("idType", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            >
                                <option value="">Driver's License or Government ID Type</option>
                                {idTypes.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="ID Number"
                                value={form.validId.idNumber}
                                onChange={(e) => updateValidId("idNumber", e.target.value)}
                                required
                                className="w-full border bg-white border-primary/50 bg-surface text-dark py-3 px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent rounded-xl"
                            />

                            <label className="block">
                                <span className="block text-sm text-primary/70 mb-1">
                                    Upload driver's license or primary government ID
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        updateValidId("fileName", file?.name || "");
                                        setUploadingDocs(true);
                                        try {
                                            const result = await uploadAndRecord(file, "validId");
                                            setIdUploadResult(result);
                                        } catch {
                                            setError("Failed to upload ID. Please try again.");
                                        } finally {
                                            setUploadingDocs(false);
                                        }
                                    }}
                                    required
                                    className="w-full border border-primary/15 bg-surface rounded-lg px-4 py-2 cursor-pointer"
                                />
                            </label>

                            <div className="sm:col-span-2 space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-primary/80">
                                        Selfie holding the physical ID
                                    </p>
                                    <p className="text-sm text-primary/70">
                                        Add a clear selfie while holding the same physical ID.
                                    </p>
                                </div>

                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setForm((current) => ({
                                            ...current,
                                            selfieWithId: { fileName: file?.name || "" },
                                        }));
                                        setSelfiePreview(file ? URL.createObjectURL(file) : "");
                                        setUploadingDocs(true);
                                        try {
                                            const result = await uploadAndRecord(file, "selfieWithId");
                                            setSelfieUploadResult(result);
                                        } catch {
                                            setError("Failed to upload selfie. Please try again.");
                                        } finally {
                                            setUploadingDocs(false);
                                        }
                                    }}
                                    className="hidden"
                                />

                                {!selfiePreview && selfieSource !== "camera" && (
                                    <button
                                        type="button"
                                        onClick={() => setSelfiePickerOpen(true)}
                                        className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-3 border-dashed border-primary bg-background px-6 py-8 text-center transition hover:border-primary/50    hover:bg-accent/10"
                                    >
                                        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-2xl font-light text-accent">
                                            +
                                        </span>
                                        <span className="mt-3 font-semibold text-primary">Add photo</span>
                                        <span className="mt-1 text-sm text-primary/70">
                                            Upload an image or take a selfie with your camera
                                        </span>
                                    </button>
                                )}

                                {selfiePickerOpen && (
                                    <div className="fixed inset-0 z-[120] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
                                        <button
                                            type="button"
                                            aria-label="Close selfie options"
                                            onClick={() => setSelfiePickerOpen(false)}
                                            className="absolute inset-0 bg-dark/45 backdrop-blur-sm"
                                        />

                                        <div className="relative w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl ring-1 ring-primary/15">
                                            <div className="mb-4 flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-primary">Add selfie photo</h3>
                                                    <p className="mt-1 text-sm text-primary/50">
                                                        Choose how you want to provide your selfie with ID.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelfiePickerOpen(false)}
                                                    className="grid h-9 w-9 place-items-center rounded-full text-primary/50 hover:bg-accent/10 hover:text-primary"
                                                    aria-label="Close"
                                                >
                                                    X
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <button
                                                    type="button"
                                                    onClick={openPhotoPicker}
                                                    className="flex w-full items-center gap-4 rounded-2xl border border-primary/15 p-4 text-left transition hover:border-accent hover:bg-accent/10"
                                                >
                                                    <span className="grid h-11 w-11 place-items-center rounded-full bg-background text-lg">
                                                        +
                                                    </span>
                                                    <span>
                                                        <span className="block font-semibold text-primary">Upload from photos</span>
                                                        <span className="block text-sm text-primary/50">Choose an existing selfie image</span>
                                                    </span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={openCameraCapture}
                                                    className="flex w-full items-center gap-4 rounded-2xl border border-primary/15 p-4 text-left transition hover:border-accent hover:bg-accent/10"
                                                >
                                                    <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-accent">
                                                        O
                                                    </span>
                                                    <span>
                                                        <span className="block font-semibold text-primary">Take a selfie</span>
                                                        <span className="block text-sm text-primary/50">Open camera and capture now</span>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selfieSource === "camera" && !form.selfieWithId.fileName && (
                                    <div className="rounded-2xl border border-primary/15 bg-surface p-4 shadow-sm">
                                        <div className="overflow-hidden rounded-2xl bg-black">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="aspect-video w-full object-cover"
                                            />
                                        </div>
                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                type="button"
                                                onClick={captureSelfieFromCamera}
                                                className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-primary hover:bg-accent"
                                            >
                                                Capture Selfie
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    stopCamera();
                                                    setSelfieSource("photos");
                                                }}
                                                className="w-full rounded-xl border border-primary/15 px-4 py-3 font-semibold text-primary/80 hover:bg-accent/10"
                                            >
                                                Cancel
                                            </button>
                                        </div>

                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                )}

                                {selfiePreview && (
                                    <div className="rounded-2xl border border-primary/15 bg-surface p-4 shadow-sm">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-primary">Selfie added</p>
                                                <p className="text-sm text-primary/50">{form.selfieWithId.fileName}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelfiePickerOpen(true)}
                                                className="rounded-full border border-primary/15 px-4 py-2 text-sm font-semibold text-primary/80 hover:bg-accent/10"
                                            >
                                                Change
                                            </button>
                                        </div>
                                        <img
                                            src={selfiePreview}
                                            alt="Selfie holding physical ID preview"
                                            className="mt-4 w-full max-w-xs rounded-2xl border border-primary/15 object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90">
                        Review Application
                    </button>
                </form>
            )}

            {!submitted && step === 2 && (
                <>
                    <h2 className="text-lg font-semibold mb-4">Review & Submit</h2>

                    <div className="space-y-4 mb-6 border border-primary/15 bg-surface rounded-xl p-4">
                        <div>
                            <p className="text-sm text-dark/70">Legal Name</p>
                            <p className="font-medium">
                                {[form.name.prefix, form.name.firstName, form.name.middleName, form.name.lastName]
                                    .filter(Boolean)
                                    .join(" ")}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-dark/70">Contact Number</p>
                            <p className="font-medium">{form.contactNumber}</p>
                        </div>

                        <div>
                            <p className="text-sm text-dark/70">Complete Address</p>
                            <p className="font-medium">
                                {[
                                    form.address.unitFloorBuilding,
                                    form.address.streetAddress,
                                    form.address.barangay,
                                    form.address.cityMunicipality,
                                    form.address.province,
                                    form.address.region,
                                    form.address.zipCode,
                                ].filter(Boolean).join(", ")}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-dark/70">Government ID</p>
                            <p className="font-medium">
                                {form.validId.idType} - {form.validId.idNumber}
                            </p>
                            <p className="text-sm text-dark/70">{form.validId.fileName}</p>
                        </div>

                        <div>
                            <p className="text-sm text-dark/70">Selfie with ID</p>
                            <p className="font-medium">{form.selfieWithId.fileName}</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep(1)}
                            disabled={submitting || uploadingDocs}
                            className="w-full border border-primary/20 py-2 rounded-lg disabled:opacity-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || uploadingDocs}
                            className="w-full bg-primary text-white py-2 rounded-lg disabled:opacity-50"
                        >
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </>
            )}
        </div>
        </>
    );
}
