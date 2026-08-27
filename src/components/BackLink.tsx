import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'

export function useSmartBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) navigate(-1)
    else navigate(fallback)
  }
}

export function BackLink({ fallback }: { fallback: string }) {
  const t = useT()
  const goBack = useSmartBack(fallback)
  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200"
    >
      ← {t('common.back')}
    </button>
  )
}
