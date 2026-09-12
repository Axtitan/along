"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { geocode } from "@/lib/geocode"
import { localMatch, HUBS } from "@/lib/network"
import { km, nearestHub, buildJourney } from "@/lib/router"
import { QUICK_TRIPS } from "@/lib/format"
import type { GeoPoint, GeocodeResult } from "@/lib/types"

function SearchInput({
  label,
  dot,
  dotClass,
  value: controlledValue,
  onChange,
  onPick,
  onSelect,
  placeholder,
}: {
  label: string
  dot: string
  dotClass?: string
  value: string
  onChange: (v: string) => void
  onPick: () => void
  onSelect: (point: GeoPoint) => void
  placeholder: string
}) {
  const [results, setResults] = useState<(GeocodeResult & { type: string })[]>([])
  const [showResults, setShowResults] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleInput = useCallback(
    (val: string) => {
      onChange(val)
      if (timerRef.current) clearTimeout(timerRef.current)

      const local = localMatch(val)
      setResults(local)
      setShowResults(local.length > 0)

      if (val.trim().length < 3) return

      timerRef.current = setTimeout(async () => {
        try {
          const remote = await geocode(val)
          const merged = [...local, ...remote].slice(0, 6)
          setResults(merged)
          setShowResults(merged.length > 0)
        } catch {
          // offline fallback — keep local results
        }
      }, 900)
    },
    [onChange],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleSelect = (item: GeocodeResult) => {
    onSelect({ name: item.name, lat: item.lat, lng: item.lng, type: item.type })
    onChange(item.name)
    setShowResults(false)
  }

  return (
    <div className="relative">
      <div className="location-row grid items-center gap-1">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass || "bg-ink"}`}>
          {dot === "diamond" && (
            <span className="block text-center text-xs text-violet">&#9670;</span>
          )}
        </span>
        <span className="text-xs font-bold text-muted-foreground">{label}</span>
        <input
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={controlledValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            const local = localMatch(controlledValue)
            if (local.length) {
              setResults(local)
              setShowResults(true)
            }
          }}
          className="min-w-0 border-0 bg-transparent text-sm font-bold text-ink outline-none"
          required
        />
        <button
          type="button"
          onClick={onPick}
          className="map-pick flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-[9px] font-extrabold"
        >
          MAP
        </button>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              className="block w-full border-b border-line bg-white px-3 py-2.5 text-left text-xs font-bold last:border-0 hover:bg-[#ececea]"
              onClick={() => handleSelect(item)}
            >
              {item.name}
              <small className="ml-1 text-muted-foreground">
                {item.type === "search" ? "OpenStreetMap place" : "Along transport hub"}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PlannerPanel() {
  const origin = useAppStore((s) => s.origin)
  const destination = useAppStore((s) => s.destination)
  const setOrigin = useAppStore((s) => s.setOrigin)
  const setDestination = useAppStore((s) => s.setDestination)
  const setRoutes = useAppStore((s) => s.setRoutes)
  const setPanel = useAppStore((s) => s.setPanel)
  const setPickMode = useAppStore((s) => s.setPickMode)
  const showToast = useAppStore((s) => s.showToast)
  const swapLocations = useAppStore((s) => s.swapLocations)
  const panel = useAppStore((s) => s.panel)

  const [originText, setOriginText] = useState("Berger Junction")
  const [destText, setDestText] = useState("Wuse Market")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (origin) setOriginText(origin.name)
  }, [origin])

  useEffect(() => {
    if (destination) setDestText(destination.name)
  }, [destination])

  const resolveInput = useCallback(
    async (text: string, key: "origin" | "destination"): Promise<GeoPoint | null> => {
      const store = useAppStore.getState()
      const existing = key === "origin" ? store.origin : store.destination
      if (existing && existing.name === text) return existing

      const local = HUBS.find((h) => h.name.toLowerCase() === text.trim().toLowerCase())
      if (local) {
        if (key === "origin") store.setOrigin(local)
        else store.setDestination(local)
        return local
      }

      const found = await geocode(text)
      if (!found[0]) return null

      const point: GeoPoint = { name: found[0].name, lat: found[0].lat, lng: found[0].lng }
      if (key === "origin") store.setOrigin(point)
      else store.setDestination(point)
      return point
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)

      try {
        const [o, d] = await Promise.all([resolveInput(originText, "origin"), resolveInput(destText, "destination")])

        if (!o || !d) {
          showToast("We couldn't find one of those places in Abuja.")
          return
        }

        if (km(o, d) < 0.05) {
          showToast("Choose two different places.")
          return
        }

        const abuja = { lat: 9.0556, lng: 7.4914 }
        if (km(o, abuja) > 90 || km(d, abuja) > 90) {
          showToast("Along currently supports journeys connected to the Abuja network.")
          return
        }

        const a = nearestHub(o)
        const b = nearestHub(d)

        const routes = [
          buildJourney(o, d, "fast", "Fastest", a, b),
          buildJourney(o, d, "cheap", "Cheapest", a, b),
          buildJourney(o, d, "simple", "Fewer changes", a, b),
        ]

        setRoutes(routes)
        setPanel("results")
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "We could not build this route."
        showToast(msg)
      } finally {
        setLoading(false)
      }
    },
    [originText, destText, resolveInput, showToast, setRoutes, setPanel],
  )

  const handleQuickTrip = (from: string, to: string) => {
    setOriginText(from)
    setDestText(to)
    const hFrom = HUBS.find((h) => h.name === from)
    const hTo = HUBS.find((h) => h.name === to)
    if (hFrom) setOrigin(hFrom)
    if (hTo) setDestination(hTo)
  }

  const handleSwap = () => {
    swapLocations()
    setOriginText(destText)
    setDestText(originText)
  }

  return (
    <section
      className={`planner-panel ${panel === "planner" ? "" : "hidden"}`}
      id="plannerPanel"
    >
      <div className="eyebrow">ABUJA, NIGERIA</div>
      <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-5xl">
        How are you<br />getting there?
      </h1>
      <p className="subhead mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Search any place or tap the map. Along connects you to the nearest supported bus and keke
        corridor.
      </p>

      <form onSubmit={handleSubmit} className="route-form mt-6">
        <div className="input-stack">
          <SearchInput
            label="From"
            dot="circle"
            dotClass="bg-green"
            value={originText}
            onChange={setOriginText}
            onPick={() => setPickMode("origin")}
            onSelect={(p) => setOrigin(p)}
            placeholder="Current location or address"
          />

          <button
            type="button"
            onClick={handleSwap}
            className="mx-auto my-1 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-sm font-bold shadow-sm hover:bg-[#ececea]"
            aria-label="Swap locations"
          >
            &#8645;
          </button>

          <SearchInput
            label="To"
            dot="diamond"
            value={destText}
            onChange={setDestText}
            onPick={() => setPickMode("destination")}
            onSelect={(p) => setDestination(p)}
            placeholder="Where are you going?"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="primary-btn mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-[#2a2b2a] disabled:opacity-50"
        >
          <span className="btn-label">{loading ? "Finding route\u2026" : "Find my route"}</span>
          <span>&rarr;</span>
        </button>
      </form>

      <div className="quick-row mt-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Popular</span>
        {QUICK_TRIPS.map((t) => (
          <button
            key={`${t.from}-${t.to}`}
            type="button"
            onClick={() => handleQuickTrip(t.from, t.to)}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-[#ececea]"
          >
            {t.from.split(" ")[0]} &rarr; {t.to.split(" ")[0]}
          </button>
        ))}
      </div>

      <p className="data-disclaimer mt-4 text-[10px] text-muted-foreground">
        Transport routes and fares are prototype estimates. Confirm locally before entering.
      </p>
    </section>
  )
}
