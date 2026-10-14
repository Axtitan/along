import type { GeocodeResult } from "./types"
import { HUBS } from "./network"
import { km } from "./geo"

type Row = [name: string, lat: number, lng: number, kind: string]

/** Popular destinations, coordinates checked against OpenStreetMap (Oct 2026). */
const LANDMARKS: Row[] = [
  ["Jabi Lake Mall", 9.0765, 7.4252, "Mall, Jabi"],
  ["Ceddi Plaza", 9.0552, 7.4898, "Mall, Central Area"],
  ["Grand Square", 9.053, 7.4791, "Mall, Central Area"],
  ["Banex Plaza", 9.0839, 7.4689, "Shopping, Wuse II"],
  ["Wuse Market", 9.0686, 7.4659, "Market, Wuse"],
  ["Utako Market", 9.0655, 7.446, "Market, Utako"],
  ["Area 1 Shopping Complex", 9.0319, 7.4715, "Market, Garki"],
  ["Dei-Dei Building Materials Market", 9.0998, 7.2779, "Market, Dei-Dei"],
  ["Dunes Center", 9.0839, 7.4847, "Shopping, Maitama"],
  ["National Hospital", 9.0399, 7.462, "Hospital, Central Area"],
  ["Wuse General Hospital", 9.0629, 7.469, "Hospital, Wuse"],
  ["Garki Hospital", 9.0336, 7.4846, "Hospital, Garki"],
  ["Asokoro District Hospital", 9.0459, 7.523, "Hospital, Asokoro"],
  ["Gwarinpa General Hospital", 9.0771, 7.3984, "Hospital, Life Camp"],
  ["Kubwa General Hospital", 9.1574, 7.341, "Hospital, Kubwa"],
  ["University of Abuja Teaching Hospital", 8.9496, 7.0624, "Hospital, Gwagwalada"],
  ["University of Abuja", 8.9808, 7.1753, "University, Airport Road"],
  ["Baze University", 9.0063, 7.4047, "University, Kuchingoro"],
  ["Nile University", 9.0143, 7.3963, "University, Jabi Airport Road"],
  ["Federal Secretariat", 9.0631, 7.4981, "Government, Central Area"],
  ["Eagle Square", 9.0609, 7.4998, "Landmark, Central Area"],
  ["National Mosque", 9.0602, 7.4896, "Landmark, Central Area"],
  ["National Christian Centre", 9.0516, 7.4951, "Landmark, Central Area"],
  ["Millennium Park", 9.0716, 7.4995, "Park, Maitama"],
  ["Unity Fountain", 9.073, 7.4962, "Park, Maitama"],
  ["Transcorp Hilton", 9.075, 7.4949, "Hotel, Maitama"],
  ["Sheraton Abuja Hotel", 9.0633, 7.4843, "Hotel, Wuse"],
  ["Moshood Abiola National Stadium", 9.038, 7.4534, "Stadium, Kukwaba"],
  ["Magicland Amusement Park", 9.0428, 7.4529, "Leisure, Kukwaba"],
  ["Abuja City Gate", 9.0357, 7.4486, "Landmark, Kukwaba"],
  ["Nicon Junction", 9.0957, 7.4753, "Junction, Maitama"],
  ["Nnamdi Azikiwe International Airport", 9.0068, 7.2631, "Airport"],
]

