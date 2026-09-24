# Agente de IA — Eco

## Objetivo

Eco interpreta el mensaje de la persona y redacta una respuesta breve a partir de una ruta ya seleccionada. **Claude no decide ni inventa la ruta**: el motor determinista elige un objeto del catálogo y el modelo solo lo explica.

```text
Mensaje → intención → reportes vigentes → motor de rutas → contexto acotado → Claude → respuesta
                                                   ↘ respuesta segura sin IA
```

Esta separación permite demostrar IA sin convertir al modelo en una fuente geográfica no verificada. Los datos de apoyo y sus límites se detallan en `docs/FUENTES-Y-DATOS.md`.

## Configurar Claude

1. Crear una clave en el panel de Anthropic.
2. Copiar `.env.example` a `.env.local`.
3. Completar:

```dotenv
ANTHROPIC_API_KEY=tu_clave_privada
ANTHROPIC_MODEL=claude-sonnet-5
```

La clave solo se usa en `/api/chat`; nunca se incorpora al bundle de React.

## Ejecutar

Frontend normal, con fallback determinista:

```powershell
npm run dev
```

Frontend + funciones de Vercel:

```powershell
npx vercel dev
```

En Vercel se deben configurar `ANTHROPIC_API_KEY` y, opcionalmente, `ANTHROPIC_MODEL` en **Project Settings → Environment Variables**.

## Garantías

- La API y el mapa usan coordenadas GeoJSON `[lon, lat]`; la conversión a Leaflet ocurre en presentación.
- La respuesta se limita a 450 caracteres.
- El modelo recibe como máximo cuatro pasos y advertencias explícitas.
- El enlace veredal usa **Mirador del Paraíso**; “Villa del Rosario” no se trata como estación.
- Los datos se etiquetan como demostración y no se presenta una estimación como hecho.
- Sin clave, sin red, por timeout o con salida inválida, el endpoint responde con el mismo esquema generado de forma determinista.
- Un reporte vencido no altera la ruta.
- Un bloqueo en el Portal Tunal produce advertencia, no una alternativa inventada.
- No se registran teléfonos ni el texto completo en el servidor.

## Contrato de respuesta

La respuesta de `/api/chat` incluye:

- `answerText`: texto breve generado por Claude o fallback.
- `route`: fuente de verdad estructurada, o `null` si falta información.
- `warnings` y `usedReportIds`: contexto de incertidumbre.
- `meta.source`: `claude` o `deterministic-fallback`.
- `meta.dataStatus`: siempre `demo` hasta que David entregue datos verificados.

Contratos detallados en `docs/CONTRATOS-INTEGRACION.md`.

## Pruebas

```powershell
npm test
npm run build
```

Las pruebas cubren interpretación, selección, impacto por ubicación, expiración, salida de Claude, fallback y endpoint HTTP.
