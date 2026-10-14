import type { Corridor, Hub } from "./types"

/**
 * Boarding points (motor parks, junctions and bus stops where "along" vehicles load).
 * Coordinates and street names come from OpenStreetMap (Nominatim/Photon lookups and OSM bus-stop
 * nodes, Oct 2026). Where OSM only had a district centre, the point was snapped onto the main road
 * the vehicles use (checked by routing each corridor with OSRM). `board` tells riders where to stand.
 * Note: OSM calls the Kubwa Expressway "Murtala Mohammed Expressway" and Airport Road
 * "Umaru Musa Yar'Adua Expressway".
 */
export const HUBS: Hub[] = [
  // City centre (Phase 1)
  { id: "berger", name: "Berger Junction", lat: 9.0671, lng: 7.4543, kind: "Motor park, Wuse", board: "Berger Bus Stop on Herbert Macaulay Way, beside Berger Park", aliases: ["Berger", "Berger Roundabout", "Berger Park"] },
  { id: "wuseMkt", name: "Wuse Market", lat: 9.0675, lng: 7.4655, kind: "Market & taxi rank, Wuse", board: "Wuse Market Bus Stop on Wuse Market Road, beside the market", aliases: ["Wuse", "Wuse Zone 5"] },
  { id: "zone4", name: "Wuse Zone 4", lat: 9.0636, lng: 7.4749, kind: "Bus stop, Wuse", board: "Zone 4 Bus Stop on Herbert Macaulay Way", aliases: ["Zone 4"] },
  { id: "banex", name: "Banex Junction", lat: 9.0839, lng: 7.4689, kind: "Junction, Wuse II", board: "the roadside by Banex Plaza on Aminu Kano Crescent", aliases: ["Banex", "Wuse 2", "Wuse II"] },
  { id: "maitama", name: "Maitama", lat: 9.0901, lng: 7.4908, kind: "District, taxis only", board: "the nearest main road in Maitama (cabs pass along Aguiyi Ironsi Street and Shehu Shagari Way)" },
  { id: "fedSec", name: "Federal Secretariat", lat: 9.059, lng: 7.4968, kind: "Bus stop, Central Area", board: "Eagle Square Bus Stop on Ahmadu Bello Way, near the Federal Secretariat", aliases: ["Eagle Square", "Central Area", "CBD", "Central Business District", "Ministry of Finance"] },
  { id: "area10", name: "Area 10", lat: 9.0393, lng: 7.4858, kind: "Bus stop, Garki", board: "Area 10 Bus Stop on Moshood Abiola Way", aliases: ["Garki Area 10", "Old Federal Secretariat"] },
  { id: "area1", name: "Area 1", lat: 9.0319, lng: 7.4715, kind: "Motor park, Garki", board: "the Area 1 bus park by Area 1 Shopping Complex, Moshood Abiola Way", aliases: ["Garki Area 1", "Area One", "Garki"] },
  { id: "area3", name: "Area 3 Junction", lat: 9.0252, lng: 7.4755, kind: "Junction, Garki II", board: "Area 3 Junction bus stop on Nnamdi Azikiwe Expressway", aliases: ["Area 3"] },
  { id: "area11", name: "Area 11", lat: 9.043, lng: 7.504, kind: "Junction, Garki II", board: "the Area 11 junction, Garki II", aliases: ["Garki Area 11"] },
  { id: "aya", name: "AYA Junction", lat: 9.0493, lng: 7.5267, kind: "Bus stop, Asokoro", board: "AYA Bus Stop by the Asokoro Roundabout", aliases: ["AYA", "Asokoro", "Asokoro Roundabout"] },
  // Phase 2 / fringe
  { id: "jabiPark", name: "Jabi / Utako Motor Park", lat: 9.0645, lng: 7.4328, kind: "Motor park, Obafemi Awolowo Way", board: "the Utako / Jabi Motor Park bus stops on Obafemi Awolowo Way", aliases: ["Utako Motor Park", "Jabi Motor Park", "Jabi Park", "Utako", "Jabi", "Jabi Garage"] },
  { id: "mabushi", name: "Mabushi", lat: 9.0774, lng: 7.4561, kind: "Roadside, Nnamdi Azikiwe Expressway", board: "the roadside at Mabushi on Nnamdi Azikiwe Expressway", aliases: ["Mabushi Terminal", "Mabushi Junction"] },
  { id: "wuye", name: "Wuye", lat: 9.0514, lng: 7.4536, kind: "Roadside, Nnamdi Azikiwe Expressway", board: "the roadside at Wuye on Nnamdi Azikiwe Expressway" },
  { id: "durumi", name: "Durumi", lat: 9.0195, lng: 7.4643, kind: "District, Garki side", board: "the main road through Durumi" },
  { id: "jahi", name: "Jahi", lat: 9.1179, lng: 7.4368, kind: "Roadside, Kubwa Expressway", board: "the roadside at Jahi on the Kubwa Expressway", aliases: ["Kado", "Jahi Junction"] },
  { id: "lifeCamp", name: "Life Camp Junction", lat: 9.0675, lng: 7.4042, kind: "Bus stop, Obafemi Awolowo Way", board: "Life Camp Junction bus stop on Obafemi Awolowo Way", aliases: ["Life Camp"] },
  { id: "gwarinpa", name: "Gwarinpa", lat: 9.1192, lng: 7.4059, kind: "Bus stop, Kubwa Expressway", board: "Gwarinpa Bus Stop on the Kubwa Expressway", aliases: ["Gwarinpa Estate", "Gwarimpa"] },
  { id: "apo", name: "Apo Roundabout", lat: 9.0131, lng: 7.4914, kind: "Bus stop, Murtala Mohammed Expressway", board: "Apo Roundabout Bus Stop on Murtala Mohammed Expressway", aliases: ["Apo"] },
  { id: "gudu", name: "Gudu", lat: 9.0079, lng: 7.4885, kind: "Roadside, Murtala Mohammed Expressway", board: "the roadside at Gudu on Murtala Mohammed Expressway, just south of Apo Roundabout" },
  { id: "galadimawa", name: "Galadimawa Roundabout", lat: 9.0022, lng: 7.4112, kind: "Roundabout, Airport Road", board: "Galadimawa Roundabout on Airport Road", aliases: ["Galadimawa"] },
  { id: "lokogoma", name: "Lokogoma", lat: 8.967, lng: 7.465, kind: "Estate district", board: "the main Lokogoma road", aliases: ["Lokogoma Junction"] },
  { id: "kabusaJn", name: "Kabusa Junction", lat: 8.9739, lng: 7.4957, kind: "Bus stop, Murtala Mohammed Expressway", board: "Kabusa Junction bus stop", aliases: ["Kabusa"] },
  { id: "apoRes", name: "Apo Resettlement", lat: 8.9732, lng: 7.5045, kind: "Satellite community", board: "the Apo Resettlement junction", aliases: ["Apo Resettlement Junction"] },
  { id: "karmo", name: "Karmo", lat: 9.0556, lng: 7.3748, kind: "Satellite community", board: "the main road at Karmo", aliases: ["Karimo"] },
  { id: "idu", name: "Idu", lat: 9.0464, lng: 7.3428, kind: "Industrial area & metro station", board: "the roadside by Idu metro station", aliases: ["Idu Railway", "Idu Industrial"] },
  { id: "mpape", name: "Mpape", lat: 9.1447, lng: 7.4927, kind: "Satellite community", board: "the main road in Mpape", aliases: ["Mpape Junction"] },
  // Keffi Expressway towns
  { id: "kugbo", name: "Kugbo", lat: 9.0279, lng: 7.5488, kind: "Bus stop, Abuja–Keffi Expressway", board: "Kugbo Bus Stop on the Abuja–Keffi Expressway", aliases: ["Kugbo Terminal"] },
  { id: "karu", name: "Karu", lat: 9.023, lng: 7.565, kind: "Abuja–Keffi Expressway", board: "the Karu bus stop on the Abuja–Keffi Expressway", aliases: ["Karu Bridge", "Karu Junction"] },
  { id: "nyanya", name: "Nyanya", lat: 9.0281, lng: 7.5807, kind: "Motor park, Abuja–Keffi Expressway", board: "Nyanya bus stop on the Abuja–Keffi Expressway", aliases: ["New Nyanya", "Nyanya Junction", "Nyanya Park", "Yanya"] },
  { id: "mararaba", name: "Mararaba", lat: 9.029, lng: 7.596, kind: "Motor park (Nasarawa side)", board: "Mararaba bus stop on the Abuja–Keffi Expressway", aliases: ["Maraba"] },
  { id: "masaka", name: "Masaka", lat: 9.005, lng: 7.6736, kind: "Town (Nasarawa)", board: "the Masaka bus stop on the Abuja–Keffi Expressway" },
  { id: "jikwoyi", name: "Jikwoyi", lat: 8.9793, lng: 7.5605, kind: "Nyanya–Karshi Road", board: "Jikwoyi Phase 2 bus stop on Nyanya–Karshi Road", aliases: ["Jikwoyi Phase 2", "Karshi Road"] },
  // Airport Road / south-west
  { id: "chika", name: "Chika", lat: 8.9959, lng: 7.4049, kind: "Roadside, Airport Road", board: "the Chika bus stop on Airport Road", aliases: ["Chika Junction", "Kuchingoro"] },
  { id: "lugbe", name: "Lugbe", lat: 8.9809, lng: 7.3801, kind: "Roadside, Airport Road", board: "the Lugbe bus stop on Airport Road", aliases: ["Lugbe Junction", "FHA Lugbe", "Sabon Lugbe"] },
  { id: "sauka", name: "Sauka", lat: 8.9577, lng: 7.252, kind: "Bus stop, Airport Road", board: "Sauka pedestrian bridge bus stop on Airport Road" },
  { id: "airport", name: "Nnamdi Azikiwe Airport", lat: 9.0068, lng: 7.2631, kind: "Airport", board: "the airport terminal taxi rank", aliases: ["Abuja Airport", "Airport", "NAIA"] },
  { id: "kuje", name: "Kuje", lat: 8.8796, lng: 7.2272, kind: "Satellite town", board: "the motor park in Kuje town", aliases: ["Kuje Market", "Tipper Garage Kuje"] },
  { id: "gwagwalada", name: "Gwagwalada", lat: 8.936, lng: 7.0859, kind: "Satellite town", board: "the motor park in Gwagwalada town", aliases: ["Gwagwalada Park", "Giri"] },
  // Kubwa Expressway / north-west
  { id: "dawaki", name: "Dutse Junction (Dawaki)", lat: 9.1217, lng: 7.3889, kind: "Junction, Kubwa Expressway", board: "the Dutse junction bus stop on the Kubwa Expressway, by Dawaki", aliases: ["Dawaki", "Dutse Junction"] },
  { id: "kubwa", name: "Kubwa Junction", lat: 9.1438, lng: 7.3414, kind: "Roadside, Kubwa Expressway", board: "the Kubwa bus stop on the Kubwa Expressway", aliases: ["Kubwa", "Kubwa Village", "Arab Road", "Byazhin", "Phase 4 Kubwa"] },
  { id: "deiDei", name: "Dei-Dei Junction", lat: 9.1142, lng: 7.2604, kind: "Park, Kubwa–Zuba road", board: "Dei-Dei Junction bus stop (by Narto Park)", aliases: ["Dei Dei", "Deidei"] },
  { id: "zuba", name: "Zuba", lat: 9.0932, lng: 7.216, kind: "Motor park", board: "Zuba bus station", aliases: ["Madalla", "Zuba Park"] },
  { id: "suleja", name: "Suleja", lat: 9.1758, lng: 7.1808, kind: "Town (Niger)", board: "the motor park in Suleja" },
  { id: "gwagwa", name: "Gwagwa", lat: 9.0896, lng: 7.2857, kind: "Satellite community", board: "the main road at Gwagwa" },
  { id: "dutse", name: "Dutse Alhaji", lat: 9.1417, lng: 7.3726, kind: "Satellite town", board: "the main road in Dutse Alhaji", aliases: ["Dutse", "Dutse Express"] },
  { id: "ushafa", name: "Ushafa", lat: 9.2108, lng: 7.3951, kind: "Bus stop, Bwari Road", board: "the Ushafa Bridge bus stop by the new market" },
  { id: "bwari", name: "Bwari", lat: 9.2799, lng: 7.3822, kind: "Satellite town", board: "the motor park in Bwari town", aliases: ["Bwari Market"] },
]

