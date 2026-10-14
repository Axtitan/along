#!/usr/bin/env node
/**
 * Builds public/data/abuja-places.json — the offline search index of named places in Abuja
 * (POIs, streets, estates, districts) from OpenStreetMap via the free Overpass API.
 *
 *   node scripts/build-places.mjs                 # download from Overpass and build
 *   node scripts/build-places.mjs --from <dir>    # build from previously downloaded *.json files
 *
 * Data © OpenStreetMap contributors, ODbL. Re-run every few months to pick up new places.
 */
import fs from "node:fs"
import path from "node:path"

const BBOX = "8.75,7.0,9.35,7.75" // south,west,north,east — FCT plus Mararaba/Masaka and Suleja
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "public", "data", "abuja-places.json")

const QUERIES = {
  poi_amenity: `nwr["name"]["amenity"](${BBOX});`,
  poi_shop: `nwr["name"]["shop"](${BBOX});`,
  poi_misc: `nwr["name"]["tourism"](${BBOX});nwr["name"]["leisure"](${BBOX});nwr["name"]["healthcare"](${BBOX});`,
  poi_office: `nwr["name"]["office"](${BBOX});nwr["name"]["craft"](${BBOX});`,
  streets: `way["name"]["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"](${BBOX});`,
  areas: `nwr["name"]["landuse"~"residential|commercial|retail"](${BBOX});nwr["name"]["place"](${BBOX});nwr["name"]["building"~"commercial|retail|office|hotel|church|mosque|school|university|hospital|government|public"](${BBOX});`,
  stops: `node["name"]["highway"="bus_stop"](${BBOX});node["name"]["public_transport"](${BBOX});`,
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function overpass(query) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": "Along-Abuja/1.0 (places index builder)", "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(`[out:json][timeout:170];(${query});out center tags;`),
    }).catch(() => null)
    const text = res?.ok ? await res.text() : ""
    if (text.startsWith("{")) return JSON.parse(text)
    console.warn(`  Overpass busy (attempt ${attempt}), retrying…`)
    await sleep(20000)
  }
  throw new Error("Overpass unavailable")
}

async function load() {
  const fromIdx = process.argv.indexOf("--from")
  const out = {}
  for (const [key, q] of Object.entries(QUERIES)) {
    if (fromIdx > 0) {
      const file = path.join(process.argv[fromIdx + 1], `${key}.json`)
      out[key] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { elements: [] }
    } else {
      console.log(`Downloading ${key}…`)
      out[key] = await overpass(q)
    }
  }
  return out
}

/* --------------------------------- labels -------------------------------- */

const LABELS = {
  place_of_worship: (t) => (t.religion === "muslim" ? "Mosque" : t.religion === "christian" ? "Church" : "Place of worship"),
  fuel: "Filling station",
  bus_station: "Motor park",
  marketplace: "Market",
  townhall: "Government office",
  police: "Police station",
  clinic: "Clinic",
  doctors: "Clinic",
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  school: "School",
  kindergarten: "School",
  college: "College",
  university: "University",
  bank: "Bank",
  atm: "ATM",
  restaurant: "Restaurant",
  fast_food: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  pub: "Bar",
  hotel: "Hotel",
  guest_house: "Guest house",
  mall: "Mall",
  supermarket: "Supermarket",
  park: "Park",
  stadium: "Stadium",
  sports_centre: "Sports centre",
  government: "Government office",
  embassy: "Embassy",
  diplomatic: "Embassy",
  residential: "Estate",
  commercial: "Business area",
  retail: "Shopping area",
  suburb: "District",
  neighbourhood: "Neighbourhood",
  quarter: "Neighbourhood",
  village: "Village",
  town: "Town",
  hamlet: "Village",
  bus_stop: "Bus stop",
}

const LOOKS_LIKE_STOP = /stop|junction|park|bridge|roundabout|garage|gate|market|terminal|station|express/i
const JUNK_KINDS = new Set(["fixme", "public", "yes", "dabi"])

