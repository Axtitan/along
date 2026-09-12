import type { TransportMode } from "./types"

export function money(n: number) {
  return `\u20A6${Math.round(n).toLocaleString("en-NG")}`
}

export function modeIcon(m: TransportMode) {
  return ({ walk: "\u2197", bus: "\u25B0", keke: "\u25C9", taxi: "\u25C6" })[m] || "\u2192"
}

export function modeLabel(m: TransportMode) {
  return m[0].toUpperCase() + m.slice(1)
}

export const ABUJA_CENTER: [number, number] = [9.0556, 7.4914]

export const QUICK_TRIPS = [
  { from: "Berger Junction", to: "Wuse Market" },
  { from: "Wuse Market", to: "Garki Area 1" },
  { from: "Kubwa", to: "Central Area" },
] as const
