import { initializeApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

/** Public Firebase web config (safe in the client). .env.local overrides when set. */
const FALLBACK = {
  apiKey: 'AIzaSyA56QVHzNFQjwXXgAPgCq76R-H96wkM1ao',
  authDomain: 'phoneflip-e89ce.firebaseapp.com',
  databaseURL: 'https://phoneflip-e89ce-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'phoneflip-e89ce',
  storageBucket: 'phoneflip-e89ce.firebasestorage.app',
  messagingSenderId: '150013635076',
  appId: '1:150013635076:web:5cb07041fc8eb6c77d2351',
}

function pick(env: string | undefined, fallback: string): string {
  const v = env?.trim()
  return v || fallback
}

function firebaseOptions() {
  return {
    apiKey: pick(import.meta.env.VITE_FIREBASE_API_KEY, FALLBACK.apiKey),
    authDomain: pick(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, FALLBACK.authDomain),
    databaseURL: pick(import.meta.env.VITE_FIREBASE_DATABASE_URL, FALLBACK.databaseURL).replace(
      /\/$/,
      '',
    ),
    projectId: pick(import.meta.env.VITE_FIREBASE_PROJECT_ID, FALLBACK.projectId),
    storageBucket: pick(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, FALLBACK.storageBucket),
    messagingSenderId: pick(
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      FALLBACK.messagingSenderId,
    ),
    appId: pick(import.meta.env.VITE_FIREBASE_APP_ID, FALLBACK.appId),
  }
}

export function isFirebaseConfigured(): boolean {
  const c = firebaseOptions()
  return Boolean(c.apiKey && c.projectId && c.databaseURL)
}

let db: Database | null = null

export function getSyncDatabase(): Database | null {
  if (!isFirebaseConfigured()) return null
  if (!db) {
    try {
      db = getDatabase(initializeApp(firebaseOptions()))
    } catch (err) {
      console.warn('Firebase kon niet starten; app draait lokaal.', err)
      return null
    }
  }
  return db
}
