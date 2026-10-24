# Meeting Booker

Flujo de prospección con **aprobación manual**: Claude puntúa el encaje de cada lead y redacta el mensaje; tú lo revisas, lo envías tú mismo y gestionas respuestas y reuniones.

No se conecta a LinkedIn ni envía nada por ti, así que no arriesgas tu cuenta.

## Uso

Requiere [Node.js 18+](https://nodejs.org) y una [API key de Anthropic](https://console.anthropic.com).

```bash
git clone https://github.com/TU_USUARIO/meeting-booker.git
cd meeting-booker
cp .env.example .env     # pega tu ANTHROPIC_API_KEY
npm start
```

Abre http://localhost:3000

## Flujo

1. **Leads**: tu oferta, cliente ideal y disponibilidad; pega prospectos (`Nombre, Cargo, Empresa, nota`).
2. **Aprobar**: edita el borrador, copia y pégalo en LinkedIn.
3. **Respuestas**: pega la respuesta; Claude clasifica la intención y sugiere contestación con horarios.
4. **Reuniones**: agenda y ve el contador semanal.

## Notas

- La API key solo vive en `.env` (ignorado por git). El servidor escucha solo en `127.0.0.1`.
- Los datos se guardan en `localStorage` del navegador. Úsalo siempre desde el mismo navegador.
- Cada puntuación consume tokens de tu cuenta de API.
- Revisa cada mensaje: Claude solo conoce lo que escribes en el lead.

MIT
