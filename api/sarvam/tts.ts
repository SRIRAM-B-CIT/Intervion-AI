export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
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
    const { text, language_code, speaker, gender } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required for TTS." });
    }

    const validLangs = [
      "hi-IN", "ta-IN", "te-IN", "ml-IN", "en-IN",
      "bn-IN", "gu-IN", "kn-IN", "mr-IN", "od-IN", "pa-IN"
    ];
    const targetLang = validLangs.includes(language_code) ? language_code : "hi-IN";

    let chosenSpeaker = speaker;
    if (!chosenSpeaker) {
      if (gender === "male") {
        if (targetLang === "ta-IN") chosenSpeaker = "gokul";
        else chosenSpeaker = "aditya";
      } else {
        if (targetLang === "te-IN") chosenSpeaker = "kavitha";
        else chosenSpeaker = "priya";
      }
    }

    const cleanText = text.trim().slice(0, 2500);
    const modelsToTry = ["bulbul:v4-flash", "bulbul:v3"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const payload: any = {
          text: cleanText,
          language_code: targetLang,
          model,
        };
        if (chosenSpeaker && model === "bulbul:v3") {
          payload.speaker = chosenSpeaker;
        }

        const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!sarvamRes.ok) {
          const errText = await sarvamRes.text();
          console.warn(`Sarvam TTS model ${model} failed (${sarvamRes.status}):`, errText);
          lastError = new Error(`Sarvam TTS (${sarvamRes.status}): ${errText}`);
          continue;
        }

        const data = (await sarvamRes.json()) as any;
        const audioBase64 = data?.audios?.[0];
        if (audioBase64) {
          return res.status(200).json({
            audioBase64,
            format: "wav",
            request_id: data?.request_id,
          });
        }
      } catch (mErr) {
        console.warn(`Sarvam TTS model ${model} error:`, mErr);
        lastError = mErr;
      }
    }

    return res.status(502).json({
      error: lastError?.message || "Failed to synthesize speech using Sarvam TTS.",
    });
  } catch (err: any) {
    console.error("Sarvam TTS endpoint error:", err);
    return res.status(500).json({ error: err.message || "Failed to synthesize speech." });
  }
}
