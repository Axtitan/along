import type { GeocodeResult } from "./types"

const cache = new Map<string, GeocodeResult[]>()

function nameFromPhoton(p: Record<string, string | undefined>) {
  return [p.name, p.street, p.district, p.city, p.state, p.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4)
    .join(", ")
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const clean = query.trim()
  if (cache.has(clean)) return cache.get(clean)!

  // 1. Try our own API proxy
  try {
    const u = new URL("/api/geocode", window.location.origin)
    u.searchParams.set("q", clean)
    const r = await fetch(u)
    if (r.ok) {
      const x = await r.json()
      if (x.results?.length) {
        const results = x.results.map((v: GeocodeResult) => ({ ...v, type: "search" }))
        cache.set(clean, results)
        return results
      }
    }
  } catch {}

  // 2. Nominatim fallback
  try {
    const u = new URL("https://nominatim.openstreetmap.org/search")
    u.searchParams.set("q", clean)
    u.searchParams.set("format", "jsonv2")
    u.searchParams.set("limit", "8")
    u.searchParams.set("addressdetails", "1")
    u.searchParams.set("countrycodes", "ng")
    u.searchParams.set("viewbox", "7.20,9.30,7.75,8.80")
    u.searchParams.set("bounded", "0")
    const r = await fetch(u, { headers: { "Accept-Language": "en-NG,en" } })
    if (r.ok) {
      const items = (await r.json()).map(
        (x: { display_name: string; lat: string; lon: string; type: string }) => ({
          name: x.display_name,
          lat: +x.lat,
          lng: +x.lon,
          type: x.type || "place",
        }),
      )
      if (items.length) {
        cache.set(clean, items)
        return items
      }
    }
  } catch {}

  // 3. Photon fallback
  try {
    const u = new URL("https://photon.komoot.io/api/")
    u.searchParams.set("q", clean)
    u.searchParams.set("limit", "8")
    u.searchParams.set("lat", "9.0556")
    u.searchParams.set("lon", "7.4914")
    u.searchParams.set("lang", "en")
    const r = await fetch(u)
    if (r.ok) {
      const data = await r.json()
      const items = data.features
        .filter((x: { properties: { countrycode: string } }) => x.properties.countrycode === "NG")
        .map(
          (x: {
            properties: Record<string, string | undefined>
            geometry: { coordinates: [number, number] }
          }) => ({
            name: nameFromPhoton(x.properties),
            lat: x.geometry.coordinates[1],
            lng: x.geometry.coordinates[0],
            type: x.properties.type || "place",
          }),
        )
      if (items.length) cache.set(clean, items)
      return items
    }
  } catch {}

  return []
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // 1. Try our API proxy
  try {
    const u = new URL("/api/geocode", window.location.origin)
    u.searchParams.set("lat", String(lat))
    u.searchParams.set("lon", String(lng))
    const r = await fetch(u)
    if (r.ok) {
      const x = await r.json()
      if (x.results?.[0]) return x.results[0].name
    }
  } catch {}

  // 2. Nominatim fallback
  try {
    const u = new URL("https://nominatim.openstreetmap.org/reverse")
    u.searchParams.set("lat", String(lat))
    u.searchParams.set("lon", String(lng))
    u.searchParams.set("format", "jsonv2")
    u.searchParams.set("zoom", "18")
    const r = await fetch(u, { headers: { "Accept-Language": "en-NG,en" } })
    const x = await r.json()
    return x.display_name || "Dropped pin"
  } catch {
    return "Dropped pin"
  }
}