/** Neighbourhoods, districts and towns from OpenStreetMap place nodes (ODbL). */
const OSM_PLACES: Row[] = [
  ["Aba", 8.9144, 7.6356, "Village"],
  ["Ado", 9.0122, 7.6333, "Town"],
  ["Aso", 9.0519, 7.53, "Village"],
  ["Asokoro", 9.0423, 7.5197, "District"],
  ["Azu", 9.3167, 7.3333, "Village"],
  ["Babun Tunga", 9.2342, 7.2186, "Village"],
  ["Budupe", 9.1862, 7.469, "Village"],
  ["Bwari", 9.2799, 7.3822, "Village"],
  ["CBN Quarters Lugbe Phase 2", 8.991, 7.3575, "Neighbourhood"],
  ["Dachino", 9.2228, 7.2283, "Village"],
  ["Dakibiyu", 9.0412, 7.4206, "District"],
  ["Daku", 9.3339, 7.213, "Village"],
  ["Dam Camp", 9.1954, 7.4028, "Village"],
  ["Dawliko", 9.0578, 7.2069, "Village"],
  ["Durumi", 9.1716, 7.4998, "Village"],
  ["Durumi", 9.0195, 7.4643, "District"],
  ["Dutsen Alhaji", 9.14, 7.3727, "Town"],
  ["Galadimawa", 8.9847, 7.4306, "Village"],
  ["Galadimawa Village", 8.9946, 7.4239, "Village"],
  ["Garki", 9.0131, 7.4813, "District"],
  ["Garki", 9.0352, 7.4818, "District"],
  ["Garki II", 9.0322, 7.4986, "District"],
  ["Gudu", 9.0082, 7.4799, "District"],
  ["Guidna", 9.126, 7.3116, "Neighbourhood"],
  ["Gurfata", 9.1281, 7.0611, "Village"],
  ["Guzape", 9.0189, 7.52, "Village"],
  ["Guzape", 9.0112, 7.5073, "District"],
  ["Gwachife", 9.2667, 7.0667, "Village"],
  ["Gwagwalada", 8.936, 7.0859, "Town"],
  ["Gwarinpa", 9.0994, 7.4081, "Town"],
  ["Idon Kasa", 8.9859, 7.2099, "Village"],
  ["Ija Gwari", 9.2414, 7.2836, "Village"],
  ["Ikwa", 9.0919, 7.2083, "Village"],
  ["Izom", 9.2461, 7.0072, "Village"],
  ["Jabi", 9.0646, 7.421, "District"],
  ["Jahi", 9.1096, 7.4388, "District"],
  ["Jigape", 9.0875, 7.115, "Village"],
  ["Jigbodo", 9.2278, 7.0678, "Village"],
  ["Jikakuchi", 9.1081, 7.5586, "Village"],
  ["Jiru", 9.1168, 7.4546, "Village"],
  ["Kabusu", 9.1951, 7.6279, "Village"],
  ["Kado", 9.0907, 7.4274, "District"],
  ["Kagini", 9.1327, 7.2988, "Village"],
  ["Kagwaru", 9.174, 7.6822, "Village"],
  ["Karmajiji", 9.024, 7.423, "Village"],
  ["Karshi", 8.8278, 7.55, "Village"],
  ["Karu", 9.0114, 7.5751, "Village"],
  ["Karum", 9.0578, 7.3786, "Village"],
  ["Katambe", 9.0132, 7.5859, "Village"],
  ["Katampe", 9.1029, 7.4617, "District"],
  ["Kato", 9.2414, 7.3028, "Village"],
  ["Kaura", 9.0032, 7.4456, "District"],
  ["Kogi", 9.1813, 7.4721, "Village"],
  ["Kubwa", 9.1527, 7.3411, "Town"],
  ["Kuchbuni", 9.2192, 7.3514, "Village"],
  ["Kuchidna", 9.1535, 7.6277, "Village"],
  ["Kuchin Pwere", 9.2475, 7.2344, "Village"],
  ["Kuchingoro", 9.0163, 7.4204, "Village"],
  ["Kugbo", 9.0228, 7.5481, "Village"],
  ["Kuje", 8.8796, 7.2272, "Town"],
  ["Kukwaba", 9.0339, 7.4497, "District"],
  ["Kurunduma", 9.0161, 7.5294, "Village"],
  ["Kwali", 8.8206, 7.0372, "Town"],
  ["Mabushi", 9.0838, 7.4494, "District"],
  ["Madalla", 9.0964, 7.2128, "Town"],
  ["Maitama", 9.0901, 7.4908, "District"],
  ["Mallam Koro", 9.2667, 7.1333, "Village"],
  ["Mape", 9.1447, 7.4927, "Village"],
  ["Masaka", 9.005, 7.6736, "Town"],
  ["Mashapa", 9.1631, 7.4842, "Village"],
  ["Muron", 9.2667, 7.1, "Village"],
  ["NCCE Quarters Karmo", 9.0556, 7.3748, "Neighbourhood"],
  ["Nyanya", 9.0213, 7.5699, "Village"],
  ["Pasere", 9.0047, 7.1556, "Village"],
  ["Sabojibi", 9.1166, 7.2602, "Village"],
  ["Sara", 8.7869, 7.7083, "Village"],
  ["Share", 9.2325, 7.4958, "Village"],
  ["Shishipe", 9.1618, 7.5202, "Village"],
  ["Suleja", 9.1758, 7.1808, "Village"],
  ["Tunga Gwuntu", 9.2165, 7.2225, "Village"],
  ["Tunga Mekidi", 9.2193, 7.2237, "Village"],
  ["Uke", 8.9172, 7.6975, "Village"],
  ["Utako", 9.0691, 7.4435, "District"],
  ["Wuse", 9.062, 7.4666, "District"],
  ["Wuse II", 9.0762, 7.476, "District"],
  ["Wuye", 9.0498, 7.4425, "District"],]

