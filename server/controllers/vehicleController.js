import { db } from "../config/firebase.js";
import AppError from "../utils/AppError.js";
import { destroyImage, extractPublicId } from "../services/cloudinaryAdmin.js";
import { rememberMissingVehicleId } from "../middleware/firestoreIdProtection.js";

export const createVehicle = async (req, res, next) => {
  try {
    const { brand, model, year, transmission, seatingCapacity, fuelType, plateNumber, pricePerDay, description, images } = req.body;
    const ref = db.collection("vehicles").doc();
    await ref.set({
      hostId: req.user.uid,
      brand, model, year, transmission, seatingCapacity, fuelType, plateNumber, pricePerDay: Number(pricePerDay), description,
      images: images || [],
      status: "available",
      createdAt: new Date(),
    });
    res.status(201).json({ id: ref.id, message: "Vehicle listed" });
  } catch (err) {
    next(err);
  }
};

export const getAllVehicles = async (req, res, next) => {
  try {
    const snap = await db.collection("vehicles").where("status", "==", "available").get();
    const vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const hostIds = [...new Set(vehicles.map((v) => v.hostId).filter(Boolean))];
    if (hostIds.length > 0) {
      const refs = hostIds.map((id) => db.collection("users").doc(id));
      const hostDocs = await db.getAll(...refs);
      const hostMap = {};
      hostDocs.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data();
          hostMap[doc.id] = data.hostInfo?.address || data.address || null;
        }
      });
      vehicles.forEach((v) => {
        v.hostAddress = hostMap[v.hostId] || null;
      });
    }

    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

export const getMyVehicles = async (req, res, next) => {
  try {
    const snap = await db.collection("vehicles").where("hostId", "==", req.user.uid).get();
    const vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

export const updateVehicle = async (req, res, next) => {
  try {
    console.log("[updateVehicle] params.id:", req?.params?.id);
    console.log("[updateVehicle] user:", req?.user?.uid);
    console.log("[updateVehicle] body keys:", Object.keys(req?.body || {}));
    const ref = db.collection("vehicles").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new AppError("Vehicle not found", 404);
    }

    if (doc.data().hostId !== req.user.uid) {
      throw new AppError("You can only edit your own vehicles", 403);
    }

    const { brand, model, year, transmission, seatingCapacity, fuelType, plateNumber, pricePerDay, description, status, images } = req.body;
    const updates = {
      brand, model, year, transmission, seatingCapacity,
      fuelType, plateNumber, pricePerDay: Number(pricePerDay), description, status,
      images, updatedAt: new Date(),
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined || updates[key] === "") {
        delete updates[key];
      }
    });

    await ref.update(updates);
    res.json({ message: "Vehicle updated" });
  } catch (err) {
    next(err);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const ref = db.collection("vehicles").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new AppError("Vehicle not found", 404);
    }

    if (doc.data().hostId !== req.user.uid) {
      throw new AppError("You can only delete your own vehicles", 403);
    }

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

export const getVehicleById = async (req, res, next) => {
  try {
    const doc = await db.collection("vehicles").doc(req.params.id).get();

    if (!doc.exists) {
      rememberMissingVehicleId(req.params.id);
      return next(new AppError("Vehicle not found", 404));
    }

    const vehicle = { id: doc.id, ...doc.data() };

    if (vehicle.hostId) {
      const hostDoc = await db.collection("users").doc(vehicle.hostId).get();
      if (hostDoc.exists) {
        const data = hostDoc.data();
        vehicle.hostAddress = data.hostInfo?.address || data.address || null;
      }
    }

    res.json(vehicle);
  }
  catch (err) {
    next(err);
  }
};
