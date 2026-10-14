"use client"

import { useAppStore } from "@/lib/store"

export function Toast() {
  const toast = useAppStore((s) => s.toast)

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 top-4 z-[3000] w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-center text-sm font-medium text-white shadow-[0_12px_32px_rgba(0,0,0,0.25)] transition-all duration-300 ${
        toast ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
    >
      {toast}
    </div>
  )
}
