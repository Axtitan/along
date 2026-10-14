import type { Corridor, GeoPoint, Hub, Journey, Leg, RoutePreference, TransportMode, Zone } from "./types"
import { CORRIDORS, HUBS, HUB_MAP } from "./network"
import { km, roadKm } from "./geo"
import { zoneOf, kekeAllowed, okadaAllowed } from "./zones"
import { baseFare, fareRange, rideFare, travelMinutes, MAX_WALK_KM, SPEED } from "./fares"
import {
  corridorDetails,
  kekeDetails,
  okadaDetails,
  rideDetails,
  taxiDetails,
  walkDetails,
  type Place,
} from "./instructions"

/** Corridors follow the main road between boarding points, so they detour less than street trips. */
const CORRIDOR_ROAD_FACTOR = 1.15 / 1.3

/* ------------------------------------------------------------------ */
/* Graph                                                               */
/* ------------------------------------------------------------------ */

const ORIGIN = "__origin"
const DEST = "__dest"

interface Edge {
  to: string
  leg: Leg
  /** true when this edge means getting into a new vehicle */
  boards: boolean
}

function fareMid(l: Leg) {
  return l.fare ? (l.fare[0] + l.fare[1]) / 2 : 0
}

function corridorKm(c: Corridor, i: number, j: number) {
  const [a, b] = i < j ? [i, j] : [j, i]
  let d = 0
  for (let k = a; k < b; k++) d += roadKm(HUB_MAP[c.stops[k]], HUB_MAP[c.stops[k + 1]])
  return d * CORRIDOR_ROAD_FACTOR
}

/** Scale a corridor's distance-based fare so its full run matches the published fare check. */
function corridorScale(c: Corridor) {
  if (!c.fareCheck) return 1
  const i = c.stops.indexOf(c.fareCheck.from)
  const j = c.stops.indexOf(c.fareCheck.to)
  if (i < 0 || j < 0) return 1
  const model = baseFare(c.mode, corridorKm(c, i, j))
  return Math.min(1.6, Math.max(0.7, c.fareCheck.fare / model))
}

const VEHICLE_WORD: Record<Corridor["mode"], string> = { bus: "Bus", taxi: "Shared cab", keke: "Keke" }

function corridorLeg(c: Corridor, i: number, j: number, scale: number): Leg {
  const from = HUB_MAP[c.stops[i]]
  const to = HUB_MAP[c.stops[j]]
  const terminal = HUB_MAP[j > i ? c.stops[c.stops.length - 1] : c.stops[0]]
  const d = corridorKm(c, i, j)
  const fare = fareRange(baseFare(c.mode, d) * scale)
  const rideMinutes = Math.max(1, Math.round((d / c.speed) * 60))
  const step = j > i ? 1 : -1
  const path: Hub[] = []
  for (let k = i; k !== j + step; k += step) path.push(HUB_MAP[c.stops[k]])
  const via = path.slice(1, -1)
  return {
    mode: c.mode,
    from: from.name,
    to: to.name,
    distance: Math.round(d * 1000),
    time: c.wait + rideMinutes,
    fare,
    text: `${VEHICLE_WORD[c.mode]} from ${from.name} to ${to.name}`,
    tip: `${c.name} line, towards ${terminal.name}`,
    details: corridorDetails(c, from, to, terminal, via, fare, rideMinutes),
    via: via.map((h) => h.name),
    waypoints: path.map((h) => [h.lat, h.lng] as [number, number]),
    coords: path.map((h) => [h.lat, h.lng] as [number, number]),
    corridor: c.name,
  }
}

const HUB_EDGES: Record<string, Edge[]> = Object.fromEntries(HUBS.map((h) => [h.id, [] as Edge[]]))

for (const c of CORRIDORS) {
  const scale = corridorScale(c)
  for (let i = 0; i < c.stops.length; i++) {
    for (let j = 0; j < c.stops.length; j++) {
      if (i === j) continue
      HUB_EDGES[c.stops[i]].push({ to: c.stops[j], leg: corridorLeg(c, i, j, scale), boards: true })
    }
  }
}

