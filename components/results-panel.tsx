"use client"

import { IconArrowLeft, IconArrowRight, IconInfoCircle, IconNavigation } from "@tabler/icons-react"
import { useAppStore } from "@/lib/store"
import { distanceText, duration, fareText, MODE_META } from "@/lib/format"
import { ModeBadge, ModeIcon } from "@/components/mode-icon"
import type { Journey } from "@/lib/types"

function ModeChain({ journey }: { journey: Journey }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {journey.legs.map((l, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-ink/30">›</span>}
          <span
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ background: MODE_META[l.mode].soft, color: MODE_META[l.mode].color }}
          >
            <ModeIcon mode={l.mode} size={13} />
            {l.mode === "walk" ? distanceText(l.distance) : MODE_META[l.mode].label}
          </span>
        </span>
      ))}
    </div>
  )
}

function OptionCard({ journey, active, onClick }: { journey: Journey; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-2xl border p-3.5 text-left transition ${
        active ? "border-ink bg-white shadow-[0_6px_20px_rgba(18,20,15,0.10)]" : "border-line bg-white hover:border-ink/40 hover:bg-paper"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              active ? "bg-brand text-green-dark" : "bg-paper text-ink/60"
            }`}
          >
            {journey.label}
          </span>
          <div className="mt-1.5 text-xl font-bold tracking-tight text-ink">{duration(journey.time)}</div>
          {journey.also?.length ? (
            <div className="text-[11px] font-medium text-ink/50">Also the {journey.also.join(" & ")}</div>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="whitespace-nowrap text-[15px] font-bold text-ink">{fareText(journey.fare)}</div>
          <div className="text-[11px] text-ink/50">
            {journey.transfers === 0 ? "No changes" : `${journey.transfers} change${journey.transfers > 1 ? "s" : ""}`}
            {journey.walk > 0 ? ` · ${distanceText(journey.walk)} walk` : ""}
          </div>
        </div>
      </div>
      <div className="mt-2.5">
        <ModeChain journey={journey} />
      </div>
    </button>
  )
}

export function Timeline({ journey, current }: { journey: Journey; current?: number }) {
  return (
    <ol className="relative">
      {journey.legs.map((l, i) => {
        const meta = MODE_META[l.mode]
        const done = current !== undefined && i < current
        const isCurrent = current === i
        return (
          <li key={i} className={`relative flex gap-3 pb-5 last:pb-0 ${done ? "opacity-45" : ""}`}>
            {i < journey.legs.length - 1 && (
              <span
                className="absolute left-[15px] top-9 bottom-1 w-[3px] rounded-full"
                style={{
                  background: l.mode === "walk" ? `repeating-linear-gradient(${meta.color} 0 4px, transparent 4px 8px)` : meta.color,
                  opacity: 0.55,
                }}
              />
            )}
            <ModeBadge mode={l.mode} />
            <div className={`min-w-0 flex-1 ${isCurrent ? "rounded-xl bg-brand/25 p-2 -m-2 mb-0" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{l.text}</h3>
              </div>
              {l.tip && <p className="mt-1 text-xs leading-relaxed text-ink/60">{l.tip}</p>}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium text-ink/55">
                <span>{duration(l.time)}</span>
                {l.distance > 0 && <span>{distanceText(l.distance)}</span>}
                {l.fare && <span className="font-semibold text-ink/80">{fareText(l.fare)}</span>}
                {l.corridor && <span className="truncate">{l.corridor}</span>}
              </div>
            </div>
          </li>
        )
      })}
      <li className="relative mt-5 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" />
          </svg>
        </span>
        <span className="min-w-0 truncate text-sm font-semibold text-ink">{journey.destination.name}</span>
      </li>
    </ol>
  )
}

export function ResultsPanel() {
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const setSelected = useAppStore((s) => s.setSelected)
  const setPanel = useAppStore((s) => s.setPanel)
  const startTrip = useAppStore((s) => s.startTrip)

  const journey = routes[selected]
  if (!journey) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => setPanel("planner")}
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ink hover:text-white"
          aria-label="Edit trip"
        >
          <IconArrowLeft size={20} />
        </button>
        <div className="min-w-0 pt-1">
          <div className="truncate text-sm font-semibold text-ink">{journey.origin.name}</div>
          <div className="flex items-center gap-1 truncate text-sm text-ink/60">
            <IconArrowRight size={14} className="shrink-0" />
            <span className="truncate">{journey.destination.name}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {routes.map((r, i) => (
          <OptionCard key={r.id} journey={r} active={i === selected} onClick={() => setSelected(i)} />
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink/45">Step by step</h2>
        <Timeline journey={journey} />
      </section>

      <p className="flex gap-2 text-[11px] leading-relaxed text-ink/55">
        <IconInfoCircle size={15} className="mt-px shrink-0" />
        Fares are estimates based on 2026 Abuja commuter reports and change with fuel prices. Agree the price with
        the driver before you enter.
      </p>

      <div className="sticky bottom-0 -mx-5 -mb-5 bg-gradient-to-t from-white via-white to-white/0 px-5 pb-5 pt-3">
        <button
          type="button"
          onClick={startTrip}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(18,20,15,0.18)] hover:bg-black"
        >
          <IconNavigation size={18} className="text-brand" />
          Start trip
        </button>
      </div>
    </div>
  )
}
