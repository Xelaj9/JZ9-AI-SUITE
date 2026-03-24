const MODEL_MAP = {
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.5-flash-preview-04-17": "gemini-2.5-flash",
  "gemini-2.5-flash-preview-09-2025": "gemini-2.5-flash",
};
const ALLOWED_MODELS = ["gemini-2.5-flash","imagen-4.0-generate-001","imagen-3.0-generate-002"];
const IMAGEN_MODELS = ["imagen-4.0-generate-001","imagen-3.0-generate-002"];
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({error:"GEMINI_API_KEY not configured"});
  let {model,action,body} = req.body||{};
  if (MODEL_MAP[model]) model=MODEL_MAP[model];
  if (!ALLOWED_MODELS.includes(model)) return res.status(400).json({error:`Model not allowed: ${model}`});
  const apiVersion = IMAGEN_MODELS.includes(model) ? "v1" : "v1beta";
  const method = action==="predict" ? "predict" : "generateContent";
  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:${method}?key=${apiKey}`;
  try {
    const r = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({error:data?.error?.message||`Error ${r.status}`});
    return res.status(200).json(data);
  } catch(err) { return res.status(500).json({error:err.message}); }
}
