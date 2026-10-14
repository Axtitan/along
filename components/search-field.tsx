"use client"

import { useEffect, useId, useRef, useState } from "react"
import {
  IconBusStop,
  IconCurrentLocation,
  IconHistory,
  IconLoader2,
  IconMapPin,
  IconPointer,
  IconX,
} from "@tabler/icons-react"
import { searchLocal } from "@/lib/places"
import { getRecent, mergeResults, reverseGeocode, searchRemote } from "@/lib/geocode"
import { locateOnce, useAppStore } from "@/lib/store"
import { km } from "@/lib/geo"
import { distanceText } from "@/lib/format"
import type { GeocodeResult, GeoPoint } from "@/lib/types"

type Item =
  | { kind: "gps" }
  | { kind: "map" }
  | { kind: "result"; result: GeocodeResult }

const SOURCE_ICON = {
  hub: IconBusStop,
  recent: IconHistory,
  place: IconMapPin,
  search: IconMapPin,
  gps: IconCurrentLocation,
} as const

const SOURCE_LABEL: Partial<Record<GeocodeResult["source"], string>> = {
  hub: "Along stop",
  recent: "Recent",
}

export function SearchField({
  role,
  text,
  onText,
  onSelect,
  placeholder,
  marker,
}: {
  role: "origin" | "destination"
  text: string
  onText: (t: string) => void
  onSelect: (p: GeoPoint) => void
  placeholder: string
  marker: React.ReactNode
}) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)

  const userLocation = useAppStore((s) => s.userLocation)
  const setPickMode = useAppStore((s) => s.setPickMode)
  const showToast = useAppStore((s) => s.showToast)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [open])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const actions = (): Item[] => (role === "origin" ? [{ kind: "gps" }, { kind: "map" }] : [{ kind: "map" }])

  const refresh = (q: string) => {
    abortRef.current?.abort()
    if (timerRef.current) clearTimeout(timerRef.current)
    const near = userLocation ?? undefined
    const trimmed = q.trim()

    if (!trimmed) {
      setLoading(false)
      setItems([...actions(), ...getRecent().map((result) => ({ kind: "result" as const, result }))])
      setActive(-1)
      return
    }

    const local = searchLocal(trimmed, near, 4)
    setItems([...actions(), ...local.map((result) => ({ kind: "result" as const, result }))])
    setActive(local.length ? actions().length : -1)
    if (trimmed.length < 2) return

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const remote = await searchRemote(trimmed, near, ctrl.signal)
        if (ctrl.signal.aborted) return
        const merged = mergeResults(local, remote)
        setItems([...actions(), ...merged.map((result) => ({ kind: "result" as const, result }))])
        setActive((a) => (a < 0 && merged.length ? actions().length : a))
      } catch {
        // offline or aborted: keep local results
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 280)
  }

  const choose = async (item: Item) => {
    if (item.kind === "map") {
      setOpen(false)
      setPickMode(role)
      return
    }
    if (item.kind === "gps") {
      setLocating(true)
      const loc = await locateOnce()
      setLocating(false)
      if (!loc) {
        showToast("Couldn't get your location. Allow location access, or search for a place.")
        return
      }
      setOpen(false)
      onSelect({ name: "Your location", lat: loc.lat, lng: loc.lng, type: "gps", detail: "Finding address…" })
      const where = await reverseGeocode(loc.lat, loc.lng)
      // Only fill in the address if the user hasn't changed the field meanwhile.
      const current = useAppStore.getState()[role]
      if (current?.type === "gps") onSelect({ ...current, detail: where.name })
      return
    }
    const r = item.result
    setOpen(false)
    onSelect({ name: r.name, detail: r.detail, lat: r.lat, lng: r.lng, type: r.source })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true)
      refresh(text)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(items.length - 1, a + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === "Enter" && open && active >= 0 && items[active]) {
      e.preventDefault()
      choose(items[active])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* pr-14 leaves room for the swap button that sits over the right edge of the card */}
      <div className="flex items-center gap-3 pl-3 pr-14">
        <span className="flex w-5 shrink-0 justify-center">{marker}</span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={role === "origin" ? "Starting point" : "Destination"}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            onText(e.target.value)
            setOpen(true)
            refresh(e.target.value)
          }}
          onFocus={(e) => {
            e.currentTarget.select()
            setOpen(true)
            refresh(text)
          }}
          onKeyDown={onKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink/40"
        />
        {loading || locating ? (
          <IconLoader2 size={18} className="shrink-0 animate-spin text-ink/40" aria-label="Searching" />
        ) : text ? (
          <button
            type="button"
            onClick={() => {
              onText("")
              inputRef.current?.focus()
              refresh("")
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/45 hover:bg-ink/10 hover:text-ink"
            aria-label="Clear"
          >
            <IconX size={16} />
          </button>
        ) : null}
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="relative z-10 mx-2 mb-2 max-h-[46vh] overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-[0_12px_32px_rgba(18,20,15,0.12)]"
        >
          {items.map((item, i) => {
            const isActive = i === active
            const base = `flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${isActive ? "bg-ink/[0.07]" : "hover:bg-ink/[0.07]"}`
            if (item.kind === "gps" || item.kind === "map") {
              const gps = item.kind === "gps"
              const Icon = gps ? IconCurrentLocation : IconPointer
              return (
                <li key={item.kind} role="option" aria-selected={isActive}>
                  <button type="button" className={base} onMouseEnter={() => setActive(i)} onClick={() => choose(item)}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/40 text-green-dark">
                      <Icon size={17} />
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {gps ? (locating ? "Finding you…" : "Use my current location") : "Choose on the map"}
                    </span>
                  </button>
                </li>
              )
            }
            const r = item.result
            const Icon = SOURCE_ICON[r.source] ?? IconMapPin
            const tag = SOURCE_LABEL[r.source]
            const dist = userLocation ? distanceText(km(userLocation, r) * 1000) : null
            return (
              <li key={`${r.source}-${r.name}-${r.lat}-${i}`} role="option" aria-selected={isActive}>
                <button type="button" className={base} onMouseEnter={() => setActive(i)} onClick={() => choose(item)}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-ink/60">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-xs text-ink/55">
                      {tag ? <b className="font-semibold text-violet">{tag} · </b> : null}
                      {r.detail || "Abuja"}
                    </span>
                  </span>
                  {dist && <span className="shrink-0 text-[11px] font-medium text-ink/45">{dist}</span>}
                </button>
              </li>
            )
          })}
          {!loading && text.trim().length >= 2 && items.every((x) => x.kind !== "result") && (
            <li className="px-4 py-3 text-xs text-ink/55">No places found in Abuja. Try a landmark, street or district.</li>
          )}
        </ul>
      )}
    </div>
  )
}
