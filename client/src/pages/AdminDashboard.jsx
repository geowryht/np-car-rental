import { useEffect, useState } from "react";
import { api } from "../services/api";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "applications", label: "Host Applications" },
  { id: "bookings", label: "Bookings" },
  { id: "settings", label: "Settings" },
];

const SECTION_ACCENTS = {
  overview: "bg-accent",
  users: "bg-accent",
  applications: "bg-accent",
  bookings: "bg-accent",
  settings: "bg-accent",
};

const CARD_ACCENTS = {
  "Total Users": "bg-primary",
  "Total Vehicles": "bg-primary",
  "Total Bookings": "bg-primary",
  "Total Revenue": "bg-primary",
};

function StatusPill({ status }) {
  const colors = {
    confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-300",
    pending: "bg-amber-50 text-amber-700 ring-amber-300",
    completed: "bg-blue-50 text-blue-700 ring-blue-300",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-300",
    rejected: "bg-rose-50 text-rose-700 ring-rose-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colors[status] || "bg-background text-primary/80 ring-primary/20"}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }) {
  const colors = {
    admin: "bg-accent/15 text-primary ring-accent/30",
    host: "bg-accent/15 text-primary ring-accent/30",
    renter: "bg-accent/15 text-primary ring-accent/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${colors[role] || "bg-background text-primary/80 ring-primary/20"}`}>
      {role}
    </span>
  );
}

function StatCard({ label, value, subtitle }) {
  const barColor = CARD_ACCENTS[label] || "bg-primary";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-surface transition hover:shadow-md">
      <div className={`h-1 w-full ${barColor}`} />
      <div className="p-5">
        <p className="text-sm font-medium text-primary/60">{label}</p>
        <p className="mt-1 text-3xl font-black text-primary">{value ?? "—"}</p>
        {subtitle && <p className="mt-1 text-xs text-primary/50">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationsPage, setApplicationsPage] = useState({ nextCursor: null, hasMore: false, loadingMore: false });
  const [bookings, setBookings] = useState([]);
  const [settingsData, setSettingsData] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [docViewer, setDocViewer] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = () => api.get("/admin/stats").then(setStats);
  const loadUsers = () => api.get("/admin/users").then(setUsers);
  const loadApplications = async ({ append = false, cursor = "" } = {}) => {
    if (append) setApplicationsPage((prev) => ({ ...prev, loadingMore: true }));
    const endpoint = `/admin/host-applications?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const data = await api.get(endpoint);
    setApplications((prev) => append ? [...prev, ...data.applications] : data.applications);
    setApplicationsPage({
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
      loadingMore: false,
    });
  };
  const loadBookings = () => api.get("/admin/bookings").then(setBookings);
  const loadSettings = () => api.get("/admin/settings").then(setSettingsData);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadUsers(), loadApplications(), loadBookings(), loadSettings()])
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      setMessage(`User role updated to ${role}`);
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await api.put(`/admin/host-applications/${userId}/approve`);
      setMessage("Application approved");
      loadApplications();
      loadStats();
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async (userId) => {
    try {
      await api.put(`/admin/host-applications/${userId}/reject`);
      setMessage("Application rejected");
      loadApplications();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm("Delete this vehicle permanently?")) return;
    try {
      await api.delete(`/admin/vehicles/${vehicleId}`);
      setMessage("Vehicle deleted");
      loadStats();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const platformFee = Number(fd.get("platformFee")) / 100;
    try {
      await api.put("/admin/settings", { platformFee });
      setMessage("Settings saved");
      loadSettings();
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm font-medium text-primary/60">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <span className="text-base font-bold tracking-tight">Admin</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const accent = SECTION_ACCENTS[item.id];
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${activeTab === item.id
                  ? "bg-accent/15 text-accent shadow-sm"
                  : "text-white/60 hover:bg-accent/10 hover:text-white"
                  }`}
              >
                {activeTab === item.id && (
                  <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full ${accent}`} />
                )}
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "applications" && applications.length > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-accent">
                    {applicationsPage.hasMore ? `${applications.length}+` : applications.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-4">
          <p className="flex items-center gap-2 text-xs text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Signed in as admin
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-primary/10 bg-surface/80 px-4 shadow-sm backdrop-blur-md lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl text-primary transition hover:bg-accent/10 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className={`h-2 w-2 rounded-full ${SECTION_ACCENTS[activeTab] || "bg-primary"}`} />

          <h1 className="text-lg font-bold tracking-tight text-primary">
            {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
          </h1>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          {message && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-primary shadow-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/30 text-xs font-bold text-primary">i</span>
              <span className="flex-1">{message}</span>
              <button onClick={() => setMessage("")} className="font-semibold text-primary/50 transition hover:text-primary">&times;</button>
            </div>
          )}

          {activeTab === "overview" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Users" value={stats.totalUsers} subtitle={`${stats.roles?.renter || 0} renters, ${stats.roles?.host || 0} hosts`} />
                <StatCard label="Total Vehicles" value={stats.totalVehicles} />
                <StatCard label="Total Bookings" value={stats.totalBookings} subtitle={Object.entries(stats.bookingStatuses || {}).map(([s, c]) => `${s}: ${c}`).join(" · ")} />
                <StatCard label="Total Revenue" value={`₱${stats.totalRevenue?.toLocaleString() || "0"}`} subtitle={`Fee: ${((stats.settings?.platformFee || 0.15) * 100).toFixed(0)}%`} />
              </div>

              {stats.totalVehicles > 0 && (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    Vehicles
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-primary/10 bg-background text-xs uppercase text-primary/60">
                          <tr>
                            <th className="px-4 py-3">Vehicle</th>
                            <th className="px-4 py-3">Host</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/10">
                          {(stats.vehicles || []).length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-primary/50">No vehicles found.</td></tr>
                          )}
                          {(stats.vehicles || []).slice(0, 10).map((v) => (
                            <tr key={v.id} className="transition hover:bg-accent/10">
                              <td className="px-4 py-3 font-medium text-primary">{v.brand} {v.model}</td>
                              <td className="px-4 py-3 text-primary/60">{v.host?.fullName || "—"}</td>
                              <td className="px-4 py-3 text-primary/80">₱{v.pricePerDay?.toLocaleString()}/day</td>
                              <td className="px-4 py-3"><StatusPill status={v.status} /></td>
                              <td className="px-4 py-3">
                                <button onClick={() => handleDeleteVehicle(v.id)} className="text-xs font-semibold text-rose-500 transition hover:text-rose-700">Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative max-w-xs flex-1">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 pl-11 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                  />
                </div>
                <span className="text-xs font-semibold text-dark">{users.length} users</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-primary/10 bg-background text-xs uppercase text-primary/60">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Verified</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {users
                        .filter((u) => {
                          if (!search) return true;
                          const q = search.toLowerCase();
                          return u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                        })
                        .length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-primary/50">No users match your search.</td></tr>
                        )}
                      {users
                        .filter((u) => {
                          if (!search) return true;
                          const q = search.toLowerCase();
                          return u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                        })
                        .map((u) => (
                          <tr key={u.id} className="transition hover:bg-accent/10">
                            <td className="px-4 py-3 font-medium text-primary">{u.fullName || "—"}</td>
                            <td className="px-4 py-3 text-primary">{u.email}</td>
                            <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                            <td className="px-4 py-3">
                              {u.emailVerified ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                  Unverified
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {u.role !== "admin" && (
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  className="rounded-lg border border-primary/15 bg-surface px-2.5 py-1.5 text-xs font-medium text-primary/80 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
                                >
                                  <option value="renter">renter</option>
                                  <option value="host">host</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "applications" && (
            <div className="space-y-4">
              {applications.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-surface py-12">
                  <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-primary/60">No pending host applications.</p>
                </div>
              )}
              {applications.map((app) => (
                <div key={app.id} className="overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-sm transition hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-4 bg-white border-b border-primary/10 bg-gradient-to-r from-transparent via-transparent to-accent/[0.04] px-5 ">
                    <div className="">
                      <p className="font-bold text-primary pt-1">{app.fullName || `${app.hostInfo?.name?.firstName || ""} ${app.hostInfo?.name?.lastName || ""}`.trim() || "Unknown"}</p>
                      <p className="text-sm text-primary">{app.email}</p>
                    </div>
                    <div className="flex">
                      {app.hostInfo?.validId?.imageUrl && app.hostInfo?.selfieWithId?.imageUrl && (
                        <button
                          onClick={() => setDocViewer({ idUrl: app.hostInfo.validId.imageUrl, selfieUrl: app.hostInfo.selfieWithId.imageUrl })}
                          className="px-4 py-4 text-sm font-semibold text-dark transition hover:bg-gray-200 flex gap-2 pr-10 border-l border-gray-300"
                        >
                          <svg className="w-6 h-6 text-gray" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" stroke-linejoin="round" strokeWidth="2" d="m3 16 5-7 6 6.5m6.5 2.5L16 13l-4.286 6M14 10h.01M4 19h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z" />
                          </svg>
                          Compare
                        </button>
                      )}
                      <button
                        onClick={() => handleApprove(app.id)}
                        className="px-4 py-4 text-sm font-semibold text-dark transition hover:bg-gray-200 flex gap-2 border-l border-gray-300"
                      >
                        <svg class="w-6 h-6 text-gray" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeLinecap="round" stroke-linejoin="round" strokeWidth="2" d="M9.83892 12.4543s1.24988-3.08822-.21626-5.29004C8.15656 4.96245 4.58671 4.10885 4.39794 4.2436c-.18877.13476-1.11807 3.32546.34803 5.52727 1.4661 2.20183 5.09295 2.68343 5.09295 2.68343Zm0 0C10.3389 13.4543 12 15 12 18v2c0-2-.4304-3.4188 2.0696-5.9188m0 0s-.4894-2.7888 1.1206-4.35788c1.6101-1.56907 4.4903-1.54682 4.6701-1.28428.1798.26254.4317 2.84376-1.0809 4.31786-1.61 1.5691-4.7098 1.3243-4.7098 1.3243Z" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(app.id)}
                        className="px-4 py-4 text-sm font-semibold text-dark transition hover:bg-gray-200 flex gap-2 pr-10 border-l border-gray-300"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {app.hostInfo && (
                    <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">Contact:</p>
                        <p className="text-dark font-medium">{app.hostInfo.contactNumber || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">ID Type:</p>
                        <p className="text-dark font-medium">{app.hostInfo.validId?.idType || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">ID Number:</p>
                        <p className="text-dark font-medium">{app.hostInfo.validId?.idNumber || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">ID Photo:</p>
                        {app.hostInfo.validId?.imageUrl ? (
                          <a href={app.hostInfo.validId.imageUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 transition hover:text-primary/80">View file</a>
                        ) : (
                          <p className="text-dark font-medium">{app.hostInfo.validId?.fileName || "—"}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary/80">Selfie:</p>
                        {app.hostInfo.selfieWithId?.imageUrl ? (
                          <a href={app.hostInfo.selfieWithId.imageUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 transition hover:text-primary/80">View file</a>
                        ) : (
                          <p className="text-primary/60">{app.hostInfo.selfieWithId?.fileName || "—"}</p>
                        )}
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary">Address:</p>
                        <p className="text-dark font-medium">
                          {[app.hostInfo.address?.unitFloorBuilding, app.hostInfo.address?.streetAddress, app.hostInfo.address?.barangay, app.hostInfo.address?.cityMunicipality, app.hostInfo.address?.province].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {applicationsPage.hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    disabled={applicationsPage.loadingMore}
                    onClick={() => loadApplications({ append: true, cursor: applicationsPage.nextCursor })}
                    className="rounded-full border border-primary/15 bg-surface px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {applicationsPage.loadingMore ? "Loading..." : "Load more applications"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "bookings" && (
            <div className="overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-primary/10 bg-background text-xs uppercase text-primary/60">
                    <tr>
                      <th className="px-4 py-3">Renter</th>
                      <th className="px-4 py-3">Host</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10">
                    {bookings.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-primary/50">No bookings found.</td></tr>
                    )}
                    {bookings.map((b) => (
                      <tr key={b.id} className="transition hover:bg-accent/10">
                        <td className="px-4 py-3 font-semibold text-primary">{b.renterName}</td>
                        <td className="px-4 py-3 text-primary font-semibold">{b.hostName}</td>
                        <td className="px-4 py-3 text-primary font-semibold">{b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : "—"}</td>
                        <td className="px-4 py-3 text-xs text-primary font-semibold">{b.startDate} – {b.endDate}</td>
                        <td className="px-4 py-3 font-medium text-primary">₱{b.totalPrice?.toLocaleString()}</td>
                        <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-lg">
              <form onSubmit={handleSaveSettings} className="space-y-5 rounded-2xl border border-primary/15 bg-surface p-6 shadow-sm">
                <div>
                  <label className="block text-sm font-semibold text-dark">Platform Fee (%)</label>
                  <input
                    type="number"
                    name="platformFee"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={(settingsData?.platformFee || 0.15) * 100}
                    required
                    className="mt-1.5 rounded-xl border bg-white border-primary/50 bg-surface text-dark py-3 pl-11 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-accent"
                  />
                  <p className="mt-1.5 text-xs text-primary">Percentage deducted from each booking as the platform fee.</p>
                </div>
                <button type="submit" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 hover:shadow-md">
                  Save Settings
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {docViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDocViewer(null)}>
          <div className="flex w-full max-w-4xl gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-hidden rounded-2xl bg-surface p-4 shadow-2xl">
              <p className="mb-2 text-sm font-semibold text-primary/80">Government ID</p>
              <img src={docViewer.idUrl} alt="Government ID" className="w-full rounded-xl object-cover" />
            </div>
            <div className="flex-1 overflow-hidden rounded-2xl bg-surface p-4 shadow-2xl">
              <p className="mb-2 text-sm font-semibold text-primary/80">Selfie with ID</p>
              <img src={docViewer.selfieUrl} alt="Selfie with ID" className="w-full rounded-xl object-cover" />
            </div>
          </div>
          <button onClick={() => setDocViewer(null)} className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-2xl text-white backdrop-blur transition hover:bg-white/30">&times;</button>
        </div>
      )}
    </div>
  );
}
