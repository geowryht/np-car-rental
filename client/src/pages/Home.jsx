import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getAllCities } from "../data/philippines";
import HeroMarquee from "../components/HeroMarquee";

const IMG = (id) =>
    `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&auto=format&q=80`;

const MARQUEE_COLUMNS = [
    {
        images: [
            IMG("1494976388531-d1058494cdd8"),
            IMG("1542362567-b07e54358753"),
            IMG("1503376780353-7e6692767b70"),
            IMG("1606664515524-ed2f786a0bd6"),
        ],
        direction: "up",
        duration: 20,
    },
    {
        images: [
            IMG("1555215695-3004980ad54e"),
            IMG("1560958089-b8a1929cea89"),
            IMG("1533473359331-0135ef1b58bf"),
            IMG("1583121274602-3e2820c69888"),
        ],
        direction: "down",
        duration: 25,
    },
    {
        images: [
            IMG("1619767886558-efdc259cde1a"),
            IMG("1553440569-bcc63803a83d"),
            IMG("1593941707882-a5bba14938c7"),
            IMG("1605559424843-9e4c228bf1c2"),
        ],
        direction: "up",
        duration: 22,
    },
];

export default function Home() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [searchCity, setSearchCity] = useState("");
    const [cityInput, setCityInput] = useState("");
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [userBookingIds, setUserBookingIds] = useState(new Set());

    const allCities = useMemo(() => getAllCities(), []);

    const filteredCities = useMemo(() => {
        if (!cityInput || searchCity) return [];
        const q = cityInput.toLowerCase();
        return allCities
            .filter((c) => c.name.toLowerCase().includes(q))
            .slice(0, 10);
    }, [cityInput, searchCity, allCities]);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter((v) => {
            if (searchKeyword) {
                const kw = searchKeyword.toLowerCase();
                const text = [
                    v.brand, v.model, String(v.year), v.description,
                    v.fuelType, v.transmission,
                ].filter(Boolean).join(" ").toLowerCase();
                if (!text.includes(kw)) return false;
            }
            if (searchCity) {
                const city = v.hostAddress?.cityMunicipality || "";
                const province = v.hostAddress?.province || "";
                if (!`${city} ${province}`.toLowerCase().includes(searchCity.toLowerCase())) return false;
            }
            return true;
        });
    }, [vehicles, searchKeyword, searchCity]);

    useEffect(() => {
        api.get("/vehicles").then((data) => {
            setVehicles(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (user) {
            api.get("/payments/my-pending-vehicle-ids")
                .then((ids) => setUserBookingIds(new Set(ids)))
                .catch(() => {});
        }
    }, [user]);

    return (
        <div>
            <section className="bg-accent font-Nunito overflow-hidden ">
                <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
                    <div className="max-w-xl">
                        <p className="mb-3 font-bold text-lg uppercase tracking-wide text-dark">
                            Peer-to-peer car rental
                        </p>
                        <h1 className="text-4xl font-bold tracking-[1px] text-primary sm:text-5xl">
                            Find a <span className="text-amber-400">trusted</span> car for your next trip.
                        </h1>
                        <p className="mt-4 text-lg leading-8 text-gray">
                            Browse available vehicles from local hosts and choose the ride that fits your day.
                        </p>
                        <button
                            type="button"
                            onClick={() => document.getElementById("vehicle-list")?.scrollIntoView({ behavior: "smooth" })}
                            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-white font-bold transition hover:bg-primary/90"
                        >
                            Browse Cars
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M5 12h14M13 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="relative h-[470px] hidden lg:grid grid-cols-3 gap-3">
                        {MARQUEE_COLUMNS.map((col, i) => (
                            <HeroMarquee
                                key={i}
                                images={col.images}
                                direction={col.direction}
                                duration={col.duration}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section className="sticky top-[72px] z-30 bg-white backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary/40">
                                <img src="/search.svg" alt="search icon" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search cars, brands, or keywords..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                className="w-full rounded-2xl border bg-white border-primary/50 bg-surface text-dark py-3 pl-11 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                            />
                            {searchKeyword && (
                                <button
                                    type="button"
                                    onClick={() => setSearchKeyword("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary/60"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="relative sm:w-72">
                            <input
                                type="text"
                                placeholder="City / Area"
                                value={searchCity || cityInput}
                                onChange={(e) => { setSearchCity(""); setCityInput(e.target.value); setShowCityDropdown(true); }}
                                onFocus={() => { if (cityInput || searchCity) setShowCityDropdown(true); }}
                                onBlur={() => { setTimeout(() => setShowCityDropdown(false), 200); }}
                                className="w-full rounded-2xl border border-primary/50 bg-white py-3 pl-11 pr-10 text-sm text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                            />
                            {(searchCity || cityInput) && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchCity(""); setCityInput(""); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary/60"
                                >
                                    ✕
                                </button>
                            )}

                            {showCityDropdown && filteredCities.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-primary/15 bg-surface p-2 shadow-xl">
                                    {filteredCities.map((c) => (
                                        <button
                                            key={c.name + c.province}
                                            type="button"
                                            onMouseDown={() => { setSearchCity(c.name); setCityInput(c.name); setShowCityDropdown(false); }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-accent/10"
                                        >
                                            <span className="font-medium text-primary">{c.name}</span>
                                            <span className="text-xs text-primary/40">{c.province}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section id="vehicle-list" className="max-w-7xl mx-auto px-4 py-10">
                {(searchKeyword || searchCity) && (
                    <p className="mb-6 text-sm text-primary/50">
                        {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""} found
                        <button
                            type="button"
                            onClick={() => { setSearchKeyword(""); setSearchCity(""); setCityInput(""); }}
                            className="ml-3 font-semibold text-accent underline hover:text-accent"
                        >
                            Clear filters
                        </button>
                    </p>
                )}

                {loading ? (
                    <div className="rounded-2xl border border-primary/15 bg-surface p-6 text-primary/50">
                        Loading vehicles...
                    </div>
                ) : filteredVehicles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-surface p-8 text-center text-primary/50">
                        {vehicles.length === 0
                            ? "No vehicles available yet."
                            : "No vehicles match your search."}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredVehicles.map((v) => (
                            <Link
                                key={v.id}
                                to={`/vehicles/${v.id}`}
                                className="group overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm transition"
                            >
                                <div className="relative h-48 bg-primary/10">
                                    {(typeof v.images?.[0] === "string" ? v.images[0] : v.images?.[0]?.url) ? (
                                        <img
                                            src={typeof v.images[0] === "string" ? v.images[0] : v.images[0].url}
                                            alt={`${v.brand} ${v.model}`}
                                            className="h-full w-full object-cover transition duration-300"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60" />
                                    )}
                                    {v.status === "rented" ? (
                                        <div className="absolute left-4 top-4 rounded-full bg-gray-200/90 px-3 py-1 text-xs font-semibold text-gray-600">
                                            Rented
                                        </div>
                                    ) : userBookingIds.has(v.id) ? (
                                        <div className="absolute left-4 top-4 rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-700">
                                            Awaiting Payment
                                        </div>
                                    ) : (
                                        <div className="absolute left-4 top-4 rounded-full bg-green-100/90 px-3 py-1 text-xs font-semibold text-green-700">
                                            {v.status || "available"}
                                        </div>
                                    )}
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-dark">
                                                {v.brand} {v.model}
                                            </h3>
                                            <p className="text-sm text-gray-500 font-semibold">{v.year}</p>
                                            {v.hostAddress && (
                                                <p className="mt-1 text-xs text-dark font-semibold">
                                                    {[v.hostAddress.cityMunicipality, v.hostAddress.province].filter(Boolean).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                        <p className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-md font-bold text-gray">
                                            &#x20B1; {Number(v.pricePerDay || 0).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-2 font-semibold text-center text-sm text-gray">
                                        <span className="border-r border-gray-400 px-2 py-2">{v.transmission}</span>
                                        <span className="border-r border-gray-400 px-2 py-2">{v.seatingCapacity} seats</span>
                                        <span className="px-2 py-2">{v.fuelType}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
