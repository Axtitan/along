import type { CloudVoice } from "./types"

export type TTSProvider = "azure" | "google" | "elevenlabs"

export interface ProviderConfig {
  provider: TTSProvider
  voices: CloudVoice[]
}

const AZURE_VOICES: CloudVoice[] = [
  { id: "en-NG-EzinneNeural", name: "Ezinne", label: "Ezinne \u00b7 Nigerian English", lang: "en-NG" },
  { id: "en-NG-AbeoNeural", name: "Abeo", label: "Abeo \u00b7 Nigerian English", lang: "en-NG" },
]

const GOOGLE_VOICES: CloudVoice[] = [
  // Swap in your Google Cloud TTS voice names here
  // e.g. { id: "en-NG-Wavenet-A", name: "Wavenet A", label: "Wavenet A \u00b7 Nigerian English", lang: "en-NG" },
]

const ELEVENLABS_VOICES: CloudVoice[] = [
  // Swap in your ElevenLabs voice IDs here
]

const PROVIDERS: Record<TTSProvider, ProviderConfig> = {
  azure: { provider: "azure", voices: AZURE_VOICES },
  google: { provider: "google", voices: GOOGLE_VOICES },
  elevenlabs: { provider: "elevenlabs", voices: ELEVENLABS_VOICES },
}

// Change this to switch providers
export const ACTIVE_PROVIDER: TTSProvider = "azure"

export function getCloudVoices(): CloudVoice[] {
  return PROVIDERS[ACTIVE_PROVIDER].voices
}

export function isValidCloudVoice(voiceId: string): boolean {
  return getCloudVoices().some((v) => v.id === voiceId)
}

export function getVoiceLabel(voiceId: string): string {
  if (voiceId === "browser") return "Device voice"
  const voice = getCloudVoices().find((v) => v.id === voiceId)
  return voice?.label ?? voiceId
}
