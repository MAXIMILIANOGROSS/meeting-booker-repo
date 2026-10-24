<p align="center">
  <img src="public/assets/booker-brody/mascot/booker-principal-512.webp" width="200" alt="Booker, la mascota de Booker Brody">
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
5. **Mi CV**: a partir de tu perfil y de una oferta, crea un CV a medida, indica qué requisitos cubres y cuáles faltan, lo descarga en PDF y puede enviarlo por correo con el PDF adjunto.

No automatiza tu cuenta de LinkedIn: no hay API pública para ello y automatizarla arriesga tu cuenta. El botón «Abrir en LinkedIn» solo copia el mensaje y abre la búsqueda de personas de la empresa.

## Instalación

Necesitas [Node.js 18+](https://nodejs.org) y una de estas dos IAs:

- **Gratis y local**: [Ollama](https://ollama.com) y `ollama pull qwen2.5:7b`.
- **Claude por API** (de pago): una clave en [console.anthropic.com](https://console.anthropic.com) y `PROVIDER=anthropic` en `.env`.

```bash
git clone https://github.com/MAXIMILIANOGROSS/meeting-booker-repo.git
cd meeting-booker-repo
npm install
cp .env.example .env
npm start
```

Abre http://localhost:3000 (cambia el puerto con `PORT=3001 npm start`).

## Configuración (`.env`)

| Variable | Para qué |
|---|---|
| `PROVIDER` | `ollama` (por defecto) o `anthropic` |
| `OLLAMA_MODEL` | Modelo local, por defecto `qwen2.5:7b` |
| `ANTHROPIC_API_KEY`, `MODEL` | Solo si usas Claude por API |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Para enviar el CV por correo |

**Enviar con Gmail**: activa la verificación en dos pasos, crea una *contraseña de aplicación* en tu cuenta de Google y úsala en `SMTP_PASS` (no tu contraseña normal). Cada envío pide confirmación. El correo de la empresa lo pones tú: las ofertas no incluyen contacto.

## Privacidad

- Tus datos (perfil, leads, reuniones) se guardan en `data.json`, en tu carpeta. Está en `.gitignore` y no se sube.
- `.env` también está ignorado. Nunca subas tus claves.
- El servidor escucha solo en `127.0.0.1`.

## Diseño

Sistema de diseño, paleta y lista de assets en [`DESIGN.md`](DESIGN.md).

## Límites conocidos

- Un modelo local pequeño puede redactar peor que Claude: revisa siempre mensajes y CV antes de enviar.
- El CV solo usa lo que escribas en tu perfil; lo que falte se marca, no se inventa.
- Sin pruebas automáticas todavía.

## Licencia

MIT
