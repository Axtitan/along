"use client"

import { useState } from "react"
import { IconArrowRight, IconArrowsDownUp, IconLoader2, IconMapPinFilled } from "@tabler/icons-react"
import { useAppStore } from "@/lib/store"
import { resolvePlace, saveRecent } from "@/lib/geocode"
import { planJourneys } from "@/lib/router"
import { POPULAR_PLACES } from "@/lib/places"
import { inAbuja, km } from "@/lib/geo"
import { SearchField } from "@/components/search-field"
import { ModeBadge } from "@/components/mode-icon"
import type { GeoPoint } from "@/lib/types"

type Draft = { text: string; base: GeoPoint | null }

/** Text shown in a field for a chosen point. */
function label(p: GeoPoint | null) {
  return p ? p.name : ""
}

export function PlannerPanel() {
  const origin = useAppStore((s) => s.origin)
  const destination = useAppStore((s) => s.destination)
  const setOrigin = useAppStore((s) => s.setOrigin)
  const setDestination = useAppStore((s) => s.setDestination)
  const setRoutes = useAppStore((s) => s.setRoutes)
  const setPanel = useAppStore((s) => s.setPanel)
  const showToast = useAppStore((s) => s.showToast)
  const swapLocations = useAppStore((s) => s.swapLocations)
  const userLocation = useAppStore((s) => s.userLocation)

  // Typed text that hasn't been turned into a place yet. A draft only applies to the point it was
  // typed over, so picking on the map or using GPS replaces it automatically.
  const [originDraft, setOriginDraft] = useState<Draft | null>(null)
  const [destDraft, setDestDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(false)

  const liveOrigin = originDraft && originDraft.base === origin ? originDraft.text : null
  const liveDest = destDraft && destDraft.base === destination ? destDraft.text : null
  const originText = liveOrigin ?? label(origin)
  const destText = liveDest ?? label(destination)

  const resolve = async (draft: string | null, current: GeoPoint | null) => {
    if (draft === null || (current && draft === current.name)) return current
    if (!draft.trim()) return null
    return resolvePlace(draft, userLocation ?? undefined)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const [o, d] = await Promise.all([resolve(liveOrigin, origin), resolve(liveDest, destination)])
      if (!o) return showToast("Where are you starting from? Search, use your location, or tap the map.")
      if (!d) return showToast("Where are you going? Search for a place or tap the map.")
      setOrigin(o)
      setDestination(d)
      setOriginDraft(null)
      setDestDraft(null)

      if (!inAbuja(o) || !inAbuja(d)) {
        return showToast("Along currently covers the Abuja area (FCT, Mararaba, Masaka and Suleja).")
      }
      if (km(o, d) < 0.08) return showToast("Those two places are the same spot. Pick a different destination.")

      saveRecent(o)
      saveRecent(d)
      setRoutes(planJourneys(o, d))
      setPanel("results")
    } catch {
      showToast("We couldn't plan that trip. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSwap = () => {
    // After the swap, origin is the old destination, so the drafts still line up with their points.
    swapLocations()
    setOriginDraft(destDraft)
    setDestDraft(originDraft)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Where are you going?</h1>
        <p className="mt-1 text-sm text-ink/60">
          Buses, shared cabs, keke and okada — the way Abuja actually moves.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(18,20,15,0.05)]">
          <SearchField
            role="origin"
            text={originText}
            onText={(text) => setOriginDraft({ text, base: origin })}
            onSelect={(p) => {
              setOrigin(p)
              setOriginDraft(null)
            }}
            placeholder="Starting point"
            marker={<span className="block h-3 w-3 rounded-full border-[3px] border-ink bg-brand" />}
          />
          <div className="ml-11 mr-14 border-t border-line" />
          <SearchField
            role="destination"
            text={destText}
            onText={(text) => setDestDraft({ text, base: destination })}
            onSelect={(p) => {
              setDestination(p)
              setDestDraft(null)
            }}
            placeholder="Where to?"
            marker={<IconMapPinFilled size={18} className="text-violet" />}
          />
          <button
            type="button"
            onClick={handleSwap}
            className="absolute right-3 top-[34px] flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink/70 shadow-sm hover:border-ink/30 hover:bg-ink hover:text-white"
            aria-label="Swap start and destination"
          >
            <IconArrowsDownUp size={16} />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(18,20,15,0.18)] transition hover:bg-black disabled:opacity-60"
        >
          {loading ? <IconLoader2 size={18} className="animate-spin" /> : null}
          {loading ? "Finding the best way…" : "Find routes"}
          {!loading && <IconArrowRight size={18} className="text-brand" />}
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/45">Popular places</h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR_PLACES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setDestination({ name: p.name, detail: p.detail, lat: p.lat, lng: p.lng, type: p.source })
                setDestDraft(null)
              }}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink hover:bg-ink hover:text-white"
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-paper p-4">
        <h2 className="text-sm font-semibold text-ink">How Along picks your ride</h2>
        <ul className="mt-3 flex flex-col gap-2.5 text-[13px] leading-snug text-ink/70">
          <li className="flex items-start gap-2.5">
            <ModeBadge mode="keke" size={26} />
            <span>
              <b className="font-semibold text-ink">Keke & okada</b> only where they&apos;re allowed — satellite towns
              like Kubwa, Nyanya and Lugbe, and inside estates. Never in the city centre.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <ModeBadge mode="walk" size={26} />
            <span>
              <b className="font-semibold text-ink">Short walks only.</b> Anything over about 500 m becomes a keke, bike
              or cab.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <ModeBadge mode="bus" size={26} />
            <span>
              <b className="font-semibold text-ink">2026 fares</b> from published Abuja commuter reports. Always confirm
              with the driver.
            </span>
          </li>
        </ul>
      </section>
    </div>
  )
}
