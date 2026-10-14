import type { Corridor, Hub, Zone } from "./types"
import { areaName } from "./zones"

/**
 * Step-by-step wording for each kind of leg. Everything here is derived from data we hold
 * (boarding spots, corridor stop order, fares, zone rules) — road names and turns are added
 * at runtime from OSRM in lib/directions.ts.
 */

export type Place = { name: string; lat: number; lng: number; board?: string }

const n = (x: number) => x.toLocaleString("en-NG")
export const naira = (f: [number, number]) => `₦${n(f[0])}–${n(f[1])}`

function at(p: Place) {
  return p.board ?? p.name
}

/** What conductors shout: "Berger!", not "Berger Junction". */
function callName(h: Hub) {
  return h.name.replace(/\s+(Junction|Roundabout|Motor Park)$/i, "").replace(/\s*\(.*\)$/, "")
}

function list(names: string[]) {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

function distanceWords(km: number) {
  return km < 1 ? `${Math.round((km * 1000) / 10) * 10} m` : `${km.toFixed(1)} km`
}

export function corridorDetails(
  c: Corridor,
  from: Hub,
  to: Hub,
  terminal: Hub,
  via: Hub[],
  fare: [number, number],
  rideMinutes: number,
): string[] {
  const passing = via.length
    ? `On the way you'll pass ${list(via.map((v) => v.name))}.`
    : `${to.name} is the next stop on this line.`
  const getReady = via.length
    ? `After ${via[via.length - 1].name}, tell the ${c.mode === "bus" ? "conductor" : "driver"} you're getting down at ${to.name}.`
    : `Tell the ${c.mode === "bus" ? "conductor" : "driver"} early that you're getting down at ${to.name}.`

  if (c.mode === "bus") {
    return [
      `Go to ${from.board}.`,
      `Look for a bus (korope or minibus) loading for ${terminal.name} — the conductor will be shouting "${callName(terminal)}!". This is the ${c.name} line.`,
      `Before you enter, ask the conductor "${callName(to)}?" and enter when he says yes.`,
      `${passing} The ride is about ${rideMinutes} min.`,
      getReady,
      `Get down at ${to.board}.`,
      `Fare: about ${naira(fare)}. Pay the conductor during the ride and keep small notes ready — change can be scarce.`,
    ]
  }
  if (c.mode === "taxi") {
    return [
      `Go to ${from.board}.`,
      `Stand on the side of the road where traffic heads towards ${terminal.name}, and wave down a green-and-white taxi.`,
      `Tell the driver "${callName(to)}". If he's going that way he'll let you in — you share the cab with other passengers ("along").`,
      `${passing} The ride is about ${rideMinutes} min.`,
      getReady,
      `Get down at ${to.board}.`,
      `Fare: about ${naira(fare)} per person. Pay when you get down; if the driver quotes more, agree the price before you enter.`,
    ]
  }
  return [
    `Go to ${from.board}. Keke heading to ${terminal.name} load there.`,
    `Tell the rider "${callName(to)}" and agree the fare — about ${naira(fare)} — before you sit.`,
    `Get down at ${to.board}.`,
  ]
}

export function walkDetails(a: Place, b: Place, km: number, minutes: number): string[] {
  return [`Walk about ${distanceWords(km)} (${minutes} min) to ${at(b)}.`]
}

export function kekeDetails(a: Place, b: Place, fare: [number, number], direction: "access" | "egress" | "direct"): string[] {
  const area = areaName(a)
  return [
    `Keke pick up on the main streets${area ? ` around ${area}` : ""}. Wave one down, or ask a shop owner where the nearest keke stand is.`,
    `Tell the rider "${b.name}" and agree the fare — about ${naira(fare)} — before you sit.`,
    direction === "access"
      ? `The keke drops you at ${at(b)}. Keke can't use the expressway, so this is as far as it goes.`
      : `Show the rider the exact address or a landmark near ${b.name}, and pay when you arrive.`,
  ]
}

export function okadaDetails(a: Place, b: Place, fare: [number, number], direction: "access" | "egress" | "direct"): string[] {
  const area = areaName(a)
  return [
    `Okada riders wait at junctions${area ? ` around ${area}` : ""}. Choose one who has a helmet for you.`,
    `Tell the rider "${b.name}" and agree the fare — about ${naira(fare)} — before you climb on.`,
    direction === "access"
      ? `Get down at ${at(b)}. Okada aren't allowed into the city centre, so continue from there.`
      : `Guide the rider to the exact gate or landmark at ${b.name}, then pay.`,
  ]
}

export function taxiDetails(
  a: Place,
  b: Place,
  fare: [number, number],
  zone: Zone,
  direction: "access" | "egress" | "direct",
): string[] {
  const area = areaName(a)
  const where =
    direction === "egress"
      ? `At ${at(a)}, wave down a green-and-white taxi.`
      : zone === "core"
        ? `Walk to the nearest main road and wave down a green-and-white taxi.`
        : `Cabs are fewer here — wait by the main road or junction${area ? ` in ${area}` : ""} and wave one down.`
  return [
    where,
    `Tell the driver "${b.name}". On a busy road he may carry other passengers going the same way ("along"), which keeps it cheap.`,
    direction === "access"
      ? `Get down at ${at(b)}.`
      : `If you want to go straight to the gate on your own, ask for a "drop" — it costs more, so agree the price first.`,
    `Expect about ${naira(fare)}${direction === "access" ? "" : " shared"}. No cab passing? Book a Bolt or inDrive instead.`,
  ]
}

export function rideDetails(a: Place, b: Place, fare: [number, number]): string[] {
  return [
    `Open Bolt or inDrive. Set pickup to ${a.name} and the destination to ${b.name}.`,
    `Bolt should quote around ${naira(fare)}. On inDrive you name a price — start near ₦${n(fare[0])} and adjust if no driver accepts.`,
    `Before you enter, check the plate number and the driver's name match the app, and share your trip with someone you trust.`,
  ]
}
