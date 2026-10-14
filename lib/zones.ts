import type { Zone } from "./types"
import { km } from "./geo"

/**
 * Where keke and okada can actually pick you up.
 *
 * FCTA rules (restated by the FCT Minister, Aug 2026; DRTS enforcement Dec 2025):
 * - Keke NAPEP and okada are banned from the city centre and from expressways
 *   (Ahmadu Bello Way, Nnamdi Azikiwe Expressway, Obafemi Awolowo Way, …).
 * - They may operate in the area councils and satellite towns (Nyanya, Kurudu, Orozo,
 *   Karshi, Bwari, Kubwa, Lugbe, Gwagwalada, Kwali, Abaji) and inside estates.
 * - Okada is additionally restricted in Phase 2 districts such as Idu, Jahi, Gudu,
 *   Galadimawa and Life Camp (2022 and 2024 FCTA enforcement notices).
 *
 * Each anchor covers a circle; the smallest circle containing a point wins.
 */
interface Anchor {
  name: string
  lat: number
  lng: number
  radius: number
  zone: Zone
}

const ANCHORS: Anchor[] = [
  // Satellite towns — keke and okada
  { name: "Kubwa", lat: 9.1527, lng: 7.3411, radius: 4.5, zone: "satellite" },
  { name: "Dutse Alhaji", lat: 9.1417, lng: 7.3726, radius: 2.5, zone: "satellite" },
  { name: "Bwari", lat: 9.2799, lng: 7.3822, radius: 5, zone: "satellite" },
  { name: "Ushafa", lat: 9.2108, lng: 7.3951, radius: 3, zone: "satellite" },
  { name: "Mpape", lat: 9.1447, lng: 7.4927, radius: 2.5, zone: "satellite" },
  { name: "Nyanya", lat: 9.0281, lng: 7.5807, radius: 2.5, zone: "satellite" },
  { name: "Karu", lat: 9.0114, lng: 7.5751, radius: 2, zone: "satellite" },
  { name: "Mararaba", lat: 9.029, lng: 7.6, radius: 3, zone: "satellite" },
  { name: "Masaka", lat: 9.005, lng: 7.6736, radius: 4, zone: "satellite" },
  { name: "Jikwoyi / Kurudu", lat: 8.9793, lng: 7.5605, radius: 3.5, zone: "satellite" },
  { name: "Karshi / Orozo", lat: 8.9, lng: 7.56, radius: 6, zone: "satellite" },
  { name: "Lugbe", lat: 8.985, lng: 7.368, radius: 4, zone: "satellite" },
  { name: "Chika / Kuchingoro", lat: 8.995, lng: 7.405, radius: 2, zone: "satellite" },
  { name: "Sauka / Airport Road", lat: 8.9577, lng: 7.252, radius: 4, zone: "satellite" },
  { name: "Kuje", lat: 8.8796, lng: 7.2272, radius: 6, zone: "satellite" },
  { name: "Gwagwalada", lat: 8.936, lng: 7.0859, radius: 8, zone: "satellite" },
  { name: "Zuba / Madalla", lat: 9.0932, lng: 7.216, radius: 4, zone: "satellite" },
  { name: "Suleja", lat: 9.1758, lng: 7.1808, radius: 5, zone: "satellite" },
  { name: "Dei-Dei", lat: 9.1142, lng: 7.2604, radius: 3, zone: "satellite" },
  { name: "Gwagwa", lat: 9.0896, lng: 7.2857, radius: 3, zone: "satellite" },
  { name: "Apo Resettlement", lat: 8.9732, lng: 7.5045, radius: 1.8, zone: "satellite" },
  // Estates and fringe districts — keke inside the estate, okada restricted
  { name: "Gwarinpa Estate", lat: 9.1098, lng: 7.403, radius: 3, zone: "estate" },
  { name: "Dawaki", lat: 9.1247, lng: 7.3887, radius: 2, zone: "estate" },
  { name: "Karmo", lat: 9.0556, lng: 7.3748, radius: 2.5, zone: "estate" },
  { name: "Idu", lat: 9.0464, lng: 7.3428, radius: 2.5, zone: "estate" },
  { name: "Life Camp / Kafe", lat: 9.08, lng: 7.395, radius: 2, zone: "estate" },
  { name: "Lokogoma", lat: 8.967, lng: 7.465, radius: 2.5, zone: "estate" },
  { name: "Galadimawa", lat: 8.9847, lng: 7.4306, radius: 2, zone: "estate" },
  { name: "Kabusa", lat: 8.9654, lng: 7.439, radius: 2, zone: "estate" },
  { name: "Gudu / Apo", lat: 9.0, lng: 7.485, radius: 2, zone: "estate" },
  // City centre — no keke, no okada
  { name: "Central Area", lat: 9.0556, lng: 7.4914, radius: 3.5, zone: "core" },
  { name: "Wuse / Wuse II", lat: 9.07, lng: 7.468, radius: 3, zone: "core" },
  { name: "Maitama", lat: 9.0901, lng: 7.4908, radius: 2.5, zone: "core" },
  { name: "Asokoro", lat: 9.0423, lng: 7.5197, radius: 2.5, zone: "core" },
  { name: "Garki", lat: 9.033, lng: 7.484, radius: 2.5, zone: "core" },
  { name: "Utako / Jabi", lat: 9.067, lng: 7.435, radius: 2.5, zone: "core" },
  { name: "Mabushi / Katampe", lat: 9.09, lng: 7.455, radius: 2.5, zone: "core" },
  { name: "Wuye / Durumi", lat: 9.035, lng: 7.452, radius: 2.5, zone: "core" },
  { name: "Jahi", lat: 9.1096, lng: 7.4388, radius: 1.8, zone: "core" },
]

const CITY_CENTRE = { lat: 9.0556, lng: 7.4914 }

export function zoneOf(p: { lat: number; lng: number }): Zone {
  let best: Anchor | null = null
  for (const a of ANCHORS) {
    if (km(p, a) <= a.radius && (!best || a.radius < best.radius)) best = a
  }
  if (best) return best.zone
  // Outside every named area: judge by distance from the Central Area.
  const d = km(p, CITY_CENTRE)
  if (d < 8) return "core"
  if (d < 13) return "estate"
  return "satellite"
}

/** Name of the area a point falls in (e.g. "Kubwa"), for phrases like "keke around Kubwa". */
export function areaName(p: { lat: number; lng: number }): string | null {
  let best: Anchor | null = null
  for (const a of ANCHORS) {
    if (km(p, a) <= a.radius && (!best || a.radius < best.radius)) best = a
  }
  return best?.name ?? null
}

export function kekeAllowed(z: Zone) {
  return z !== "core"
}

export function okadaAllowed(z: Zone) {
  return z === "satellite"
}

export function zoneNote(z: Zone) {
  if (z === "core") return "Keke and okada are not allowed in the city centre."
  if (z === "estate") return "Keke run inside the estate; okada are restricted here."
  return "Keke and okada operate here."
}
