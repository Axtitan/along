"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { getCloudVoices } from "@/lib/tts-config"

type SettingsTab = "voice" | "report"

export function SettingsDialog() {
  const voiceName = useAppStore((s) => s.voiceName)
  const setVoiceName = useAppStore((s) => s.setVoiceName)
  const showToast = useAppStore((s) => s.showToast)
  const [tab, setTab] = useState<SettingsTab>("voice")

  const handleSaveVoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const value = String(form.get("voice") || "browser")
    setVoiceName(value)
    localStorage.setItem("alongVoice", value)
    showToast("Voice settings saved.")
  }

  const handleReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    showToast("Thanks \u2014 your report was saved for review.")
    setTab("voice")
  }

  const close = () => (document.getElementById("settingsDialog") as HTMLDialogElement)?.close()

  return (
    <dialog id="settingsDialog" className="settings-dialog">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow text-[10px] font-bold tracking-widest text-muted-foreground">
              PROFILE
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-ink">Settings</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-sm font-bold text-white"
          >
            &times;
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setTab("voice")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              tab === "voice" ? "bg-white text-ink shadow-sm" : "text-muted-foreground"
            }`}
          >
            Voice &amp; Map
          </button>
          <button
            type="button"
            onClick={() => setTab("report")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              tab === "report" ? "bg-white text-ink shadow-sm" : "text-muted-foreground"
            }`}
          >
            Report an issue
          </button>
        </div>

        {tab === "voice" && (
          <form onSubmit={handleSaveVoice}>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Online Nigerian voices use cloud TTS when deployment keys are configured. The app falls
              back to an installed <b className="text-ink">en-NG</b> device voice, then the default
              browser voice.
            </p>

            <label className="mt-5 block text-xs font-bold text-ink">
              Preferred voice
              <select
                name="voice"
                defaultValue={voiceName}
                className="mt-1.5 block w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-violet focus:ring-2 focus:ring-violet/20"
              >
                <option value="browser">Best Nigerian device voice</option>
                {getCloudVoices().map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-[#2a2b2a]"
            >
              Save settings
            </button>
          </form>
        )}

        {tab === "report" && (
          <form onSubmit={handleReport}>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Reports help keep Along useful. We never publish a change without review.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {[
                { value: "wrong_fare", label: "Fare is wrong" },
                { value: "stop_moved", label: "Stop has moved" },
                { value: "route_changed", label: "Route changed" },
                { value: "unavailable", label: "Route unavailable" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-bold text-ink hover:bg-[#ececea]"
                >
                  <input
                    type="radio"
                    name="issue"
                    value={opt.value}
                    required={opt.value === "wrong_fare"}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <textarea
              name="details"
              placeholder="Add a short note (optional)"
              className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-violet focus:ring-2 focus:ring-violet/20"
              rows={3}
            />

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-[#2a2b2a]"
            >
              Send report
            </button>
          </form>
        )}
      </div>
    </dialog>
  )
}