function kindOf(t) {
  // Many OSM "bus stops" in Abuja are really shops tagged by mistake; only trust stop-like names.
  if (t.highway === "bus_stop" || t.public_transport) return LOOKS_LIKE_STOP.test(t.name ?? "") ? "Bus stop" : "Place"
  if (t.highway) return "Street"
  for (const key of ["amenity", "shop", "tourism", "leisure", "healthcare", "office", "craft", "place", "landuse", "building"]) {
    const v = t[key]?.split(";")[0]
    if (!v || JUNK_KINDS.has(v.toLowerCase())) continue
    if (v === "love_hotel") return "Hotel"
    const l = LABELS[v]
    if (typeof l === "function") return l(t)
    if (l) return l
    if (key === "shop") return "Shop"
    if (key === "office") return "Office"
    return v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  }
  return "Place"
}

/* --------------------------------- helpers -------------------------------- */

function km(a, b) {
  const p = Math.PI / 180
  const s = Math.sin(((b.lat - a.lat) * p) / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(((b.lng - a.lng) * p) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(s))
}

function goodName(n) {
  return n && n.length >= 2 && !/[ÃâÂ�]/.test(n) && !/^[\d\s.,/-]+$/.test(n) && !/^\+?\w{4}\+\w{2,3}/.test(n)
}

function tidy(n) {
  return n.replace(/\s+/g, " ").trim().replace(/\bQuaters\b/g, "Quarters")
}

/* ---------------------------------- build --------------------------------- */

const data = await load()

// Areas for the "detail" line: districts, neighbourhoods, towns and villages.
const areaNodes = data.areas.elements
  .filter((e) => e.tags?.place && ["suburb", "neighbourhood", "quarter", "town", "village", "city"].includes(e.tags.place) && e.lat)
  .map((e) => ({ name: tidy(e.tags.name).replace(/ District$/, ""), lat: e.lat, lng: e.lon, town: e.tags.place === "town" }))
  .filter((a) => a.name !== "Abuja")

function areaFor(p) {
  let best = null
  for (const a of areaNodes) {
    const d = km(p, a)
    const limit = a.town ? 6 : 3
    if (d <= limit && (!best || d < best.d)) best = { a, d }
  }
  return best?.a.name ?? null
}

const raw = []
for (const [key, j] of Object.entries(data)) {
  for (const e of j.elements) {
    const t = e.tags ?? {}
    const name = tidy(t["name:en"] || t.name || "")
    if (!goodName(name)) continue
    const lat = e.lat ?? e.center?.lat
    const lng = e.lon ?? e.center?.lon
    if (lat == null || lng == null) continue
    raw.push({ name, lat, lng, kind: kindOf(t), street: key === "streets" })
  }
}

// Merge duplicates: same name within 300 m (POIs) or 1.5 km (street segments).
const groups = new Map()
for (const r of raw) {
  const k = r.name.toLowerCase()
  const list = groups.get(k) ?? []
  const radius = r.street ? 1.5 : 0.3
  const near = list.find((g) => km(g, r) <= radius)
  if (near) {
    near.n++
    near.lat += (r.lat - near.lat) / near.n
    near.lng += (r.lng - near.lng) / near.n
    if (near.kind === "Place" || near.kind === "Street") near.kind = r.kind === "Street" ? near.kind : r.kind
  } else list.push({ ...r, n: 1 })
  groups.set(k, list)
}

const kinds = []
const areas = []
const idx = (arr, v) => {
  if (v == null) return -1
  let i = arr.indexOf(v)
  if (i < 0) i = arr.push(v) - 1
  return i
}

const places = []
for (const list of groups.values()) {
  for (const g of list) {
    const area = areaFor(g)
    places.push([g.name, +g.lat.toFixed(5), +g.lng.toFixed(5), idx(kinds, g.kind), area && area !== g.name ? idx(areas, area) : -1])
  }
}
places.sort((a, b) => a[0].localeCompare(b[0]))

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(
  OUT,
  JSON.stringify({
    v: 1,
    generated: new Date().toISOString().slice(0, 10),
    attribution: "© OpenStreetMap contributors, ODbL",
    kinds,
    areas,
    places,
  }),
)
console.log(`Wrote ${places.length} places (${kinds.length} kinds, ${areas.length} areas) to ${OUT}`)
