/**
 * walk  — on foot
 * bus   — korope/minibus or AUMTCO/CNG bus on a fixed corridor
 * taxi  — shared green-and-white city cab ("along" / "drop")
 * keke  — tricycle (Keke NAPEP); satellite towns & estates only
 * okada — commercial motorcycle; satellite towns only
 * ride  — app ride-hailing (Bolt / inDrive) door to door
 */
export type TransportMode = "walk" | "bus" | "taxi" | "keke" | "okada" | "ride"

/**
 * core      — Phase 1/2 city districts: keke & okada banned (FCTA)
 * estate    — Phase 2/3 estates and fringe districts: keke tolerated, okada restricted
 * satellite — satellite towns & area councils: keke and okada operate
 */
export type Zone = "core" | "estate" | "satellite"

export interface Hub {
  id: string
  name: string
  lat: number
  lng: number
  /** Short description of what is there, e.g. "Motor park" or "Bus stop on Kubwa Expressway" */
  kind: string
  /** Where exactly to stand, e.g. "Berger Bus Stop on Herbert Macaulay Way, beside Berger Park" */
  board: string
  aliases?: string[]
}

export interface Corridor {
  id: string
  name: string
  mode: "bus" | "taxi" | "keke"
  /** Hub ids in travel order — a vehicle runs the whole line and you drop anywhere along it */
  stops: string[]
  /** Average speed in km/h including stops and traffic */
  speed: number
  /** Typical wait to board, minutes */
  wait: number
  /** Reported fare for the full length (naira) and the source it came from */
  fareCheck?: { from: string; to: string; fare: number; source: string }
}

export interface GeoPoint {
  name: string
  lat: number
  lng: number
  type?: string
  /** Secondary line for display, e.g. "Wuse II, Abuja" */
  detail?: string
}

export interface Leg {
  mode: TransportMode
  from: string
  to: string
  /** minutes */
  time: number
  /** metres along the road (estimated) */
  distance: number
  fare?: [number, number]
  text: string
  /** Short tip shown under the instruction, e.g. what to tell the driver */
  tip?: string
  coords: [number, number][]
  corridor?: string
  /** Detailed, ordered instructions for this leg (where to stand, what to say, where to drop) */
  details: string[]
  /** Corridor stops passed on the way (excluding board and drop) */
  via?: string[]
  /** Points the road route must pass through (lat, lng), boarding point first */
  waypoints?: [number, number][]
}

export interface Journey {
  id: string
  label: string
  /** Other plan types that produced this same route, e.g. ["cheapest"] */
  also?: string[]
  summary: string
  legs: Leg[]
  time: number
  fare: [number, number]
  walk: number
  transfers: number
  modes: TransportMode[]
  origin: GeoPoint
  destination: GeoPoint
}

export interface GeocodeResult {
  name: string
  detail?: string
  lat: number
  lng: number
  type: string
  source: "hub" | "place" | "search" | "recent" | "gps"
}

export type RoutePreference = "fast" | "cheap" | "simple"

export interface CloudVoice {
  id: string
  name: string
  label: string
  lang: string
}

export type PickMode = "origin" | "destination" | null
