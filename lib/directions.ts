import type { GeoPoint } from "./types"

const cache = new Map<string, [number, number][]>()

function cacheKey(coords: [number, number][]) {
  return coords.map((c) => `${c[0]},${c[1]}`).join(";")
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

  const key = cacheKey(coords)
  if (cache.has(key)) return cache.get(key)!

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
        cache.set(key, latLngCoords)
        return latLngCoords
      }
    }
  } catch {}

  // Fallback: straight line
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
