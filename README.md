# Math Trade Argentina - Logística

App web para los voluntarios y organizadores que operan el evento presencial del Math Trade Argentina: recibir los juegos que traen los participantes, armar y abrir las cajas que viajan entre ciudades, entregar a cada participante lo que se lleva y resolver los problemas del día (juegos que faltan, reportes).

Está pensada para usarse **desde el celular, parado en el salón**: navegación inferior, botones grandes, textos legibles y escaneo de QR con la cámara trasera. No es la app pública de los participantes (esa es `mathtrade-web-ui`); la única pantalla pensada para público es la vista de TV `/display/ready-to-pickup`.

Forma parte de un sistema de tres repos: `mathtrade-backend` (API Django REST, fuente de verdad), `mathtrade-web-ui` (app pública) y este repo. Habla con el backend por HTTP; no comparte código con los otros dos.

## Quiénes la usan y qué ven

El acceso se decide en la interfaz según el rol del voluntario (la API acepta a cualquier voluntario de la edición activa) y según la fase del evento. Los roles están en `src/config/roles.ts` y la navegación en `src/config/nav.ts`.

| Rol | Qué hace | Pantallas |
|---|---|---|
| Ventanilla | Recibe los juegos que traen los participantes y entrega los que se llevan | `/receive`, `/receive-games`, `/deliver`, `/deliver-to-user` |
| Cajas | Arma y desarma las cajas desde y hacia otras ciudades | `/boxes`, `/boxes/in`, `/boxes/out` |
| Mesas | Ordena los juegos de sus mesas por receptor y controla quiénes están listos y qué juegos faltan | `/tables` |
| Runner | Lleva y trae juegos entre mesas y ventanillas, y busca lo que no aparece | usa Consultar y Más |
| Mi ciudad (referentes y voluntarios locales) | Prepara las cajas que salen de su ciudad, los envíos y lo que llega | `/city` y subpáginas |
| Organizador (admin) | Todo lo anterior, más configuración del evento | `/admin/*`, `/more/tools`, `/reports/all` |

Pantallas abiertas a todos los voluntarios: `/more` (menú "Más"), `/lookup` (buscar participante o juego), `/reports`, `/problem` ("Hay un problema"), `/select-role`, `/login`.

### Fases del evento

El backend expone la fase del evento y la app habilita pantallas según ella (`EventPhaseContext`): `0` sin empezar, `1` recepción, `2` entrega. Las mesas y ventanillas aplican solo a la entrega; la recepción es por orden de llegada.

## Funcionalidades

- **Recepción y entrega con QR** (`/receive-games`, `/deliver-to-user`): se escanea el QR del participante, se traen sus juegos pendientes y se marcan como recibidos o entregados, uno por uno o en bloque. También acepta `?qr=` para saltear la cámara.
- **Cajas** (`/boxes`): cajas entrantes (`/boxes/in`, incluyendo juegos sueltos) y salientes por destino (`/boxes/out`), agregado de juegos por código, aviso de "ya está en la caja N", cierre y reapertura de cajas, destinos no empaquetables, y exportación a Excel.
- **Mi ciudad** (`/city`): armado de cajas, etiquetas, instructivo, envíos con comprobantes y ejemplares, cajas recibidas, usuarios y voluntarios de la ciudad.
- **Faltantes y problemas**: "Hay un problema" (`/problem`) lista preguntas de negocio que llevan a la pantalla que las resuelve; reportes de faltantes por ítem (`/more/report`, `/more/reports`), vista de faltantes AMBA (`/more/reports/amba-missing`) y pendientes AMBA para organizadores (`/more/tools/amba-pending`).
- **Reportes** (`/reports`, `/reports/all`): reportes de ítems y de usuarios con fotos; el panel completo es solo para admins. Hay una campana de avisos de actividad.
- **Consultar** (`/lookup`): búsqueda de participantes y juegos por nombre, título o código.
- **Etiquetas e impresión** (`/more/print`): etiquetas de cajas, carteles de sectores, ventanillas y mesas (en blanco y negro).
- **Planillas del evento** (`/more`): descarga de Excel con cajas entrantes, juegos que salen, y juegos a recibir y a entregar por usuario.
- **Administración**: "Quién retiró" (`/admin/ready-to-pickup`), configuración de ventanillas y mesas (`/admin/window-config`), administración de voluntarios (`/admin/volunteers`), cambio de fase y panel de control global, y "Forzar juego" en `/more/tools`.
- **Vista de TV** (`/display/ready-to-pickup`): sin login, consulta periódicamente quién está listo para retirar.

