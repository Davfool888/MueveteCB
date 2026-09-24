# ECO CB — Muévete Ciudad Bolívar

Prototipo web de movilidad que compara rutas formales e informales, explica una recomendación y considera reportes ciudadanos recientes. Construido con **React 18 + Vite 6 + Leaflet** y preparado para desplegarse en Vercel.

> Las rutas veredales, frecuencias, tarifas informales y tiempos combinados siguen marcados como demostración. No usar la aplicación para decisiones operativas.

## Funcionalidades

- Agente **Eco** conectado a `POST /api/chat`.
- Claude redacta la respuesta únicamente a partir de una ruta seleccionada por el motor determinista.
- Fallback local si no hay clave, red o respuesta válida del proveedor.
- Formulario y chat en español de Colombia.
- Mapa con TransMiCable, SITP, veredales, reportes y ruta recomendada.
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
              Claude redacta      fallback local
                       ↘               ↙
                    respuesta + mapa
```

El modelo de lenguaje **no dibuja ni inventa rutas**. La función serverless conserva la clave y entrega al modelo únicamente contexto acotado.

## Requisitos

- Node.js 18 o superior.
- npm 9 o superior.
- Opcional: cuenta de Anthropic para respuestas reales con Claude.
- Opcional: CLI de Vercel para probar funciones serverless localmente.

## Ejecutar el frontend

```bash
npm install
npm run dev
```

Abrir la URL que indique Vite, normalmente `http://localhost:5173`.

Sin `ANTHROPIC_API_KEY`, la interfaz usa el mismo contrato y una respuesta determinista.

## Probar frontend + API

```bash
npx vercel dev
```

La reescritura de `vercel.json` excluye `/api/*`; por eso la función `api/chat.js` no se convierte en una respuesta HTML de la SPA.

## Configurar Claude

1. Crear una clave en Anthropic.
2. Copiar `.env.example` a `.env.local`.
3. Completar:

```dotenv
ANTHROPIC_API_KEY=tu_clave_privada
ANTHROPIC_MODEL=claude-sonnet-5
```

En Vercel, configurar las mismas variables en **Project Settings → Environment Variables**. Nunca usar `VITE_` para una clave privada.

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
- fallback sin clave o con proveedor caído;
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
