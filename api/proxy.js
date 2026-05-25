export const config = {
  api: { bodyParser: { sizeLimit: '10mb' }, responseLimit: false }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ error: "No OPENAI_API_KEY" });
    const { endpoint, body } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "No endpoint" });
    const allowed = ["chat/completions", "images/generations"];
    if (!allowed.includes(endpoint)) return res.status(400).json({ error: "Endpoint not allowed: " + endpoint });
    const url = `https://api.openai.com/v1/${endpoint}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });
    const buf = await upstream.arrayBuffer();
    res.setHeader("Content-Type", "application/json");
    res.status(upstream.status).send(Buffer.from(buf));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
