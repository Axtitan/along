"use client"

import { useEffect, useRef, useState } from "react"
import { IconX } from "@tabler/icons-react"
import { useAppStore } from "@/lib/store"
import { getCloudVoices } from "@/lib/tts-config"

type SettingsTab = "voice" | "report"

const ISSUES = [
  { value: "wrong_fare", label: "Fare is wrong" },
  { value: "no_keke", label: "Keke / okada not allowed here" },
  { value: "stop_moved", label: "Stop or park has moved" },
  { value: "route_changed", label: "Vehicles don't run this way" },
]

export function SettingsDialog() {
  const open = useAppStore((s) => s.settingsOpen)
  const setOpen = useAppStore((s) => s.setSettingsOpen)
  const voiceName = useAppStore((s) => s.voiceName)
  const setVoiceName = useAppStore((s) => s.setVoiceName)
  const voice = useAppStore((s) => s.voice)
  const setVoice = useAppStore((s) => s.setVoice)
  const showToast = useAppStore((s) => s.showToast)
  const [tab, setTab] = useState<SettingsTab>("voice")
  const ref = useRef<HTMLDialogElement>(null)
  const cloudVoices = getCloudVoices()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const handleReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Reports aren't sent anywhere yet: there is no backend. Keep them on the device for now.
    const form = new FormData(e.currentTarget)
    try {
      const list = JSON.parse(localStorage.getItem("along-reports") || "[]")
      list.push({ issue: form.get("issue"), details: form.get("details"), at: new Date().toISOString() })
      localStorage.setItem("along-reports", JSON.stringify(list.slice(-50)))
    } catch {}
    e.currentTarget.reset()
    showToast("Thanks — your report was saved on this device.")
    setOpen(false)
  }

  return (
    <dialog
      ref={ref}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === ref.current && setOpen(false)}
      className="m-auto w-[calc(100%-32px)] max-w-[420px] rounded-3xl bg-white p-0 text-ink shadow-[0_25px_60px_rgba(0,0,0,0.25)] backdrop:bg-black/35 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-ink hover:text-white"
            aria-label="Close settings"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-paper p-1">
          {(["voice", "report"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:bg-ink/10 hover:text-ink"
              }`}
            >
              {t === "voice" ? "Voice" : "Report an issue"}
            </button>
          ))}
        </div>

        {tab === "voice" && (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-line p-3">
              <span>
                <span className="block text-sm font-semibold">Spoken directions</span>
                <span className="block text-xs text-ink/55">Reads each step aloud during a trip.</span>
              </span>
              <input
                type="checkbox"
                checked={voice}
                onChange={(e) => setVoice(e.target.checked)}
                className="h-5 w-5 accent-[#12140f]"
              />
            </label>

            <label className="block text-sm font-semibold">
              Voice
              <select
                value={voiceName}
                onChange={(e) => {
                  setVoiceName(e.target.value)
                  showToast("Voice saved.")
                }}
                className="mt-1.5 block w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-violet focus:ring-2 focus:ring-violet/20"
              >
                <option value="browser">This device&apos;s voice (free, works offline)</option>
                {cloudVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-relaxed text-ink/55">
              Nigerian cloud voices only work if the server has a speech key configured; otherwise Along uses your
              phone&apos;s built-in voice.
            </p>
          </div>
        )}

        {tab === "report" && (
          <form onSubmit={handleReport} className="mt-5 flex flex-col gap-2">
            <p className="mb-1 text-xs leading-relaxed text-ink/55">
              Spotted something wrong? Reports help us correct fares, stops and where keke can go.
            </p>
            {ISSUES.map((opt, i) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm font-medium hover:border-ink/40 hover:bg-paper has-[:checked]:border-ink has-[:checked]:bg-paper"
              >
                <input type="radio" name="issue" value={opt.value} required={i === 0} className="accent-[#12140f]" />
                {opt.label}
              </label>
            ))}
            <textarea
              name="details"
              placeholder="Where was it, and what's the correct info? (optional)"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-violet focus:ring-2 focus:ring-violet/20"
              rows={3}
            />
            <button
              type="submit"
              className="mt-2 flex h-11 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white hover:bg-black"
            >
              Save report
            </button>
          </form>
        )}
      </div>
    </dialog>
  )
}
