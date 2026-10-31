'use strict';
// Abre la página real en un navegador simulado (jsdom), contra el servidor real con IA y ofertas falsas,
// y pulsa los botones. Si el JavaScript de la página se rompe (como pasó con «wk is not a function»), falla aquí.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch {}
const { fakes, startApp, stopAll } = require('./helpers');

let f, t, dom, w, errors;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(cond, what, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = cond(); if (v) return v; } catch {} await sleep(25); } assert.fail('Tiempo agotado esperando: ' + what); }
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); el.dispatchEvent(new w.Event('change', { bubbles: true })); };
const tab = k => click($(`[data-t="${k}"]`));
const serverState = async () => (await t.raw('GET', '/api/state')).json;
const settled = async () => { await sleep(700); }; // el guardado está “debounced” 400 ms

before(async () => {
  if (!JSDOM) return;
  f = await fakes(); t = await startApp(f); errors = [];
  dom = await JSDOM.fromURL(t.base + '/', { runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(win) {
    win.fetch = (u, o = {}) => fetch(new URL(u, t.base), { ...o, headers: { Origin: t.base, ...(o.headers || {}) } });
    win.confirm = () => true; win.open = () => null; win.URL.createObjectURL = () => 'blob:test'; win.HTMLAnchorElement.prototype.click = function () { win.__downloaded = this.download; };
    Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: async () => {} } });
    win.addEventListener('error', e => errors.push(e.message)); win.addEventListener('unhandledrejection', e => errors.push('promesa: ' + e.reason));
  } });
  w = dom.window;
  await until(() => $$('#nav button').length === 5, 'la navegación');
});
after(async () => { w?.close(); await stopAll(); f?.close(); });
const skip = { skip: !JSDOM && 'jsdom no instalado (npm install)' };

test('la página carga sin errores y pinta estadísticas y pestañas', skip, async () => {
  assert.equal($$('.st').length, 4); assert.equal($('#net').hidden, true);
  assert.deepEqual($$('#nav button').map(b => b.getAttribute('role')), Array(5).fill('tab'));
  assert.deepEqual(errors, []);
});

test('regresión «wk is not a function»: todas las pestañas se pintan y los botones responden', skip, async () => {
  for (const k of ['approve', 'replies', 'meets', 'cv', 'leads']) { tab(k); await until(() => $(`[data-t="${k}"]`).classList.contains('on'), 'pestaña ' + k); assert.ok($('#view').children.length > 0, k + ' vacía'); }
  assert.deepEqual(errors, [], 'errores de JavaScript en la página: ' + errors.join(' | '));
});

test('leads: el carrusel guiado avanza, usa ejemplos y guarda lo escrito', skip, async () => {
  tab('leads'); await until(() => $('.trk'), 'carrusel');
  assert.equal($$('.sl').length, 9, '9 pasos'); assert.equal($('#cnt').textContent, 'Paso 1 de 9'); assert.equal($('#cprev').disabled, true);
  click($('#cnext')); assert.equal($('#cnt').textContent, 'Paso 2 de 9');
  click($$('.dot')[8]); assert.equal($('#cnt').textContent, 'Paso 9 de 9'); assert.equal($('#cnext').disabled, true);
  click($('[data-ex="me"]')); await until(() => $('#me').value.length > 20, 'ejemplo aplicado'); await settled();
  assert.equal((await serverState()).state.me, $('#me').value, 'el ejemplo se guarda en el servidor');
  assert.ok([...$('#fr').options].some(o => o.value === '' && /Todo el mundo/.test(o.textContent)), 'zona «Todo el mundo»');
  type($('#fr'), ''); await settled(); assert.equal((await serverState()).state.auto.region, '');
  assert.equal($$('.steps li').length, 0, 'el carrusel no usa la clase de la ruta del CV'); assert.deepEqual(errors, [], errors.join(' | '));
});

test('leads: añadir a mano y buscar empresas (se guardan en el servidor)', skip, async () => {
  type($('#new'), 'Ana Ruiz, CTO, Zeta, contrata devs'); click($('#add'));
  await until(() => $$('.card.row').length === 1, 'lead manual'); assert.match($('.card.row').textContent, /Zeta/);
  click($('#find')); await until(() => /empresas nuevas añadidas/.test($('.warn[role="status"]')?.textContent || ''), 'resultado de la búsqueda');
  assert.equal($$('.card.row').length, 3, 'Zeta + Acme + Beta'); await settled();
  assert.deepEqual((await serverState()).state.leads.map(l => l.company).sort(), ['Acme', 'Beta', 'Zeta']);
  click($('#find')); await until(() => /0 empresas nuevas/.test($('.warn[role="status"]')?.textContent || ''), 'sin duplicados al repetir');
});

