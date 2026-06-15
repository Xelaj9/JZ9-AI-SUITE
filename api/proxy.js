export const config = {
  api: { bodyParser: { sizeLimit: '25mb' }, responseLimit: false }
};

function decodeImage(input) {
  let mime = "image/png", data = input;
  const m = /^data:([^;]+);base64,(.*)$/.exec(input || "");
  if (m) { mime = m[1]; data = m[2]; }
  const ext = (mime.includes("jpeg") || mime.includes("jpg")) ? "jpg"
            : mime.includes("webp") ? "webp" : "png";
  return { buffer: Buffer.from(data, "base64"), mime, ext };
}

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
    const allowed = ["chat/completions", "images/generations", "images/edits"];
    if (!allowed.includes(endpoint)) return res.status(400).json({ error: "Endpoint not allowed: " + endpoint });
    const url = `https://api.openai.com/v1/${endpoint}`;

    let upstream;
    if (endpoint === "images/edits") {
      const b = body || {};
      const imgs = Array.isArray(b.image) ? b.image : (b.image ? [b.image] : []);
      if (!imgs.length) return res.status(400).json({ error: "No image provided for images/edits" });
      const form = new FormData();
      if (b.model) form.append("model", b.model);
      if (b.prompt) form.append("prompt", b.prompt);
      if (b.size) form.append("size", b.size);
      if (b.quality) form.append("quality", b.quality);
      if (b.background) form.append("background", b.background);
      form.append("n", String(b.n || 1));
      const field = imgs.length > 1 ? "image[]" : "image";
      for (const im of imgs) {
        const { buffer, mime, ext } = decodeImage(im);
        form.append(field, new Blob([buffer], { type: mime }), `image.${ext}`);
      }
      if (b.mask) {
        const mk = decodeImage(b.mask);
        form.append("mask", new Blob([mk.buffer], { type: mk.mime }), "mask.png");
      }
      upstream = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}` },
        body: form
      });
    } else {
      upstream = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(body)
      });
    }

    const buf = await upstream.arrayBuffer();
    res.setHeader("Content-Type", "application/json");
    res.status(upstream.status).send(Buffer.from(buf));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
