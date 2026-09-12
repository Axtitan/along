const { Readable } = require("node:stream");
//azure Nigerian voices
const VOICES = new Set(["en-NG-EzinneNeural", "en-NG-AbeoNeural"]);
const escapeXml = (s) =>
  s.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c],
  );
module.exports = async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.AZURE_SPEECH_KEY,
    region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region)
    return res
      .status(503)
      .json({ error: "Online Nigerian voice is not configured" });
  const text = String(req.body?.text || "").slice(0, 1000),
    voice = VOICES.has(req.body?.voice) ? req.body.voice : "en-NG-EzinneNeural";
  if (!text) return res.status(400).json({ error: "Text is required" });
  const endpoint = [
    "https:",
    "",
    region + ".tts.speech.microsoft.com",
    "cognitiveservices",
    "v1",
  ].join("/");
  const ssml = `<speak version="1.0" xml:lang="en-NG"><voice name="${voice}"><prosody rate="-4%">${escapeXml(text)}</prosody></voice></speak>`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "Along-Abuja-MVP",
    },
    body: ssml,
  });
  if (!response.ok)
    return res
      .status(response.status)
      .json({ error: "Speech synthesis failed" });
  // FIX 11: pipe response body directly — avoids buffering the full MP3 in serverless memory
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "private, max-age=86400");
  Readable.fromWeb(response.body).pipe(res);
};
