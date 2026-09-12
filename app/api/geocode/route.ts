import { NextRequest, NextResponse } from "next/server"

function withTimeout(ms: number) {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), ms)
  return ctrl.signal
}

function nameFromPhoton(p: Record<string, string | undefined>) {
  return [p.name, p.street, p.district, p.city, p.state, p.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4)
    .join(", ")
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")
  const q = searchParams.get("q") || ""

  try {
    if (lat && lon) {
      const u = new URL("https://nominatim.openstreetmap.org/reverse")
      u.searchParams.set("lat", lat)
      u.searchParams.set("lon", lon)
      u.searchParams.set("format", "jsonv2")
      u.searchParams.set("zoom", "18")
      u.searchParams.set("addressdetails", "1")
      const r = await fetch(u, {
        headers: { "User-Agent": "Along-Abuja-MVP/1.0", "Accept-Language": "en-NG,en" },
        signal: withTimeout(4000),
      })
      if (!r.ok) throw new Error("reverse failed")
      const x = await r.json()
      return NextResponse.json({
        results: [{ name: x.display_name, lat: +x.lat, lng: +x.lon, type: x.type || "place" }],
      })
    }

    if (q.trim().length < 2) {
      return NextResponse.json({ error: "Enter at least two characters" }, { status: 400 })
    }

    const u = new URL("https://nominatim.openstreetmap.org/search")
    u.searchParams.set("q", q)
    u.searchParams.set("format", "jsonv2")
    u.searchParams.set("limit", "8")
    u.searchParams.set("addressdetails", "1")
    u.searchParams.set("countrycodes", "ng")
    u.searchParams.set("viewbox", "7.20,9.30,7.75,8.80")
    u.searchParams.set("bounded", "0")

    let r = await fetch(u, {
      headers: { "User-Agent": "Along-Abuja-MVP/1.0", "Accept-Language": "en-NG,en" },
      signal: withTimeout(4000),
    })

    let items: { name: string; lat: number; lng: number; type: string }[] = []
    if (r.ok) {
      const data = await r.json()
      items = data.map((x: { display_name: string; lat: string; lon: string; type: string }) => ({
        name: x.display_name,
        lat: +x.lat,
        lng: +x.lon,
        type: x.type || "place",
      }))
    }

    if (!items.length) {
      const p = new URL("https://photon.komoot.io/api/")
      p.searchParams.set("q", q)
      p.searchParams.set("limit", "8")
      p.searchParams.set("lat", "9.0556")
      p.searchParams.set("lon", "7.4914")
      p.searchParams.set("lang", "en")
      r = await fetch(p, { signal: withTimeout(4000) })
      if (r.ok) {
        const data = await r.json()
        items = data.features
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
      }
    }

    return NextResponse.json({ results: items })
  } catch {
    return NextResponse.json(
      { error: "Location search is temporarily unavailable" },
      { status: 502 },
    )
  }
}