## Stack

- Next.js 15 (App Router) y React 18, TypeScript
- Tailwind CSS 4 (sin `tailwind.config.js`; los tokens están en `src/app/globals.css`)
- Jest 29 + Testing Library (+ MSW, jest-fetch-mock)
- `react-qrcode-scanner-mi` para el escaneo, `xlsx` para las planillas, reCAPTCHA v3 en el login de producción
- Sentry (`@sentry/nextjs`) solo para errores, activo si hay DSN
- Node 24.x (`engines` de `package.json`)

## Correrla en local

Necesitás el backend corriendo (o apuntar a uno de prueba).

```bash
npm install
# creá .env.local con las variables de abajo
npm run dev               # http://localhost:3000
```

### Variables de entorno

Los archivos `.env*` están ignorados por git. Ejemplo de `.env.local` con valores de muestra:

```env
# Requerida. Host de la API del backend, con barra final.
NEXT_PUBLIC_MT_API_HOST=http://localhost:8000/

# Entorno. Con "prod" el login exige reCAPTCHA; en cualquier otro valor lo saltea.
NEXT_PUBLIC_ENV=development

# Clave pública de reCAPTCHA v3 (solo necesaria con NEXT_PUBLIC_ENV=prod).
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu-site-key-de-ejemplo

# Opcional. Si no está, Sentry queda desactivado.
NEXT_PUBLIC_SENTRY_DSN=
```

`NEXT_PUBLIC_VERCEL_ENV` lo setea Vercel y solo se usa para etiquetar el entorno de Sentry.

### Scripts

```bash
npm run dev         # servidor de desarrollo
npm run build       # build de producción
npm run start       # servidor de producción
npm run lint        # next lint
npm run lint-fix    # next lint --fix
npm test            # jest
npm run test:watch  # jest en modo watch
```

Husky + lint-staged corren `next lint --fix` sobre los archivos `.js/.jsx/.ts/.tsx` en cada commit.

## Estructura

```
src/
├── app/                 # rutas (App Router) y globals.css
│   ├── admin/           # Quién retiró, ventanillas, voluntarios
│   ├── boxes/           # cajas entrantes (in) y salientes (out)
│   ├── city/            # Mi ciudad: cajas, envíos, recibidas, usuarios, voluntarios
│   ├── deliver/, deliver-to-user/, receive/, receive-games/
│   ├── display/         # vista pública de TV
│   ├── lookup/, problem/, reports/, tables/
│   ├── login/, select-role/, more/
│   ├── api/compress-image/
│   └── fonts/           # Bricolage Grotesque (títulos), SF Pro Display
├── components/          # boxes, city, common (+ common/ui), control-panel, modals, qr, staff
├── config/              # roles, nav, problems, referrers, sessionKeys
├── constants/
├── contexts/            # ActionStatus, ControlPanel, EventPhase
├── hooks/               # useApi, useAuth, exportaciones, hooks de boxes y city
├── styles/staff.css     # botones y tarjetas del kit "staff"
├── types/
└── utils/
```

## Conexión con el backend

- Cliente HTTP: un wrapper de `fetch` en `src/hooks/useApi.ts`, más algunos `fetch` directos en pantallas de búsqueda por QR. La URL base sale de `NEXT_PUBLIC_MT_API_HOST` en cada llamada.
- Autenticación: token guardado en `localStorage` (`authToken`) y enviado como `Authorization: token <token>`. Solo el login es público; el resto de las llamadas falla si no hay token. El rol y el flag de admin se releen desde `logistics/me/`; un 401/403 cierra la sesión.
- Los endpoints de logística viven bajo `/logistics/` en el backend. Para el detalle de la API y del dominio mirá `mathtrade-backend`.

