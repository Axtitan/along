#!/usr/bin/env node
/**
 * Builds public/data/abuja-places.json — the offline search index of named places in Abuja
 * (POIs, streets, estates, districts) from OpenStreetMap via the free Overpass API.
 *
 *   node scripts/build-places.mjs                 # download from Overpass and build
 *   node scripts/build-places.mjs --from <dir>    # build from previously downloaded *.json files
 *   node scripts/build-places.mjs --overture overture-abuja.json   # also add Overture places & streets
 *                                                 # (export it with scripts/fetch-overture.py)
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

/* -------------------------------- Overture -------------------------------- */
// Optional: `--overture overture-abuja.json` from scripts/fetch-overture.py.
// Overture has ~10× more Abuja businesses than OSM, and their addresses name many streets
// OSM doesn't have yet (e.g. "Plot 1088 Isiyaku Ismaila Crescent, Wuye").

const overtureIdx = process.argv.indexOf("--overture")
const overtureFile = overtureIdx > 0 ? process.argv[overtureIdx + 1] : null
if (overtureFile && !fs.existsSync(overtureFile)) {
  console.warn(`No ${overtureFile} — run "npm run fetch:overture" first to include Overture places. Continuing with OpenStreetMap only.`)
}
const overture = overtureFile && fs.existsSync(overtureFile) ? JSON.parse(fs.readFileSync(overtureFile, "utf8")) : []