// Short walking transfers between nearby boarding points
for (const a of HUBS) {
  for (const b of HUBS) {
    if (a.id === b.id) continue
    const d = roadKm(a, b)
    if (d <= 0.6) {
      HUB_EDGES[a.id].push({
        to: b.id,
        boards: false,
        leg: {
          mode: "walk",
          from: a.name,
          to: b.name,
          distance: Math.round(d * 1000),
          time: travelMinutes("walk", d),
          text: `Walk to ${b.name}`,
          details: walkDetails(a, b, d, travelMinutes("walk", d)),
          coords: [
            [a.lat, a.lng],
            [b.lat, b.lng],
          ],
        },
      })
    }
  }
}

/* ------------------------------------------------------------------ */
/* First and last mile                                                 */
/* ------------------------------------------------------------------ */

function metres(d: number) {
  return d < 1 ? `${Math.round((d * 1000) / 10) * 10} m` : `${d.toFixed(1)} km`
}

/**
 * Ways to get between a street address and a boarding point.
 * Never suggests walking more than MAX_WALK_KM (0.8 km in the city centre, where
 * keke/okada are banned and the alternative is a cab).
 */
function connectorLegs(a: Place, b: Place, zone: Zone, direction: "access" | "egress" | "direct"): Leg[] {
  const d = roadKm(a, b)
  const coords: [number, number][] = [
    [a.lat, a.lng],
    [b.lat, b.lng],
  ]
  const legs: Leg[] = []
  // You're basically there: a zero-cost hop that toJourney() drops.
  if (d < 0.08) return [{ mode: "walk", from: a.name, to: b.name, distance: 0, time: 0, text: "", details: [], coords }]
  const walkLimit = zone === "core" ? 0.8 : MAX_WALK_KM

  if (d <= walkLimit) {
    legs.push({
      mode: "walk",
      from: a.name,
      to: b.name,
      distance: Math.round(d * 1000),
      time: travelMinutes("walk", d),
      text: `Walk ${metres(d)} to ${b.name}`,
      details: walkDetails(a, b, d, travelMinutes("walk", d)),
      coords,
    })
    if (d <= MAX_WALK_KM) return legs
  }

  // Keke and okada are last-mile modes: short hops, never onto the expressways into town.
  if (kekeAllowed(zone) && d <= 5) {
    const fare = fareRange(baseFare("keke", d))
    legs.push({
      mode: "keke",
      from: a.name,
      to: b.name,
      distance: Math.round(d * 1000),
      time: SPEED.keke.wait + travelMinutes("keke", d),
      fare,
      text: `Keke to ${b.name}`,
      details: kekeDetails(a, b, fare, direction),
      coords,
    })
  }

  if (okadaAllowed(zone) && d <= 7) {
    const fare = fareRange(baseFare("okada", d))
    legs.push({
      mode: "okada",
      from: a.name,
      to: b.name,
      distance: Math.round(d * 1000),
      time: SPEED.okada.wait + travelMinutes("okada", d),
      fare,
      text: `Okada (bike) to ${b.name}`,
      details: okadaDetails(a, b, fare, direction),
      coords,
    })
  }

  // A cab works everywhere.
  const fare = fareRange(baseFare("taxi", d) * (d < 2 ? 1.3 : 1))
  legs.push({
    mode: "taxi",
    from: a.name,
    to: b.name,
    distance: Math.round(d * 1000),
    // Cabs rarely cruise inside estates and satellite towns; expect a longer wait there.
    time: (zone === "core" ? SPEED.taxi.wait : SPEED.taxi.wait + 4) + travelMinutes("taxi", d),
    fare,
    text: `Cab to ${b.name}`,
    tip: zone === "core" ? "Keke and okada aren't allowed in the city centre." : undefined,
    details: taxiDetails(a, b, fare, zone, direction),
    coords,
  })

  return legs
}

/** A keke/okada can only do a trip if both ends are somewhere it is allowed to operate. */
function stricter(a: Zone, b: Zone): Zone {
  if (a === "core" || b === "core") return "core"
  if (a === "estate" || b === "estate") return "estate"
  return "satellite"
}

