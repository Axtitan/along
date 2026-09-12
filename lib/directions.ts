import type { GeoPoint } from "./types"

const LS_KEY = "along-directions-cache"
const LS_TTL = 60 * 60 * 1000 // 1 hour

function loadCache(): Map<string, { data: [number, number][]; ts: number }> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Map()
    const entries = JSON.parse(raw) as [string, { data: [number, number][]; ts: number }][]
    const now = Date.now()
    return new Map(entries.filter(([, v]) => now - v.ts < LS_TTL))
  } catch {
    return new Map()
  }
}

function saveCache(cache: Map<string, { data: [number, number][]; ts: number }>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...cache]))
  } catch {}
}

let clientCache = loadCache()

function cacheKey(coords: [number, number][]) {
  return coords.map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join(";")
}

export async function getRoadGeometry(
  from: GeoPoint,
  to: GeoPoint,
  profile: "foot-walking" | "driving-car" = "foot-walking",
): Promise<[number, number][]> {
  const coords: [number, number][] = [
    [from.lng, from.lat],
    [to.lng, to.lat],
  ]

  const key = `${profile}:${cacheKey(coords)}`
  const cached = clientCache.get(key)
  if (cached) return cached.data

  try {
    const res = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: coords, profile }),
    })

    if (res.ok) {
      const data = await res.json()
      const geo = data.geometry?.coordinates as [number, number][] | undefined
      if (geo && geo.length > 0) {
        const latLngCoords = geo.map((c) => [c[1], c[0]] as [number, number])
        clientCache.set(key, { data: latLngCoords, ts: Date.now() })
        saveCache(clientCache)
        return latLngCoords
      }
    }
  } catch {}

  return [
    [from.lat, from.lng],
    [to.lat, to.lng],
  ]
}

export async function getMultiLegGeometry(
  legs: { from: GeoPoint; to: GeoPoint; mode?: string }[],
): Promise<[number, number][][]> {
  return Promise.all(
    legs.map((leg) => {
      const profile = leg.mode === "walk" ? "foot-walking" : "driving-car"
      return getRoadGeometry(leg.from, leg.to, profile)
    }),
  )
}
