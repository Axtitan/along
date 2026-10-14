import { NextRequest, NextResponse } from "next/server"

/**
 * Free geocoding for Abuja.
 * - Search: Photon (komoot, built for type-ahead) restricted to the Abuja metro bbox and biased
 *   towards the user's position; Nominatim is the fallback (its policy forbids autocomplete use,
 *   so it is only hit when Photon has nothing).
 * - Reverse: Nominatim, turned into a short "name + area" label instead of a full address.
 */

const UA = "Along-Abuja/1.0 (https://github.com/Axtitan/along)"
const BBOX = { west: 6.95, south: 8.7, east: 7.8, north: 9.4 }
const TTL = 24 * 60 * 60 * 1000

const cache = new Map<string, { data: unknown; ts: number }>()

function cached<T>(key: string): T | undefined {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return hit.data as T
  return undefined
}

function remember(key: string, data: unknown) {
  if (cache.size > 2000) cache.delete(cache.keys().next().value!)
  cache.set(key, { data, ts: Date.now() })
}

interface Result {
  name: string
  detail: string
  precise?: boolean
  lat: number
  lng: number
  type: string
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: status === 200 ? { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } : {},
  })
}

function parseCoord(v: string | null, min: number, max: number) {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

function joinParts(parts: (string | undefined)[]) {
  return parts
    .filter((v): v is string => !!v)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ")
}

/* ----------------------------- search ----------------------------- */

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}

async function photonSearch(q: string, lat: number | null, lon: number | null): Promise<Result[]> {
  const u = new URL("https://photon.komoot.io/api/")
  u.searchParams.set("q", q)
  u.searchParams.set("limit", "10")
  u.searchParams.set("lang", "en")
  u.searchParams.set("bbox", `${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}`)
  u.searchParams.set("lat", String(lat ?? 9.0556))
  u.searchParams.set("lon", String(lon ?? 7.4914))
  const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(2500) })
  if (!r.ok) throw new Error(`photon ${r.status}`)
  const data = (await r.json()) as { features: PhotonFeature[] }
  return data.features.map((f) => {
    const p = f.properties
    const street = joinParts([p.housenumber, p.street])
    const name = p.name || street || p.district || p.city || "Unnamed place"
    return {
      name,
      detail: joinParts([p.name ? street : undefined, p.district || p.locality, p.city || p.county]),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      type: p.osm_value || p.type || "place",
    }
  })
}

interface NominatimItem {
  name?: string
  display_name: string
  lat: string
  lon: string
  type?: string
  address?: Record<string, string | undefined>
}

/** Short label. For reverse lookups a street beats a big area polygon like "Wuse II". */
function nominatimLabel(x: NominatimItem, preferStreet = false) {
  const a = x.address ?? {}
  const road = joinParts([a.house_number, a.road])
  const area = a.neighbourhood || a.quarter || a.suburb || a.city_district || a.village || a.town
  const poi = a.amenity || a.shop || a.office || a.tourism || a.building
  const name =
    (preferStreet ? poi || road || x.name : x.name || poi || road) || area || x.display_name.split(",")[0]
  return {
    name,
    detail: joinParts([name === road ? undefined : road, area, a.city || a.county || "Abuja"].filter((v) => v !== name)),
    /** false when OSM only knows the area (many Abuja streets are unnamed) */
    precise: !!(poi || road || x.name),
  }
}

async function nominatimSearch(q: string): Promise<Result[]> {
  const u = new URL("https://nominatim.openstreetmap.org/search")
  u.searchParams.set("q", q)
  u.searchParams.set("format", "jsonv2")
  u.searchParams.set("limit", "8")
  u.searchParams.set("addressdetails", "1")
  u.searchParams.set("countrycodes", "ng")
  u.searchParams.set("viewbox", `${BBOX.west},${BBOX.north},${BBOX.east},${BBOX.south}`)
  u.searchParams.set("bounded", "1")
  const r = await fetch(u, {
    headers: { "User-Agent": UA, "Accept-Language": "en-NG,en" },
    signal: AbortSignal.timeout(4500),
  })
  if (!r.ok) throw new Error(`nominatim ${r.status}`)
  const items = (await r.json()) as NominatimItem[]
  return items.map((x) => ({ ...nominatimLabel(x), lat: +x.lat, lng: +x.lon, type: x.type || "place" }))
}

function dedupe(items: Result[]) {
  const seen = new Set<string>()
  return items.filter((x) => {
    const k = `${x.name.toLowerCase()}|${x.lat.toFixed(2)}|${x.lng.toFixed(2)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/* ----------------------------- reverse ---------------------------- */

async function reverse(lat: number, lon: number): Promise<Result> {
  const u = new URL("https://nominatim.openstreetmap.org/reverse")
  u.searchParams.set("lat", String(lat))
  u.searchParams.set("lon", String(lon))
  u.searchParams.set("format", "jsonv2")
  u.searchParams.set("zoom", "18")
  u.searchParams.set("addressdetails", "1")
  u.searchParams.set("layer", "address,poi")
  const r = await fetch(u, {
    headers: { "User-Agent": UA, "Accept-Language": "en-NG,en" },
    signal: AbortSignal.timeout(4500),
  })
  if (!r.ok) throw new Error(`nominatim ${r.status}`)
  const x = (await r.json()) as NominatimItem
  return { ...nominatimLabel(x, true), lat, lng: lon, type: x.type || "place" }
}

/* ----------------------------- handler ---------------------------- */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = (sp.get("q") || "").trim().slice(0, 120)
  const lat = parseCoord(sp.get("lat"), -90, 90)
  const lon = parseCoord(sp.get("lon"), -180, 180)

  if (!q) {
    if (lat === null || lon === null) return json({ error: "Pass q, or lat and lon" }, 400)
    const key = `r:${lat.toFixed(4)},${lon.toFixed(4)}`
    const hit = cached<Result>(key)
    if (hit) return json({ results: [hit] })
    try {
      const res = await reverse(lat, lon)
      remember(key, res)
      return json({ results: [res] })
    } catch {
      return json({ results: [{ name: "Dropped pin", detail: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lng: lon, type: "pin" }] })
    }
  }

  if (q.length < 2) return json({ error: "Type at least two characters" }, 400)

  // Bias rounding keeps the cache useful while still favouring nearby results.
  const bias = lat !== null && lon !== null ? `${lat.toFixed(2)},${lon.toFixed(2)}` : "-"
  const key = `s:${q.toLowerCase()}|${bias}`
  const hit = cached<Result[]>(key)
  if (hit) return json({ results: hit })

  // Ask both services at once. Photon (komoot) is often slow or down, so it gets a short leash
  // and never holds up Nominatim's answer for long.
  const [photon, nominatim] = await Promise.allSettled([photonSearch(q, lat, lon), nominatimSearch(q)])
  let results = [
    ...(photon.status === "fulfilled" ? photon.value : []),
    ...(nominatim.status === "fulfilled" ? nominatim.value : []),
  ]
  results = dedupe(results).slice(0, 8)
  if (results.length) remember(key, results)
  return json({ results })
}
