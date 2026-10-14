import { IconRoad, IconCornerUpRight } from "@tabler/icons-react"
import type { LegRoute } from "@/lib/directions"
import type { Leg } from "@/lib/types"

/**
 * The full instructions for one leg: numbered steps (where to stand, what to say, where to drop,
 * what to pay), then the roads the vehicle takes, or turn-by-turn directions when walking.
 */
export function LegDetails({ leg, route, inverted = false }: { leg: Leg; route?: LegRoute; inverted?: boolean }) {
  const muted = inverted ? "text-white/85" : "text-ink/70"
  const faint = inverted ? "text-white/65" : "text-ink/50"
  const number = inverted ? "bg-white/20 text-white" : "bg-ink/[0.07] text-ink/70"
  const turns = leg.mode === "walk" ? (route?.turns ?? []) : []
  // Keke and okada use side streets the router doesn't know about, so only list roads for buses and cabs.
  const roads = leg.mode === "bus" || leg.mode === "taxi" || leg.mode === "ride" ? (route?.roads ?? []) : []

  return (
    <div className="mt-2 flex flex-col gap-2.5">
      <ol className="flex flex-col gap-1.5">
        {leg.details.map((d, i) => (
          <li key={i} className={`flex gap-2 text-[13px] leading-snug ${muted}`}>
            <span className={`mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${number}`}>
              {i + 1}
            </span>
            <span>{d}</span>
          </li>
        ))}
      </ol>

      {roads.length > 0 && (
        <p className={`flex gap-1.5 text-xs leading-snug ${faint}`}>
          <IconRoad size={14} className="mt-px shrink-0" />
          <span>
            <b className="font-semibold">Route:</b> {roads.join(" › ")}
          </span>
        </p>
      )}

      {turns.length > 0 && (
        <div>
          <p className={`mb-1 flex items-center gap-1.5 text-xs font-semibold ${faint}`}>
            <IconCornerUpRight size={14} /> Turn by turn
          </p>
          <ol className={`flex flex-col gap-1 border-l-2 pl-3 text-xs leading-snug ${inverted ? "border-white/30" : "border-line"} ${muted}`}>
            {turns.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
