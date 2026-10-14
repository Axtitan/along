import { NextRequest, NextResponse } from "next/server"

/**
 * Road-following geometry, road names and turn-by-turn steps for one leg of a trip.
 * Uses OpenRouteService when ORS_API_KEY is set (free tier), otherwise the free FOSSGIS OSRM
 * servers that power openstreetmap.org's own directions. The app falls back to a straight line
 * if routing is unavailable.
 */

const PROFILES = {
  "foot-walking": { osrm: "routed-foot" },
  "driving-car": { osrm: "routed-car" },
} as const
type Profile = keyof typeof PROFILES

interface Result {
  geometry: { type: "LineString"; coordinates: [number, number][] }
  distance: number
  duration: number
  /** Main roads in travel order, e.g. ["Nnamdi Azikiwe Expressway", "Herbert Macaulay Way"] */
  roads: string[]
  /** Plain-English turn instructions */
  turns: string[]
}

const TTL = 24 * 60 * 60 * 1000
const cache = new Map<string, { data: Result; ts: number }>()

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

function metres(m: number) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`
  return `${(m / 1000).toFixed(1)} km`
}

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"]

function ordinal(n: number) {
  return ["first", "second", "third", "fourth", "fifth", "sixth"][n - 1] ?? `${n}th`
}

/** Collapse step road names into the main roads, skipping short bits and brief detours (A › B › A). */
function mainRoads(steps: { name: string; distance: number }[]) {
  const merge = (list: { name: string; distance: number }[]) => {
    const out: { name: string; distance: number }[] = []
    for (const s of list) {
      const last = out[out.length - 1]
      if (last?.name === s.name) last.distance += s.distance
      else out.push({ ...s })
    }
    return out
  }
  // Drop unnamed and very short pieces first, so a slip road between two stretches of the
  // same expressway doesn't split it.
  const runs = merge(steps.filter((s) => s.name && s.distance >= 120))
  const kept = runs.filter((r, i) => {
    if (r.distance < 300) return false
    const detour = i > 0 && runs[i - 1].name === runs[i + 1]?.name && r.distance < 800
    return !detour
  })
  return merge(kept).map((r) => r.name)
}

interface OsrmStep {
  name: string
  ref?: string
  distance: number
  maneuver: { type: string; modifier?: string; bearing_after: number; exit?: number }
}

function osrmTurn(s: OsrmStep): string | null {
  const m = s.maneuver
  const name = s.name || s.ref || ""
  const onto = name ? ` onto ${name}` : ""
  const then = s.distance > 15 ? ` and go ${metres(s.distance)}` : ""
  const mod = m.modifier ?? "straight"
  switch (m.type) {
    case "depart":
      return `Head ${COMPASS[Math.round(m.bearing_after / 45) % 8]}${name ? ` on ${name}` : ""}${then}`
    case "arrive":
      return null
    case "roundabout":
    case "rotary":
    case "roundabout turn":
      return `At the roundabout, take the ${ordinal(m.exit ?? 1)} exit${onto}${then}`
    case "fork":
      return `Keep ${mod.replace("slight ", "")}${onto}${then}`
    case "end of road":
      return `At the end of the road, turn ${mod}${onto}${then}`
    case "new name":
    case "continue":
      return mod === "straight" || mod === "uturn" ? (name ? `Continue onto ${name}${then}` : null) : `Bear ${mod.replace("slight ", "")}${onto}${then}`
    default:
      if (mod === "straight") return name ? `Go straight onto ${name}${then}` : null
      if (mod === "uturn") return `Make a U-turn${then}`
      return `Turn ${mod}${onto}${then}`
  }
}

async function viaOSRM(coords: [number, number][], profile: Profile): Promise<Result> {
  const path = coords.map((c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`).join(";")
  const url = `https://routing.openstreetmap.de/${PROFILES[profile].osrm}/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true`
  const res = await fetch(url, {
    headers: { "User-Agent": "Along-Abuja/1.0 (https://github.com/Axtitan/along)" },
    signal: AbortSignal.timeout(7000),
  })
  if (!res.ok) throw new Error(`osrm ${res.status}`)
  const data = await res.json()
  const route = data.routes?.[0]
  if (!route) throw new Error("no route")
  const steps: OsrmStep[] = route.legs.flatMap((l: { steps: OsrmStep[] }) => l.steps)
  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
    roads: mainRoads(steps.map((s) => ({ name: s.name || s.ref || "", distance: s.distance }))),
    turns: steps.map(osrmTurn).filter((t): t is string => !!t),
  }
}

async function viaORS(coords: [number, number][], profile: Profile, key: string): Promise<Result> {
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: coords }),
    signal: AbortSignal.timeout(7000),
  })
  if (!res.ok) throw new Error(`ors ${res.status}`)
  const data = await res.json()
  const route = data.features?.[0]
  if (!route) throw new Error("no route")
  const steps: { instruction: string; name: string; distance: number; type: number }[] =
    route.properties?.segments?.flatMap((s: { steps: unknown[] }) => s.steps) ?? []
  return {
    geometry: route.geometry,
    distance: route.properties?.summary?.distance,
    duration: route.properties?.summary?.duration,
    roads: mainRoads(steps.map((s) => ({ name: s.name === "-" ? "" : s.name, distance: s.distance }))),
    // ORS type 10 = arrive
    turns: steps.filter((s) => s.type !== 10).map((s) => (s.distance > 15 ? `${s.instruction} and go ${metres(s.distance)}` : s.instruction)),
  }
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

  // OSRM first: its step names are reliable for Abuja; ORS (if configured) is the backup.
  const orsKey = process.env.ORS_API_KEY
  for (const attempt of [() => viaOSRM(coords, profile), orsKey ? () => viaORS(coords, profile, orsKey) : null]) {
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
