import type { Leg } from "./types"

export interface LegRoute {
  line: [number, number][]
  /** Main roads in order (vehicle legs) */
  roads: string[]
  /** Turn-by-turn instructions (shown for walking legs) */
  turns: string[]
}

const LS_KEY = "along-directions-cache-v3"
const LS_TTL = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 150

type Entry = { data: LegRoute; ts: number }

function loadCache(): Map<string, Entry> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Map()
    const now = Date.now()
    return new Map((JSON.parse(raw) as [string, Entry][]).filter(([, v]) => now - v.ts < LS_TTL))
  } catch {
    return new Map()
  }
}

let clientCache: Map<string, Entry> | null = null
const inflight = new Map<string, Promise<LegRoute>>()

function cache() {
  clientCache ??= loadCache()
  return clientCache
}

function saveCache() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...cache()].slice(-MAX_ENTRIES)))
  } catch {}
}

function points(leg: Leg) {
  return leg.waypoints ?? [leg.coords[0], leg.coords[leg.coords.length - 1]]
}

function keyFor(leg: Leg) {
  const profile = leg.mode === "walk" ? "foot-walking" : "driving-car"
  return `${profile}:${points(leg).map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(";")}`
}

/** Cached result if we already have it, without a network call. */
export function cachedLegRoute(leg: Leg): LegRoute | undefined {
  return cache().get(keyFor(leg))?.data
}

/** Road geometry, road names and turns for one leg; falls back to the straight line. */
export async function legRoute(leg: Leg): Promise<LegRoute> {
  const fallback: LegRoute = { line: leg.coords, roads: [], turns: [] }
  const pts = points(leg)
  if (pts.length < 2 || leg.distance < 60) return fallback
  const key = keyFor(leg)
  const hit = cache().get(key)
  if (hit) return hit.data
  const pending = inflight.get(key)
  if (pending) return pending

  const request = (async () => {
    try {
      const res = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coordinates: pts.map((p) => [p[1], p[0]]),
          profile: leg.mode === "walk" ? "foot-walking" : "driving-car",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const geo = data.geometry?.coordinates as [number, number][] | undefined
        if (geo?.length) {
          const result: LegRoute = {
            line: geo.map((c) => [c[1], c[0]] as [number, number]),
            roads: data.roads ?? [],
            turns: data.turns ?? [],
          }
          cache().set(key, { data: result, ts: Date.now() })
          saveCache()
          return result
        }
      }
    } catch {}
    return fallback
  })()
  inflight.set(key, request)
  try {
    return await request
  } finally {
    inflight.delete(key)
  }
}
