<p align="center">
  <img src="public/assets/booker-brody/backgrounds/paisaje-alienigena-1672.webp" width="100%" alt="Paisaje alienígena bajo un planeta gigante: el universo de Booker Brody">
</p>

<p align="center">
  <img src="public/assets/booker-brody/brand/booker-original-1024.webp" width="220" alt="Booker, la mascota de Booker Brody, con su calendario">
</p>

<h1 align="center">Booker Brody</h1>

<p align="center">
  Encuentra empresas que contratan, redacta el mensaje, crea un CV a medida de cada oferta y agenda la reunión.<br>
  Tú apruebas y envías. Funciona en tu ordenador.
</p>

<p align="center">
  <img src="public/assets/booker-brody/scenes/portal.webp" width="240" alt="">
  <img src="public/assets/booker-brody/scenes/oficina.webp" width="240" alt="">
  <img src="public/assets/booker-brody/scenes/escribiendo.webp" width="240" alt="">
</p>

## Qué hace

1. **Leads**: busca empresas con ofertas recientes en [freehire.me](https://freehire.me) (gratis, sin clave), con filtros de palabras clave, región, nivel y días. Puede repetirse solo cada pocas horas.
2. **Aprobar**: una IA puntúa el encaje de cada empresa y redacta un mensaje. Lo revisas, lo copias y lo envías tú.
3. **Respuestas**: pegas la respuesta de la empresa; la IA clasifica la intención y sugiere qué contestar.
4. **Reuniones**: agenda y contador semanal.
5. **Mi CV**: primero creas tu perfil **subiendo tu CV actual** (PDF con texto, DOCX o TXT), **contando tu trayectoria con tus palabras** (la IA lo ordena y te pregunta lo que falta) o importando tus datos de LinkedIn. Después, a partir de tu perfil y de **cualquier oferta publicada en internet** (de tu lista, pegando su texto o con su enlace), crea un CV a medida, indica qué requisitos cubres y cuáles faltan, muestra su compatibilidad de palabras clave con los filtros ATS, lo descarga en PDF y puede enviarlo por correo con el PDF adjunto.

No automatiza tu cuenta de LinkedIn: no hay API pública para ello y automatizarla arriesga tu cuenta. El botón «Abrir en LinkedIn» solo copia el mensaje y abre la búsqueda de personas de la empresa.

La interfaz te guía: cada pestaña indica el **siguiente paso**, «Mi CV» muestra una ruta de 4 pasos (perfil, oferta, CV, envío) y un glosario explica lead, encaje y ATS.

## Instalación

Necesitas [Node.js 22 (LTS)](https://nodejs.org) (mínimo 20.16) y una de estas dos IAs:

- **Gratis y local**: [Ollama](https://ollama.com) y `ollama pull qwen2.5:7b`.
- **Claude por API** (de pago): una clave en [console.anthropic.com](https://console.anthropic.com) y `PROVIDER=anthropic` en `.env`.

```bash
git clone https://github.com/MAXIMILIANOGROSS/meeting-booker-repo.git
cd meeting-booker-repo
npm install
cp .env.example .env
npm start
```

Abre http://localhost:3000 (cambia el puerto con `PORT=3001 npm start`). Para desarrollar con recarga automática: `npm run dev`.

## Configuración (`.env`)

| Variable | Para qué |
|---|---|
| `PROVIDER` | `ollama` (por defecto) o `anthropic` |
| `OLLAMA_MODEL` | Modelo local, por defecto `qwen2.5:7b` |
| `ANTHROPIC_API_KEY`, `MODEL` | Solo si usas Claude por API |
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `OLLAMA_URL`, `DATA_FILE`, `FREEHIRE_API_URL` | Avanzado: otra dirección de Ollama, otra ruta de `data.json` u otra fuente de ofertas |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Para enviar el CV por correo |

**Enviar con Gmail**: activa la verificación en dos pasos, crea una *contraseña de aplicación* en tu cuenta de Google y úsala en `SMTP_PASS` (no tu contraseña normal). Cada envío pide confirmación. El correo de la empresa lo pones tú: las ofertas no incluyen contacto.

## Privacidad

- Tus datos (perfil, leads, reuniones) se guardan en `data.json`, en tu carpeta. Está en `.gitignore` y no se sube.
- `.env` también está ignorado. Nunca subas tus claves.
- El servidor escucha solo en `127.0.0.1` y además rechaza peticiones con `Host` u `Origin` que no sean locales, así que otra web abierta en tu navegador no puede usar tu API (ni enviar correos con tu SMTP).
- `data.json` se guarda con permisos `600`, con escritura atómica; si algún día se daña, se conserva una copia `data.json.danado-…` y la app arranca limpia en vez de caerse.
- Al leer una oferta desde un enlace, el servidor solo abre `http(s)` públicos: bloquea direcciones internas (localhost, redes privadas), valida la IP en el momento de conectar y en cada redirección, y limita tamaño y tiempo. Muchas webs (LinkedIn, por ejemplo) exigen iniciar sesión: en ese caso se pega el texto.
- Los textos de las ofertas se tratan como datos, no como instrucciones, al pedirle a la IA el CV y los mensajes.

## Solución de problemas

| Síntoma | Qué hacer |
|---|---|
| `El puerto 3000 ya está en uso` | Ya hay otra copia corriendo. Ciérrala con `lsof -ti :3000 \| xargs kill` o arranca en otro puerto: `PORT=3001 npm start`. |
| Los botones no responden | Abre las herramientas del navegador (`Cmd+Opt+J`) → Console y mira el error en rojo. Recarga con `Cmd+Shift+R`. |
| Aparece «No se pudo hablar con el servidor local» | `npm start` se ha parado. Vuelve a arrancarlo; los cambios no guardados se reintentan. |
| «Ollama no está en marcha» | Abre la app Ollama y comprueba que descargaste el modelo (`ollama pull qwen2.5:7b`). |
| «La IA no devolvió un JSON válido» | Pasa con modelos pequeños. Reintenta o usa un modelo mayor / Claude. |
| «Falta SMTP_USER y SMTP_PASS» | Configura el correo en `.env` (ver arriba). |

## Pruebas

```bash
npm install
npm test         # servidor, seguridad, persistencia y la página real (botones incluidos)
npm run check    # comprobación de sintaxis
```

Los tests arrancan el servidor con una IA y un buscador de ofertas falsos, abren la página en un navegador simulado ([jsdom](https://github.com/jsdom/jsdom)) y pulsan los botones de cada pestaña. GitHub Actions los ejecuta en cada push.

## Universo visual

<p align="center">
  <img src="public/assets/booker-brody/mascot/booker-saludando-360.webp" height="150" alt="Booker saludando">
  <img src="public/assets/booker-brody/mascot/booker-celebrando-360.webp" height="150" alt="Booker celebrando">
  <img src="public/assets/booker-brody/mascot/booker-vistas-640.webp" height="150" alt="Booker de frente, perfil y espalda">
</p>

## Límites conocidos

- Un modelo local pequeño puede redactar peor que Claude: revisa siempre mensajes y CV antes de enviar.
- Los PDF escaneados (solo imagen) no se pueden leer sin OCR, y los `.doc` antiguos no se admiten: guárdalos como DOCX o PDF, o cuenta tu trayectoria en el cuadro B.
- Al subir un CV, el correo y el teléfono solo se rellenan si aparecen de verdad en el archivo.
- El CV solo usa lo que escribas en tu perfil; lo que falte se marca, no se inventa.
- El buscador de ofertas depende de freehire.me: si cambia su API, la búsqueda avisará con un error claro.
- Si ejecutas dos copias a la vez en puertos distintos, ambas escriben el mismo `data.json` (usa `DATA_FILE` para separarlas).
- Los datos son de una sola persona y un solo ordenador; no hay cuentas ni sincronización.

## Licencia

MIT
