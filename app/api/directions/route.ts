import { NextRequest, NextResponse } from "next/server"

/**
 * Road-following line geometry for the map.
 * Uses OpenRouteService when ORS_API_KEY is set (free tier), otherwise the free FOSSGIS OSRM
 * servers that power openstreetmap.org's own directions. Either way the app falls back to a
 * straight line if routing is unavailable.
 */

const PROFILES = {
  "foot-walking": { osrm: "routed-foot" },
  "driving-car": { osrm: "routed-car" },
} as const
type Profile = keyof typeof PROFILES

const TTL = 24 * 60 * 60 * 1000
const cache = new Map<string, { data: unknown; ts: number }>()

function valid(coords: unknown): coords is [number, number][] {
  return (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    coords.length <= 10 &&
    coords.every(
      (c) =>
        Array.isArray(c) &&
        c.length === 2 &&
        c.every((n) => typeof n === "number" && Number.isFinite(n)) &&
        Math.abs(c[0]) <= 180 &&
        Math.abs(c[1]) <= 90,
    )
  )
}

async function viaORS(coords: [number, number][], profile: Profile, key: string) {
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: coords }),
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`ors ${res.status}`)
  const data = await res.json()
  const route = data.features?.[0]
  if (!route) throw new Error("no route")
  return {
    geometry: route.geometry,
    distance: route.properties?.summary?.distance,
    duration: route.properties?.summary?.duration,
  }
}

async function viaOSRM(coords: [number, number][], profile: Profile) {
  const path = coords.map((c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`).join(";")
  const url = `https://routing.openstreetmap.de/${PROFILES[profile].osrm}/route/v1/driving/${path}?overview=full&geometries=geojson`
  const res = await fetch(url, {
    headers: { "User-Agent": "Along-Abuja/1.0 (https://github.com/Axtitan/along)" },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`osrm ${res.status}`)
  const data = await res.json()
  const route = data.routes?.[0]
  if (!route) throw new Error("no route")
  return { geometry: route.geometry, distance: route.distance, duration: route.duration }
}

export async function POST(req: NextRequest) {
  let body: { coordinates?: unknown; profile?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const profile: Profile = body.profile === "foot-walking" ? "foot-walking" : "driving-car"
  if (!valid(body.coordinates)) {
    return NextResponse.json({ error: "Send 2–10 [lng, lat] coordinates" }, { status: 400 })
  }
  const coords = body.coordinates

  const key = `${profile}:${coords.map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join(";")}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return NextResponse.json(hit.data)

  const orsKey = process.env.ORS_API_KEY
  for (const attempt of [orsKey ? () => viaORS(coords, profile, orsKey) : null, () => viaOSRM(coords, profile)]) {
    if (!attempt) continue
    try {
      const result = await attempt()
      if (cache.size > 2000) cache.delete(cache.keys().next().value!)
      cache.set(key, { data: result, ts: Date.now() })
      return NextResponse.json(result)
    } catch {}
  }
  return NextResponse.json({ error: "Directions service unavailable" }, { status: 502 })
}
