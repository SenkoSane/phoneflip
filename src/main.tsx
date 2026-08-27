import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { AppLock } from './components/AppLock'
import { I18nProvider } from './i18n'
import './index.css'

const App = lazy(() => import('./App'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AppLock>
        <AppErrorBoundary>
          <Suspense fallback={<div className="min-h-svh bg-stone-950" />}>
            <App />
          </Suspense>
        </AppErrorBoundary>
      </AppLock>
    </I18nProvider>
  </StrictMode>,
)
