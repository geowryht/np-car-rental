import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccount = process.env.FIREBASE_PRIVATE_KEY
    ? {
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }
    : JSON.parse(readFileSync(resolve(__dirname, "serviceAccountKey.json"), "utf-8"));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

export const db = admin.firestore();
export const auth = admin.auth();