/**
 * "Along" lines: a vehicle loads at the first stop and passengers drop anywhere en route.
 * Fare checks are the most recent published commuter fares we could find; the router
 * calibrates each corridor's distance-based fare against its check (see lib/fares.ts).
 */
export const CORRIDORS: Corridor[] = [
  {
    id: "kubwa-exp", name: "Kubwa Expressway", mode: "bus", speed: 38, wait: 8,
    stops: ["berger", "mabushi", "jahi", "gwarinpa", "dawaki", "kubwa", "deiDei", "zuba", "suleja"],
    // Also reported: Berger–Zuba ₦1,800 (Leadership, 2026); the model gives ~₦1,700 for that run.
    fareCheck: { from: "kubwa", to: "berger", fare: 1000, source: "ICIR, Mar 2026" },
  },
  {
    id: "bwari", name: "Bwari Road", mode: "bus", speed: 34, wait: 10,
    stops: ["dawaki", "dutse", "ushafa", "bwari"],
  },
  {
    id: "keffi-berger", name: "Berger–Nyanya (Keffi Expressway)", mode: "bus", speed: 28, wait: 8,
    stops: ["berger", "zone4", "fedSec", "aya", "kugbo", "karu", "nyanya", "mararaba", "masaka"],
    fareCheck: { from: "nyanya", to: "fedSec", fare: 1000, source: "ICIR, Mar 2026 (New Nyanya–Ministry of Finance)" },
  },
  {
    id: "keffi-area1", name: "Area 1–Nyanya", mode: "bus", speed: 28, wait: 8,
    stops: ["area1", "area10", "area11", "aya", "kugbo", "karu", "nyanya", "mararaba"],
  },
  {
    id: "nyanya-jabi", name: "Nyanya–Jabi", mode: "bus", speed: 26, wait: 10,
    stops: ["nyanya", "karu", "kugbo", "aya", "fedSec", "berger", "jabiPark"],
    fareCheck: { from: "nyanya", to: "jabiPark", fare: 1700, source: "ICIR, Mar 2026" },
  },
  { id: "karshi", name: "Nyanya–Karshi Road", mode: "bus", speed: 22, wait: 10, stops: ["nyanya", "jikwoyi"] },
  {
    id: "airport-rd", name: "Airport Road", mode: "bus", speed: 45, wait: 8,
    stops: ["area1", "chika", "lugbe", "sauka", "gwagwalada"],
  },
  {
    id: "berger-lugbe", name: "Berger–Lugbe", mode: "bus", speed: 32, wait: 8,
    stops: ["berger", "wuye", "chika", "lugbe"],
    fareCheck: { from: "lugbe", to: "berger", fare: 1000, source: "Leadership, 2026" },
  },
  {
    id: "kuje", name: "Lugbe–Kuje", mode: "bus", speed: 42, wait: 12,
    stops: ["area1", "chika", "lugbe", "kuje"],
    fareCheck: { from: "kuje", to: "lugbe", fare: 850, source: "ICIR, Mar 2026" },
  },
  { id: "kuje-gwag", name: "Kuje–Gwagwalada", mode: "bus", speed: 45, wait: 15, stops: ["kuje", "gwagwalada"] },
  {
    id: "gudu-lugbe", name: "Gudu–Galadimawa–Lugbe", mode: "bus", speed: 26, wait: 10,
    stops: ["apo", "gudu", "galadimawa", "chika", "lugbe"],
    fareCheck: { from: "gudu", to: "lugbe", fare: 650, source: "ICIR, Mar 2026 (₦500, ₦800 in scarcity)" },
  },
  {
    id: "apo", name: "Area 1–Apo–Apo Resettlement", mode: "bus", speed: 25, wait: 8,
    stops: ["area1", "area3", "apo", "gudu", "kabusaJn", "apoRes"],
    fareCheck: { from: "apoRes", to: "gudu", fare: 500, source: "ICIR, Mar 2026" },
  },
  {
    id: "gwarinpa", name: "Berger–Life Camp–Gwarinpa", mode: "bus", speed: 24, wait: 7,
    stops: ["berger", "jabiPark", "lifeCamp", "gwarinpa"],
  },
  {
    id: "karmo", name: "Berger–Karmo–Gwagwa", mode: "bus", speed: 26, wait: 8,
    stops: ["berger", "jabiPark", "lifeCamp", "karmo", "gwagwa", "deiDei"],
    fareCheck: { from: "berger", to: "karmo", fare: 700, source: "Leadership, 2026" },
  },
  { id: "idu", name: "Life Camp–Idu", mode: "taxi", speed: 26, wait: 8, stops: ["jabiPark", "lifeCamp", "karmo", "idu"] },
  {
    id: "city-loop", name: "Wuse–Central Area–Garki (shared cabs)", mode: "taxi", speed: 22, wait: 4,
    stops: ["jabiPark", "berger", "wuseMkt", "zone4", "fedSec", "area10", "area1"],
    fareCheck: { from: "wuseMkt", to: "fedSec", fare: 500, source: "Daily Trust, Apr 2026" },
  },
  { id: "maitama", name: "Berger–Banex–Maitama–Mpape", mode: "taxi", speed: 22, wait: 5, stops: ["berger", "banex", "maitama", "mpape"] },
  { id: "mabushi-banex", name: "Mabushi–Banex–Wuse Market", mode: "taxi", speed: 22, wait: 5, stops: ["mabushi", "banex", "wuseMkt"] },
  { id: "ring-rd", name: "Utako–Wuye–Durumi–Garki", mode: "taxi", speed: 24, wait: 6, stops: ["jabiPark", "wuye", "durumi", "area1", "area3", "apo"] },
  { id: "asokoro", name: "Central Area–Area 11–Asokoro", mode: "taxi", speed: 22, wait: 5, stops: ["fedSec", "area11", "aya"] },
  { id: "airport-taxi", name: "Airport taxis", mode: "taxi", speed: 40, wait: 10, stops: ["lugbe", "sauka", "airport"] },
  // Tricycle lines with published fares (MSME Africa, Sep 2026)
  {
    id: "keke-lokogoma", name: "Gudu–Lokogoma keke", mode: "keke", speed: 18, wait: 4,
    stops: ["gudu", "lokogoma"],
    fareCheck: { from: "gudu", to: "lokogoma", fare: 300, source: "MSME Africa, Sep 2026" },
  },
  {
    id: "keke-kabusa", name: "Kabusa–Apo keke", mode: "keke", speed: 18, wait: 4,
    stops: ["kabusaJn", "apo"],
    fareCheck: { from: "kabusaJn", to: "apo", fare: 400, source: "MSME Africa, Sep 2026" },
  },
]

export const HUB_MAP: Record<string, Hub> = Object.fromEntries(HUBS.map((h) => [h.id, h]))
