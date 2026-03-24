export default async function handler(req,res){
res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type");
if(req.method==="OPTIONS")return res.status(200).end();
if(req.method!=="POST")return res.status(405).end();
const key=process.env.GEMINI_API_KEY;
if(!key)return res.status(500).json({error:"No API key"});
let{model,action,body}=req.body||{};
const remap={"gemini-2.0-flash":"gemini-2.5-flash"};
if(remap[model])model=remap[model];
const ver=model.startsWith("imagen")?"v1":"v1beta";
const act=action==="predict"?"predict":"generateContent";
const url=`https://generativelanguage.googleapis.com/${ver}/models/${model}:${act}?key=${key}`;
try{
const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const d=await r.json();
if(!r.ok)return res.status(r.status).json({error:d?.error?.message||"Error"});
return res.status(200).json(d);
}catch(e){return res.status(500).json({error:e.message});}
}
