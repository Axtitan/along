import type { TransportMode } from "./types"

export function money(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`
}

export function fareText(f: [number, number]) {
  if (!f[1]) return "Free"
  return f[0] === f[1] ? money(f[0]) : `${money(f[0])}–${Math.round(f[1]).toLocaleString("en-NG")}`
}

export function duration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

export function distanceText(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`
}

export const MODE_META: Record<TransportMode, { label: string; color: string; soft: string }> = {
  walk: { label: "Walk", color: "#5b6158", soft: "#eceee8" },
  bus: { label: "Bus", color: "#6247d8", soft: "#ece8fd" },
  taxi: { label: "Cab", color: "#138a43", soft: "#e2f5e9" },
  keke: { label: "Keke", color: "#d97a06", soft: "#fdf0dc" },
  okada: { label: "Okada", color: "#d23c2f", soft: "#fde5e2" },
  ride: { label: "Bolt / inDrive", color: "#0b6e69", soft: "#ddf3f1" },
}

export function modeLabel(m: TransportMode) {
  return MODE_META[m].label
}
