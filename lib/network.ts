import type { Hub, Link } from "./types"

export const HUBS: Hub[] = [
  { id: "berger", name: "Berger Junction", lat: 9.0667, lng: 7.4431, source: "prototype" },
  { id: "wuse", name: "Wuse Market", lat: 9.0765, lng: 7.4623, source: "prototype" },
  { id: "area1", name: "Garki Area 1", lat: 9.0358, lng: 7.4881, source: "prototype" },
  { id: "garki", name: "Garki Market", lat: 9.0304, lng: 7.4898, source: "prototype" },
  { id: "central", name: "Central Area", lat: 9.0556, lng: 7.4914, source: "prototype" },
  { id: "jabi", name: "Jabi Park", lat: 9.0655, lng: 7.4207, source: "prototype" },
  { id: "utako", name: "Utako Motor Park", lat: 9.0679, lng: 7.4498, source: "prototype" },
  { id: "mabushi", name: "Mabushi", lat: 9.0834, lng: 7.4534, source: "prototype" },
  { id: "gwarinpa", name: "Gwarinpa", lat: 9.1098, lng: 7.4055, source: "prototype" },
  { id: "kubwa", name: "Kubwa", lat: 9.1544, lng: 7.322, source: "prototype" },
  { id: "lugbe", name: "Lugbe", lat: 8.9778, lng: 7.3724, source: "prototype" },
  { id: "airportRd", name: "Airport Road Junction", lat: 9.0038, lng: 7.3957, source: "prototype" },
  { id: "nyanya", name: "Nyanya", lat: 9.0251, lng: 7.5681, source: "prototype" },
  { id: "mararaba", name: "Mararaba", lat: 9.0312, lng: 7.5885, source: "prototype" },
  { id: "asokoro", name: "Asokoro", lat: 9.0361, lng: 7.5247, source: "prototype" },
  { id: "maitama", name: "Maitama", lat: 9.0873, lng: 7.4934, source: "prototype" },
  { id: "apo", name: "Apo", lat: 8.9898, lng: 7.4992, source: "prototype" },
  { id: "karu", name: "Karu", lat: 9.0098, lng: 7.5695, source: "prototype" },
  { id: "lifeCamp", name: "Life Camp", lat: 9.0805, lng: 7.3908, source: "prototype" },
  { id: "dutse", name: "Dutse Alhaji", lat: 9.1328, lng: 7.3907, source: "prototype" },
]

