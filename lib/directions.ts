import type { Leg } from "./types"

const LS_KEY = "along-directions-cache-v2"
const LS_TTL = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 150

type Entry = { data: [number, number][]; ts: number }

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

function cache() {
  clientCache ??= loadCache()
  return clientCache
}

function saveCache() {
  try {
    const entries = [...cache()].slice(-MAX_ENTRIES)
    localStorage.setItem(LS_KEY, JSON.stringify(entries))
  } catch {}
}

/** Road geometry for one leg as [lat, lng][]; falls back to the straight line. */
export async function legGeometry(leg: Leg): Promise<[number, number][]> {
  const [a, b] = [leg.coords[0], leg.coords[leg.coords.length - 1]]
  if (!a || !b || leg.distance < 60) return leg.coords
  const profile = leg.mode === "walk" ? "foot-walking" : "driving-car"
  const key = `${profile}:${a[0].toFixed(4)},${a[1].toFixed(4)};${b[0].toFixed(4)},${b[1].toFixed(4)}`
  const hit = cache().get(key)
  if (hit) return hit.data

  try {
    const res = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [a[1], a[0]],
          [b[1], b[0]],
        ],
        profile,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const geo = data.geometry?.coordinates as [number, number][] | undefined
      if (geo?.length) {
        const line = geo.map((c) => [c[1], c[0]] as [number, number])
        cache().set(key, { data: line, ts: Date.now() })
        saveCache()
        return line
      }
    }
  } catch {}
  return leg.coords
}
