import type { Hub, Link, RoutePreference, GeoPoint, Leg, Journey, TransportMode } from "./types"
import { HUBS, LINKS, HUB_MAP } from "./network"

interface AdjEdge extends Link {
  neighbor: string
}

const ADJ: Record<string, AdjEdge[]> = {}
HUBS.forEach((h) => (ADJ[h.id] = []))
LINKS.forEach((e) => {
  ADJ[e.a].push({ ...e, neighbor: e.b })
  ADJ[e.b].push({ ...e, neighbor: e.a })
})

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const p = Math.PI / 180
  const dLat = (b.lat - a.lat) * p
  const dLng = (b.lng - a.lng) * p
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function nearestHub(p: { lat: number; lng: number }) {
  return HUBS.reduce(
    (best, h) => {
      const d = km(p, h)
      return d < best.distance ? { hub: h, distance: d } : best
    },
    { hub: HUBS[0], distance: Infinity },
  )
}

export function graphRoute(
  start: string,
  end: string,
  preference: RoutePreference = "fast",
) {
  const dist: Record<string, number> = {}
  const prev: Record<string, { from: string; edge: AdjEdge } | null> = {}
  const queue = new Set(HUBS.map((h) => h.id))

  HUBS.forEach((h) => (dist[h.id] = Infinity))
  dist[start] = 0

  while (queue.size) {
    let u = [...queue].reduce((a, b) => (dist[a] < dist[b] ? a : b))
    if (!Number.isFinite(dist[u])) break
    queue.delete(u)
    if (u === end) break

    for (const e of ADJ[u]) {
      const v = e.neighbor
      if (!queue.has(v)) continue
      const weight =
        preference === "cheap"
          ? e.fareMin / 25 + e.minutes
          : preference === "simple"
            ? e.minutes + (e.mode === "keke" ? 5 : 0)
            : e.minutes + e.fareMin / 100
      const alt = dist[u] + weight
      if (alt < dist[v]) {
        dist[v] = alt
        prev[v] = { from: u, edge: e }
      }
    }
  }

  if (!prev[end] && start !== end) return null

  const edges: (AdjEdge & { from: string; to: string })[] = []
  let cur = end
  while (cur !== start) {
    const p = prev[cur]
    if (!p) return null
    edges.unshift({ ...p.edge, from: p.from, to: cur })
    cur = p.from
  }
  return edges
}

export function buildJourney(
  origin: GeoPoint,
  destination: GeoPoint,
  preference: RoutePreference,
  label: string,
  a?: { hub: Hub; distance: number },
  b?: { hub: Hub; distance: number },
): Journey {
  a = a || nearestHub(origin)
  b = b || nearestHub(destination)
  const edges = graphRoute(a.hub.id, b.hub.id, preference) || []
  const legs: Leg[] = []

  if (a.distance > 0.05) {
    legs.push({
      mode: "walk",
      from: origin.name,
      to: a.hub.name,
      distance: Math.round(a.distance * 1000),
      time: Math.max(2, Math.round(a.distance * 12)),
      text: `Walk to ${a.hub.name}, your nearest supported Along stop.`,
      coords: [
        [origin.lat, origin.lng],
        [a.hub.lat, a.hub.lng],
      ],
    })
  }

  edges.forEach((e) => {
    const f = HUB_MAP[e.from]
    const t = HUB_MAP[e.to]
    legs.push({
      mode: e.mode as TransportMode,
      from: f.name,
      to: t.name,
      time: e.minutes,
      fare: [e.fareMin, e.fareMax],
      text: `Take a ${e.mode} going to ${t.name}. Drop at ${t.name}.`,
      coords: [
        [f.lat, f.lng],
        [t.lat, t.lng],
      ],
      confidence: e.confidence,
    })
  })

  if (b.distance > 0.05) {
    legs.push({
      mode: "walk",
      from: b.hub.name,
      to: destination.name,
      distance: Math.round(b.distance * 1000),
      time: Math.max(2, Math.round(b.distance * 12)),
      text: `Walk from ${b.hub.name} to ${destination.name}.`,
      coords: [
        [b.hub.lat, b.hub.lng],
        [destination.lat, destination.lng],
      ],
    })
  }

  if (!legs.length) {
    const d = km(origin, destination)
    legs.push({
      mode: "walk",
      from: origin.name,
      to: destination.name,
      distance: Math.round(d * 1000),
      time: Math.round(d * 12),
      text: `Walk to ${destination.name}.`,
      coords: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
    })
  }

  const fares = legs.filter((l) => l.fare)
  const walk = legs
    .filter((l) => l.mode === "walk")
    .reduce((s, l) => s + (l.distance || 0), 0)
  const modes = legs.map((l) => l.mode)
  const changes = Math.max(0, legs.filter((l) => l.mode !== "walk").length - 1)

  return {
    label,
    legs,
    time: legs.reduce((s, l) => s + l.time, 0),
    fare: [
      fares.reduce((s, l) => s + (l.fare?.[0] ?? 0), 0),
      fares.reduce((s, l) => s + (l.fare?.[1] ?? 0), 0),
    ],
    walk,
    transfers: changes,
    confidence: edges.every((e) => e.confidence === "High") ? "High" : "Medium",
    modes: modes as TransportMode[],
    origin,
    destination,
  }
}
