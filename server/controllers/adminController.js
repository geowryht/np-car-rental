import { db } from "../config/firebase.js";
import { FieldPath } from "firebase-admin/firestore";
import AppError from "../utils/AppError.js";
import { destroyImage, extractPublicId } from "../services/cloudinaryAdmin.js";

const SETTINGS_DOC = "settings/platform";

export const getStats = async (req, res, next) => {
  try {
    const [usersSnap, vehiclesSnap, bookingsSnap, settingsDoc] = await Promise.all([
      db.collection("users").get(),
      db.collection("vehicles").get(),
      db.collection("bookings").get(),
      db.collection(SETTINGS_DOC).get(),
    ]);

    let totalRevenue = 0;
    bookingsSnap.docs.forEach((d) => {
      const b = d.data();
      if (b.status === "confirmed" || b.status === "returned") {
        totalRevenue += b.totalPrice || 0;
      }
    });

    const settings = settingsDoc.exists ? settingsDoc.data() : { platformFee: 0.15 };

    const roles = { renter: 0, host: 0, admin: 0 };
    const bookingStatuses = {};
    usersSnap.docs.forEach((d) => {
      const r = d.data().role || "renter";
      if (roles[r] !== undefined) roles[r]++;
    });
    bookingsSnap.docs.forEach((d) => {
      const s = d.data().status || "unknown";
      bookingStatuses[s] = (bookingStatuses[s] || 0) + 1;
    });

    const hostMap = {};
    usersSnap.docs.forEach((d) => { hostMap[d.id] = { fullName: d.data().fullName || "Unknown" }; });

    res.json({
      totalUsers: usersSnap.size,
      totalVehicles: vehiclesSnap.size,
      totalBookings: bookingsSnap.size,
      totalRevenue,
      roles,
      bookingStatuses,
      settings,
      vehicles: vehiclesSnap.docs.slice(0, 10).map((d) => ({
        id: d.id,
        ...d.data(),
        host: hostMap[d.data().hostId] || null,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const snap = await db.collection("users").get();
    let users = snap.docs.map((d) => {
      const { password, ...data } = d.data();
      return { id: d.id, ...data };
    });

    if (search) {
      const q = search.toLowerCase();
      users = users.filter((u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (role) {
      users = users.filter((u) => u.role === role);
    }

    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["renter", "host"].includes(role)) {
      throw new AppError("Role must be 'renter' or 'host'", 400);
    }

    const ref = db.collection("users").doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError("User not found", 404);

    const updates = { role };
    if (role === "renter") {
      updates["hostInfo.status"] = null;
    }
    await ref.update(updates);
    res.json({ message: `User role updated to ${role}` });
  } catch (err) {
    next(err);
  }
};

export const getHostApplications = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
    let query = db.collection("users")
      .where("hostInfo.status", "==", "pending")
      .orderBy(FieldPath.documentId());

    if (cursor) query = query.startAfter(cursor);

    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs.slice(0, limit);

    const apps = docs.map((d) => {
      const { password, ...data } = d.data();
      return { id: d.id, ...data };
    });

    res.json({
      applications: apps,
      nextCursor: snap.docs.length > limit ? docs[docs.length - 1]?.id || null : null,
      hasMore: snap.docs.length > limit,
    });
  } catch (err) {
    next(err);
  }
};

export const approveHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ref = db.collection("users").doc(id);

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new AppError("User not found", 404);

      const data = doc.data();
      if (data.hostInfo?.status !== "pending") {
        throw new AppError("No pending host application", 400);
      }

      tx.update(ref, {
        role: "host",
        "hostInfo.status": "approved",
        "hostInfo.reviewedAt": new Date(),
        "hostInfo.reviewedBy": req.user.uid,
      });
    });

    res.json({ message: "Host application approved" });
  } catch (err) {
    next(err);
  }
};

export const rejectHost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ref = db.collection("users").doc(id);
    let data;

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new AppError("User not found", 404);

      data = doc.data();
      if (data.hostInfo?.status !== "pending") {
        throw new AppError("No pending host application", 400);
      }

      tx.update(ref, {
        "hostInfo.status": "rejected",
        "hostInfo.reviewedAt": new Date(),
        "hostInfo.reviewedBy": req.user.uid,
      });
    });

    const imageUrls = [
      data.hostInfo?.validId?.imageUrl,
      data.hostInfo?.selfieWithId?.imageUrl,
    ].filter(Boolean);
    const imageUrlSet = new Set(imageUrls);
    const imageRecordRefs = [];
    const publicIds = new Set(imageUrls.map((url) => extractPublicId(url)).filter(Boolean));
    const storedRecordIds = Object.values(data.hostInfo?.imageRecordIds || {}).filter(Boolean);

    if (storedRecordIds.length > 0) {
      const storedRecordRefs = storedRecordIds.map((recordId) => db.collection("imageRecords").doc(recordId));
      const storedRecordDocs = await db.getAll(...storedRecordRefs);
      storedRecordDocs.forEach((recordDoc) => {
        if (!recordDoc.exists) return;
        const record = recordDoc.data();
        if (record.userId !== id) return;
        if (record.publicId) publicIds.add(record.publicId);
        imageRecordRefs.push(recordDoc.ref);
      });
    }

    if (imageUrls.length > 0) {
      const recordsSnap = await db.collection("imageRecords").where("userId", "==", id).get();
      recordsSnap.docs.forEach((recordDoc) => {
        const record = recordDoc.data();
        if (!imageUrlSet.has(record.imageUrl)) return;
        if (record.publicId) publicIds.add(record.publicId);
        imageRecordRefs.push(recordDoc.ref);
      });
    }

    await Promise.allSettled([...publicIds].map((publicId) => destroyImage(publicId)));

    const uniqueRecordRefs = [...new Map(imageRecordRefs.map((recordRef) => [recordRef.path, recordRef])).values()];
    if (uniqueRecordRefs.length > 0) {
      const batch = db.batch();
      uniqueRecordRefs.forEach((recordRef) => batch.delete(recordRef));
      await batch.commit();
    }

    res.json({ message: "Host application rejected" });
  } catch (err) {
    next(err);
  }
};