interface Entry {
  name: string
  detail: string
  lat: number
  lng: number
  source: GeocodeResult["source"]
  keys: string[]
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const INDEX: Entry[] = (() => {
  const out: Entry[] = []
  const seen = new Set<string>()
  const add = (e: Omit<Entry, "keys">, extra: string[] = []) => {
    const k = norm(e.name)
    if (seen.has(k)) return
    seen.add(k)
    out.push({ ...e, keys: [k, ...extra.map(norm)] })
  }
  for (const h of HUBS) {
    add({ name: h.name, detail: h.kind, lat: h.lat, lng: h.lng, source: "hub" }, h.aliases)
  }
  for (const [name, lat, lng, kind] of LANDMARKS) add({ name, detail: kind, lat, lng, source: "place" })
  for (const [name, lat, lng, kind] of OSM_PLACES) add({ name, detail: `${kind}, FCT`, lat, lng, source: "place" })
  return out
})()

/**
 * Instant, offline matches for Abuja places. Scores whole-name prefix > word prefix > substring,
 * and nudges results near `near` (the user's location) upwards.
 */
export function searchLocal(query: string, near?: { lat: number; lng: number }, limit = 5): GeocodeResult[] {
  const q = norm(query)
  if (!q) return []
  const scored: { e: Entry; score: number }[] = []
  for (const e of INDEX) {
    let score = 0
    for (const k of e.keys) {
      if (k === q) score = Math.max(score, 100)
      else if (k.startsWith(q)) score = Math.max(score, 80)
      else if (k.split(" ").some((w) => w.startsWith(q))) score = Math.max(score, 60)
      else if (q.length >= 3 && k.includes(q)) score = Math.max(score, 40)
    }
    if (!score) continue
    if (e.source === "hub") score += 5
    if (near) score -= Math.min(15, km(near, e) / 3)
    scored.push({ e, score })
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ e }) => ({ name: e.name, detail: e.detail, lat: e.lat, lng: e.lng, type: e.source, source: e.source }))
}

/** Closest known Abuja place (stop, landmark or neighbourhood) within `maxKm`. */
export function nearestPlace(p: { lat: number; lng: number }, maxKm = 2) {
  let best: { e: Entry; d: number } | null = null
  for (const e of INDEX) {
    const d = km(p, e)
    if (d <= maxKm && (!best || d < best.d)) best = { e, d }
  }
  return best ? { name: best.e.name, km: best.d } : null
}

export const POPULAR_PLACES = ["Wuse Market", "Jabi Lake Mall", "Federal Secretariat", "Area 1", "Nyanya", "Kubwa"]
  .map((n) => searchLocal(n, undefined, 1)[0])
  .filter(Boolean)
