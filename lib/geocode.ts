import type { GeocodeResult, GeoPoint } from "./types"
import { correctQuery, loadPlaceIndex, nearestPlace, searchLocal } from "./places"
import { km } from "./geo"

const remoteCache = new Map<string, GeocodeResult[]>()

/** Remote search through our proxy (Photon → Nominatim). Abortable so typing cancels stale requests. */
export async function searchRemote(
  query: string,
  near?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const key = `${q.toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ""}`
  const hit = remoteCache.get(key)
  if (hit) return hit

  const u = new URL("/api/geocode", window.location.origin)
  u.searchParams.set("q", q)
  if (near) {
    u.searchParams.set("lat", near.lat.toFixed(4))
    u.searchParams.set("lon", near.lng.toFixed(4))
  }
  const r = await fetch(u, { signal })
  if (!r.ok) return []
  const x = (await r.json()) as { results?: Omit<GeocodeResult, "source">[] }
  const results = (x.results ?? []).map((v) => ({ ...v, source: "search" as const }))
  remoteCache.set(key, results)
  return results
}

/**
 * Merge instant local matches (hubs, landmarks, districts) with remote results,
 * dropping remote duplicates that sit on top of a local match.
 */
export function mergeResults(local: GeocodeResult[], remote: GeocodeResult[], limit = 7) {
  const out = [...local]
  for (const r of remote) {
    const dup = out.some(
      (l) => km(l, r) < 0.3 && (l.name.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(l.name.toLowerCase())),
    )
    if (!dup) out.push(r)
  }
  return out.slice(0, limit)
}

/** Best single match for free text — used when someone presses "Find route" without picking a suggestion. */
export async function resolvePlace(text: string, near?: { lat: number; lng: number }): Promise<GeoPoint | null> {
  await loadPlaceIndex()
  const local = searchLocal(text, near, 1)[0]
  // A confident offline match (even with a typo) wins: "jabi laek" → Jabi Lake Mall.
  if (local && local.score >= 0.85) return local
  try {
    const remote = await searchRemote(text, near)
    if (remote[0]) return remote[0]
    const fixed = correctQuery(text)
    if (fixed !== text.trim().toLowerCase()) {
      const retry = await searchRemote(fixed, near)
      if (retry[0]) return retry[0]
    }
  } catch {}
  return local ?? null
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; detail?: string }> {
  try {
    const u = new URL("/api/geocode", window.location.origin)
    u.searchParams.set("lat", lat.toFixed(6))
    u.searchParams.set("lon", lng.toFixed(6))
    const r = await fetch(u)
    if (r.ok) {
      const x = await r.json()
      const first = x.results?.[0]
      if (first?.name) {
        if (first.precise !== false) return { name: first.name, detail: first.detail }
        // Street has no name in OpenStreetMap: describe it by the nearest place people know.
        const near = nearestPlace({ lat, lng })
        if (near) return { name: near.km < 0.15 ? near.name : `Near ${near.name}`, detail: first.name }
        return { name: first.name, detail: first.detail }
      }
    }
  } catch {}
  const near = nearestPlace({ lat, lng })
  return { name: near ? `Near ${near.name}` : "Dropped pin", detail: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
}

/* ------------------------- recent places ------------------------- */

const RECENT_KEY = "along-recent-places"
const MAX_RECENT = 30

export function getRecent(): GeocodeResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as GeocodeResult[]).map((r) => ({ ...r, source: "recent" as const })) : []
  } catch {
    return []
  }
}

export function saveRecent(p: GeoPoint) {
  if (p.type === "gps" || p.type === "pin") return
  try {
    const list = getRecent().filter((r) => r.name !== p.name)
    list.unshift({ name: p.name, detail: p.detail, lat: p.lat, lng: p.lng, type: p.type || "place", source: "recent" })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
  } catch {}
}
