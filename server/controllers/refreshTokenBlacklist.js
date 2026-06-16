import { db } from "../config/firebase.js";

const COLLECTION = "usedJtis";

export async function markUsed(jti, userId) {
  await db.collection(COLLECTION).doc(jti).set({
    userId,
    createdAt: new Date(),
  });
}

export async function isUsed(jti) {
  const doc = await db.collection(COLLECTION).doc(jti).get();
  return doc.exists;
}
