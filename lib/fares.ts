import type { TransportMode } from "./types"

/**
 * Fare and speed models, calibrated against published 2026 Abuja fares:
 *
 * Bus / korope (per ride, whole corridor or part of it)
 *   Kubwa–Berger ₦1,000 · New Nyanya–Ministry of Finance ₦1,000 · Kuje–Lugbe ₦800–900
 *   Apo Resettlement–Gudu ₦500 · Gudu–Lugbe ₦500–800 (ICIR, 10 Mar 2026)
 *   Lugbe–Berger ₦1,000 · Berger–Zuba ₦1,800 · Berger–Karmo ₦700 · Kuje–Berger ₦1,500 (Leadership, 2026)
 *   AUMTCO / CNG buses ₦700 flat where they still run (Daily Trust, Apr 2026)
 *   → about ₦250 + ₦40 per road-km, minimum ₦300.
 *
 * Shared city cab ("along" taxi)
 *   Wuse–Federal Secretariat ₦500 · Kubwa–Wuse cab ₦1,200 (Daily Trust, Apr 2026)
 *   → about ₦150 + ₦55 per road-km, minimum ₦300.
 *
 * Keke (tricycle)
 *   Gudu–Lokogoma Jn ₦300 · Kabusa Jn–Apo ₦400 · Dutse Express–Tipper Garage ₦500
 *   Dutse–Sokale ₦400 · Chika Bridge ₦200 · Nyanya Jn–City College ₦500 · Kubwa Village–Byazhin ₦400
 *   (MSME Africa, 20 Sep 2026)
 *   → about ₦100 + ₦70 per road-km, minimum ₦200.
 *
 * Okada (motorcycle) — "₦300 by bike" for the short Kubwa leg (Daily Trust, Apr 2026)
 *   → about ₦100 + ₦90 per road-km, minimum ₦200.
 *
 * App ride (Bolt) — last published Abuja rate card: ₦884 start + ₦152/km + ₦25/min,
 *   minimum ₦1,495 (Aug 2024). Fuel has risen since, so the upper bound is +40%.
 *   inDrive is negotiated and usually lands inside this range.
 */

function round50(n: number) {
  return Math.max(50, Math.round(n / 50) * 50)
}

const MODEL: Record<Exclude<TransportMode, "walk" | "ride">, { base: number; perKm: number; min: number }> = {
  bus: { base: 250, perKm: 40, min: 300 },
  taxi: { base: 150, perKm: 55, min: 300 },
  keke: { base: 100, perKm: 70, min: 200 },
  okada: { base: 100, perKm: 90, min: 200 },
}

export function baseFare(mode: Exclude<TransportMode, "walk" | "ride">, roadKm: number) {
  const m = MODEL[mode]
  // Long runs are cheaper per km (Berger–Zuba ₦1,800 for ~35 km, Kuje–Berger ₦1,500).
  const km = Math.min(roadKm, 20) + Math.max(0, roadKm - 20) * 0.6
  return Math.max(m.min, m.base + m.perKm * km)
}

/** Fares are negotiated; show a range around the expected price. */
export function fareRange(expected: number): [number, number] {
  return [round50(expected * 0.85), round50(expected * 1.2)]
}

export function rideFare(roadKm: number, minutes: number): [number, number] {
  const est = Math.max(1495, 884 + 152 * roadKm + 25 * minutes)
  return [round50(est), round50(est * 1.4)]
}

/** Door-to-door speeds in km/h, and typical wait before you are moving. */
export const SPEED: Record<TransportMode, { kmh: number; wait: number }> = {
  walk: { kmh: 4.5, wait: 0 },
  keke: { kmh: 18, wait: 3 },
  okada: { kmh: 24, wait: 2 },
  taxi: { kmh: 24, wait: 5 },
  bus: { kmh: 26, wait: 8 },
  ride: { kmh: 28, wait: 7 },
}

export function travelMinutes(mode: TransportMode, roadKm: number, kmh = SPEED[mode].kmh) {
  // Longer trips spend more time on expressways, so average speed rises with distance.
  const speed = mode === "walk" ? kmh : kmh + Math.min(18, Math.max(0, roadKm - 5) * 0.6)
  return Math.max(1, Math.round((roadKm / speed) * 60))
}

/** Longest walk Along will suggest before offering a keke, okada or cab instead. */
export const MAX_WALK_KM = 0.5
