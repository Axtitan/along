import { NextRequest, NextResponse } from "next/server"

const ORS_BASE = "https://api.openrouteservice.org/v2"

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

    return NextResponse.json({
      geometry: route.geometry,
      distance: route.properties?.summary?.distance,
      duration: route.properties?.summary?.duration,
    })
  } catch (e) {
    return NextResponse.json({ error: "Directions service unavailable" }, { status: 502 })
  }
}