export const LINKS: Link[] = [
  { id: "route-1", a: "berger", b: "utako", mode: "bus", fareMin: 250, fareMax: 350, minutes: 7, confidence: "High", source: "prototype" },
  { id: "route-2", a: "utako", b: "jabi", mode: "bus", fareMin: 250, fareMax: 400, minutes: 9, confidence: "High", source: "prototype" },
  { id: "route-3", a: "jabi", b: "lifeCamp", mode: "keke", fareMin: 250, fareMax: 350, minutes: 8, confidence: "High", source: "prototype" },
  { id: "route-4", a: "lifeCamp", b: "gwarinpa", mode: "bus", fareMin: 350, fareMax: 500, minutes: 12, confidence: "High", source: "prototype" },
  { id: "route-5", a: "gwarinpa", b: "dutse", mode: "keke", fareMin: 250, fareMax: 400, minutes: 10, confidence: "High", source: "prototype" },
  { id: "route-6", a: "dutse", b: "kubwa", mode: "bus", fareMin: 400, fareMax: 600, minutes: 18, confidence: "High", source: "prototype" },
  { id: "route-7", a: "berger", b: "wuse", mode: "bus", fareMin: 400, fareMax: 550, minutes: 14, confidence: "High", source: "prototype" },
  { id: "route-8", a: "wuse", b: "central", mode: "bus", fareMin: 300, fareMax: 450, minutes: 10, confidence: "High", source: "prototype" },
  { id: "route-9", a: "central", b: "area1", mode: "bus", fareMin: 300, fareMax: 450, minutes: 11, confidence: "High", source: "prototype" },
  { id: "route-10", a: "area1", b: "garki", mode: "keke", fareMin: 200, fareMax: 300, minutes: 6, confidence: "High", source: "prototype" },
  { id: "route-11", a: "garki", b: "apo", mode: "keke", fareMin: 250, fareMax: 400, minutes: 10, confidence: "High", source: "prototype" },
  { id: "route-12", a: "wuse", b: "mabushi", mode: "keke", fareMin: 250, fareMax: 350, minutes: 8, confidence: "High", source: "prototype" },
  { id: "route-13", a: "mabushi", b: "maitama", mode: "taxi", fareMin: 350, fareMax: 500, minutes: 9, confidence: "High", source: "prototype" },
  { id: "route-14", a: "maitama", b: "central", mode: "taxi", fareMin: 350, fareMax: 550, minutes: 10, confidence: "High", source: "prototype" },
  { id: "route-15", a: "central", b: "asokoro", mode: "taxi", fareMin: 400, fareMax: 650, minutes: 12, confidence: "High", source: "prototype" },
  { id: "route-16", a: "asokoro", b: "karu", mode: "taxi", fareMin: 450, fareMax: 700, minutes: 15, confidence: "High", source: "prototype" },
  { id: "route-17", a: "karu", b: "nyanya", mode: "bus", fareMin: 250, fareMax: 400, minutes: 9, confidence: "High", source: "prototype" },
  { id: "route-18", a: "nyanya", b: "mararaba", mode: "bus", fareMin: 300, fareMax: 500, minutes: 11, confidence: "High", source: "prototype" },
  { id: "route-19", a: "berger", b: "airportRd", mode: "bus", fareMin: 400, fareMax: 600, minutes: 15, confidence: "High", source: "prototype" },
  { id: "route-20", a: "airportRd", b: "lugbe", mode: "bus", fareMin: 350, fareMax: 550, minutes: 14, confidence: "High", source: "prototype" },
  { id: "route-21", a: "airportRd", b: "apo", mode: "taxi", fareMin: 450, fareMax: 650, minutes: 14, confidence: "Medium", source: "prototype" },
  { id: "route-22", a: "apo", b: "area1", mode: "keke", fareMin: 250, fareMax: 400, minutes: 9, confidence: "Medium", source: "prototype" },
  { id: "route-23", a: "utako", b: "mabushi", mode: "keke", fareMin: 250, fareMax: 400, minutes: 8, confidence: "Medium", source: "prototype" },
  { id: "route-24", a: "jabi", b: "gwarinpa", mode: "bus", fareMin: 350, fareMax: 500, minutes: 14, confidence: "Medium", source: "prototype" },
  { id: "route-25", a: "wuse", b: "maitama", mode: "taxi", fareMin: 300, fareMax: 500, minutes: 10, confidence: "Medium", source: "prototype" },
  { id: "route-26", a: "garki", b: "asokoro", mode: "taxi", fareMin: 350, fareMax: 550, minutes: 11, confidence: "Medium", source: "prototype" },
  { id: "route-27", a: "area1", b: "karu", mode: "bus", fareMin: 450, fareMax: 650, minutes: 15, confidence: "Medium", source: "prototype" },
  { id: "route-28", a: "central", b: "nyanya", mode: "bus", fareMin: 500, fareMax: 750, minutes: 20, confidence: "Medium", source: "prototype" },
  { id: "route-29", a: "berger", b: "central", mode: "bus", fareMin: 450, fareMax: 650, minutes: 16, confidence: "Medium", source: "prototype" },
  { id: "route-30", a: "kubwa", b: "gwarinpa", mode: "bus", fareMin: 450, fareMax: 650, minutes: 18, confidence: "Medium", source: "prototype" },
  { id: "route-31", a: "lugbe", b: "apo", mode: "bus", fareMin: 450, fareMax: 650, minutes: 17, confidence: "Medium", source: "prototype" },
  { id: "route-32", a: "mabushi", b: "central", mode: "bus", fareMin: 300, fareMax: 450, minutes: 10, confidence: "Medium", source: "prototype" },
]

export const HUB_MAP = Object.fromEntries(HUBS.map((h) => [h.id, h]))

const HUB_LOWER = HUBS.map((h) => ({ hub: h, lower: h.name.toLowerCase() }))

export function localMatch(q: string) {
  const lq = q.toLowerCase().trim()
  return HUB_LOWER.filter((x) => x.lower.includes(lq))
    .map((x) => ({ ...x.hub, type: "hub" }))
    .slice(0, 5)
}
