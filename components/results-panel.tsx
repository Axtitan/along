"use client"

import { useMemo } from "react"
import { useAppStore } from "@/lib/store"
import { money, modeIcon, modeLabel } from "@/lib/format"
import type { Journey } from "@/lib/types"

function RouteTabs() {
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const setSelected = useAppStore((s) => s.setSelected)

  return (
    <div className="route-tabs flex gap-1 overflow-x-auto">
      {routes.map((r, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setSelected(i)}
          className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-left text-xs transition-all ${
            i === selected
              ? "bg-ink font-bold text-white shadow-md"
              : "bg-white font-bold text-ink hover:bg-[#ececea]"
          }`}
        >
          <div>{r.label}</div>
          <div className="text-[10px] opacity-70">
            {r.time} min · {money(r.fare[0])}+
          </div>
        </button>
      ))}
    </div>
  )
}

function Timeline({ journey }: { journey: Journey }) {
  return (
    <div className="timeline mt-4">
      {journey.legs.map((l, i) => (
        <div key={i} className={`leg flex gap-3 py-3 ${l.mode !== "walk" ? "transport" : ""}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm">
            {modeIcon(l.mode)}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold">
              {modeLabel(l.mode)} · {l.from} &rarr; {l.to}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{l.text}</p>
            {l.fare && (
              <p className="mt-1 text-xs font-bold text-violet">
                Approx. {money(l.fare[0])}–{money(l.fare[1])}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResultsPanel() {
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const panel = useAppStore((s) => s.panel)
  const setPanel = useAppStore((s) => s.setPanel)

  const journey = routes[selected]
  const title = journey ? `${journey.origin.name} to ${journey.destination.name}` : ""

  const summaryHtml = useMemo(() => {
    if (!journey) return null
    return (
      <>
        <div className="summary-card rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="metrics grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-sm font-extrabold">{journey.time} min</div>
              <div className="text-[10px] text-muted-foreground">Total time</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-extrabold">
                {money(journey.fare[0])}–{money(journey.fare[1])}
              </div>
              <div className="text-[10px] text-muted-foreground">Fare range</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-extrabold">{journey.transfers}</div>
              <div className="text-[10px] text-muted-foreground">Transfers</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-extrabold">{journey.walk}m</div>
              <div className="text-[10px] text-muted-foreground">Walking</div>
            </div>
          </div>
          <div className="mt-3 text-center text-xs font-bold">
            {journey.modes.map(modeLabel).join(" \u2192 ")}
          </div>
          <div className="mt-2 text-center text-[10px] text-muted-foreground">
            &#9679; {journey.confidence} confidence · prototype
          </div>
        </div>

        <Timeline journey={journey} />

        <p className="fare-note mt-3 text-[10px] text-muted-foreground">
          Fares and route availability can vary. Confirm with the driver before entering.
        </p>

        <button
          type="button"
          onClick={() => setPanel("navigation")}
          className="primary-btn mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-[#2a2b2a]"
        >
          Start navigation <span>&rarr;</span>
        </button>
      </>
    )
  }, [journey, setPanel])

  if (panel !== "results") return null

  return (
    <section className="results-panel" id="resultsPanel">
      <div className="results-head flex items-start justify-between">
        <div>
          <div className="eyebrow text-[10px] font-bold tracking-widest text-muted-foreground">
            YOUR ROUTES
          </div>
          <h2 className="mt-1 text-xl font-extrabold">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setPanel("planner")}
          className="text-btn text-xs font-bold text-violet hover:underline"
        >
          Edit trip
        </button>
      </div>

      <div className="mt-4">
        <RouteTabs />
      </div>

      <div id="routeSummary">{summaryHtml}</div>
    </section>
  )
}
