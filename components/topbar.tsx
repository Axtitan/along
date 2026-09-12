"use client"

import { useAppStore } from "@/lib/store"
import { reverseGeocode } from "@/lib/geocode"

export function Topbar() {
  const setOrigin = useAppStore((s) => s.setOrigin)
  const showToast = useAppStore((s) => s.showToast)

  const handleLocate = () => {
    if (!navigator.geolocation) {
      showToast("Location is unavailable on this device.")
      return
    }
    showToast("Finding your location\u2026")
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude: lat, longitude: lng } = p.coords
        const name = await reverseGeocode(lat, lng)
        setOrigin({ name, lat, lng, type: "gps" })
        showToast("Current location added.")
      },
      () => showToast("We couldn't access your location. Search or pick from the map."),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <header className="topbar">
      <a className="brand flex items-center gap-2.5 text-ink no-underline" href="#" aria-label="Along home">
        <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-lg font-extrabold text-white">
          a<span className="text-green text-sm">&#8599;</span>
        </span>
        <b className="text-lg tracking-tight">along</b>
      </a>

      <div className="top-actions flex gap-2">
        <button
          type="button"
          onClick={handleLocate}
          className="icon-btn flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-white/92 text-[9px] font-extrabold"
          aria-label="Use current location"
          title="Use current location"
        >
          GPS
        </button>
      </div>
    </header>
  )
}
