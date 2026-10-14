import { IconBus, IconCar, IconMoped, IconMotorbike, IconWalk, IconCarSuv } from "@tabler/icons-react"
import type { TransportMode } from "@/lib/types"
import { MODE_META } from "@/lib/format"

const ICONS = {
  walk: IconWalk,
  bus: IconBus,
  taxi: IconCar,
  keke: IconMoped,
  okada: IconMotorbike,
  ride: IconCarSuv,
} as const

export function ModeIcon({ mode, size = 18, className }: { mode: TransportMode; size?: number; className?: string }) {
  const Icon = ICONS[mode]
  return <Icon size={size} stroke={2} className={className} aria-hidden />
}

/** Coloured round badge used in timelines and route summaries. */
export function ModeBadge({ mode, size = 32 }: { mode: TransportMode; size?: number }) {
  const meta = MODE_META[mode]
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: meta.soft, color: meta.color }}
      title={meta.label}
    >
      <ModeIcon mode={mode} size={Math.round(size * 0.55)} />
    </span>
  )
}

/** Compact pill: icon + label, used in the route option cards. */
export function ModePill({ mode }: { mode: TransportMode }) {
  const meta = MODE_META[mode]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: meta.soft, color: meta.color }}
    >
      <ModeIcon mode={mode} size={13} />
      {meta.label}
    </span>
  )
}
