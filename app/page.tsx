"use client"

import dynamic from "next/dynamic"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Topbar } from "@/components/topbar"
import { PlannerPanel } from "@/components/planner-panel"
import { ResultsPanel } from "@/components/results-panel"
import { NavigationPanel } from "@/components/navigation-panel"
import { SettingsDialog } from "@/components/dialogs"
import { Toast } from "@/components/toast"

const MapView = dynamic(() => import("@/components/map-view").then((m) => ({ default: m.MapView })), {
  ssr: false,
})

export default function Page() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <div className="shell relative min-h-screen overflow-hidden bg-paper">
        <Topbar />

        <main>
          <MapView />
          <PlannerPanel />
          <ResultsPanel />
          <NavigationPanel />
        </main>

        <SettingsDialog />
        <Toast />
      </div>
    </QueryClientProvider>
  )
}
