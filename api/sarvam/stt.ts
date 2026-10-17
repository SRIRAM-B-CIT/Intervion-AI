export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const apiKey =
      process.env.SARVAM_API_KEY?.trim() ||
      process.env.VITE_SARVAM_API_KEY?.trim();

    if (!apiKey) {
      return res.status(503).json({
        error: "SARVAM_API_KEY is not configured in Vercel environment variables. Please add SARVAM_API_KEY in your Vercel Project Settings.",
        available: false,
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { audio, language_code, mimeType } = body;

    if (!audio || typeof audio !== "string") {
      return res.status(400).json({ error: "Audio base64 data is required." });
    }

    const validLangs = ["hi-IN", "ta-IN", "te-IN", "ml-IN", "en-IN", "unknown"];
    const targetLang = validLangs.includes(language_code) ? language_code : "unknown";

    const base64Clean = audio.includes(",") ? audio.split(",")[1] : audio;
    const audioBuffer = Buffer.from(base64Clean, "base64");

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: "Empty audio buffer received." });
    }

    if (audioBuffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: "Audio file exceeds 15MB limit." });
    }

    // Clean and validate MIME type for Sarvam STT (must be plain base MIME without parameters like ;codecs=opus)
    let cleanMime = "audio/webm";
    if (typeof mimeType === "string" && mimeType.trim()) {
      cleanMime = mimeType.split(";")[0].trim().toLowerCase();
    }

    const allowedSarvamTypes = new Set([
      "audio/webm",
      "video/webm",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
      "audio/pcm_s16le",
      "audio/mp3",
      "audio/mpeg",
      "audio/ogg",
      "audio/opus",
      "audio/flac",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "application/octet-stream",
    ]);

    if (!allowedSarvamTypes.has(cleanMime)) {
      if (cleanMime.includes("webm")) cleanMime = "audio/webm";
      else if (cleanMime.includes("wav")) cleanMime = "audio/wav";
      else if (cleanMime.includes("mp4") || cleanMime.includes("m4a")) cleanMime = "audio/mp4";
      else if (cleanMime.includes("ogg") || cleanMime.includes("opus")) cleanMime = "audio/ogg";
      else if (cleanMime.includes("mp3") || cleanMime.includes("mpeg")) cleanMime = "audio/mp3";
      else cleanMime = "audio/webm";
    }

    let filename = "speech.webm";
    if (cleanMime.includes("wav")) filename = "speech.wav";
    else if (cleanMime.includes("mp4") || cleanMime.includes("m4a")) filename = "speech.mp4";
    else if (cleanMime.includes("mp3") || cleanMime.includes("mpeg")) filename = "speech.mp3";
    else if (cleanMime.includes("ogg")) filename = "speech.ogg";

    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: cleanMime });
    formData.append("file", audioBlob, filename);
    formData.append("model", "saaras:v4");
    formData.append("language_code", targetLang);

    const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      console.warn(`Sarvam STT failed (${sarvamRes.status}):`, errText);
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {}
      const userMessage = parsedErr?.error?.message || `Sarvam STT error (${sarvamRes.status})`;
      return res.status(sarvamRes.status).json({
        error: userMessage,
        details: errText,
      });
    }

    const data = (await sarvamRes.json()) as any;
    return res.status(200).json({
      transcript: data?.transcript || "",
      language_code: data?.language_code || targetLang,
      request_id: data?.request_id,
    });
  } catch (err: any) {
    console.error("Sarvam STT endpoint error:", err);
    return res.status(500).json({ error: err.message || "Failed to transcribe audio." });
  }
}
