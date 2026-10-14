"use client"

import { useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { isValidCloudVoice } from "@/lib/tts-config"

let currentAudio: HTMLAudioElement | null = null

export function useTTS() {
  const voice = useAppStore((s) => s.voice)
  const voiceName = useAppStore((s) => s.voiceName)

  const cancel = useCallback(() => {
    currentAudio?.pause()
    currentAudio = null
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback(
    async (text: string) => {
      if (!voice || typeof window === "undefined") return
      cancel()

      // Optional cloud voice (only if a free-tier key is configured on the server)
      if (voiceName !== "browser" && isValidCloudVoice(voiceName)) {
        try {
          const r = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice: voiceName }),
          })
          if (r.ok) {
            const src = URL.createObjectURL(await r.blob())
            const audio = new Audio(src)
            currentAudio = audio
            audio.addEventListener("ended", () => URL.revokeObjectURL(src), { once: true })
            await audio.play()
            return
          }
        } catch {}
      }

      if (!("speechSynthesis" in window)) return
      const voices = window.speechSynthesis.getVoices()
      const ng =
        voices.find((v) => v.lang.toLowerCase() === "en-ng") ||
        voices.find((v) => v.lang.toLowerCase() === "en-gb") ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en"))
      const u = new SpeechSynthesisUtterance(text)
      if (ng) u.voice = ng
      u.lang = ng?.lang || "en-NG"
      u.rate = 0.95
      window.speechSynthesis.speak(u)
    },
    [voice, voiceName, cancel],
  )

  return { speak, cancel }
}
