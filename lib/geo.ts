export type LatLng = { lat: number; lng: number }

/** Great-circle distance in kilometres. */
export function km(a: LatLng, b: LatLng) {
  const R = 6371
  const p = Math.PI / 180
  const dLat = (b.lat - a.lat) * p
  const dLng = (b.lng - a.lng) * p
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Abuja's road grid adds roughly a third to straight-line distance. */
export const ROAD_FACTOR = 1.3

export function roadKm(a: LatLng, b: LatLng) {
  return km(a, b) * ROAD_FACTOR
}

export const ABUJA_CENTER: [number, number] = [9.0556, 7.4914]

/** Rough bounds of the Abuja metro area (FCT plus Mararaba/Masaka and Suleja). */
export const ABUJA_BOUNDS = { south: 8.7, west: 6.95, north: 9.4, east: 7.8 }

export function inAbuja(p: LatLng) {
  return (
    p.lat >= ABUJA_BOUNDS.south &&
    p.lat <= ABUJA_BOUNDS.north &&
    p.lng >= ABUJA_BOUNDS.west &&
    p.lng <= ABUJA_BOUNDS.east
  )
}
