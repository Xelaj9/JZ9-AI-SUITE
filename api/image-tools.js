// ── JZ9suite · Image Tools proxy (Replicate) ──
// Serves t10–t12 in studio: removebg / upscale / eraser.
// Actions:
//   { action:"create", tool:"removebg"|"upscale"|"eraser", input:{...} }
//   { action:"status", id:"<prediction id>" }
// Env (Vercel → Settings → Environment Variables):
//   REPLICATE_API_TOKEN          (required — shared with api/video-watermark.js)
//   REPLICATE_MODEL_REMOVEBG / REPLICATE_VERSION_REMOVEBG   (optional overrides)
//   REPLICATE_MODEL_UPSCALE  / REPLICATE_VERSION_UPSCALE
//   REPLICATE_MODEL_ERASER   / REPLICATE_VERSION_ERASER
export const config = {
  api: { bodyParser: { sizeLimit: "25mb" }, responseLimit: false }
};

const TOOLS = {
  removebg: { model: "851-labs/background-remover", envModel: "REPLICATE_MODEL_REMOVEBG", envVersion: "REPLICATE_VERSION_REMOVEBG" },
  upscale:  { model: "nightmareai/real-esrgan",     envModel: "REPLICATE_MODEL_UPSCALE",  envVersion: "REPLICATE_VERSION_UPSCALE" },
  eraser:   { model: "allenhooo/lama",              envModel: "REPLICATE_MODEL_ERASER",   envVersion: "REPLICATE_VERSION_ERASER" },
  restore:  { model: "microsoft/bringing-old-photos-back-to-life", envModel: "REPLICATE_MODEL_RESTORE", envVersion: "REPLICATE_VERSION_RESTORE" },
  colorize: { model: "arielreplicate/deoldify_image", envModel: "REPLICATE_MODEL_COLORIZE", envVersion: "REPLICATE_VERSION_COLORIZE",
    // deoldify takes input_image (not image) — remap the uniform client shape
    map: (input) => ({ input_image: input.image, model_name: input.mode || "Artistic", render_factor: input.render_factor || 35 }) },
  faceenhance: { model: "sczhou/codeformer", envModel: "REPLICATE_MODEL_FACEENHANCE", envVersion: "REPLICATE_VERSION_FACEENHANCE",
    map: (input) => ({ image: input.image, codeformer_fidelity: input.fidelity == null ? 0.7 : input.fidelity, background_enhance: true, face_upsample: true, upscale: input.upscale || 2 }) }
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
    const { action, tool, input, id } = req.body || {};

    // ── poll status ──
    if (action === "status") {
      if (!id) return res.status(400).json({ error: "Missing prediction id" });
      const r = await fetch("https://api.replicate.com/v1/predictions/" + encodeURIComponent(id), { headers: auth });
      const j = await r.json();
      return res.status(r.status).json(j);
    }

    // ── create prediction ──
    if (action === "create") {
      const t = TOOLS[tool];
      if (!t) return res.status(400).json({ error: "Unknown tool (use removebg / upscale / eraser)" });
      if (!input || !input.image) return res.status(400).json({ error: "Missing input.image" });

      const version = process.env[t.envVersion];
      const model = process.env[t.envModel] || t.model;
      const finalInput = t.map ? t.map(input) : input;
      let url, body;
      if (version) { url = "https://api.replicate.com/v1/predictions"; body = { version: version, input: finalInput }; }
      else { url = "https://api.replicate.com/v1/models/" + model + "/predictions"; body = { input: finalInput }; }

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