const SUFFIX = {
  street: "Street", st: "Street", str: "Street",
  crescent: "Crescent", cresc: "Crescent", cres: "Crescent", cr: "Crescent",
  close: "Close", cl: "Close",
  road: "Road", rd: "Road",
  avenue: "Avenue", ave: "Avenue", av: "Avenue",
  way: "Way", wy: "Way",
  drive: "Drive", dr: "Drive",
  lane: "Lane", ln: "Lane",
  boulevard: "Boulevard", blvd: "Boulevard",
  expressway: "Expressway",
}
const LEADING_JUNK = /^(?:(?:plot|plt|no|number|house|hse|block|blk|suite|flat|shop|unit|km|#)\.?\s*[\w/-]*\s*,?\s*)+/i
const PREFIX_WORDS = /^(?:off|along|by|opp|opposite|behind|beside|near|at|after|before)\.?\s+/i
const AREA_WORDS = new Set(
  ["wuse", "wuse ii", "wuse 2", "maitama", "asokoro", "garki", "garki ii", "utako", "jabi", "wuye", "gwarinpa", "gwarimpa",
   "kubwa", "lugbe", "durumi", "gudu", "apo", "life camp", "kado", "jahi", "katampe", "mabushi", "guzape", "lokogoma",
   "galadimawa", "karu", "nyanya", "dawaki", "gwagwalada", "kuje", "bwari", "idu", "karmo", "dutse", "mpape", "kaura",
   "central business district", "cbd", "central area", "area 1", "area 2", "area 3", "area 8", "area 10", "area 11",
   "lifecamp", "kafe", "dakibiyu", "jikwoyi", "mararaba", "zuba", "dei-dei", "deidei", "wumba", "kabusa", "sauka"].map((s) => s),
)
const AREA_LABEL = (s) =>
  ({ "wuse ii": "Wuse II", "wuse 2": "Wuse II", "garki ii": "Garki II", cbd: "Central Area", "central business district": "Central Area",
     gwarimpa: "Gwarinpa", lifecamp: "Life Camp", deidei: "Dei-Dei" })[s] ?? s.replace(/\b\w/g, (c) => c.toUpperCase())

function streetsIn(address) {
  const out = []
  // "Abogo Largema Street Off Constitution Avenue" → two streets
  for (let part of address.split(/[,;]|\s(?:off|opp|opposite|by|beside|behind|along)\.?\s/i)) {
    part = part.replace(/\s+/g, " ").trim().replace(LEADING_JUNK, "").replace(PREFIX_WORDS, "").trim()
    const words = part.split(" ")
    if (words.length < 2 || words.length > 6) continue
    const last = words[words.length - 1].toLowerCase().replace(/\.$/, "")
    const suffix = SUFFIX[last]
    if (!suffix) continue
    const base = words.slice(0, -1)
    // Names like "Isiyaku Ismaila" or "1st"/"3rd" (avenues); no stray numbers or symbols.
    if (!base.every((w) => /^[A-Za-z][A-Za-z'.-]*$/.test(w) || /^\d+(st|nd|rd|th)$/i.test(w))) continue
    if (base.join("").length < 3) continue
    // Keep initials tidy: "A.e.ekukinam" → "A.E. Ekukinam"
    const nice = base
      .join(" ")
      .replace(/\.(?=[A-Za-z])/g, ". ")
      .split(" ")
      .map((w) => (/^\d/.test(w) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
      .join(" ")
      .replace(/\b([A-Z])\.\s(?=[A-Z]\.)/g, "$1.")
    out.push({ base: nice, suffix })
  }
  return out
}

function areaIn(address) {
  const counts = new Map()
  for (const part of address.toLowerCase().split(/[,;]/)) {
    const p = part.replace(/\b(district|phase \w+|extension|estate)\b/g, "").replace(/\s+/g, " ").trim()
    if (AREA_WORDS.has(p)) counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return best ? AREA_LABEL(best[0]) : null
}

function compact(name) {
  return name
    .toLowerCase()
    .replace(/\b(street|st|crescent|cres|close|road|rd|avenue|ave|way|drive|lane|boulevard|expressway|express|highway)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** Already in OSM, misspelled ("ahmadubellow") or prefixed by a building ("cityparkahmadubello")? */
function knownStreet(c) {
  if (osmStreetNames.has(c)) return true
  for (const o of osmStreetNames) {
    if (o.length >= 8 && c.includes(o)) return true
    if (o.length >= 8 && Math.abs(o.length - c.length) <= 2 && levenshtein(o, c) <= 2) return true
  }
  return false
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

// 1) Streets mentioned in business addresses
const streetMentions = new Map() // base(lower) -> [{lat,lng,conf,suffix,area}]
for (const [, , address, lat, lng, conf] of overture) {
  if (!address || conf < 0.45) continue
  for (const s of streetsIn(address)) {
    const k = compact(s.base)
    const list = streetMentions.get(k) ?? []
    list.push({ lat, lng, conf, suffix: s.suffix, base: s.base, area: areaIn(address) })
    streetMentions.set(k, list)
  }
}

// Compare street names ignoring punctuation, spacing and the street-type word, so that
// "Ahmadu Bello Express Way" and "Abuja-keffi Road" match what OSM already has.
const osmStreetNames = new Set(raw.filter((r) => r.street).map((r) => compact(r.name)))
let addedStreets = 0
for (const mentions of streetMentions.values()) {
  // Cluster around the median position; mentions far away are probably a different street or a bad geocode.
  const mLat = median(mentions.map((m) => m.lat))
  const mLng = median(mentions.map((m) => m.lng))
  const close = mentions.filter((m) => km(m, { lat: mLat, lng: mLng }) <= 3)
  if (close.length < 2 && !(close.length === 1 && close[0].conf >= 0.7)) continue
  const suffixes = new Map()
  for (const m of close) suffixes.set(m.suffix, (suffixes.get(m.suffix) ?? 0) + 1)
  const suffix = [...suffixes.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const name = `${close[0].base} ${suffix}`
  if (knownStreet(compact(name))) continue
  // Ordinal avenues ("3rd Avenue") exist in many estates; keep them only with a known area.
  const areas = close.map((m) => m.area).filter(Boolean)
  const area = areas.length ? [...new Set(areas)].sort((a, b) => areas.filter((x) => x === b).length - areas.filter((x) => x === a).length)[0] : null
  if (/^\d/.test(name) && !area) continue
  raw.push({
    name: /^\d/.test(name) ? `${name}, ${area}` : name,
    lat: median(close.map((m) => m.lat)),
    lng: median(close.map((m) => m.lng)),
    kind: "Street (approx.)",
    street: true,
    area,
  })
  addedStreets++
}

// 2) Well-located Overture places with a useful category
// Agents' listings and home services are mostly people, not places you'd travel to.
const SKIP_CATEGORIES = new Set(["real_estate_service", "home_service", "event_or_party_service"])
const CATEGORY_LABEL = {
  christian_place_of_worship: "Church", muslim_place_of_worship: "Mosque", religious_organization: "Church",
  place_of_learning: "School", education: "School", hotel: "Hotel", lodging: "Hotel", restaurant: "Restaurant",
  hospital: "Hospital", clinic_or_treatment_center: "Clinic", pharmacy: "Pharmacy", government_office: "Government office",
  financial_service: "Bank", bank: "Bank", shopping: "Shopping", shopping_mall: "Mall", grocery_store: "Supermarket",
  supermarket: "Supermarket", fashion_and_apparel_store: "Shop", civic_organization: "Organisation",
  corporate_or_business_office: "Office", wellness_service: "Health & wellness", social_or_community_service: "Community centre",
  hardware_home_and_garden_store: "Shop", gas_station: "Filling station", fuel_station: "Filling station",
}
let addedPlaces = 0
for (const [name0, category, address, lat, lng, conf] of overture) {
  if (conf < 0.6 || !category || SKIP_CATEGORIES.has(category)) continue
  const name = tidy(name0 ?? "")
  if (!goodName(name) || name.length > 60 || /^[a-z]+$/.test(name)) continue
  raw.push({
    name,
    lat,
    lng,
    kind: CATEGORY_LABEL[category] ?? category.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    street: false,
    area: address ? areaIn(address) : null,
  })
  addedPlaces++
}
if (overture.length) console.log(`Overture: +${addedStreets} streets from addresses, +${addedPlaces} places`)

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
    const area = g.area ?? areaFor(g)
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
    attribution: overture.length ? "© OpenStreetMap contributors (ODbL); Overture Maps Foundation" : "© OpenStreetMap contributors, ODbL",
    kinds,
    areas,
    places,
  }),
)
console.log(`Wrote ${places.length} places (${kinds.length} kinds, ${areas.length} areas) to ${OUT}`)
