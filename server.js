import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
app.disable('x-powered-by');
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
const recent = new Map();
function rateLimit(req,res,next) {
 const key=req.ip, now=Date.now();
 const timestamps=(recent.get(key)||[]).filter(t=>now-t<60000);
 if(timestamps.length>=8) return res.status(429).json({error:'Zu viele Anfragen. Bitte warte eine Minute.'});
 timestamps.push(now);recent.set(key,timestamps);next();
}
app.get('/api/health',(_req,res)=>res.json({ok:true,configured:Boolean(API_KEY)}));
app.post('/api/analyze',rateLimit,async(req,res)=>{
 if(!API_KEY) return res.status(503).json({error:'ANTHROPIC_API_KEY fehlt in Render.'});
 const {prompt,image,quality}=req.body||{};
 if(typeof prompt!=='string'||prompt.length<20||prompt.length>15000) return res.status(400).json({error:'Ungültige Bauplan-Anfrage.'});
 const content=[];
 if(image!=null){
  if(typeof image!=='string'||image.length>10000000) return res.status(413).json({error:'Bild zu groß.'});
  const match=image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match) return res.status(400).json({error:'Bitte JPG, PNG oder WebP verwenden.'});
  content.push({type:'image',source:{type:'base64',media_type:match[1],data:match[2]}});
 }
 content.push({type:'text',text:prompt});
 try{
  const response=await fetch('https://api.anthropic.com/v1/messages',{
   method:'POST',headers:{'content-type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01'},
   body:JSON.stringify({model:MODEL,max_tokens:quality==='complex'?7000:4500,temperature:0.1,
    system:'Du bist ein spezialisierter Minecraft-Architekt. Rekonstruiere die sichtbare Architektur im Referenzbild so originalgetreu wie das vorgegebene JSON-Bauschema erlaubt. Priorisiere Silhouette, Proportionen, Dach, Fassadenmaterialien und die individuellen Fensterpositionen. Ergänze unsichtbare Seiten konservativ. Erfinde keine zusätzlichen sichtbaren Merkmale. Gib ausschließlich valides JSON ohne Markdown aus.',
    messages:[{role:'user',content}]})
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok) return res.status(response.status===429?429:502).json({error:response.status===429?'KI-Limit erreicht. Bitte später versuchen.':`KI-Anfrage fehlgeschlagen: ${payload?.error?.message||response.status}`});
  const raw=(payload.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n').trim();
  const cleaned=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  let spec;
  try {const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');if(a<0||b<=a)throw Error('JSON fehlt');spec=JSON.parse(cleaned.slice(a,b+1));}
  catch{return res.status(502).json({error:'Die KI-Antwort war kein gültiges JSON. Bitte erneut versuchen.'});}
  if(!spec||!Array.isArray(spec.parts)||!spec.parts.length) return res.status(502).json({error:'Kein vollständiger Bauplan geliefert.'});
  res.json({spec});
 }catch(err){console.error('Analyze failed:',err);res.status(502).json({error:'Verbindung zur KI fehlgeschlagen.'});}
});
app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`saltyfutureCraft läuft auf Port ${PORT}`));
