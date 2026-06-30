// ── JZ9suite · Video Watermark Remover proxy (Replicate / ProPainter) ──
// Keeps REPLICATE_API_TOKEN server-side. Two actions:
//   { action:"create", input:{ video, mask, ... } }  -> start a prediction
//   { action:"status", id:"<prediction id>" }          -> poll a prediction
// Configure in Vercel env:
//   REPLICATE_API_TOKEN = r8_...                (required)
//   REPLICATE_VERSION    = <ProPainter version hash>   (preferred)
//   REPLICATE_MODEL      = owner/name           (alt: official-model endpoint)
export const config = {
  api: { bodyParser: { sizeLimit: "25mb" }, responseLimit: false }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return res.status(500).json({ error: "No REPLICATE_API_TOKEN configured on the server" });
    const auth = { "Authorization": "Token " + token };
    const { action, input, id } = req.body || {};

    // ── poll status ──
    if (action === "status") {
      if (!id) return res.status(400).json({ error: "Missing prediction id" });
      const r = await fetch("https://api.replicate.com/v1/predictions/" + encodeURIComponent(id), { headers: auth });
      const j = await r.json();
      return res.status(r.status).json(j);
    }

    // ── create prediction ──
    if (action === "create") {
      if (!input || !input.video) return res.status(400).json({ error: "Missing input.video" });
      const version = process.env.REPLICATE_VERSION;
      const model = process.env.REPLICATE_MODEL;
      let url, body;
      if (version) { url = "https://api.replicate.com/v1/predictions"; body = { version: version, input: input }; }
      else if (model) { url = "https://api.replicate.com/v1/models/" + model + "/predictions"; body = { input: input }; }
      else return res.status(500).json({ error: "Set REPLICATE_VERSION (ProPainter version hash) or REPLICATE_MODEL in env" });

      const r = await fetch(url, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, auth),
        body: JSON.stringify(body)
      });
      const j = await r.json();
      return res.status(r.status).json(j);
    }

    return res.status(400).json({ error: "Unknown action (use 'create' or 'status')" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
