// Diagnóstico de Booker Brody: abre TU página real, sube TU PDF y pulsa «Leer mi CV». Cuenta lo que pasa.
// Uso (dentro de ~/booker-brody, con el servidor en marcha en otra pestaña de Terminal):
//   node ~/Downloads/booker-diagnostico.js
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = (process.env.BB_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const PDF = process.env.BB_PDF || path.join(os.homedir(), 'Downloads', 'IT_Maximiliano_Olmos.pdf');
const MAX_S = +(process.env.BB_MAX || 240);
const out = []; const say = (...a) => { const l = a.join(' '); out.push(l); console.log(l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require(path.join(process.cwd(), 'node_modules', 'jsdom'))); }
catch { console.log('✗ Ejecuta esto DENTRO de la carpeta del proyecto:  cd ~/booker-brody   (no encuentro node_modules/jsdom aquí)'); process.exit(1); }

(async () => {
  say('=== 1. Servidor y Ollama ===');
  try { const r = await fetch(BASE + '/'); const h = await r.text(); say(`página ${BASE}/ → HTTP ${r.status}, ${h.length} bytes; contiene cvfile:${h.includes('cvfile')} cvup:${h.includes('cvup')} bb_cvfile:${h.includes('bb_cvfile')}`); }
  catch (e) { say('✗ El servidor NO responde en ' + BASE + ' → arráncalo con «npm start» en otra pestaña de Terminal.'); process.exit(1); }
  try { const r = await fetch(BASE + '/api/state'); say('GET /api/state → HTTP ' + r.status); } catch (e) { say('✗ /api/state falla: ' + e.message); }
  try {
    const t = await (await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(4000) })).json();
    say('Ollama responde. Modelos: ' + (t.models || []).map(m => m.name).join(', '));
    const ps = await (await fetch('http://127.0.0.1:11434/api/ps', { signal: AbortSignal.timeout(4000) })).json();
    say('Modelo cargado ahora en memoria: ' + ((ps.models || []).map(m => m.name).join(', ') || 'NINGUNO (la 1ª petición tendrá que cargarlo → más lenta)'));
  } catch (e) { say('✗ Ollama NO responde en 127.0.0.1:11434 (' + e.message + ') → abre la app Ollama.'); }

  say('\n=== 2. Tu PDF ===');
  if (!fs.existsSync(PDF)) { say('✗ No encuentro ' + PDF + '  (puedes indicar otro: BB_PDF=/ruta/a/tu.pdf node …)'); process.exit(1); }
  const buf = fs.readFileSync(PDF); say(`${path.basename(PDF)}: ${(buf.length / 1024).toFixed(0)} KB`);

  say('\n=== 3. La página, como en el navegador ===');
  const errors = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message)); vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = await JSDOM.fromURL(BASE + '/', { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, beforeParse(win) {
    win.fetch = (u, o = {}) => fetch(new URL(u, BASE), { ...o, headers: { Origin: BASE, ...(o.headers || {}) } });
    win.confirm = () => true; win.open = () => null; win.URL.createObjectURL = () => 'blob:x';
    win.Element.prototype.scrollTo = function () {}; win.Element.prototype.scrollIntoView = function () {};
    win.HTMLAnchorElement.prototype.click = function () {};
    Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: async () => {} } });
    win.addEventListener('error', e => errors.push(e.message));
  } });
  const w = dom.window, $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const warn = () => $$('.warn').filter(e => !e.hidden && e.getAttribute('role') !== 'alert').map(e => e.textContent.trim()).join(' | ');
  await sleep(1500);
  say(`pestañas: ${$$('#nav button').length}, errores de JavaScript al cargar: ${errors.length}`); errors.forEach(e => say('   ✗ ' + e));
  const tab = $('[data-t="cv"]'); if (!tab) { say('✗ No encuentro la pestaña «Mi CV».'); process.exit(1); }
  click(tab); await sleep(500);
  const fileEl = $('#cvfile'), btn = $('#cvup');
  say(`en «Mi CV»: selector de archivo (#cvfile): ${fileEl ? 'sí' : '✗ NO'}, botón «Leer mi CV» (#cvup): ${btn ? 'sí' : '✗ NO'}`);
  if (!fileEl || !btn) { say('\nCopia todo esto y pégalo en el chat.'); process.exit(1); }

  say('\n=== 4. Subir el PDF y pulsar «Leer mi CV y rellenar el perfil» ===');
  Object.defineProperty(fileEl, 'files', { value: [new w.File([new Uint8Array(buf)], path.basename(PDF), { type: 'application/pdf' })], configurable: true });
  fileEl.dispatchEvent(new w.Event('change', { bubbles: true }));
  const t0 = Date.now(); click($('#cvup'));
  let last = '', done = false;
  while ((Date.now() - t0) / 1000 < MAX_S) {
    await sleep(1000); const s = Math.round((Date.now() - t0) / 1000), now = warn();
    if (now !== last) { say(`[${String(s).padStart(3)} s] mensaje en pantalla: «${now || '(ninguno)'}»`); last = now; }
    if (/Perfil rellenado|Error/i.test(now)) { done = true; break; }
  }
  const total = Math.round((Date.now() - t0) / 1000);
  say(done ? `\nTerminó a los ${total} s.` : `\n✗ Pasaron ${total} s sin que la página terminara.`);

  say('\n=== 5. Resultado en el formulario «Tu perfil» ===');
  for (const k of ['name', 'title', 'email', 'phone', 'location', 'summary', 'skills', 'experience']) { const el = $(`[data-p="${k}"]`); say(`${k.padEnd(10)}: ` + (el ? (el.value ? el.value.replace(/\s+/g, ' ').slice(0, 70) : '(vacío)') : '✗ no existe el campo')); }
  const qs = $$('.warn').map(e => e.textContent).find(t => /Para mejorar tu CV|Revisa/.test(t)); if (qs) say('avisos de la app: ' + qs.replace(/\s+/g, ' ').slice(0, 300));
  say(`\nerrores de JavaScript en total: ${errors.length}`); errors.slice(0, 5).forEach(e => say('   ✗ ' + e.slice(0, 200)));
  const ok = done && /Perfil rellenado/.test(last) && ($('[data-p="name"]')?.value || '').length > 2 && !errors.length;
  say('\n>>> VEREDICTO: ' + (ok ? 'FUNCIONA de punta a punta con tu PDF. Si en el navegador no te sale, el problema está en el navegador (caché, otra pestaña/puerto).' : 'ALGO FALLA: copia todo este texto y pégalo en el chat.'));
  w.close(); process.exit(0);
})().catch(e => { console.log('✗ El diagnóstico se rompió:', e.message); process.exit(1); });
