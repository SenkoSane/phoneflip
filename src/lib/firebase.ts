import { initializeApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_DATABASE_URL,
  )
}

let db: Database | null = null

export function getSyncDatabase(): Database | null {
  if (!isFirebaseConfigured()) return null
  if (!db) {
    try {
      const app = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      })
      db = getDatabase(app)
    } catch (err) {
      console.warn('Firebase kon niet starten; app draait lokaal.', err)
      return null
    }
  }
  return db
}
