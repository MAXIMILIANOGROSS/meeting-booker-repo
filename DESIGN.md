# Booker Brother · sistema de diseño (primera entrega)

Rama sugerida: `feature/booker-brother-visual-universe`

## Tokens (en `public/index.html`, bloque «Booker Brother · tokens»)
Colores: sage `#9BAF8B` (mascota, progreso) · navy `#102B49` (acciones principales, estructura) · cream `#FFF9EC` (fondo) · coral `#EF514B` (alertas suaves) · amber `#FFB43B` (selección, datos clave, acento en modo oscuro) · teal `#48C5C9` (estados positivos, foco) · ink `#18251F` (texto).
Tipografía: Nunito (OFL, gratuita), con `ui-rounded` y `system-ui` como respaldo. Radios 8 / 14 / 22 px. Foco visible turquesa de 3 px.
Modo oscuro automático (`prefers-color-scheme`). Animaciones desactivadas con `prefers-reduced-motion`.

## Assets (`public/assets/booker-brother/mascot/`, WebP con transparencia)
- `booker-principal-160.webp`, `booker-principal-512.webp`: mascota principal (de `hugo-alien.png`).
- `booker-saludando-360.webp`, `booker-celebrando-360.webp`: recortadas de la lámina de marca.
Las demás poses de la lámina no se han recortado: tienen fondos de escena o están cortadas. No existen como archivo hasta que se generen.

## Universo completo (todo lo recibido está en uso)
- Fondo de pantalla: `backgrounds/marte-1600.webp` (paisaje alienígena), fijo, con capa azul marino para legibilidad. Cabecera y pie van sobre panel crema.
- Escenas (`scenes/`): portal (Leads), oficina (Aprobar), escribiendo (Respuestas), como banner de cada pestaña.
- Iconos (`icons/`, de la lámina): remolino, check, reloj y calendario en la navegación; estrella como favicon.
- Mascota (`mascot/`): principal, saludando, celebrando, organizando calendario, primer plano (asoma abajo a la izquierda en pantallas anchas), vistas (frente, perfil, espalda) y libreta con bolígrafo en el pie.

## Dónde se usa
Cabecera (principal, flota suave) · estado vacío de Aprobar (saludando) · Respuestas y Reuniones (principal) · confirmación al agendar (celebrando, 4 s).
Imágenes decorativas con `alt=""`; las que no están en la cabecera cargan con `loading="lazy"`.

## Pendiente
Logotipo vectorial, pantalla de bienvenida, web pública (landing), poses de error y descanso, app móvil (no existe), pruebas automáticas.
