export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const hasKey = Boolean(
    (process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim().length > 0) ||
    (process.env.VITE_SARVAM_API_KEY && process.env.VITE_SARVAM_API_KEY.trim().length > 0)
  );

  return res.status(200).json({ available: hasKey });
}
