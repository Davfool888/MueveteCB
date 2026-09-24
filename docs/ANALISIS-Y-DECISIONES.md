# Análisis de `mi guia.docx` y decisiones del MVP

## 1. Diagnóstico ejecutivo

La guía está bien orientada: define responsable, equipos, entregables, caso de uso, demostración, respaldo y cronograma. Su mayor fortaleza es exigir que el usuario llegue a una respuesta real dentro de las cinco horas, no solo a una interfaz bonita.

El principal riesgo no es el diseño: es intentar conectar simultáneamente WhatsApp real, datos reales de dos operadores, rutas informales, IA, mapa y moderación comunitaria. En cinco horas, esa integración puede terminar en una demo que falla justo en el escenario. La decisión correcta es construir primero un **orquestador de demostración confiable** y añadirle adaptadores reales alrededor.

## 2. Lo que ya está bien resuelto

1. **Problema concreto:** una persona en vereda necesita combinar rutas y decidir con información fragmentada.
2. **Caso de uso verificable:** Mochuelo Alto → Portal Tunal antes de las 7.
3. **Alcance por rol:** evita que varias personas construyan lo mismo.
4. **Accesibilidad como requisito:** lenguaje sencillo, tres pasos, página liviana y letra grande.
5. **Demostración corta:** 60–90 segundos obligan a enseñar una historia, no una lista de funciones.
6. **Plan de respaldo:** video antes de la hora 4 y datos móviles.
7. **Cierre de la experiencia:** el reporte ciudadano no queda aislado; debe cambiar la recomendación.

## 3. Riesgos priorizados

### P0 — puede romper la demostración

- **Fallo de red o de los mapas:** el lienzo queda gris. Mitigación: vector de respaldo local y video.
- **Contrato tardío entre David y Ángel:** nombres de campos incompatibles. Mitigación: acordar JSON en los primeros 20 minutos.
- **Respuesta del agente demasiado larga:** no cabe en un chat móvil. Mitigación: máximo cuatro pasos, una cifra principal y enlace al mapa.
- **Ruta dibujada que no coincide con el texto:** riesgo de credibilidad ante el jurado. Mitigación: una sola fuente de verdad para `route.steps` y `route.geometry`.

### P1 — debilita la propuesta

- **Certeza excesiva:** horarios informales o reportes recientes pueden estar desactualizados. Mostrar hora de verificación y confianza.
- **Reporte único tratado como bloqueo confirmado:** puede enrutar mal. Agregar estados `reported`, `corroborated` y `verified`, además de una línea base.
- **WhatsApp sin alternativa:** conservar una URL, un resumen de texto y un QR de la misma ruta.
- **Privacidad:** no pedir nombre, teléfono ni ubicación precisa por defecto.
- **Alcance excesivo:** muchas rutas y operadores restan tiempo a la demostración.

### P2 — mejoras posteriores al MVP

- Notas de voz por WhatsApp.
- Búsqueda por dirección o voz.
- Perfil de movilidad y alertas.
- Panel de operación y moderación.

## 4. Las cinco decisiones que hacen que esto destaque

### 4.1 Una pregunta, no un motor de rutas oculto

La pantalla inicial pide origen, destino y hora. La persona no aprende comandos ni códigos. Este detalle comunica accesibilidad mejor que una larga explicación técnica.

### 4.2 La ruta muestra confianza y hora de verificación

Cada recomendación debe mostrar:

- duración estimada;
- hora de salida y llegada;
- modo y transbordo;
- confianza;
- fuente y hora del último dato.

Esto evita que la IA presente como hecho algo que solo es estimado.

### 4.3 El reporte realmente modifica el resultado

El momento que impresiona no es “tenemos formulario”. Es:

```text
bloqueo reportado → marcador visible → ruta recalculada → explicación del cambio
```

La demo contiene ese ciclo y no depende de un servidor real.

### 4.4 Una alternativa que parece producto, no error

El mapa incluye una vista esquemática local. Si falla la red, el recorrido y los puntos siguen visibles. El video de respaldo cubre el caso extremo.

### 4.5 Arquitectura de adaptadores, no un monolito improvisado

- `ChannelAdapter`: WhatsApp o web.
- `Orchestrator`: recibe pregunta y contexto; devuelve texto más ruta estructurada.
- `DataProvider`: datos de David.
- `ReportStore`: reportes ciudadanos.
- `PresentationLayer`: web, mapa y respuesta corta.

Así, una falla de Twilio no rompe el mapa y una falla del mapa no elimina la respuesta.

## 5. Alcance recomendado para las cinco horas

| Momento | Prioridad | Entregable verificable |
|---|---|---|
| 0:00–0:20 | Caso único y contratos | Un JSON de entrada y salida aprobado |
| 0:20–1:20 | Flujo web completo | Pregunta → respuesta → mapa |
| 1:20–2:20 | Datos y alternativa | 3–5 rutas, dos capas y marcador de reportes |
| 2:20–3:00 | Cierre del ciclo | El reporte cambia la recomendación |
| 3:00–3:40 | Conectores | WhatsApp o URL pública, sin bloquear la alternativa |
| 3:40–4:10 | Demostración | Video, capturas, QR y caso ensayado |
| 4:10–5:00 | Repaso | Prueba del jurado, respaldo y presentación |

## 6. Criterios de aceptación

- [ ] Una pregunta del caso de guía produce una respuesta en menos de 3 segundos de demostración.
- [ ] La respuesta contiene ruta, duración y próximo paso.
- [ ] Mapa y texto usan la misma geometría.
- [ ] Transporte formal e informal se distinguen por color y estilo de línea.
- [ ] Un bloqueo nuevo produce otra recomendación y una explicación.
- [ ] El flujo funciona con teclado y tiene objetivos táctiles de al menos 44 px.
- [ ] La página sigue siendo legible a 360 px de ancho.
- [ ] Si falla el mapa base, la vista esquemática conserva origen, destino y ruta.
- [ ] No se presentan datos demostrativos como información operativa.
- [ ] QR, video y datos del equipo están guardados en dos lugares.

## 7. Módulos ya implementados

- `index.html`: narrativa, formulario, chat, mapa, resumen y reporte.
- `app.js`: catálogo de rutas, respuesta, capas, recálculo, `localStorage` y voz opcional.
- `styles.css`: identidad, adaptación a móvil, accesibilidad, alto contraste y movimiento reducido.
- `server.mjs`: servidor local sin dependencias.
- `vendor/leaflet/`: mapa sin dependencia de una CDN.

## 8. Criterio de honestidad

La interfaz debe etiquetar siempre el prototipo como demostración. En una versión operativa:

1. cada tramo tiene `source` y `updatedAt`;
2. la respuesta distingue un dato observado de una estimación;
3. los reportes tienen estado de verificación;
4. una persona puede reportar de forma anónima;
5. existe un canal de moderación y corrección.

Estas decisiones hacen más confiable el producto y, al mismo tiempo, más fuerte la respuesta ante el jurado: no es solo una IA que inventa rutas, sino una interfaz que hace visible la incertidumbre y convierte la experiencia local en una señal útil.
