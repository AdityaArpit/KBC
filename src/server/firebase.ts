import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0044367264',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:685468088608:web:163cad8647f59892dd7f45',
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDT4J2zi7Y2rqd2XhJeRP_R5HeKBTGN7gQ',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0044367264.firebaseapp.com',
  firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-kbceventcommandc-58ed9730-1b55-42e6-9e68-2f2527ca92f2',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0044367264.firebasestorage.app',
};

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    firebaseConfig = { ...firebaseConfig, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed reading firebase-applet-config.json on server', err);
  }
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const serverDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export { firebaseConfig };
