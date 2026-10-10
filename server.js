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

// Small in-memory per-IP throttle to discourage accidental or automated abuse.
const recent = new Map();
function rateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const timestamps = (recent.get(key) || []).filter(t => now - t < 60_000);
  if (timestamps.length >= 8) return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warte eine Minute und versuche es erneut.' });
  timestamps.push(now); recent.set(key, timestamps); next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(API_KEY) });
});

app.post('/api/analyze', rateLimit, async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: 'Der Betreiber muss ANTHROPIC_API_KEY als Umgebungsvariable setzen.' });
  const { prompt, image, quality } = req.body || {};
  if (typeof prompt !== 'string' || prompt.length < 20 || prompt.length > 15_000) {
    return res.status(400).json({ error: 'Ungültige oder zu lange Bauplan-Anfrage.' });
  }
  const content = [];
  if (image != null) {
    if (typeof image !== 'string' || image.length > 10_000_000) return res.status(413).json({ error: 'Das Bild ist zu groß. Bitte wähle ein kleineres Bild.' });
    const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ error: 'Bildformat nicht unterstützt. Nutze JPG, PNG oder WebP.' });
    if (match[1] === 'image/gif') return res.status(400).json({ error: 'Bitte lade GIF-Bilder als JPG, PNG oder WebP hoch.' });
    content.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
  }
  content.push({ type: 'text', text: prompt });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: quality === 'complex' ? 7000 : 4500,
        temperature: 0.2,
        system: 'Du erzeugst präzise Minecraft-Java-Vanilla-Bauplanbeschreibungen. Antworte ausschließlich mit einem gültigen JSON-Objekt, ohne Markdown-Codeblock oder Zusatztext.',
        messages: [{ role: 'user', content }]
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.error?.message || `Anthropic API Fehler (${response.status})`;
      const status = response.status === 429 ? 429 : (response.status === 401 ? 502 : 502);
      return res.status(status).json({ error: response.status === 429 ? 'KI-Limit erreicht. Bitte später erneut versuchen.' : `KI-Anfrage fehlgeschlagen: ${detail}` });
    }
    const raw = (payload.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n').trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let spec;
    try {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('JSON fehlt');
      spec = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return res.status(502).json({ error: 'Die KI-Antwort war kein gültiger JSON-Bauplan. Versuche eine kleinere Hausgröße.' });
    }
    if (!spec || !Array.isArray(spec.parts) || spec.parts.length < 1) {
      return res.status(502).json({ error: 'Die KI hat keinen vollständigen Bauplan geliefert. Bitte versuche es erneut.' });
    }
    res.json({ spec });
  } catch (error) {
    console.error('Analyze request failed:', error);
    res.status(502).json({ error: 'Die Verbindung zur KI ist fehlgeschlagen. Bitte später erneut versuchen.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`saltyfutureCraft läuft auf Port ${PORT}`));
