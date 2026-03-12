/**
 * JZ9 AI Suite — Gemini API Proxy
 * API Key อยู่ใน Environment Variable ของ Vercel เท่านั้น
 * Frontend ไม่เห็น Key เลย
 */

const ALLOWED_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-09-2025",
  "imagen-4.0-generate-001",
  "imagen-3.0-generate-002",
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY not configured on server" });
  }

  const { model, action, body } = req.body || {};

  // Validate model whitelist
  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: `Model not allowed: ${model}` });
  }

  // Build Gemini API URL
  let endpoint;
  if (action === "predict") {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  } else {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || `Upstream error ${upstream.status}`,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
