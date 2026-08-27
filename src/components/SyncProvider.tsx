import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchCloud,
  hasUserData,
  isDemoOnly,
  isFirebaseConfigured,
  isValidSyncCode,
  makeSyncCode,
  mergeAppData,
  nestedFingerprint,
  normalizeSyncCode,
  pushCloud,
  readLocalSavedAt,
  readStoredCode,
  subscribeCloud,
  writeLocalSavedAt,
  writeStoredCode,
} from '../lib/cloudSync'
import { getSyncDatabase } from '../lib/firebase'
import { tr } from '../i18n'
import { consumeSkipCloudPush, useStore } from '../store'
import { onValue, ref } from 'firebase/database'

export type SyncStatus = 'lokaal' | 'bezig' | 'gekoppeld' | 'offline' | 'fout'

type ConnectResult = 'ok' | 'conflict' | 'error'

type SyncApi = {
  configured: boolean
  code: string | null
  status: SyncStatus
  error: string
  pendingCode: string | null
  createAndLink: () => Promise<void>
  connect: (raw: string) => Promise<ConnectResult>
  resolveConflict: (choice: 'local' | 'cloud') => Promise<void>
  cancelConflict: () => void
  disconnect: () => void
}

const SyncContext = createContext<SyncApi | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const dataRef = useRef(store.data)
  dataRef.current = store.data
  const applyRemoteRef = useRef(store.applyRemote)
  applyRemoteRef.current = store.applyRemote

  const [code, setCode] = useState<string | null>(() => readStoredCode())
  const [status, setStatus] = useState<SyncStatus>(() =>
    isFirebaseConfigured() && readStoredCode() ? 'bezig' : 'lokaal',
  )
  const [error, setError] = useState('')
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  const [fbOnline, setFbOnline] = useState(true)
  const [hydrated, setHydrated] = useState(() => !readStoredCode())
  const timerRef = useRef<number>(0)
  const statusRef = useRef(status)
  statusRef.current = status

  const configured = isFirebaseConfigured()

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = 0
  }

  useEffect(() => {
    if (!configured) return
    try {
      const db = getSyncDatabase()
      if (!db) return
      return onValue(ref(db, '.info/connected'), (snap) => {
        setFbOnline(snap.val() === true)
      })
    } catch (err) {
      console.warn('Firebase verbinding mislukt; app draait lokaal.', err)
    }
  }, [configured])

  useEffect(() => {
    if (!configured || !code) {
      setHydrated(true)
      return
    }
    let firstSnap = true
    setHydrated(false)
    setStatus('bezig')
    setError('')
    const stop = subscribeCloud(
      code,
      (blob) => {
        if (blob) {
          const merged = mergeAppData(dataRef.current, blob.data)
          writeLocalSavedAt(Math.max(blob.savedAt, readLocalSavedAt()))
          applyRemoteRef.current(merged)
          if (nestedFingerprint(merged) !== nestedFingerprint(blob.data)) {
            const savedAt = Date.now()
            writeLocalSavedAt(savedAt)
            void pushCloud(code, merged, savedAt).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : tr('sync.err.upload'))
              setStatus('fout')
            })
          }
        } else if (hasUserData(dataRef.current)) {
          const savedAt = Date.now()
          writeLocalSavedAt(savedAt)
          void pushCloud(code, dataRef.current, savedAt).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : tr('sync.err.upload'))
            setStatus('fout')
          })
        }
        setHydrated(true)
        if (firstSnap || statusRef.current === 'bezig') {
          setStatus((s) => (s === 'fout' ? s : 'gekoppeld'))
        }
        firstSnap = false
      },
      (message) => {
        setError(message)
        setStatus('fout')
        setHydrated(true)
      },
    )
    return stop
  }, [code, configured])

  useEffect(() => {
    if (!configured || !code || !hydrated) return
    if (consumeSkipCloudPush()) return
    if (isDemoOnly(dataRef.current)) return
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      const savedAt = Date.now()
      writeLocalSavedAt(savedAt)
      void pushCloud(code, dataRef.current, savedAt).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : tr('sync.err.upload'))
        setStatus('fout')
      })
    }, 700)
    return clearTimer
  }, [code, configured, store.data, hydrated])

  const createAndLink = useCallback(async () => {
    if (!configured) return
    const next = makeSyncCode()
    const savedAt = Date.now()
    setStatus('bezig')
    setError('')
    try {
      await pushCloud(next, dataRef.current, savedAt)
      writeStoredCode(next)
      setCode(next)
      setPendingCode(null)
      setHydrated(true)
      setStatus('gekoppeld')
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('sync.err.link'))
      setStatus('fout')
    }
  }, [configured])

  const connect = useCallback(async (raw: string): Promise<ConnectResult> => {
    if (!configured) return 'error'
    const next = normalizeSyncCode(raw)
    if (!isValidSyncCode(next)) {
      setError(tr('sync.err.code'))
      setStatus('fout')
      return 'error'
    }
    setStatus('bezig')
    setError('')
    try {
      const remote = await fetchCloud(next)
      const local = dataRef.current
      if (!remote) {
        if (hasUserData(local) || isDemoOnly(local)) {
          const savedAt = Date.now()
          await pushCloud(next, local, savedAt)
        }
        writeStoredCode(next)
        setCode(next)
        setPendingCode(null)
        setHydrated(true)
        setStatus('gekoppeld')
        return 'ok'
      }
      if (!hasUserData(local) || isDemoOnly(local)) {
        writeLocalSavedAt(remote.savedAt)
        applyRemoteRef.current(remote.data)
        writeStoredCode(next)
        setCode(next)
        setPendingCode(null)
        setHydrated(true)
        setStatus('gekoppeld')
        return 'ok'
      }
      const merged = mergeAppData(local, remote.data)
      applyRemoteRef.current(merged)
      const savedAt = Date.now()
      await pushCloud(next, merged, savedAt)
      writeStoredCode(next)
      setCode(next)
      setPendingCode(null)
      setHydrated(true)
      setStatus('gekoppeld')
      return 'ok'
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('sync.err.link'))
      setStatus('fout')
      return 'error'
    }
  }, [configured])

  const resolveConflict = useCallback(async (choice: 'local' | 'cloud') => {
    if (!pendingCode) return
    setStatus('bezig')
    try {
      if (choice === 'cloud') {
        const remote = await fetchCloud(pendingCode)
        if (remote) {
          writeLocalSavedAt(remote.savedAt)
          applyRemoteRef.current(remote.data)
        }
      } else {
        const savedAt = Date.now()
        await pushCloud(pendingCode, dataRef.current, savedAt)
      }
      writeStoredCode(pendingCode)
      setCode(pendingCode)
      setPendingCode(null)
      setStatus('gekoppeld')
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('sync.err.link'))
      setStatus('fout')
    }
  }, [pendingCode])

  const disconnect = useCallback(() => {
    clearTimer()
    writeStoredCode(null)
    setCode(null)
    setPendingCode(null)
    setError('')
    setStatus('lokaal')
  }, [])

  const shownStatus: SyncStatus = !code
    ? 'lokaal'
    : status === 'bezig' || status === 'fout'
      ? status
      : !fbOnline
        ? 'offline'
        : status

  const api = useMemo<SyncApi>(
    () => ({
      configured,
      code,
      status: shownStatus,
      error,
      pendingCode,
      createAndLink,
      connect,
      resolveConflict,
      cancelConflict: () => {
        setPendingCode(null)
        setStatus(code ? 'gekoppeld' : 'lokaal')
      },
      disconnect,
    }),
    [
      code,
      configured,
      connect,
      createAndLink,
      disconnect,
      error,
      pendingCode,
      resolveConflict,
      shownStatus,
    ],
  )

  return <SyncContext.Provider value={api}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync moet binnen SyncProvider')
  return ctx
}
