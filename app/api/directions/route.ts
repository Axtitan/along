import { NextRequest, NextResponse } from "next/server"

const ORS_BASE = "https://api.openrouteservice.org/v2"

// Server-side in-memory cache — survives within the same function instance
// Hub-to-hub routes are static, so cache those aggressively (24h)
// Walking routes from user origin/dest change but are still worth caching (1h)
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour default
const STATIC_TTL = 60 * 60 * 24 * 1000 // 24 hours for hub-to-hub

function cacheKey(coords: [number, number][], profile: string) {
  return `${profile}:${coords.map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join(";")}`
}

function isStaticRoute(coords: [number, number][]) {
  // Hub-to-hub routes are between known transport hubs
  // Simple heuristic: short routes (< 5km) within Abuja bounds are likely hub-to-hub
  return coords.length === 2
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { coordinates, profile = "foot-walking" } = body as {
    coordinates: [number, number][]
    profile?: string
  }

  const key = process.env.ORS_API_KEY
  if (!key) {
    return NextResponse.json({ error: "ORS API key not configured" }, { status: 503 })
  }

  if (!coordinates || coordinates.length < 2) {
    return NextResponse.json({ error: "At least 2 coordinates required" }, { status: 400 })
  }

  const ck = cacheKey(coordinates, profile)
  const now = Date.now()
  const ttl = isStaticRoute(coordinates) ? STATIC_TTL : CACHE_TTL

  // Check server-side cache
  const cached = cache.get(ck)
  if (cached && now - cached.ts < ttl) {
    return NextResponse.json(cached.data)
  }

  try {
    const res = await fetch(`${ORS_BASE}/directions/${profile}/geojson`, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: "ORS request failed", detail: err }, { status: res.status })
    }

    const data = await res.json()
    const route = data.features?.[0]

    if (!route) {
      return NextResponse.json({ error: "No route found" }, { status: 404 })
    }

    const result = {
      geometry: route.geometry,
      distance: route.properties?.summary?.distance,
      duration: route.properties?.summary?.duration,
    }

    // Store in server-side cache
    cache.set(ck, { data: result, ts: now })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Directions service unavailable" }, { status: 502 })
  }
}
