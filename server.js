// Servidor local mínimo: sirve la app y reenvía las peticiones a la API de Anthropic.
// La API key vive solo aquí (en .env), nunca en el navegador.
const http = require('http'), fs = require('fs'), path = require('path');
try { for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const KEY = process.env.ANTHROPIC_API_KEY, MODEL = process.env.MODEL || 'claude-sonnet-5-5', PORT = process.env.PORT || 3000;
const PROVIDER = process.env.PROVIDER || 'ollama', OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
if (PROVIDER === 'anthropic' && !KEY) { console.error('Falta ANTHROPIC_API_KEY. Copia .env.example a .env y rellénala.'); process.exit(1); }
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/ask') {
    let body = ''; for await (const c of req) { body += c; if (body.length > 20000) return send(res, 413, { error: 'Demasiado largo' }); }
    try {
      const { prompt } = JSON.parse(body);
      if (PROVIDER === 'ollama') {
        const o = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, format: 'json', messages: [{ role: 'user', content: String(prompt) }] }) })
          .catch(() => null);
        if (!o) return send(res, 502, { error: 'Ollama no está en marcha. Abre la app Ollama o ejecuta: ollama serve' });
        const oj = await o.json();
        if (!o.ok) return send(res, o.status, { error: oj.error || 'Error de Ollama (¿descargaste el modelo?)' });
        return send(res, 200, { text: oj.message?.content || '' });
      }
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages: [{ role: 'user', content: String(prompt) }] })
      });
      const j = await r.json();
      if (!r.ok) return send(res, r.status, { error: j.error?.message || 'Error de la API' });
      return send(res, 200, { text: j.content.filter(b => b.type === 'text').map(b => b.text).join('') });
    } catch (e) { return send(res, 500, { error: e.message }); }
  }
  const f = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : path.normalize(req.url).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('No encontrado'); } res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); res.end(d); });
}).listen(PORT, '127.0.0.1', () => console.log(`Meeting Booker en http://localhost:${PORT}`));
