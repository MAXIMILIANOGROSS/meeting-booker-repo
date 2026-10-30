// Booker Brody: servidor local. Busca, puntúa y redacta solo; el envío lo haces tú.
const http = require('http'), fs = require('fs'), path = require('path'), { execFile } = require('child_process');
try { for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const KEY = process.env.ANTHROPIC_API_KEY, MODEL = process.env.MODEL || 'claude-sonnet-5-5', PORT = process.env.PORT || 3000;
const PROVIDER = process.env.PROVIDER || 'ollama', OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b', FH = process.env.FREEHIRE_API_URL || 'https://freehire.me';
if (PROVIDER === 'anthropic' && !KEY) { console.error('Falta ANTHROPIC_API_KEY en .env'); process.exit(1); }
const DATA = path.join(__dirname, 'data.json');
const PROFILE = { name: '', title: 'Desarrollador frontend', email: '', phone: '', location: '', links: 'islandcrew.es · lebenslaufy.com · enodeus.ch', summary: 'Desarrollador frontend con 2 años de experiencia construyendo interfaces. Publico productos propios de principio a fin.', skills: '', experience: '', education: '', languages: '',
  projects: 'Island Crew (islandcrew.es): plataforma de empleo y personal de hostelería en Canarias. Buscar ofertas, crear el currículum gratis y contactar directamente con quien contrata; incluye vivienda y un market local.\nENODEUS Reports: app iOS de informes de inspección industrial, con análisis de ensayos no destructivos asistido por IA, 15 módulos, 6 idiomas y verificación de informes por QR.\nLebenslaufy (lebenslaufy.com): creador de currículums en formato suizo con PDF exportable y número de documento verificable. Todo se procesa en el dispositivo, sin cuenta.' };
const def = () => ({ icp: '', me: '', avail: '', leads: [], meetings: [], profile: { ...PROFILE }, auto: { on: false, hours: 6, q: 'react OR frontend', region: 'eu,uk', seniority: '', days: 14, last: 0, msg: '' } });
let S = def(), rev = 0, running = false;
try { const d = JSON.parse(fs.readFileSync(DATA, 'utf8')); S = Object.assign(def(), d.state); rev = d.rev || 0; } catch {}
S.auto = Object.assign(def().auto, S.auto);
const persist = () => { rev++; fs.writeFileSync(DATA, JSON.stringify({ state: S, rev })); };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const clean = t => String(t ?? '').replace(/\*\*|__|^#+\s*/gm, '').replace(/[^\u0020-\u00FF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u20AC\n]/g, '');
const L = a => (Array.isArray(a) ? a : (a ? [a] : [])).map(x => typeof x === 'string' ? x : Object.values(x || {}).join(' - '));
function buildPdf(p, cv) {
  const PDFDocument = require('pdfkit');
  const H = cv.idioma === 'en' ? ['Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Languages'] : ['Resumen', 'Habilidades', 'Experiencia', 'Proyectos', 'Formación', 'Idiomas'];
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'CV ' + clean(p.name), Author: clean(p.name) } });
  const bufs = []; doc.on('data', d => bufs.push(d));
  const done = new Promise(r => doc.on('end', () => r(Buffer.concat(bufs))));
  const NAVY = '#102B49', W = doc.page.width - 96;
  doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text(clean(p.name));
  const ti = cv.titular || p.title; if (ti) doc.font('Helvetica').fontSize(12).fillColor('#555').text(clean(ti));
  doc.fontSize(9.5).text(clean([p.email, p.phone, p.location].filter(Boolean).join('  |  ')));
  if (p.links) doc.text(clean(p.links));
  const sec = t => { doc.moveDown(.8).font('Helvetica-Bold').fontSize(11.5).fillColor(NAVY).text(clean(t)); const y = doc.y + 1; doc.moveTo(48, y).lineTo(48 + W, y).lineWidth(1.4).strokeColor('#FFB43B').stroke(); doc.moveDown(.4); };
  const txt = (t, b) => doc.font(b ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#222').text(clean(t), { lineGap: 2 });
  if (cv.resumen) { sec(H[0]); txt(cv.resumen); }
  if (L(cv.habilidades).length) { sec(H[1]); txt(L(cv.habilidades).join('  ·  ')); }
  if ((cv.experiencia || []).length) { sec(H[2]); for (const e of cv.experiencia) { if (typeof e === 'string') { txt(e); continue; } txt([e.puesto, e.empresa].filter(Boolean).join(' - ') + (e.fechas ? '   (' + e.fechas + ')' : ''), true); for (const x of L(e.logros)) txt('•  ' + x); doc.moveDown(.4); } }
  if ((cv.proyectos || []).length) { sec(H[3]); for (const e of cv.proyectos) { if (typeof e === 'string') { txt(e); continue; } txt(e.nombre + (e.tecnologias ? '   (' + e.tecnologias + ')' : ''), true); txt(e.descripcion); doc.moveDown(.4); } }
  if (L(cv.formacion).length) { sec(H[4]); L(cv.formacion).forEach(x => txt(x)); }
  if (L(cv.idiomas).length) { sec(H[5]); txt(L(cv.idiomas).join('  ·  ')); }
  doc.end(); return done;
}
async function sendCv(b) {
  const nm = require('nodemailer'), { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) throw new Error('Falta SMTP_USER y SMTP_PASS en .env (mira el README).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.to || '')) throw new Error('Correo de destino no válido.');
  const port = +(process.env.SMTP_PORT || 465);
  const tr = nm.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  const pdf = await buildPdf(b.profile, b.cv);
  await tr.sendMail({ from: `"${clean(b.profile.name)}" <${SMTP_USER}>`, replyTo: b.profile.email || SMTP_USER, to: b.to, subject: clean(b.subject || 'Candidatura'), text: b.body || '', attachments: [{ filename: 'CV-' + clean(b.profile.name).replace(/\s+/g, '-') + '.pdf', content: pdf }] });
}
const parseJSON = t => { const x = String(t || '').replace(/```json|```/g, ''), a = x.indexOf('{'), b = x.lastIndexOf('}'); if (a < 0 || b < a) throw new Error('La IA no devolvió datos válidos. Inténtalo de nuevo.'); return JSON.parse(x.slice(a, b + 1)); };
const askJSON = async p => { try { return parseJSON(await askAI(p)); } catch (e) { if (/IA no devolvi|JSON/.test(e.message)) return parseJSON(await askAI(p + '\nIMPORTANTE: responde únicamente con un objeto JSON válido.')); throw e; } };
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+#. ]+/g, ' ').replace(/\s+/g, ' ').trim();
const profCorpus = p => norm(Object.values(p || {}).join(' '));
const inCorpus = (item, corpus) => { const n = norm(item); if (!n) return false; if (corpus.includes(n)) return true; const w = n.split(' ').filter(x => x.length > 2); return w.length > 0 && w.every(x => corpus.includes(x)); };

async function askAI(prompt) {
  if (PROVIDER === 'ollama') {
    const o = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, format: 'json', options: { num_ctx: 16384, num_predict: 4096, temperature: 0.3 }, messages: [{ role: 'user', content: prompt }] }) }).catch(() => null);
    if (!o) throw new Error('Ollama no está en marcha. Abre la app Ollama.');
    const j = await o.json(); if (!o.ok) throw new Error(j.error || 'Error de Ollama');
    return j.message?.content || '';
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'Error de la API');
  return j.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

