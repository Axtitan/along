"use client"

import { useEffect, useRef, useState } from "react"
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCurrentLocation,
  IconVolume,
  IconVolumeOff,
  IconX,
} from "@tabler/icons-react"
import { useAppStore } from "@/lib/store"
import { useTTS } from "@/hooks/use-tts"
import { duration, fareText, MODE_META } from "@/lib/format"
import { km } from "@/lib/geo"
import { ModeBadge } from "@/components/mode-icon"
import { Timeline } from "@/components/results-panel"
import { LegDetails } from "@/components/leg-details"
import { useLegRoutes } from "@/hooks/use-leg-routes"

/** How close (km) you need to be to the end of a leg for Along to move to the next step. */
const ARRIVAL_KM = 0.12

export function NavigationPanel() {
  const routes = useAppStore((s) => s.routes)
  const selected = useAppStore((s) => s.selected)
  const navStep = useAppStore((s) => s.navStep)
  const voice = useAppStore((s) => s.voice)
  const setNavStep = useAppStore((s) => s.setNavStep)
  const setVoice = useAppStore((s) => s.setVoice)
  const setPanel = useAppStore((s) => s.setPanel)
  const setUserLocation = useAppStore((s) => s.setUserLocation)
  const { speak, cancel } = useTTS()
  const [tracking, setTracking] = useState<"off" | "on" | "denied">("off")

  const journey = routes[selected]
  const legRoutes = useLegRoutes(journey)
  const total = journey?.legs.length ?? 0
  const leg = journey?.legs[navStep]
  const done = !leg

  // Speak each step as it becomes current.
  const spokenRef = useRef("")
  useEffect(() => {
    const key = `${journey?.id}#${navStep}`
    if (!journey || spokenRef.current === key) return
    spokenRef.current = key
    const l = journey.legs[navStep]
    // Read the full instructions; "₦1,050–1,450" reads badly, so spell fares out.
    if (l) speak(`${navStep === 0 ? "Let's go. " : ""}${l.text}. ${l.details.join(" ").replace(/₦([\d,]+)–([\d,]+)/g, "$1 to $2 naira")}`)
    else speak(`You have arrived at ${journey.destination.name}.`)
  }, [journey, navStep, speak])

  // Follow the user's GPS and move on when they reach the end of the current leg.
  useEffect(() => {
    if (!journey || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude }
        setUserLocation({ ...here, accuracy: p.coords.accuracy })
        setTracking("on")
        const { navStep: step } = useAppStore.getState()
        const current = journey.legs[step]
        if (!current) return
        const end = current.coords[current.coords.length - 1]
        if (km(here, { lat: end[0], lng: end[1] }) < Math.max(ARRIVAL_KM, (p.coords.accuracy || 0) / 1000)) {
          useAppStore.getState().setNavStep(step + 1)
        }
      },
      () => setTracking("denied"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [journey, setUserLocation])

  if (!journey) return null

  const end = () => {
    cancel()
    setPanel("results")
  }

  const meta = leg ? MODE_META[leg.mode] : null
  const remaining = journey.legs.slice(navStep).reduce((s, l) => s + l.time, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            tracking === "on" ? "bg-brand/50 text-green-dark" : "bg-paper text-ink/60"
          }`}
        >
          <IconCurrentLocation size={13} />
          {tracking === "on" ? "Following your location" : tracking === "denied" ? "GPS off — tap Next as you go" : "Waiting for GPS…"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (voice) cancel()
              setVoice(!voice)
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink hover:bg-ink hover:text-white"
            aria-label={voice ? "Mute voice" : "Turn voice on"}
          >
            {voice ? <IconVolume size={17} /> : <IconVolumeOff size={17} />}
          </button>
          <button
            type="button"
            onClick={end}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink hover:bg-ink hover:text-white"
            aria-label="End trip"
          >
            <IconX size={17} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4 text-white" style={{ background: done ? "#12140f" : meta!.color }}>
        <div className="flex items-start gap-3">
          {done ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-green-dark">
              <IconCheck size={22} />
            </span>
          ) : (
            <span className="rounded-full bg-white p-1">
              <ModeBadge mode={leg!.mode} size={32} />
            </span>
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
              {done ? "Arrived" : `Step ${navStep + 1} of ${total} · ${meta!.label}`}
            </div>
            <h2 className="mt-0.5 text-lg font-bold leading-snug">{done ? journey.destination.name : leg!.text}</h2>
            {!done && leg!.tip && <p className="mt-1 text-[13px] font-medium text-white/85">{leg!.tip}</p>}
            {!done && <LegDetails leg={leg!} route={legRoutes[navStep]} inverted />}
            {!done && (
              <div className="mt-2 flex gap-3 text-xs font-semibold text-white/90">
                <span>{duration(leg!.time)}</span>
                {leg!.fare && <span>{fareText(leg!.fare)}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-[11px] font-medium text-ink/55">
          <span>{done ? "Trip complete" : `About ${duration(remaining)} to go`}</span>
          <span>{fareText(journey.fare)} total</span>
        </div>
        <div className="flex gap-1">
          {journey.legs.map((l, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: i < navStep ? MODE_META[l.mode].color : i === navStep ? `${MODE_META[l.mode].color}66` : "#e2e3dc" }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button
          type="button"
          disabled={navStep === 0}
          onClick={() => setNavStep(Math.max(0, navStep - 1))}
          className="flex h-11 items-center justify-center gap-1 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-40"
        >
          <IconArrowLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={done ? end : () => setNavStep(navStep + 1)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-black"
        >
          {done ? "Finish" : navStep === total - 1 ? "I've arrived" : "Next step"}
          {!done && <IconArrowRight size={16} className="text-brand" />}
        </button>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/45">Whole trip</h3>
        <Timeline journey={journey} current={navStep} compact />
      </section>
    </div>
  )
}
