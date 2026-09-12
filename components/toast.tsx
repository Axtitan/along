"use client"

import { useAppStore } from "@/lib/store"

export function Toast() {
  const toast = useAppStore((s) => s.toast)

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ${
        toast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      {toast}
    </div>
  )
}