const PK = ['name', 'title', 'email', 'phone', 'location', 'links', 'summary', 'skills', 'experience', 'education', 'languages', 'projects'];
async function extractText(name, b64) {
  const buf = Buffer.from(String(b64 || ''), 'base64'), ext = path.extname(String(name || '')).toLowerCase();
  if (ext === '.pdf') { const { PDFParse } = require('pdf-parse'), p = new PDFParse({ data: new Uint8Array(buf) }); try { return (await p.getText()).text; } finally { await p.destroy().catch(() => {}); } }
  if (ext === '.docx') return (await require('mammoth').extractRawText({ buffer: buf })).value;
  if (['.txt', '.md', ''].includes(ext)) return buf.toString('utf8');
  throw new Error('Formato no admitido. Usa PDF, DOCX o TXT (los .doc antiguos: guárdalos como DOCX o PDF).');
}
async function parseProfile(b) {
  const raw = b.data ? await extractText(b.name, b.data) : String(b.text || '');
  const txt = raw.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 14000);
  if (txt.length < 30) throw new Error('No he podido leer texto (¿PDF escaneado o vacío?). Usa un PDF con texto o pega tu CV en el cuadro B.');
  const notes = b.mode === 'notes';
  const r = await askJSON(`Eres experto en currículums. Convierte el texto de abajo en un perfil estructurado. REGLAS: usa SOLO lo que diga el texto; no inventes empleos, títulos, fechas, cifras, habilidades ni datos de contacto; lo que no aparezca va como "". Texto plano, sin Markdown. ${notes ? 'El texto son notas informales: redáctalas en lenguaje profesional y claro, sin añadir hechos nuevos.' : 'Conserva fechas y cifras tal como están.'} "experience": una línea por puesto con el formato "Puesto - Empresa (fechas). Logros". "projects": una línea por proyecto con "Nombre: qué hace y con qué". "education": una línea por título. "skills" e "languages": separados por comas. "preguntas": hasta 5 preguntas cortas sobre datos que faltan o mejorarían el CV (logros con cifras, fechas, contacto…). Mantén el idioma del texto.\nTEXTO:\n${txt}\nDevuelve SOLO JSON: {"name":"","title":"","email":"","phone":"","location":"","links":"","summary":"","skills":"","experience":"","education":"","languages":"","projects":"","preguntas":["..."]}`);
  const profile = {};
  for (const k of PK) { let v = r[k]; if (Array.isArray(v)) v = L(v).join(k === 'skills' || k === 'languages' ? ', ' : '\n'); profile[k] = String(v ?? '').replace(/\*\*|__/g, '').trim(); }
  if (profile.email && !txt.toLowerCase().includes(profile.email.toLowerCase())) profile.email = '';
  if (profile.phone && !txt.replace(/\D/g, '').includes(profile.phone.replace(/\D/g, ''))) profile.phone = '';
  return { profile, preguntas: L(r.preguntas).slice(0, 5) };
}

