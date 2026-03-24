export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "No API key" });
    let { model, action, body } = req.body || {};
    if (!model) return res.status(400).json({ error: "No model" });
    if (model === "gemini-2.0-flash") model = "gemini-2.5-flash";
    const ver = model.startsWith("imagen") ? "v1" : "v1beta";
    const act = action === "predict" ? "predict" : "generateContent";
    const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:${act}?key=${key}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
