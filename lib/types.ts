export interface Hub {
  id: string
  name: string
  lat: number
  lng: number
  source: string
  type?: string
}

export interface Link {
  id: string
  a: string
  b: string
  mode: TransportMode
  fareMin: number
  fareMax: number
  minutes: number
  confidence: "High" | "Medium"
  source: string
}

export type TransportMode = "walk" | "bus" | "keke" | "taxi"

export interface Leg {
  mode: TransportMode
  from: string
  to: string
  time: number
  distance?: number
  fare?: [number, number]
  text: string
  coords: [number, number][]
  confidence?: string
}

export interface Journey {
  label: string
  legs: Leg[]
  time: number
  fare: [number, number]
  walk: number
  transfers: number
  confidence: "High" | "Medium"
  modes: TransportMode[]
  origin: GeoPoint
  destination: GeoPoint
}

export interface GeoPoint {
  name: string
  lat: number
  lng: number
  type?: string
}

export interface GeocodeResult {
  name: string
  lat: number
  lng: number
  type: string
}

export type RoutePreference = "fast" | "cheap" | "simple"

export type VoiceProvider = "browser" | "cloud"

export interface TTSConfig {
  provider: VoiceProvider
  cloudVoices: CloudVoice[]
  defaultVoiceId: string
}

export interface CloudVoice {
  id: string
  name: string
  label: string
  lang: string
}

export interface TTSRequest {
  text: string
  voice: string
}

export type PickMode = "origin" | "destination" | null