async function findLeads(a) {
  const p = new URLSearchParams({ limit: 40 });
  if (a.q) p.set('q', a.q); if (a.region) p.set('regions', a.region); if (a.seniority) p.set('seniority', a.seniority); if (a.days) p.set('posted_within_days', a.days);
  const r = await fetch(`${FH}/api/v1/jobs/search?${p}`, { headers: { accept: 'application/json' } });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error('freehire no respondió (' + r.status + ')');
  const arr = Array.isArray(j) ? j : (j.results || j.jobs || j.items || j.data || []);
  return arr.map(x => {
    const company = x.company?.name || x.company_name || (typeof x.company === 'string' ? x.company : '');
    const loc = x.location || [].concat(x.cities || x.countries || []).join(', ');
    const sk = [].concat(x.skills || []).slice(0, 5).map(s => s.name || s).join(', ');
    return { name: company, role: 'Contrata: ' + (x.title || ''), company, desc: String(x.description || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2500), note: [loc, sk, (x.public_slug || x.id ? FH + '/jobs/' + (x.public_slug || x.id) : x.url || '')].filter(Boolean).join(' · ') };
  }).filter(l => l.company);
}

async function runAuto() {
  if (running) return; running = true; const A = S.auto; let n = 0;
  try {
    const have = new Set(S.leads.map(l => l.company.toLowerCase())); let added = 0; const room = Math.max(0, 60 - S.leads.filter(x => x.status === 'new').length);
    for (const l of await findLeads(A)) { const k = l.company.toLowerCase(); if (have.has(k)) continue; if (added >= room) break; have.add(k); S.leads.push({ id: Date.now() + Math.random(), status: 'new', ...l }); added++; }
    if (!S.me.trim() || !S.icp.trim()) A.msg = `${added} empresas nuevas. Rellena «Qué ofreces» y «Cliente ideal» para redactar.`;
    else {
      for (const l of S.leads.filter(x => x.status === 'new').slice(0, 5)) {
        try {
          const r = parseJSON(await askAI(`Eres asistente de prospección B2B. Mi oferta: ${S.me}\nCliente ideal: ${S.icp}\nProspecto: ${l.name}, ${l.role}, ${l.company}. Notas: ${l.note}\nDevuelve SOLO JSON: {"score":0-100,"reason":"una frase","message":"mensaje de LinkedIn en español, máximo 60 palabras, cercano, sin inventar datos que no estén arriba, termina con una pregunta"}`));
          Object.assign(l, { score: r.score, reason: r.reason, msg: r.message, status: 'drafted' }); n++;
        } catch (e) { A.msg = 'Error al redactar: ' + e.message; break; }
      }
      if (!A.msg.startsWith('Error')) A.msg = `${added} nuevas, ${n} borradores.`;
    }
  } catch (e) { A.msg = 'Error: ' + e.message; }
  A.last = Date.now(); persist(); running = false;
  if (n) execFile('osascript', ['-e', `display notification "${n} borradores listos para aprobar" with title "Booker Brody"`], () => {});
}
setInterval(() => { if (S.auto.on && Date.now() - S.auto.last > S.auto.hours * 3600e3) runAuto(); }, 60000);