test('aprobar: puntuar y redactar con IA, copiar y marcar enviado', skip, async () => {
  type($('#me'), 'Desarrollo webs'); type($('#icp'), 'Startups'); await settled();
  click($('#go')); await until(() => $('[data-t="approve"]').classList.contains('on'), 'saltar a Aprobar', 6000);
  await until(() => $$('[data-send]').length === 3, '3 borradores');
  assert.match($('[data-msg]').value, /vi vuestra oferta/); assert.match($('#view').textContent, /encaje 87/);
  click($('[data-skip]')); await until(() => $$('[data-send]').length === 2, 'descartar uno');
  click($('[data-send]')); await until(() => $$('[data-send]').length === 1, 'marcar enviado'); await settled();
  const { leads } = (await serverState()).state;
  assert.equal(leads.filter(l => l.status === 'discarded').length, 1); assert.equal(leads.filter(l => l.status === 'sent').length, 1);
  assert.equal($$('.st b')[1].textContent, '1', '«Enviados» no cuenta lo descartado (antes sí lo contaba)');
});

test('respuestas: analizar con IA y agendar reunión; el calendario .ics se descarga', skip, async () => {
  tab('replies'); await until(() => $('[data-rep]'), 'lead enviado en Respuestas');
  type($('[data-rep]'), 'Me interesa, hablamos'); click($('[data-an]'));
  await until(() => $('[data-book]'), 'respuesta sugerida', 6000); assert.match($('#view').textContent, /martes a las 10:00/);
  click($('[data-book]')); assert.match($('.warn[role="status"]').textContent, /Elige día y hora/);
  type($('[data-when]'), '2030-05-14T10:00'); click($('[data-book]'));
  await until(() => $('.flash'), 'reunión agendada'); assert.equal($$('.card.row').length, 1);
  assert.ok($('#ics'), 'botón .ics'); click($('#ics')); assert.equal(w.__downloaded, 'reuniones-booker.ics'); await settled();
  assert.equal((await serverState()).state.meetings.length, 1);
});

test('mi CV: crear a medida, ver encaje y descargar PDF; error de correo legible', skip, async () => {
  tab('cv'); await until(() => $('#cvsel'), 'selector de oferta');
  assert.equal($('#cvgen').disabled, true, 'sin nombre no se puede crear');
  type($('[data-p="name"]'), 'Eva Prueba'); type($('#cvsel'), String(Math.min(...(await serverState()).state.leads.map(l => l.id)) )); 
  const opt = [...$('#cvsel').options].find(o => /Acme/.test(o.textContent)); type($('#cvsel'), opt.value);
  await until(() => !$('#cvgen').disabled, 'botón habilitado'); click($('#cvgen'));
  await until(() => /Encaje con la oferta/.test($('#view').textContent), 'CV generado', 6000);
  assert.match($('#view').textContent, /Cubre: React/); assert.match($('#view').textContent, /Go/);
  click($('#cvpdf')); await sleep(300); assert.match(w.__downloaded, /^CV-Eva-Prueba-Acme\.pdf$/);
  type($('#cvto'), 'rrhh@acme.com'); click($('#cvsend'));
  await until(() => /Error: .*SMTP_USER/.test($('.warn[role="status"]')?.textContent || ''), 'aviso de SMTP sin configurar');
  assert.deepEqual(errors, [], errors.join(' | '));
});

test('CV para cualquier oferta: pegar el texto, crear el CV y ver la compatibilidad; la ruta guía', skip, async () => {
  tab('cv'); await until(() => $('[data-om="paste"]'), 'selector de origen'); assert.ok($$('.steps li').length === 4, 'ruta de 4 pasos');
  click($('[data-om="paste"]')); await until(() => $('#otext'), 'formulario de oferta pegada');
  click($('#ouse')); assert.match($('.warn[role="status"]').textContent, /texto completo/);
  type($('[data-p="email"]'), 'eva@prueba.com'); type($('#otitle'), 'Backend Dev'); type($('#ocomp'), 'Omega'); type($('#otext'), 'Buscamos desarrollador backend con Go y Docker. '.repeat(4));
  click($('#ouse')); await until(() => $('#cvsel') && /Omega/.test($('#cvsel').selectedOptions[0]?.textContent || ''), 'oferta seleccionada');
  await until(() => !$('#cvgen').disabled, 'botón habilitado'); click($('#cvgen'));
  await until(() => /Compatibilidad de palabras clave/.test($('#view').textContent), 'compatibilidad ATS', 6000);
  assert.ok($$('.steps li.done').length >= 3, 'la ruta marca los pasos hechos'); assert.deepEqual(errors, [], errors.join(' | '));
  tab('leads'); await until(() => $('.guide'), 'guía en Leads'); assert.match($('.guide').textContent, /Siguiente paso/);
});

