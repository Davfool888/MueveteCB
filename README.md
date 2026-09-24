# Muevete CB — MVP demostrable

Prototipo web construido a partir de `mi guia.docx`. Convierte la propuesta en un caso de uso que puede ejecutarse ante el jurado sin cuentas, instalaciones ni una clave de API.

> **Importante:** rutas, horarios y reportes incluidos son demostrativos. OpenStreetMap aporta la base geográfica; no usar esta demo para decisiones reales de movilidad.

## Lo que ya funciona

- Pregunta en lenguaje natural mediante formulario o chat.
- Respuesta con pasos, tiempos, transbordo, llegada y nivel de confianza.
- Mapa Leaflet con capas diferenciadas para TransMiCable, SITP, veredales, reportes y ruta.
- Vista esquemática de respaldo si no cargan los mapas de OpenStreetMap.
- Formulario ciudadano para bloqueo, demora o cambio de ruta.
- El reporte aparece en el mapa y recalcula la recomendación.
- Persistencia local de reportes en el navegador.
- Enlace compartible, reinicio de demo y entrada por voz cuando el navegador la soporta.
- Diseño móvil, controles táctiles grandes, foco visible y reducción de movimiento.

## Ejecutar

Requisitos: Node.js 18 o superior.

```powershell
cd "C:\Users\oscar\OneDrive\Datos adjuntos\Documentos\MueveteCB"
npm run dev
```

Abrir: **http://localhost:4173**

Para verificar la sintaxis:

```powershell
npm run check
```

No hay dependencias que instalar: el servidor usa módulos nativos de Node y Leaflet está incluido localmente en `vendor/leaflet`.

## Demo recomendada — 80 segundos

1. Pulsar **Repetir caso**.
2. Ángel responde al caso “Mochuelo Alto → Portal Tunal antes de las 7”.
3. Señalar la ruta resaltada y las capas diferenciadas.
4. Pulsar **Reportar novedad** → **Bloqueo** → **Vía Alpes – Quiba** → **Enviar y recalcular**.
5. El aviso aparece en rojo, la ruta pasa a la alternativa por Las Torres y Ángel explica el cambio.
6. Compartir el enlace generado en la barra de direcciones.

## Estructura

```text
MueveteCB/
├─ index.html                    Interfaz y contenido accesible
├─ styles.css                    Sistema visual adaptable a móvil
├─ app.js                        Chat, rutas, mapa y reportes
├─ server.mjs                    Servidor local sin dependencias
├─ manifest.webmanifest          Metadatos de instalación
├─ assets/                       Identidad visual
├─ vendor/leaflet/               Leaflet 1.9.4 local
├─ docs/
│  ├─ ANALISIS-Y-DECISIONES.md   Diagnóstico de la guía
│  ├─ GUION-DEMO-Y-PITCH.md      Guion cronometrado
│  └─ CONTRATOS-INTEGRACION.md   Contratos con David y Ángel
└─ mi guia.docx                  Documento original, sin modificar
```

## Decisión de producto

La prioridad es demostrar el **ciclo completo** antes que construir una infraestructura perfecta:

```text
Pregunta → compara trazados → explica la ruta → recibe reporte → recalcula
```

WhatsApp debe integrarse después del flujo navegable. Para la conexión del pitch, usar esta web detrás de un QR o ngrok; si falla, mostrar el video de respaldo.

## Próximo paso de integración

1. Reemplazar el catálogo `ROUTES` de `app.js` por el endpoint de Ángel.
2. Cargar el GeoJSON de David y usar `confidence`, `updatedAt` y `source` por tramo.
3. Enviar reportes a un endpoint con `id`, `type`, `location`, `createdAt` y estado de verificación.
4. Añadir moderación y una línea base de operación para que un reporte aislado no se presente como certeza.
5. Integrar Twilio Sandbox después de cerrar el contrato de entrada/salida y probar reintentos.

Los campos propuestos están en `docs/CONTRATOS-INTEGRACION.md`.
