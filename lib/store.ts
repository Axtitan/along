"use client"

import { create } from "zustand"
import type { GeoPoint, Journey, PickMode } from "./types"

interface AppState {
  origin: GeoPoint | null
  destination: GeoPoint | null
  routes: Journey[]
  selected: number
  pickMode: PickMode
  navStep: number
  voice: boolean
  paused: boolean
  voiceName: string
  panel: "planner" | "results" | "navigation"
  toast: string | null

  setOrigin: (p: GeoPoint | null) => void
  setDestination: (p: GeoPoint | null) => void
  setRoutes: (r: Journey[]) => void
  setSelected: (i: number) => void
  setPickMode: (m: PickMode) => void
  setNavStep: (s: number) => void
  setVoice: (v: boolean) => void
  setPaused: (p: boolean) => void
  setVoiceName: (n: string) => void
  setPanel: (p: "planner" | "results" | "navigation") => void
  showToast: (msg: string) => void
  swapLocations: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useAppStore = create<AppState>((set, get) => ({
  origin: null,
  destination: null,
  routes: [],
  selected: 0,
  pickMode: null,
  navStep: 0,
  voice: true,
  paused: false,
  voiceName: "browser",
  panel: "planner",
  toast: null,

  setOrigin: (p) => set({ origin: p }),
  setDestination: (p) => set({ destination: p }),
  setRoutes: (r) => set({ routes: r }),
  setSelected: (i) => set({ selected: i }),
  setPickMode: (m) => set({ pickMode: m }),
  setNavStep: (s) => set({ navStep: s }),
  setVoice: (v) => set({ voice: v }),
  setPaused: (p) => set({ paused: p }),
  setVoiceName: (n) => set({ voiceName: n }),
  setPanel: (p) => set({ panel: p }),

  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: msg })
    toastTimer = setTimeout(() => set({ toast: null }), 3000)
  },

  swapLocations: () => {
    const { origin, destination } = get()
    set({ origin: destination, destination: origin })
  },
}))
