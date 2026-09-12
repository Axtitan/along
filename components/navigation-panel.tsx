"use client"

import { useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { useTTS } from "@/hooks/use-tts"
import { modeIcon } from "@/lib/format"
import { getCloudVoices } from "@/lib/tts-config"

export function NavigationPanel() {
  const panel = useAppStore((s) => s.panel)
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const navStep = useAppStore((s) => s.navStep)
  const paused = useAppStore((s) => s.paused)
  const voice = useAppStore((s) => s.voice)
  const voiceName = useAppStore((s) => s.voiceName)
  const setNavStep = useAppStore((s) => s.setNavStep)
  const setPaused = useAppStore((s) => s.setPaused)
  const setVoice = useAppStore((s) => s.setVoice)
  const setVoiceName = useAppStore((s) => s.setVoiceName)
  const setPanel = useAppStore((s) => s.setPanel)
  const showToast = useAppStore((s) => s.showToast)

  const { speak, cancel } = useTTS()

  const journey = routes[selected]
  const leg = journey?.legs[navStep]
  const totalLegs = journey?.legs.length ?? 0
  const isComplete = !leg

  const handleNextStep = useCallback(() => {
    if (paused) {
      showToast("Resume the trip first.")
      return
    }
    if (!leg) return

    const nextStep = navStep + 1
    setNavStep(nextStep)

    const nextLeg = journey?.legs[nextStep]
    if (nextLeg) {
      speak(`You've reached ${leg.to}. ${nextLeg.text}`)
    } else {
      speak(`You've arrived at ${journey?.destination.name}.`)
    }
  }, [navStep, paused, leg, journey, setNavStep, speak, showToast])

  const handleStart = useCallback(() => {
    setNavStep(0)
    setPaused(false)
    setPanel("navigation")
    if (journey?.legs[0]) {
      speak(`Navigation started. ${journey.legs[0].text}`)
    }
  }, [setNavStep, setPaused, setPanel, journey, speak])

  const handleClose = useCallback(() => {
    setPanel("results")
    cancel()
  }, [setPanel, cancel])

  const handleVoiceChange = useCallback(
    (value: string) => {
      setVoiceName(value)
      localStorage.setItem("alongVoice", value)
    },
    [setVoiceName],
  )

  if (panel !== "navigation") return null

  const progress = Math.max(12, (navStep / totalLegs) * 100)

  return (
    <section className="navigation-panel" id="navigationPanel">
      <div className="nav-handle mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

      <div className="flex items-center justify-between">
        <span className="live-chip flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[10px] font-bold text-white">
          <i className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
          DEMO LIVE
        </span>

        <div className="nav-tools flex items-center gap-2">
          <select
            aria-label="Navigation voice"
            value={voiceName}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-bold"
          >
            <option value="browser">Device voice</option>
            {getCloudVoices().map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setVoice(!voice)}
            className="icon-btn light flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white text-sm"
            aria-label="Toggle voice"
          >
            {voice ? "\uD83D\uDD0A" : "\uD83D\uDD07"}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="icon-btn light flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white text-sm"
            aria-label="Close navigation"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="nav-next mt-4 text-xs font-bold text-muted-foreground">
        NEXT ·{" "}
        <span id="navStepNumber">
          {isComplete ? "COMPLETE" : `${navStep + 1} OF ${totalLegs}`}
        </span>
      </div>

      <div className="nav-instruction mt-3 flex gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          {isComplete ? "\u2713" : modeIcon(leg!.mode)}
        </div>
        <div>
          <h2 className="text-lg font-extrabold">
            {isComplete ? "You've arrived" : leg!.text}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isComplete
              ? journey?.destination.name
              : leg!.distance
                ? `${leg!.distance} metres away`
                : `About ${leg!.time} minutes`}
          </p>
        </div>
      </div>

      <div className="progress-track mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <span
          id="navProgress"
          className="block h-full rounded-full bg-green transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="nav-controls mt-4 grid grid-cols-[92px_1fr] gap-2">
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          className="secondary-btn rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-[#ececea]"
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={isComplete ? handleClose : handleNextStep}
          className="primary-btn compact flex items-center justify-center gap-1 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2a2b2a]"
        >
          {isComplete ? "Trip complete" : "Simulate next step"} <span>&rarr;</span>
        </button>
      </div>
    </section>
  )
}
