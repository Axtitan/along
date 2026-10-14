"use client"

import { create } from "zustand"
import type { GeoPoint, Journey, PickMode } from "./types"

export type Panel = "planner" | "results" | "navigation"

export interface UserLocation {
  lat: number
  lng: number
  accuracy: number
}

interface AppState {
  origin: GeoPoint | null
  destination: GeoPoint | null
  routes: Journey[]
  selected: number
  pickMode: PickMode
  /** Name the user typed for a place we couldn't find; the dropped pin takes this name */
  pickName: string | null
  navStep: number
  voice: boolean
  voiceName: string
  panel: Panel
  toast: string | null
  /** Last known GPS fix (only set after the user asks for their location) */
  userLocation: UserLocation | null
  /** Mobile bottom sheet folded down to show more map */
  sheetCollapsed: boolean
  settingsOpen: boolean

  setOrigin: (p: GeoPoint | null) => void
  setDestination: (p: GeoPoint | null) => void
  setRoutes: (r: Journey[]) => void
  setSelected: (i: number) => void
  setPickMode: (m: PickMode, name?: string | null) => void
  setNavStep: (s: number) => void
  setVoice: (v: boolean) => void
  setVoiceName: (n: string) => void
  setPanel: (p: Panel) => void
  setUserLocation: (l: UserLocation | null) => void
  setSheetCollapsed: (c: boolean) => void
  setSettingsOpen: (o: boolean) => void
  showToast: (msg: string) => void
  swapLocations: () => void
  startTrip: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useAppStore = create<AppState>((set, get) => ({
  origin: null,
  destination: null,
  routes: [],
  selected: 0,
  pickMode: null,
  pickName: null,
  navStep: 0,
  voice: true,
  voiceName: "browser",
  panel: "planner",
  toast: null,
  userLocation: null,
  sheetCollapsed: false,
  settingsOpen: false,

  setOrigin: (p) => set({ origin: p }),
  setDestination: (p) => set({ destination: p }),
  setRoutes: (r) => set({ routes: r, selected: 0 }),
  setSelected: (i) => set({ selected: i }),
  setPickMode: (m, name = null) => set({ pickMode: m, pickName: m ? name : null, sheetCollapsed: m !== null }),
  setNavStep: (s) => set({ navStep: s }),
  setVoice: (v) => set({ voice: v }),
  setVoiceName: (n) => {
    try {
      localStorage.setItem("alongVoice", n)
    } catch {}
    set({ voiceName: n })
  },
  setPanel: (p) => set({ panel: p, sheetCollapsed: false }),
  setUserLocation: (l) => set({ userLocation: l }),
  setSheetCollapsed: (c) => set({ sheetCollapsed: c }),
  setSettingsOpen: (o) => set({ settingsOpen: o }),

  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: msg })
    toastTimer = setTimeout(() => set({ toast: null }), 3500)
  },

  swapLocations: () => {
    const { origin, destination } = get()
    set({ origin: destination, destination: origin })
  },

  startTrip: () => set({ navStep: 0, panel: "navigation", sheetCollapsed: false }),
}))

/** Ask the browser for a single GPS fix. Resolves null if denied or unavailable. */
export function locateOnce(): Promise<UserLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const loc = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }
        useAppStore.getState().setUserLocation(loc)
        resolve(loc)
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  })
}
