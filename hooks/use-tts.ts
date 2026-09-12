"use client"

import { useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { isValidCloudVoice } from "@/lib/tts-config"

export function useTTS() {
  const voice = useAppStore((s) => s.voice)
  const voiceName = useAppStore((s) => s.voiceName)
  const showToast = useAppStore((s) => s.showToast)

  const speak = useCallback(
    async (text: string) => {
      if (!voice) return

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
            audio.addEventListener("ended", () => URL.revokeObjectURL(src), { once: true })
            await audio.play()
            return
          }
        } catch {}
      }

      if (!("speechSynthesis" in window)) return

      window.speechSynthesis.cancel()
      const voices = speechSynthesis.getVoices()
      const ng =
        voices.find((v) => v.lang.toLowerCase() === "en-ng") ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en-"))
      const u = new SpeechSynthesisUtterance(text)
      if (ng) u.voice = ng
      u.lang = ng?.lang || "en-NG"
      u.rate = 0.94
      speechSynthesis.speak(u)

      if (voiceName !== "browser") {
        showToast("Online voice is not configured; using your device voice.")
      }
    },
    [voice, voiceName, showToast],
  )

  const cancel = useCallback(() => {
    speechSynthesis?.cancel()
  }, [])

  return { speak, cancel }
}