## Identidad visual

La app usa la identidad del logo. Los tokens están en el bloque `@theme` de `src/app/globals.css`.

| Token | Valor | Uso |
|---|---|---|
| `canvas` / `page` | `#fffaf0` (crema) | fondo de página |
| `surface`, `surface-soft`, `surface-strong`, `line` | tonos crema/arena | superficies y bordes |
| `ink` | `#2e294e` (azul noche) | texto y títulos |
| `ink-muted` | `#5a574f` | texto secundario |
| `brand` | `#6cbfe3` (celeste) | color de marca |
| `brand-ink` | `#2e294e` | texto sobre celeste |
| `sun` | `#ffc700` | acento |
| `link` | `#005f86` | enlaces (contraste suficiente sobre crema) |
| `peach`, `pink`, `mint`, `lilac`, `sky` | pasteles | acentos de apoyo |
| `want`, `danger`, `warning` | verde, rojo, amarillo | estados |

Reglas:

- **El celeste es el color de marca.** El botón primario es celeste con texto azul noche (`.staff-btn-primary`); no usar texto blanco sobre celeste.
- Fondo crema, texto azul noche. Los estados usan tokens o los tonos de `Chip`, no la paleta por defecto de Tailwind.
- **Radios**: tarjetas `--radius-card` (16px), paneles y diálogos `--radius-main` (24px), botones totalmente redondeados.
- **Sin sombras** en componentes nuevos: tarjetas planas con borde de 1px (`line`). Quedan unas pocas sombras heredadas (campana de avisos, algunos modales) que no hay que replicar.
- **Tipografía**: títulos con Bricolage Grotesque (`--font-display`, cargada localmente en `src/app/fonts/`); el resto con SF Pro Display y fuentes del sistema. Escala de texto propia: `text-caption` 11px, `text-body` 13px, `text-body-lg` 15px, `text-heading` 19px, `text-display` (fluido). No usar `text-xs/sm/base/lg/xl` ni `text-[..]`; el peso se escribe siempre con `font-*`.
- **App de evento**: se usa de pie, con ruido y apuro. Priorizar legibilidad y contraste, áreas táctiles de al menos 48px en la navegación y 56px en los botones principales (40px en `staff-btn-sm`), acciones principales al alcance del pulgar (`ThumbCta`) y confirmaciones para acciones destructivas.
- Capas con utilidades `z-raised … z-tooltip` (sin `z-[..]`). No hay modo oscuro: no agregar clases `dark:`.
- Las etiquetas de impresión (`/more/print`) son siempre blanco y negro.

## Tests

```bash
npm test
```

Jest con `next/jest` y entorno `jsdom`; los tests viven en carpetas `__tests__` junto a lo que prueban (páginas, componentes, hooks y config). La cobertura es parcial: no hay umbral configurado ni script de coverage. Todo cambio de comportamiento debería llevar test, y los arreglos de bugs empiezan por un test que falle.

## Despliegue

Se publica en Vercel. El build de producción sale de los forks `fesgura/*`, no de la organización: **mergear a `main` de `MathTradeArg/mathtrade-logistics` no publica hasta que se sincroniza el fork.** Las variables de entorno se configuran en Vercel. No hay Dockerfile ni CI en este repo.

## Contribuir

1. Creá una rama desde `main` (por ejemplo `feat/...`, `fix/...` o `docs/...`).
2. Hacé los cambios siguiendo las convenciones: TypeScript, alias `@/` para imports, componentes en PascalCase, hooks `use*`.
3. Corré `npm run lint` y `npm test`.
4. Commits y título del PR **en inglés**, en imperativo y descriptivos. El cuerpo del PR, corto y concreto.
5. Abrí el PR contra `MathTradeArg/mathtrade-logistics`.

Los textos de la interfaz están en español rioplatense (voseo). Para bugs, abrí un issue con pasos para reproducir y capturas.

## Licencia

Licencia MIT. Ver [LICENSE.md](LICENSE.md).

---

**Math Trade Argentina - Logística** - Hecho para la comunidad de juegos de mesa.
