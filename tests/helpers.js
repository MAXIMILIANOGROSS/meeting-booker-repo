'use strict';
// Utilidades de los tests: una IA (Ollama) y un buscador de ofertas (freehire) FALSOS,
// y un arranque del servidor real en un puerto libre con un data.json temporal.
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const { createApp } = require('../server');

const CV_JSON = {
  idioma: 'es', titular: 'Desarrolladora frontend', resumen: 'Resumen de prueba',
  habilidades: ['React', 'CSS'],
  experiencia: [{ puesto: 'Dev', empresa: 'Acme', fechas: '2022-2024', logros: ['Construí interfaces'] }],
  proyectos: [{ nombre: 'App', descripcion: 'Hace cosas', tecnologias: 'React' }],
  formacion: ['Informática'], idiomas: ['Español'],
  cubre: ['React'], faltan: ['Go'], asunto: 'Candidatura', email: 'Hola, me interesa la oferta.',
};
const PROFILE_JSON = {
  name: 'Eva Prueba', title: 'Desarrolladora frontend', email: 'eva@prueba.com', phone: '', location: 'Madrid', links: '',
  summary: 'Desarrolladora con dos años de experiencia.', skills: 'React, CSS', experience: 'Dev - Acme (2022-2024). Construí interfaces',
  education: 'Informática', languages: 'Español', projects: 'App: hace cosas con React', preguntas: ['¿Qué logros puedes medir con cifras?'],
};

function listen(server) { return new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port))); }
function closeServer(s) { return new Promise(r => { s.close(() => r()); s.closeAllConnections?.(); }); }

// Decide qué contesta la IA falsa según el prompt (el servidor real manda siempre el mismo tipo de prompt).
function fakeAnswer(p) {
  if (p.includes('redactor de currículums')) return 'Aquí tienes el CV:\n```json\n' + JSON.stringify(CV_JSON) + '\n```\nEspero que te sirva.';
  if (p.includes('perfil estructurado')) return JSON.stringify(PROFILE_JSON);
  if (p.includes('Respuesta de un prospecto')) return JSON.stringify({ intent: 'interesado', suggested: 'Genial, ¿te va bien el martes a las 10:00?' });
  if (p.includes('prospección B2B')) return JSON.stringify({ score: 87, reason: 'Encaja bien', message: 'Hola, vi vuestra oferta y creo que puedo ayudar. ¿Hablamos?' });
  return 'respuesta de prueba';
}

async function fakes() {
  const calls = { ai: [], jobs: [] };
  const ollama = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      let prompt = ''; try { prompt = JSON.parse(b).messages[0].content; } catch {}
      calls.ai.push(prompt);
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ message: { content: fakeAnswer(prompt) } }));
    });
  });
  const jobs = http.createServer((req, res) => {
    calls.jobs.push(req.url);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ results: [
      { title: 'Frontend Developer', company: { name: 'Acme' }, description: '<p>React TS</p>', public_slug: 'acme-fe', location: 'Berlín', skills: [{ name: 'React' }] },
      { title: 'Backend Developer', company_name: 'Beta', description: 'Go y Docker', id: 7 },
      { title: 'Oferta sin empresa', description: 'x' },
    ] }));
  });
  const [op, jp] = [await listen(ollama), await listen(jobs)];
  return { calls, ollamaUrl: `http://127.0.0.1:${op}`, jobsUrl: `http://127.0.0.1:${jp}`, close() { closeServer(ollama); closeServer(jobs); } };
}

const running = [];
function raw(base, port) {
  return (method, url, { json, body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const h = { ...headers };
    let payload = body;
    if (json !== undefined) { payload = JSON.stringify(json); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
    if (payload !== undefined) h['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request({ host: '127.0.0.1', port, path: url, method, headers: h }, res => {
      const ch = []; res.on('data', c => ch.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(ch), text = buf.toString('utf8'); let j; try { j = JSON.parse(text); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, text, json: j, buf });
      });
    });
    req.on('error', reject); if (payload !== undefined) req.write(payload); req.end();
  });
}

async function startApp(f, env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'booker-test-')), dataFile = path.join(dir, 'data.json');
  const app = createApp({ quiet: true, env: { PORT: '0', DATA_FILE: dataFile, OLLAMA_URL: f.ollamaUrl, FREEHIRE_API_URL: f.jobsUrl, SMTP_USER: '', SMTP_PASS: '', PROVIDER: 'ollama', ...env } });
  const port = await app.start(), base = `http://127.0.0.1:${port}`;
  let stopped = false;
  const t = { app, port, base, dir, dataFile, raw: raw(base, port), async stop() { if (stopped) return; stopped = true; await app.stop(); } };
  running.push(t); return t;
}
async function stopAll() { while (running.length) await running.pop().stop(); }

module.exports = { fakes, startApp, stopAll, CV_JSON, PROFILE_JSON };