http.createServer(async (req, res) => {
  const u = req.url.split('?')[0];
  let body = ''; if (req.method !== 'GET') for await (const c of req) { body += c; if (body.length > 15e6) return send(res, 413, { error: 'Demasiado grande' }); }
  try {
    if (u === '/api/state' && req.method === 'GET') return send(res, 200, { state: { ...S, leads: S.leads.map(({ desc, ...l }) => l) }, rev });
    if (u === '/api/rev' && req.method === 'GET') return send(res, 200, { rev });
    if (u === '/api/leads/clear' && req.method === 'POST') { S.leads = S.leads.filter(l => l.status !== 'new'); persist(); return send(res, 200, { rev }); }
    if (u === '/api/state' && req.method === 'PUT') { const b = JSON.parse(body); if (b.rev !== rev) return send(res, 409, { rev }); const old = new Map(S.leads.map(l => [String(l.id), l.desc])); S = Object.assign(def(), b.state); S.leads.forEach(l => { if (!l.desc && old.get(String(l.id))) l.desc = old.get(String(l.id)); }); persist(); return send(res, 200, { rev }); }
    if (u === '/api/run' && req.method === 'POST') { await runAuto(); return send(res, 200, { rev }); }
    if (u === '/api/cv/generate' && req.method === 'POST') {
      const { profile: p, lead: l } = JSON.parse(body); const dd = l.desc || S.leads.find(x => String(x.id) === String(l.id))?.desc || '';
      if (String(dd).trim().length < 40) throw new Error('La oferta no tiene texto. Pega el texto completo de la oferta (sección "¿Una oferta que has encontrado tú?").');
      const cv = await askJSON(`Eres un experto en selección y en currículums que superan filtros ATS y consiguen entrevistas. Reescribe el CV de esta persona para ESTA oferta concreta.
PASO 1 (interno): lee la oferta y detecta puesto exacto, requisitos imprescindibles, requisitos deseables, tecnologías y palabras clave tal como las escribe la oferta, y su idioma.
PASO 2: construye el CV a medida:
- Titular: el título del puesto de la oferta, solo si el perfil lo respalda; si no, el titular más cercano y veraz.
- Resumen de 3-4 frases orientado a la empresa y al puesto: qué aporta, con qué tecnologías y qué resultado.
- Habilidades: primero las que pide la oferta y la persona tiene, con el MISMO nombre que usa la oferta (ej. "React", no "librería de UI"). Después las demás relevantes. Quita las irrelevantes.
- Experiencia y proyectos: ordénalos por relevancia para la oferta. Cada logro empieza con verbo de acción, en 1 línea, con resultado o cifra SOLO si consta en el perfil. Prioriza lo más parecido a las tareas de la oferta.
- Incluye de forma natural las palabras clave de la oferta que el perfil respalde (para el filtro ATS).
REGLAS DE HONESTIDAD (inquebrantables): usa SOLO datos del perfil. No inventes empresas, puestos, fechas, cifras, títulos, habilidades ni idiomas. Si la oferta pide algo que el perfil no respalda, NO lo pongas en el CV: ponlo en "faltan". Texto plano, sin Markdown ni asteriscos. Escribe en el idioma de la oferta.
PERFIL: ${JSON.stringify(p).slice(0, 9000)}
OFERTA: ${l.role} en ${l.company}. ${l.note || ''}
${String(dd).slice(0, 5000)}
Devuelve SOLO JSON: {"idioma":"es o en","titular":"","resumen":"","habilidades":["..."],"experiencia":[{"puesto":"","empresa":"","fechas":"","logros":["..."]}],"proyectos":[{"nombre":"","descripcion":"","tecnologias":""}],"formacion":["..."],"idiomas":["..."],"palabras_clave":["palabras clave de la oferta que SÍ has incluido"],"cubre":["requisito de la oferta que el perfil cubre"],"faltan":["requisito de la oferta que el perfil no respalda"],"encaje":0-100,"asunto":"asunto del email","email":"email de candidatura, máx 120 palabras, menciona la empresa y el puesto, directo, sin inventar"}`);
      // Guardas anti-invención: se descarta lo que no esté respaldado por el perfil.
      const corpus = profCorpus(p), expCorpus = norm(p.experience), removed = [];
      cv.habilidades = L(cv.habilidades).filter(x => inCorpus(x, corpus) || (removed.push(x), false));
      cv.palabras_clave = L(cv.palabras_clave).filter(x => inCorpus(x, corpus));
      cv.experiencia = (Array.isArray(cv.experiencia) ? cv.experiencia : []).filter(e => typeof e === 'string' ? inCorpus(e.slice(0, 60), expCorpus) : (e.empresa ? inCorpus(e.empresa, expCorpus) : inCorpus(e.puesto, expCorpus)) || (removed.push((e.puesto || '') + ' ' + (e.empresa || '')), false));
      cv.proyectos = (Array.isArray(cv.proyectos) ? cv.proyectos : []).filter(e => typeof e === 'string' || inCorpus(e.nombre, norm(p.projects) + ' ' + expCorpus) || (removed.push(e.nombre || ''), false));
      cv.idiomas = L(cv.idiomas).filter(x => inCorpus(x.split(/[ :(-]/)[0], corpus));
      cv.faltan = [...new Set([...L(cv.faltan), ...removed.filter(x => x && !L(cv.faltan).some(f => norm(f) === norm(x)))])];
      cv.encaje = Math.max(0, Math.min(100, Math.round(+cv.encaje || 0)));
      if (!p.email) cv.aviso = 'Tu perfil no tiene correo: añádelo para que la empresa pueda contactarte.';
      return send(res, 200, { cv });
    }
    if (u === '/api/cv/parse' && req.method === 'POST') return send(res, 200, await parseProfile(JSON.parse(body)));
    if (u === '/api/cv/pdf' && req.method === 'POST') { const b = JSON.parse(body); const pdf = await buildPdf(b.profile, b.cv); res.writeHead(200, { 'Content-Type': 'application/pdf' }); return res.end(pdf); }
    if (u === '/api/cv/send' && req.method === 'POST') { await sendCv(JSON.parse(body)); return send(res, 200, { ok: true }); }
    if (u === '/api/ask' && req.method === 'POST') return send(res, 200, { text: await askAI(String(JSON.parse(body).prompt)) });
    if (u === '/api/leads') { const q = new URL(req.url, 'http://x').searchParams; return send(res, 200, { leads: await findLeads({ q: q.get('q'), region: q.get('region'), seniority: q.get('seniority'), days: q.get('days') }) }); }
  } catch (e) { return send(res, 500, { error: e.message }); }
  const f = path.join(__dirname, 'public', u === '/' ? 'index.html' : path.normalize(u).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('No encontrado'); } const T = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'text/javascript' }; res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' }); res.end(d); });
}).listen(PORT, '127.0.0.1', () => console.log(`Booker Brody en http://localhost:${PORT}`));