export const getAllVehicles = async (req, res, next) => {
  try {
    const snap = await db.collection("vehicles").get();
    const vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const hostIds = [...new Set(vehicles.map((v) => v.hostId).filter(Boolean))];
    if (hostIds.length > 0) {
      const refs = hostIds.map((id) => db.collection("users").doc(id));
      const hostDocs = await db.getAll(...refs);
      const hostMap = {};
      hostDocs.forEach((doc) => {
        if (doc.exists) {
          hostMap[doc.id] = {
            fullName: doc.data().fullName || "Unknown",
            email: doc.data().email || "",
          };
        }
      });
      vehicles.forEach((v) => {
        v.host = hostMap[v.hostId] || null;
      });
    }

    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const ref = db.collection("vehicles").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) throw new AppError("Vehicle not found", 404);

    const data = doc.data();
    if (data.images?.length) {
      await Promise.allSettled(data.images.map((url) => destroyImage(extractPublicId(url))));
    }

    await ref.delete();
    res.json({ message: "Vehicle deleted" });
  } catch (err) {
    next(err);
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const snap = await db.collection("bookings")
      .orderBy("createdAt", "desc")
      .get();

    const bookings = await Promise.all(snap.docs.map(async (d) => {
      const b = { id: d.id, ...d.data() };

      const [renterDoc, hostDoc, vehicleDoc] = await Promise.all([
        db.collection("users").doc(b.renterId).get(),
        db.collection("users").doc(b.hostId).get(),
        db.collection("vehicles").doc(b.vehicleId).get(),
      ]);

      b.renterName = renterDoc.exists ? (renterDoc.data().fullName || "Unknown") : "Unknown";
      b.hostName = hostDoc.exists ? (hostDoc.data().fullName || "Unknown") : "Unknown";
      b.vehicle = vehicleDoc.exists
        ? { id: vehicleDoc.id, brand: vehicleDoc.data().brand, model: vehicleDoc.data().model }
        : null;

      return b;
    }));

    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const doc = await db.collection(SETTINGS_DOC).get();
    res.json(doc.exists ? doc.data() : { platformFee: 0.15 });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { platformFee } = req.body;
    if (platformFee === undefined || typeof platformFee !== "number" || platformFee < 0 || platformFee > 1) {
      throw new AppError("platformFee must be a number between 0 and 1", 400);
    }

    await db.collection(SETTINGS_DOC).doc("platform").set({ platformFee }, { merge: true });
    res.json({ message: "Settings updated" });
  } catch (err) {
    next(err);
  }
};