function rideLeg(origin: GeoPoint, destination: GeoPoint): Leg {
  const d = roadKm(origin, destination)
  const minutes = travelMinutes("ride", d)
  return {
    mode: "ride",
    from: origin.name,
    to: destination.name,
    distance: Math.round(d * 1000),
    time: SPEED.ride.wait + minutes,
    fare: rideFare(d, minutes),
    text: `Bolt or inDrive to ${destination.name}`,
    tip: "Estimate from Bolt's last published Abuja rates (Aug 2024) plus fuel increases.",
    details: rideDetails(origin, destination, rideFare(d, minutes)),
    coords: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

const WEIGHTS: Record<RoutePreference, { time: number; naira: number; board: number; walkMin: number }> = {
  // generalised cost in "minutes"; naira = minutes per ₦1
  fast: { time: 1, naira: 1 / 250, board: 8, walkMin: 0.5 },
  cheap: { time: 0.35, naira: 1 / 30, board: 6, walkMin: 0.4 },
  simple: { time: 1, naira: 1 / 200, board: 25, walkMin: 2 },
}

function edgeCost(e: Edge, w: (typeof WEIGHTS)[RoutePreference]) {
  return (
    e.leg.time * w.time +
    fareMid(e.leg) * w.naira +
    (e.boards ? w.board : 0) +
    (e.leg.mode === "walk" ? e.leg.time * w.walkMin : 0)
  )
}

function nearestHubs(p: { lat: number; lng: number }, n: number, maxKm: number): Hub[] {
  return HUBS.map((h) => ({ h, d: km(p, h) }))
    .filter((x) => x.d <= maxKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.h)
}

function buildGraph(origin: GeoPoint, destination: GeoPoint) {
  const oZone = zoneOf(origin)
  const dZone = zoneOf(destination)
  const extra: Record<string, Edge[]> = { [ORIGIN]: [] }
  const toDest: Record<string, Edge[]> = {}

  let oHubs = nearestHubs(origin, 8, 10)
  if (!oHubs.length) oHubs = nearestHubs(origin, 2, 40)
  let dHubs = nearestHubs(destination, 8, 10)
  if (!dHubs.length) dHubs = nearestHubs(destination, 2, 40)

  for (const h of oHubs) {
    for (const leg of connectorLegs(origin, h, stricter(oZone, zoneOf(h)), "access")) {
      extra[ORIGIN].push({ to: h.id, leg, boards: leg.mode !== "walk" })
    }
  }
  for (const h of dHubs) {
    toDest[h.id] = connectorLegs(h, destination, stricter(zoneOf(h), dZone), "egress").map((leg) => ({
      to: DEST,
      leg,
      boards: leg.mode !== "walk",
    }))
  }

  // Direct, no boarding point needed
  const direct = roadKm(origin, destination)
  if (direct <= 8) {
    // Use the stricter of the two zones so we never send a keke into the city centre.
    for (const leg of connectorLegs(origin, destination, stricter(oZone, dZone), "direct")) {
      extra[ORIGIN].push({ to: DEST, leg, boards: leg.mode !== "walk" })
    }
  }

  return (id: string): Edge[] => {
    if (id === ORIGIN) return extra[ORIGIN]
    if (id === DEST) return []
    return [...(HUB_EDGES[id] ?? []), ...(toDest[id] ?? [])]
  }
}

function shortestPath(edgesOf: (id: string) => Edge[], pref: RoutePreference): Leg[] | null {
  // Search over (place, how you arrived) so rules about consecutive legs stay exact.
  type State = { key: string; node: string; last: Edge | null }
  const w = WEIGHTS[pref]
  const start: State = { key: ORIGIN, node: ORIGIN, last: null }
  const dist = new Map<string, number>([[start.key, 0]])
  const prev = new Map<string, { from: State; edge: Edge }>()
  const done = new Set<string>()
  const queue: State[] = [start]
  let goal: State | null = null

  while (queue.length) {
    queue.sort((a, b) => (dist.get(a.key) ?? Infinity) - (dist.get(b.key) ?? Infinity))
    const u = queue.shift()!
    if (done.has(u.key)) continue
    done.add(u.key)
    if (u.node === DEST) {
      goal = u
      break
    }
    for (const e of edgesOf(u.node)) {
      const p = u.last
      if (p && p.leg.mode === "walk" && e.leg.mode === "walk") continue
      if (p && p.leg.corridor && p.leg.corridor === e.leg.corridor) continue
      // Two cabs back to back is just one cab ride with extra steps.
      if (p && p.leg.mode === "taxi" && e.leg.mode === "taxi") continue
      const v: State = { key: `${e.to}|${e.leg.mode}|${e.leg.corridor ?? ""}`, node: e.to, last: e }
      const alt = (dist.get(u.key) ?? Infinity) + edgeCost(e, w)
      if (alt < (dist.get(v.key) ?? Infinity)) {
        dist.set(v.key, alt)
        prev.set(v.key, { from: u, edge: e })
        queue.push(v)
      }
    }
  }

  if (!goal) return null
  const legs: Leg[] = []
  let cur: State = goal
  while (cur.key !== ORIGIN) {
    const p = prev.get(cur.key)!
    legs.unshift(p.edge.leg)
    cur = p.from
  }
  return legs
}

/* ------------------------------------------------------------------ */
/* Journeys                                                            */
/* ------------------------------------------------------------------ */

const MODE_NAME: Record<TransportMode, string> = {
  walk: "Walk",
  bus: "Bus",
  taxi: "Cab",
  keke: "Keke",
  okada: "Okada",
  ride: "Bolt/inDrive",
}

function toJourney(legs: Leg[], label: string, origin: GeoPoint, destination: GeoPoint): Journey {
  legs = legs.filter((l) => !(l.mode === "walk" && l.distance === 0))
  // Name the street endpoints properly
  legs = legs.map((l, i) => ({
    ...l,
    from: i === 0 ? origin.name : l.from,
    to: i === legs.length - 1 ? destination.name : l.to,
  }))
  const vehicles = legs.filter((l) => l.mode !== "walk")
  const modes = legs.map((l) => l.mode)
  return {
    id: legs.map((l) => `${l.mode}:${l.from}>${l.to}`).join("|"),
    label,
    summary: modes.map((m) => MODE_NAME[m]).join(" → "),
    legs,
    time: legs.reduce((s, l) => s + l.time, 0),
    fare: [
      legs.reduce((s, l) => s + (l.fare?.[0] ?? 0), 0),
      legs.reduce((s, l) => s + (l.fare?.[1] ?? 0), 0),
    ],
    walk: legs.filter((l) => l.mode === "walk").reduce((s, l) => s + l.distance, 0),
    transfers: Math.max(0, vehicles.length - 1),
    modes,
    origin,
    destination,
  }
}

/**
 * Plan up to four distinct options: best public-transport route, cheapest, fewest changes,
 * and a door-to-door app ride for comparison.
 */
export function planJourneys(origin: GeoPoint, destination: GeoPoint): Journey[] {
  const edgesOf = buildGraph(origin, destination)
  const plans: { pref: RoutePreference; label: string }[] = [
    { pref: "fast", label: "Best route" },
    { pref: "cheap", label: "Cheapest" },
    { pref: "simple", label: "Fewest changes" },
  ]

  const out: Journey[] = []
  for (const { pref, label } of plans) {
    const legs = shortestPath(edgesOf, pref)
    if (!legs) continue
    const j = toJourney(legs, label, origin, destination)
    const dup = out.find((x) => x.id === j.id)
    if (dup) dup.also = [...(dup.also ?? []), label.toLowerCase()]
    else out.push(j)
  }

  // Short trips: walking is the answer, a ride option would be noise.
  const onlyWalk = out.length && out[0].modes.every((m) => m === "walk")
  if (!onlyWalk) out.push(toJourney([rideLeg(origin, destination)], "Door to door", origin, destination))
  return out
}

export { zoneOf }
