# ECO CB — Muévete Ciudad Bolívar

Prototipo web de movilidad que compara rutas formales e informales, explica una recomendación y considera reportes ciudadanos recientes. Construido con **React 18 + Vite 6 + Leaflet** y preparado para desplegarse en Vercel.

> Las rutas veredales, frecuencias, tarifas informales y tiempos combinados siguen marcados como demostración. No usar la aplicación para decisiones operativas.

## Funcionalidades

- Agente **Eco** conectado a `POST /api/chat` y respaldado por Gemini.
- Gemini redacta la respuesta con salida estructurada; el motor determinista conserva la selección de ruta y sus datos.
- Fallback local si no hay clave, red o respuesta válida del proveedor.
- Formulario y chat en español de Colombia.
- Mapa con TransMiCable, SITP, veredales, reportes y una ruta vial real entre A y B.
- Planificador multimodal por proximidad: si A está cerca de una estación TransMiCable o una van veredal, muestra el acceso, el tramo hasta la integración y recalcula la conexión hacia B.
- La capa inferior muestra distancia, precio estimado y los transportes disponibles para seleccionar.
- Extracto GTFS oficial del 18 de agosto de 2026 con paradas y servicios de Ciudad Bolívar.
- Reporte ciudadano con expiración, estado visible y recálculo según el lugar afectado.
- Enlace por ruta mediante `?ruta=alternate`.
- Vista esquemática de respaldo y diseño móvil accesible.

## Arquitectura

```text
Web / WhatsApp → /api/chat → parser de intención
                              ↓
                      reportes vigentes
                              ↓
                    motor determinista
                              ↓
                    objeto de ruta único
                       ↙               ↘
              Gemini redacta      fallback local
                       ↘               ↙
                    respuesta + mapa
```

La geometría de carretera la determina el router, no Gemini. Entre las alternativas devueltas se conserva la de menor distancia y se etiqueta como **más corta disponible**; no se afirma que sea un mínimo global.

```text
A/B geocodificados → OSRM (alternativas) → referencia vial A–B
A → estación/paradero cercano → tramo cable o van → integración → OSRM integración → B
```

El modelo de lenguaje **no dibuja ni inventa rutas**. La función serverless conserva la clave y entrega al modelo únicamente contexto acotado.

## Requisitos

- Node.js 18 o superior.
- npm 9 o superior.
- Opcional: API key de Gemini en Google AI Studio para respuestas reales con Gemini.
- Opcional: CLI de Vercel para probar funciones serverless localmente.

## Ejecutar el frontend

```bash
npm install
npm run dev
```

Abrir la URL que indique Vite, normalmente `http://localhost:5173`.

En `localhost`, Vite usa deliberadamente el fallback local para no mostrar un 404 al abrir `/api/chat`. Para probar la función serverless en local, ejecuta `VITE_CHAT_API=true npx vercel dev` (PowerShell: `$env:VITE_CHAT_API='true'; npx vercel dev`). Sin `GEMINI_API_KEY`, la función responde con el mismo fallback estructurado.

## Probar frontend + API

```bash
npx vercel dev
```

La reescritura de `vercel.json` excluye `/api/*`; por eso la función `api/chat.js` no se convierte en una respuesta HTML de la SPA.

## Configurar Gemini

1. Crear una API key en Google AI Studio.
2. Copiar `.env.example` a `.env.local`.
3. Completar:

```dotenv
GEMINI_API_KEY=tu_clave_privada
GEMINI_MODEL=gemini-3.5-flash-lite
```

En Vercel, configurar las mismas variables en **Project Settings → Environment Variables**. Nunca usar `VITE_` para una clave privada. La llamada usa `store: false` y el encabezado `x-goog-api-key`; la clave no se envía al navegador.

## Configurar la ruta vial

El prototipo consulta `VITE_ROUTING_API_URL`; por defecto usa el servidor público de OSRM y selecciona la alternativa de menor distancia entre las respuestas. Para una demostración es suficiente. En producción se debe reemplazar por un servicio con SLA, cuota y datos de actualización contractual; el fallback nunca une A y B con una línea recta.

La proximidad de abordaje se configura con `VITE_TRANSMICABLE_ACCESS_RADIUS_KM` (0,7 km), `VITE_VEREDAL_SEARCH_RADIUS_KM` (1,0 km) y `VITE_TRANSPORT_MODE_TIE_BREAKER_KM` (0,15 km). El cable solo se activa si el origen tiene una estación real cercana; una van requiere un paradero conocido antes de la integración.

## Verificación

```bash
npm test
npm run build
npm run check
```

Las pruebas cubren:

- interpretación de intención y prioridad;
- selección de rutas;
- ubicación y expiración de reportes;
- consulta de información oficial;
- geometría OSRM, selección de la alternativa más corta disponible y fallback sin línea recta;
- abordaje por proximidad a TransMiCable o van, integración y segundo tramo recalculado;
- integración de Gemini con salida estructurada y fallback local;
- rechazo de afirmaciones no soportadas;
- contrato HTTP de `/api/chat`.

## Datos

El proyecto incluye un extracto pequeño generado desde el GTFS oficial:

- `src/data/gtfs-ciudad-bolivar-snapshot.json`
- `src/data/gtfsIndex.js`
- `src/data/mobilitySources.js`
- `scripts/build-gtfs-snapshot.mjs`

Para regenerarlo:

```bash
npm run extract:gtfs -- "C:\ruta\GTFS_20260818" "src/data/gtfs-ciudad-bolivar-snapshot.json"
```

Detalles, fuentes y límites: `docs/FUENTES-Y-DATOS.md`.

## Estructura

```text
MueveteCB/
├─ api/chat.js                  Función serverless segura
├─ src/App.jsx                  Orquestación de UI
├─ src/components/              Componentes React
├─ src/core/                    Parser, motor, fallback y agente
├─ src/data/                    Catálogo, fuentes y extracto GTFS
├─ src/hooks/                   Estado de reportes y avisos
├─ src/services/chatApi.js      Cliente de /api/chat
├─ scripts/                     ETL reproducible del GTFS
├─ docs/                        Análisis, contratos, datos y pitch
├─ vercel.json                  Vite + funciones /api
└─ package.json
```

## Demo recomendada

1. Pulsar **Repetir caso**.
2. Eco responde el viaje Mochuelo Alto → Portal Tunal.
3. Señalar la ruta y el cambio de capas del mapa.
4. Reportar un bloqueo en Alpes–Quiba.
5. Eco cambia a la alternativa por Las Torres y explica la compensación entre tiempo y tramo afectado.
6. Mostrar que un reporte en Portal Tunal genera advertencia, no una salida inventada.

## Alcance actual

- La API de IA está implementada y probada.
- Los reportes siguen locales al navegador; falta una base compartida o moderación para producción.
- El modal de WhatsApp prepara el mensaje, pero el webhook Twilio aún requiere credenciales y número del Sandbox.
- Los trazados completos del GTFS y la capa comunitaria de David todavía deben sustituir el fixture.
