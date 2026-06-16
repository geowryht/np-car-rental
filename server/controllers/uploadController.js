import { db } from "../config/firebase.js";
import { destroyImage } from "../services/cloudinaryAdmin.js";
import AppError from "../utils/AppError.js";

const STALE_HOURS = 2;

export const recordUpload = async (req, res, next) => {
  try {
    const { publicId, imageUrl, imageType } = req.body;

    if (!publicId || !imageUrl || !imageType) {
      throw new AppError("Missing required fields: publicId, imageUrl, imageType", 400);
    }

    if (!["validId", "selfieWithId"].includes(imageType)) {
      throw new AppError("imageType must be 'validId' or 'selfieWithId'", 400);
    }

    const ref = db.collection("imageRecords").doc();
    await ref.set({
      userId: req.user.uid,
      publicId,
      imageUrl,
      imageType,
      status: "temporary",
      uploadedAt: new Date(),
      hostApplicationId: null,
    });

    res.json({ recordId: ref.id });
  } catch (err) {
    next(err);
  }
};

export async function cleanupStaleUploads() {
  try {
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
    const snap = await db
      .collection("imageRecords")
      .where("status", "==", "temporary")
      .where("uploadedAt", "<", cutoff)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    let deleted = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      try {
        await destroyImage(data.publicId);
      } catch {
      }
      batch.delete(doc.ref);
      deleted++;
    }

    await batch.commit();
    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} stale image record(s)`);
    }
  } catch {
  }
}

export async function cleanupTemporaryUploadsForUser(userId, recordIds = []) {
  const uniqueIds = [...new Set(recordIds.filter(Boolean))];
  if (!userId || uniqueIds.length === 0) return 0;

  const refs = uniqueIds.map((recordId) => db.collection("imageRecords").doc(recordId));
  const docs = await db.getAll(...refs);
  const batch = db.batch();
  let deleted = 0;

  for (const doc of docs) {
    if (!doc.exists) continue;

    const data = doc.data();
    if (data.userId !== userId || data.status !== "temporary") continue;

    try {
      await destroyImage(data.publicId);
    } catch {
    }

    batch.delete(doc.ref);
    deleted++;
  }

  if (deleted > 0) {
    await batch.commit();
  }

  return deleted;
}
