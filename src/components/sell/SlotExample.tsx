import type { ListingSlotId } from '../../data/listingSlots'

const wrap = 'mx-auto h-full w-full max-h-56 max-w-[9rem]'

export function SlotExample({ slot }: { slot: ListingSlotId }) {
  switch (slot) {
    case 'frontOn':
      return (
        <svg viewBox="0 0 120 200" className={wrap} aria-hidden>
          <rect x="22" y="10" width="76" height="180" rx="14" fill="#1c1917" stroke="#d6d3d1" strokeWidth="3" />
          <rect x="30" y="28" width="60" height="128" rx="4" fill="#fbbf24" />
          <circle cx="60" cy="22" r="3" fill="#57534e" />
          <rect x="48" y="168" width="24" height="4" rx="2" fill="#57534e" />
        </svg>
      )
    case 'back':
      return (
        <svg viewBox="0 0 120 200" className={wrap} aria-hidden>
          <rect x="22" y="10" width="76" height="180" rx="14" fill="#292524" stroke="#d6d3d1" strokeWidth="3" />
          <rect x="30" y="22" width="36" height="36" rx="10" fill="#1c1917" stroke="#a8a29e" strokeWidth="2" />
          <circle cx="40" cy="34" r="6" fill="#78716c" />
          <circle cx="56" cy="34" r="5" fill="#57534e" />
          <circle cx="48" cy="48" r="4" fill="#44403c" />
          <circle cx="60" cy="100" r="10" stroke="#78716c" strokeWidth="2" fill="none" />
        </svg>
      )
    case 'left':
      return <SideExample flip={false} />
    case 'right':
      return <SideExample flip />
    case 'bottom':
      return (
        <svg viewBox="0 0 160 90" className="mx-auto h-full w-full max-h-40 max-w-[14rem]" aria-hidden>
          <rect x="20" y="28" width="120" height="36" rx="8" fill="#1c1917" stroke="#d6d3d1" strokeWidth="3" />
          <rect x="68" y="38" width="24" height="16" rx="3" fill="#0c0a09" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="48" cy="46" r="4" fill="#44403c" />
          <circle cx="112" cy="46" r="4" fill="#44403c" />
        </svg>
      )
    case 'battery':
      return (
        <svg viewBox="0 0 140 180" className={wrap} aria-hidden>
          <rect x="12" y="8" width="116" height="164" rx="12" fill="#1c1917" stroke="#a8a29e" strokeWidth="2" />
          <text x="24" y="36" fill="#a8a29e" fontSize="9" fontFamily="sans-serif">
            Batterij
          </text>
          <rect x="24" y="48" width="92" height="18" rx="4" fill="#292524" />
          <rect x="26" y="50" width="70" height="14" rx="3" fill="#34d399" />
          <text x="24" y="90" fill="#e7e5e4" fontSize="11" fontFamily="sans-serif">
            Batterijconditie
          </text>
          <text x="24" y="112" fill="#fbbf24" fontSize="22" fontFamily="sans-serif" fontWeight="600">
            87%
          </text>
        </svg>
      )
    case 'damage':
      return (
        <svg viewBox="0 0 120 200" className={wrap} aria-hidden>
          <rect x="22" y="10" width="76" height="180" rx="14" fill="#1c1917" stroke="#d6d3d1" strokeWidth="3" />
          <rect x="30" y="28" width="60" height="128" rx="4" fill="#292524" />
          <circle cx="78" cy="58" r="22" fill="none" stroke="#fbbf24" strokeWidth="3" />
          <path d="M70 50 L86 66 M86 50 L70 66" stroke="#f87171" strokeWidth="3" />
        </svg>
      )
  }
}

function SideExample({ flip }: { flip: boolean }) {
  return (
    <svg viewBox="0 0 80 200" className={wrap} aria-hidden>
      <g transform={flip ? 'translate(80,0) scale(-1,1)' : undefined}>
        <rect x="28" y="10" width="22" height="180" rx="8" fill="#1c1917" stroke="#d6d3d1" strokeWidth="3" />
        <rect x="32" y="36" width="6" height="28" rx="2" fill="#78716c" />
        <rect x="32" y="72" width="6" height="18" rx="2" fill="#57534e" />
        <rect x="34" y="168" width="10" height="6" rx="1" fill="#fbbf24" />
      </g>
    </svg>
  )
}
