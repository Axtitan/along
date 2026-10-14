"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"
import { IconChevronDown, IconChevronUp, IconSettings } from "@tabler/icons-react"
import { useAppStore } from "@/lib/store"
import { PlannerPanel } from "@/components/planner-panel"
import { ResultsPanel } from "@/components/results-panel"
import { NavigationPanel } from "@/components/navigation-panel"
import { SettingsDialog } from "@/components/dialogs"
import { Toast } from "@/components/toast"

const MapView = dynamic(() => import("@/components/map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#e9ebe4]" />,
})

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 19 L12 5 L19 19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="5" r="2.4" fill="#b8f04a" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">along</span>
      <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink/60">Abuja</span>
    </div>
  )
}

export default function Page() {
  const panel = useAppStore((s) => s.panel)
  const collapsed = useAppStore((s) => s.sheetCollapsed)
  const setCollapsed = useAppStore((s) => s.setSheetCollapsed)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  // Restore the saved voice choice after hydration.
  useEffect(() => {
    try {
      const v = localStorage.getItem("alongVoice")
      if (v) useAppStore.setState({ voiceName: v })
    } catch {}
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#e9ebe4]">
      <MapView />

      <aside
        className={`sheet ${collapsed ? "sheet-collapsed" : ""}`}
        aria-label={panel === "planner" ? "Plan a trip" : panel === "results" ? "Route options" : "Trip in progress"}
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="sheet-handle"
          aria-label={collapsed ? "Expand panel" : "Collapse panel to see the map"}
        >
          <span className="h-1 w-10 rounded-full bg-ink/20" />
          {collapsed ? <IconChevronUp size={14} className="text-ink/40" /> : <IconChevronDown size={14} className="text-ink/40" />}
        </button>

        <header className="flex items-center justify-between px-5 pt-1 pb-3 md:pt-5">
          <Brand />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink hover:bg-ink hover:text-white"
            aria-label="Settings"
          >
            <IconSettings size={18} />
          </button>
        </header>

        <div className="sheet-body">
          {panel === "planner" && <PlannerPanel />}
          {panel === "results" && <ResultsPanel />}
          {panel === "navigation" && <NavigationPanel />}
        </div>
      </aside>

      <SettingsDialog />
      <Toast />
    </div>
  )
}
