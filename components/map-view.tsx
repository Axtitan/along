"use client"

import { useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { HUBS, LINKS, HUB_MAP } from "@/lib/network"
import { useAppStore } from "@/lib/store"
import { reverseGeocode } from "@/lib/geocode"
import { ABUJA_CENTER } from "@/lib/format"
import type { GeoPoint } from "@/lib/types"

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

function hubIcon() {
  return L.divIcon({
    className: "",
    html: `<span class="along-marker" style="--marker:#171817"><i></i></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function originIcon() {
  return L.divIcon({
    className: "",
    html: `<span class="along-marker" style="--marker:#b8f04a"><i></i></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function destIcon() {
  return L.divIcon({
    className: "",
    html: `<span class="along-marker" style="--marker:#8a72e8"><i></i></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const MODE_COLORS: Record<string, string> = {
  bus: "#8a72e8",
  keke: "#d08a3d",
  taxi: "#69716b",
}

function NetworkOverlay() {
  const map = useMap()
  const controlRef = useRef<L.Control | null>(null)

  useEffect(() => {
    const networkLayer = L.layerGroup()
    const hubLayer = L.layerGroup()

    LINKS.forEach((e) => {
      const a = HUB_MAP[e.a]
      const b = HUB_MAP[e.b]
      if (!a || !b) return
      L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        {
          color: MODE_COLORS[e.mode] || "#69716b",
          weight: 3,
          opacity: 0.2,
          dashArray: e.mode === "taxi" ? "5 8" : undefined,
        },
      ).addTo(networkLayer)
    })

    HUBS.forEach((h) => {
      L.marker([h.lat, h.lng], { icon: hubIcon() })
        .bindTooltip(h.name, { direction: "top" })
        .addTo(hubLayer)
    })

    networkLayer.addTo(map)
    hubLayer.addTo(map)

    const layers = L.control.layers(
      undefined,
      {
        "Prototype transport routes": networkLayer,
        "Transport hubs": hubLayer,
      },
      { collapsed: true, position: "topright" },
    )
    layers.addTo(map)
    controlRef.current = layers

    return () => {
      layers.remove()
      controlRef.current = null
      map.removeLayer(networkLayer)
      map.removeLayer(hubLayer)
    }
  }, [map])

  return null
}

function RouteOverlay() {
  const map = useMap()
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const layerRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    const r = routes[selected]
    if (!r) return

    const group: L.Layer[] = []

    r.legs.forEach((l) => {
      const color =
        l.mode === "walk"
          ? "#171817"
          : l.mode === "bus"
            ? "#8067e6"
            : l.mode === "keke"
              ? "#d48635"
              : "#65706a"
      group.push(
        L.polyline(l.coords, {
          color,
          weight: l.mode === "walk" ? 5 : 7,
          dashArray: l.mode === "walk" ? "3 10" : undefined,
          opacity: 0.95,
        }),
      )
    })

    group.push(L.marker([r.origin.lat, r.origin.lng], { icon: originIcon() }).bindTooltip("Start"))
    group.push(
      L.marker([r.destination.lat, r.destination.lng], { icon: destIcon() }).bindTooltip("Destination"),
    )

    const fg = L.featureGroup(group).addTo(map)
    layerRef.current = fg
    map.fitBounds(fg.getBounds().pad(0.22))

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, routes, selected])

  return null
}

function NavOverlay() {
  const map = useMap()
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const navStep = useAppStore((s) => s.navStep)
  const panel = useAppStore((s) => s.panel)

  useEffect(() => {
    if (panel !== "navigation") return
    const r = routes[selected]
    if (!r) return
    const leg = r.legs[navStep]
    if (!leg) return
    map.fitBounds(L.latLngBounds(leg.coords).pad(0.8))
  }, [map, routes, selected, navStep, panel])

  return null
}

function MapControls() {
  const map = useMap()

  useEffect(() => {
    const zoom = L.control.zoom({ position: "topright" })
    zoom.addTo(map)

    return () => {
      zoom.remove()
    }
  }, [map])

  return null
}

function PickMarkers() {
  const map = useMap()
  const origin = useAppStore((s) => s.origin)
  const destination = useAppStore((s) => s.destination)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    const group = L.layerGroup()

    if (origin && origin.type === "pin") {
      L.marker([origin.lat, origin.lng], { icon: originIcon() })
        .bindTooltip("Origin")
        .addTo(group)
    }
    if (destination && destination.type === "pin") {
      L.marker([destination.lat, destination.lng], { icon: destIcon() })
        .bindTooltip("Destination")
        .addTo(group)
    }

    if (origin || destination) {
      group.addTo(map)
      layerRef.current = group
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, origin, destination])

  return null
}

function ClickHandler() {
  const pickMode = useAppStore((s) => s.pickMode)
  const pickModeRef = useRef(pickMode)
  pickModeRef.current = pickMode

  useMapEvents({
    click: async (e) => {
      const mode = pickModeRef.current
      if (!mode) return
      const { lat, lng } = e.latlng
      const name = await reverseGeocode(lat, lng)
      const point: GeoPoint = { name, lat, lng, type: "pin" }

      if (mode === "origin") {
        useAppStore.getState().setOrigin(point)
      } else {
        useAppStore.getState().setDestination(point)
      }
      useAppStore.getState().setPickMode(null)
      useAppStore.getState().showToast(`${mode === "origin" ? "Origin" : "Destination"} set`)
    },
  })

  return null
}

function MapResizer() {
  const map = useMap()
  const ref = useRef<InstanceType<typeof globalThis.ResizeObserver> | null>(null)

  useEffect(() => {
    const container = map.getContainer()
    ref.current = new globalThis.ResizeObserver(() => map.invalidateSize())
    ref.current.observe(container)
    return () => ref.current?.disconnect()
  }, [map])

  return null
}

export function MapView() {
  const pickMode = useAppStore((s) => s.pickMode)

  return (
    <div className={`map-stage ${pickMode ? "picking" : ""}`}>
      <MapContainer
        center={ABUJA_CENTER}
        zoom={12}
        minZoom={9}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url={TILE_URL}
          maxZoom={19}
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />
        <NetworkOverlay />
        <MapControls />
        <PickMarkers />
        <RouteOverlay />
        <NavOverlay />
        <ClickHandler />
        <MapResizer />
      </MapContainer>

      {pickMode && (
        <div className="pick-banner">
          Tap anywhere on the map to set <b>{pickMode}</b>
          <button onClick={() => useAppStore.getState().setPickMode(null)}>Cancel</button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          const dialog = document.getElementById("settingsDialog") as HTMLDialogElement
          dialog?.showModal()
        }}
        className="absolute left-4 top-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/92 text-xs font-bold text-ink shadow-md hover:bg-white"
        aria-label="Voice settings"
      >
        TB
      </button>

      <div className="map-note">
        <span /> OpenStreetMap · prototype transport network
      </div>
    </div>
  )
}
