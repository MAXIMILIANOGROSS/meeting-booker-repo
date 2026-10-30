# Booker Brody

Busca empresas que contratan, puntúa el encaje, redacta el mensaje y adapta tu CV a cada oferta. **Tú apruebas y envías.**

## Instalar (una sola vez)
1. Instala [Node.js](https://nodejs.org) (versión LTS).
2. Abre la Terminal en esta carpeta y ejecuta: `npm install`
3. Copia `.env.example` como `.env` (en Terminal: `cp .env.example .env`).
4. Para IA gratis en tu ordenador: instala [Ollama](https://ollama.com), ábrelo y ejecuta `ollama pull qwen2.5:7b`.
   Para usar Claude: en `.env` pon `PROVIDER=anthropic` y tu `ANTHROPIC_API_KEY`.

## Usar
`npm start` y abre http://localhost:3000

## Mi CV
- **Subir tu CV** (PDF con texto, DOCX o TXT) o **crearlo desde cero** contando tu trayectoria.
- Elige una oferta de tu lista o **pega una oferta tuya**, y pulsa *Crear CV a medida*.
- Descarga el PDF o envíalo por correo (necesita SMTP en `.env`).

Tus datos se guardan solo en `data.json` en tu ordenador.

## Cómo adapta el CV a cada oferta
1. Sube tu CV (o pégalo) y **revisa el perfil**: es la única fuente de datos.
2. Elige una oferta o pega el texto completo de la oferta que encontraste.
3. *Crear CV a medida*: reordena y reescribe usando el vocabulario de la oferta (para filtros ATS), ajusta titular y resumen, y te da encaje /100, palabras clave incluidas y requisitos que te faltan.
4. Nunca inventa empleos, habilidades ni idiomas: lo que no esté en tu perfil se descarta y aparece en «Falta».

Consejo: con Ollama `qwen2.5:7b` el resultado es correcto pero básico; para CVs mucho mejores usa `PROVIDER=anthropic`.