test('mi CV: crear el perfil desde cero y desde un archivo subido', skip, async () => {
  tab('cv'); await until(() => $('#cvscratch'), 'tarjeta del paso 1');
  type($('[data-p="name"]'), ''); type($('[data-p="skills"]'), '');
  type($('#cvnotes'), 'Me llamo Eva Prueba. Estudié informática en Madrid y trabajé dos años en Acme haciendo interfaces con React.');
  click($('#cvscratch')); await until(() => $('[data-p="name"]').value === 'Eva Prueba', 'perfil creado desde cero', 6000);
  assert.equal($('[data-p="skills"]').value, 'React, CSS'); assert.match($('#view').textContent, /Para mejorar tu CV, añade/);
  type($('[data-p="name"]'), ''); click($('#cvup')); await until(() => /Selecciona primero un archivo/.test($('.warn[role="status"]')?.textContent || ''), 'aviso sin archivo');
  const file = new w.File(['Eva Prueba, desarrolladora frontend con dos años de experiencia en Acme haciendo interfaces.'], 'cv.txt', { type: 'text/plain' });
  Object.defineProperty($('#cvfile'), 'files', { value: [file], configurable: true });
  click($('#cvup')); await until(() => $('[data-p="name"]').value === 'Eva Prueba', 'perfil leído del archivo', 6000);
  assert.match($('.warn[role="status"]').textContent, /Perfil rellenado/); await settled();
  assert.equal((await serverState()).state.profile.name, 'Eva Prueba', 'el perfil se guarda en el servidor');
  assert.deepEqual(errors, [], errors.join(' | '));
});

test('conflictos: un cambio automático del servidor no borra lo que estás escribiendo', skip, async () => {
  tab('leads'); await until(() => $('#me'), 'pestaña leads'); await settled();
  const { state, rev } = await serverState(); // simula el modo automático (o otra pestaña) escribiendo en paralelo
  state.leads.push({ id: 99991, name: 'Auto', role: 'Contrata: X', company: 'DeAutomatico', status: 'new' });
  assert.equal((await t.raw('PUT', '/api/state', { json: { rev, state } })).status, 200);
  type($('#icp'), 'Escrito justo ahora'); // el cliente tiene una revisión vieja → 409 → fusión
  await until(async () => true, 'x'); await settled(); await settled();
  const fin = (await serverState()).state;
  assert.equal(fin.icp, 'Escrito justo ahora', 'se conserva lo escrito por la persona');
  assert.ok(fin.leads.some(l => l.company === 'DeAutomatico'), 'se conserva lo que llegó del servidor');
  assert.equal($('#net').hidden, true);
});

test('si el servidor no responde, avisa de que no se guarda', skip, async () => {
  const realFetch = w.fetch; w.fetch = () => Promise.reject(new Error('caído'));
  type($('#me'), 'cambio sin servidor'); await until(() => $('#net').hidden === false, 'aviso visible', 3000);
  w.fetch = realFetch; type($('#me'), 'cambio con servidor'); await until(() => $('#net').hidden === true, 'aviso oculto al recuperar', 3000);
});

test('leads: ordena por encaje, muestra 30, «Mostrar más» y «Borrar los no procesados»', skip, async () => {
  tab('leads'); await until(() => $('#me'), 'pestaña leads'); await settled();
  w.eval("for(let i=0;i<40;i++)S.leads.push({id:7000+i,status:'new',name:'N'+i,role:'x',company:'Nueva'+i,note:''});S.leads.push({id:6999,status:'drafted',score:99,name:'Top',role:'x',company:'Mejor',note:''});save();render()");
  await until(() => $$('.card.row').length === 30, '30 visibles'); assert.match($('.card.row').textContent, /Mejor/, 'el de más encaje va primero'); assert.match($('.leadsbar').textContent, /Mostrando 30 de/);
  click($('#more')); await until(() => $$('.card.row').length > 30, 'mostrar más');
  await settled(); const antes = (await serverState()).state.leads.length; assert.ok(antes >= 41, 'el cliente ya guardó los leads');
  click($('#clr')); await until(() => !$('#clr'), 'borrados los no procesados', 6000);
  const fin = (await serverState()).state.leads; assert.ok(fin.length < antes && fin.every(l => l.status !== 'new') && fin.some(l => l.company === 'Mejor'));
  assert.deepEqual(errors, [], errors.join(' | '));
});

