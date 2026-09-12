import { NextRequest, NextResponse } from "next/server"
import { Readable } from "node:stream"
import { ACTIVE_PROVIDER, isValidCloudVoice, getCloudVoices } from "@/lib/tts-config"

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] ?? c),
  )
}

async function azureTTS(text: string, voiceId: string, lang: string) {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) return null

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const ssml = `<speak version="1.0" xml:lang="${lang}"><voice name="${voiceId}"><prosody rate="-4%">${escapeXml(text)}</prosody></voice></speak>`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "Along-Abuja-MVP",
    },
    body: ssml,
  })

  return res.ok ? res : null
}

async function googleTTS(text: string, voiceId: string, lang: string) {
  const key = process.env.GOOGLE_TTS_API_KEY
  if (!key) return null

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: lang, name: voiceId },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.96 },
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const audio = Buffer.from(data.audioContent, "base64")
  return new Response(audio, { headers: { "Content-Type": "audio/mpeg" } })
}

async function elevenlabsTTS(text: string, voiceId: string) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) return null

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_monolingual_v1" }),
  })

  return res.ok ? res : null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const text = String(body?.text || "").slice(0, 1000)
  const voiceId = isValidCloudVoice(body?.voice) ? body.voice : getCloudVoices()[0]?.id

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 })
  }

  if (!voiceId) {
    return NextResponse.json({ error: "No cloud voices configured" }, { status: 503 })
  }

  const voiceConfig = getCloudVoices().find((v) => v.id === voiceId)
  const lang = voiceConfig?.lang || "en-NG"

  let upstream: Response | null = null

  switch (ACTIVE_PROVIDER) {
    case "azure":
      upstream = await azureTTS(text, voiceId, lang)
      break
    case "google":
      upstream = await googleTTS(text, voiceId, lang)
      break
    case "elevenlabs":
      upstream = await elevenlabsTTS(text, voiceId)
      break
  }

  if (!upstream) {
    return NextResponse.json({ error: "Online voice is not configured" }, { status: 503 })
  }

  const webStream = upstream.body
  if (!webStream) {
    return NextResponse.json({ error: "Empty response from TTS" }, { status: 502 })
  }

  const nodeStream = Readable.fromWeb(webStream as import("node:stream/web").ReadableStream)

  return new Response(nodeStream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=86400",
    },
  })
}
