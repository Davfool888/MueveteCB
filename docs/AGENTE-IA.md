# Agente de IA — Eco

## Objetivo

Eco interpreta el mensaje de la persona y redacta una respuesta breve. **Gemini no decide ni inventa la ruta**: el motor determinista elige un objeto del catálogo y el modelo solo lo explica. Cuando no hay ruta, Gemini puede responder una pregunta general o pedir el dato faltante sin afirmar que encontró un trayecto.

```text
Mensaje → intención → reportes vigentes → motor de rutas → contexto acotado → Gemini → respuesta
                                                    ↘ respuesta segura sin IA
```

Esta separación permite demostrar IA sin convertir al modelo en una fuente geográfica no verificada. Los datos de apoyo y sus límites se detallan en `docs/FUENTES-Y-DATOS.md`.

## Configurar Gemini

1. Crear una API key en Google AI Studio.
2. Copiar `.env.example` a `.env.local`.
3. Completar:

```dotenv
GEMINI_API_KEY=tu_clave_privada
GEMINI_MODEL=gemini-3.5-flash-lite
```

La clave solo se usa en `/api/chat`; nunca se incorpora al bundle de React. La solicitud usa `store: false` y el encabezado `x-goog-api-key`.

## Ejecutar

Frontend normal, con fallback determinista:

```powershell
npm run dev
```

Frontend + funciones de Vercel:

```powershell
npx vercel dev
```

En Vercel se deben configurar `GEMINI_API_KEY` y, opcionalmente, `GEMINI_MODEL` en **Project Settings → Environment Variables**.

## Garantías

- La API y el mapa usan coordenadas GeoJSON `[lon, lat]`; la conversión a Leaflet ocurre en presentación.
- La respuesta se limita a 450 caracteres.
- El modelo recibe como máximo cuatro pasos y advertencias explícitas.
- Gemini no puede cambiar el objeto `route` seleccionado por el motor.
- Las afirmaciones de precio, tiempo y horario se validan contra el contexto autorizado.
- El enlace veredal usa **Mirador del Paraíso**; “Villa del Rosario” no se trata como estación.
- Los datos se etiquetan como demostración y no se presenta una estimación como hecho.
- Sin clave, sin red, por timeout o con salida inválida, el endpoint responde con el mismo esquema generado de forma determinista.
- Un reporte vencido no altera la ruta.
- Un bloqueo en el Portal Tunal produce advertencia, no una alternativa inventada.
- No se registran teléfonos ni el texto completo en el servidor.

## Contrato de respuesta

La respuesta de `/api/chat` incluye:

- `answerText`: texto breve generado por Gemini o fallback.
- `route`: fuente de verdad estructurada, o `null` si falta información.
- `warnings` y `usedReportIds`: contexto de incertidumbre.
- `meta.source`: `gemini` o `deterministic-fallback`.
- `meta.dataStatus`: siempre `demo` hasta que se incorporen datos operativos verificados.

Contratos detallados en `docs/CONTRATOS-INTEGRACION.md`.

## Pruebas

```powershell
npm test
npm run build
```

Las pruebas cubren interpretación, selección, impacto por ubicación, expiración, salida estructurada de Gemini, validación de afirmaciones, fallback y endpoint HTTP.
