"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { IconCurrentLocation, IconX } from "@tabler/icons-react"
import { CORRIDORS, HUBS, HUB_MAP } from "@/lib/network"
import { locateOnce, useAppStore } from "@/lib/store"
import { reverseGeocode, saveRecent } from "@/lib/geocode"
import { legRoute } from "@/lib/directions"
import { ABUJA_CENTER, ABUJA_BOUNDS } from "@/lib/geo"
import { MODE_META } from "@/lib/format"
import type { GeoPoint, Journey } from "@/lib/types"

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

/* ----------------------------- icons ----------------------------- */

const originIcon = () =>
  L.divIcon({ className: "", html: `<span class="pin-origin"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] })

const destIcon = () =>
  L.divIcon({
    className: "",
    html: `<span class="pin-dest"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" fill="#6247d8" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  })

const stopIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<span class="pin-stop" style="--c:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })

const hubIcon = () => L.divIcon({ className: "", html: `<span class="pin-hub"></span>`, iconSize: [10, 10], iconAnchor: [5, 5] })

const userIcon = () =>
  L.divIcon({ className: "", html: `<span class="pin-user"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] })

/** Keep routes clear of the panel: left panel on desktop, bottom sheet on phones. */
function fitPadding(): L.FitBoundsOptions {
  if (window.innerWidth >= 768) return { paddingTopLeft: [440, 40], paddingBottomRight: [40, 40] }
  const sheet = document.querySelector(".sheet")?.getBoundingClientRect().height ?? window.innerHeight * 0.5
  // Never squeeze the visible map below ~140px, even when the sheet is tall.
  const bottom = Math.min(sheet + 16, window.innerHeight - 140 - 70)
  return { paddingTopLeft: [24, 70], paddingBottomRight: [24, Math.round(bottom)] }
}

/* --------------------------- network layer --------------------------- */

function NetworkLayer() {
  const map = useMap()

  useEffect(() => {
    const stops = L.layerGroup()
    const lines = L.layerGroup()
    HUBS.forEach((h) =>
      L.marker([h.lat, h.lng], { icon: hubIcon(), keyboard: false })
        .bindTooltip(`<b>${h.name}</b><br/><span>${h.kind}</span>`, { direction: "top", offset: [0, -4] })
        .addTo(stops),
    )
    CORRIDORS.forEach((c) => {
      const pts = c.stops.map((id) => [HUB_MAP[id].lat, HUB_MAP[id].lng] as [number, number])
      L.polyline(pts, { color: MODE_META[c.mode].color, weight: 3, opacity: 0.35 }).bindTooltip(c.name).addTo(lines)
    })

    // Stops only make sense once you've zoomed in a little.
    const sync = () => {
      if (map.getZoom() >= 12) stops.addTo(map)
      else stops.remove()
    }
    sync()
    map.on("zoomend", sync)

    const control = L.control
      .layers(undefined, { "Along stops & parks": stops, "Bus & cab lines": lines }, { position: "topright" })
      .addTo(map)

    return () => {
      map.off("zoomend", sync)
      control.remove()
      stops.remove()
      lines.remove()
    }
  }, [map])

  return null
}

/* ---------------------------- route layer ---------------------------- */

function drawJourney(group: L.FeatureGroup, r: Journey, lines: [number, number][][], activeLeg: number | null) {
  group.clearLayers()
  r.legs.forEach((l, i) => {
    const color = MODE_META[l.mode].color
    const faded = activeLeg !== null && i !== activeLeg
    const pts = lines[i] ?? l.coords
    if (l.mode === "walk") {
      L.polyline(pts, { color, weight: 5, dashArray: "1 9", lineCap: "round", opacity: faded ? 0.35 : 1 }).addTo(group)
    } else {
      L.polyline(pts, { color: "#ffffff", weight: 10, opacity: faded ? 0.5 : 1 }).addTo(group)
      L.polyline(pts, { color, weight: 6, opacity: faded ? 0.35 : 1 })
        .bindTooltip(`${MODE_META[l.mode].label}: ${l.from} → ${l.to}`, { sticky: true })
        .addTo(group)
    }
    if (i > 0) {
      const [lat, lng] = l.coords[0]
      L.marker([lat, lng], { icon: stopIcon(color) }).bindTooltip(l.from, { direction: "top" }).addTo(group)
    }
  })
  L.marker([r.origin.lat, r.origin.lng], { icon: originIcon(), zIndexOffset: 500 }).bindTooltip(r.origin.name).addTo(group)
  L.marker([r.destination.lat, r.destination.lng], { icon: destIcon(), zIndexOffset: 600 })
    .bindTooltip(r.destination.name)
    .addTo(group)
}

function RouteLayer() {
  const map = useMap()
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const panel = useAppStore((s) => s.panel)
  const navStep = useAppStore((s) => s.navStep)
  const groupRef = useRef<L.FeatureGroup | null>(null)
  const linesRef = useRef<{ id: string; lines: [number, number][][] } | null>(null)

  const r = panel === "planner" ? undefined : routes[selected]
  const activeLeg = panel === "navigation" && r && navStep < r.legs.length ? navStep : null

  // Draw straight lines immediately, then swap in road geometry as it arrives.
  useEffect(() => {
    const group = (groupRef.current ??= L.featureGroup().addTo(map))
    if (!r) {
      group.clearLayers()
      return
    }
    let cancelled = false
    const known = linesRef.current?.id === r.id ? linesRef.current.lines : r.legs.map((l) => l.coords)
    drawJourney(group, r, known, null)
    map.fitBounds(group.getBounds(), fitPadding())

    if (linesRef.current?.id !== r.id) {
      Promise.all(r.legs.map(legRoute)).then((routes) => {
        const lines = routes.map((x) => x.line)
        if (cancelled) return
        linesRef.current = { id: r.id, lines }
        drawJourney(group, r, lines, useAppStore.getState().panel === "navigation" ? useAppStore.getState().navStep : null)
      })
    }
    return () => {
      cancelled = true
    }
  }, [map, r])

  // During a trip, highlight and zoom to the current leg.
  useEffect(() => {
    const group = groupRef.current
    if (!group || !r) return
    const lines = linesRef.current?.id === r.id ? linesRef.current.lines : r.legs.map((l) => l.coords)
    drawJourney(group, r, lines, activeLeg)
    if (activeLeg !== null) map.fitBounds(L.latLngBounds(lines[activeLeg] ?? r.legs[activeLeg].coords), { ...fitPadding(), maxZoom: 16 })
  }, [map, r, activeLeg])

  useEffect(
    () => () => {
      groupRef.current?.remove()
      groupRef.current = null
    },
    [],
  )

  return null
}

/* --------------------- chosen points & user location --------------------- */

function PointsLayer() {
  const map = useMap()
  const origin = useAppStore((s) => s.origin)
  const destination = useAppStore((s) => s.destination)
  const panel = useAppStore((s) => s.panel)
  const user = useAppStore((s) => s.userLocation)

  useEffect(() => {
    if (panel !== "planner") return
    const group = L.featureGroup()
    if (origin) L.marker([origin.lat, origin.lng], { icon: originIcon() }).bindTooltip(origin.name).addTo(group)
    if (destination) L.marker([destination.lat, destination.lng], { icon: destIcon() }).bindTooltip(destination.name).addTo(group)
    group.addTo(map)
    if (origin && destination) map.fitBounds(group.getBounds(), { ...fitPadding(), maxZoom: 15 })
    else if (origin || destination) {
      const p = L.latLng((origin ?? destination)!.lat, (origin ?? destination)!.lng)
      map.fitBounds(L.latLngBounds(p, p), { ...fitPadding(), maxZoom: Math.max(map.getZoom(), 14) })
    }
    return () => {
      group.remove()
    }
  }, [map, origin, destination, panel])

  useEffect(() => {
    if (!user) return
    const group = L.layerGroup([
      L.circle([user.lat, user.lng], { radius: Math.min(user.accuracy, 300), color: "#2f6fed", weight: 1, fillOpacity: 0.1 }),
      L.marker([user.lat, user.lng], { icon: userIcon(), interactive: false, zIndexOffset: 1000 }),
    ]).addTo(map)
    return () => {
      group.remove()
    }
  }, [map, user])

  return null
}

function ClickToPick() {
  const pickModeRef = useRef(useAppStore.getState().pickMode)
  useEffect(() => useAppStore.subscribe((s) => (pickModeRef.current = s.pickMode)), [])

  useMapEvents({
    click: async (e) => {
      const mode = pickModeRef.current
      if (!mode) return
      const { lat, lng } = e.latlng
      const store = useAppStore.getState()
      const typedName = store.pickName
      store.setPickMode(null)
      const pin: GeoPoint = { name: typedName ?? "Dropped pin", detail: "Finding address…", lat, lng, type: typedName ? "custom" : "pin" }
      if (mode === "origin") store.setOrigin(pin)
      else store.setDestination(pin)
      const where = await reverseGeocode(lat, lng)
      // A place the user named themselves keeps that name; the address becomes the detail line.
      const named: GeoPoint = typedName ? { ...pin, detail: where.name } : { ...pin, name: where.name, detail: where.detail }
      if (typedName) saveRecent(named)
      const now = useAppStore.getState()
      if (mode === "origin" && now.origin === pin) now.setOrigin(named)
      if (mode === "destination" && now.destination === pin) now.setDestination(named)
    },
  })
  return null
}

function LocateButton() {
  const map = useMap()
  const showToast = useAppStore((s) => s.showToast)
  const ref = useRef<HTMLButtonElement>(null)
  // The button lives inside the map container; stop its clicks from dropping pins.
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current)
  }, [])
  return (
    <button
      ref={ref}
      type="button"
      onClick={async () => {
        const loc = await locateOnce()
        if (!loc) return showToast("Couldn't get your location. Check that location access is allowed.")
        const p = L.latLng(loc.lat, loc.lng)
        map.fitBounds(L.latLngBounds(p, p), { ...fitPadding(), maxZoom: 16 })
      }}
      className="map-locate"
      aria-label="Show my location"
      title="Show my location"
    >
      <IconCurrentLocation size={20} />
    </button>
  )
}

/* ------------------------------- map ------------------------------- */

/** Start centred on Abuja within the part of the screen the panel doesn't cover. */
function initialCenter(): [number, number] {
  const degPerPx = 360 / (256 * 2 ** 12) // at the initial zoom
  if (window.innerWidth >= 768) return [ABUJA_CENTER[0], ABUJA_CENTER[1] - 220 * degPerPx]
  return [ABUJA_CENTER[0] - window.innerHeight * 0.3 * degPerPx, ABUJA_CENTER[1]]
}

export function MapView() {
  const pickMode = useAppStore((s) => s.pickMode)
  const setPickMode = useAppStore((s) => s.setPickMode)
  const pickName = useAppStore((s) => s.pickName)
  const [center] = useState(initialCenter)

  return (
    <div className={`absolute inset-0 ${pickMode ? "map-picking" : ""}`}>
      <MapContainer
        center={center}
        zoom={12}
        minZoom={9}
        maxBounds={[
          [ABUJA_BOUNDS.south - 0.3, ABUJA_BOUNDS.west - 0.3],
          [ABUJA_BOUNDS.north + 0.3, ABUJA_BOUNDS.east + 0.3],
        ]}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} maxZoom={19} />
        <AttributionAndZoom />
        <NetworkLayer />
        <PointsLayer />
        <RouteLayer />
        <ClickToPick />
        <LocateButton />
      </MapContainer>

      {pickMode && (
        <div className="pick-banner">
          <span>
            Tap the map where{" "}
            <b>{pickName ? `“${pickName}”` : pickMode === "origin" ? "you're starting" : "you're going"}</b> is
          </span>
          <button type="button" onClick={() => setPickMode(null)} aria-label="Cancel">
            <IconX size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function AttributionAndZoom() {
  const map = useMap()
  useEffect(() => {
    const zoom = L.control.zoom({ position: "topright" }).addTo(map)
    const attribution = L.control
      // Bottom-right on desktop; on phones the bottom sheet covers that corner.
      .attribution({ position: window.innerWidth >= 768 ? "bottomright" : "topleft", prefix: false })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · Places: <a href="https://overturemaps.org" target="_blank" rel="noreferrer">Overture Maps</a>',
      )
      .addTo(map)
    return () => {
      zoom.remove()
      attribution.remove()
    }
  }, [map])
  return null
}
