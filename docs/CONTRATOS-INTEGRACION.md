# Contratos mínimos de integración

Acordar estas cargas útiles en los primeros 20–30 minutos. La interfaz debe consumir la misma ruta estructurada que se muestra en el chat; no reconstruir tiempos ni trazados en dos lugares.

## 1. Petición al agente

`POST /api/chat`

```json
{
  "message": "Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7",
  "channel": "web",
  "locale": "es-CO",
  "now": "2026-09-24T05:30:00-05:00",
  "location": null,
  "activeReports": []
}
```

Campos opcionales para la versión mínima:

- `channel`: `web | whatsapp`;
- `locale`: mantener `es-CO`;
- `now`: hora del servidor para no depender del reloj del celular;
- `location`: solo si la persona lo autoriza;
- `activeReports`: reportes ya verificados o dentro de una ventana de expiración.

## 2. Respuesta del agente

```json
{
  "requestId": "req_01J...",
  "answerText": "Toma el colectivo de Quiba, transborda en Mirador del Paraíso y llega por TransMiCable. Salida 5:35 a. m.; llegada 6:26 a. m.",
  "intent": "route_planning",
  "needsClarification": false,
  "route": {
    "id": "route_demo_001",
    "origin": "Mochuelo Alto",
    "destination": "Portal Tunal",
    "departureAt": "2026-09-24T05:35:00-05:00",
    "arrivalAt": "2026-09-24T06:26:00-05:00",
    "durationMinutes": 51,
    "bufferMinutes": 34,
    "confidence": 0.86,
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [-74.148341, 4.4883574],
        [-74.1602603, 4.5397146],
        [-74.1396997, 4.569174]
      ]
    },
    "steps": [
      {
        "order": 1,
        "mode": "informal",
        "from": "Mochuelo Alto",
        "to": "Mirador del Paraíso",
        "durationMinutes": 25,
        "instruction": "Toma el colectivo de Quiba",
        "source": "community_dataset",
        "verifiedAt": "2026-09-24T04:50:00-05:00"
      }
    ]
  },
  "alternatives": [],
  "warnings": [
    "Horarios de rutas informales estimados; confirma con el conductor."
  ],
  "disclaimer": "Demostración; no usar para decisiones operativas."
}
```

### Reglas

- `answerText`: máximo 450 caracteres y cuatro pasos.
- `confidence`: de 0 a 1; no se debe presentar como probabilidad de seguridad.
- `geometry.coordinates`: `[lon, lat]`, con el orden de GeoJSON.
- `steps[].source` y `verifiedAt`: obligatorios antes de usar datos reales.
- `warnings`: visibles, no ocultos en el mensaje del sistema.
- Alternativas: mismo esquema. La interfaz las ordena, pero el agente puede sugerir una.

## 3. Reporte ciudadano

`POST /api/reports`

```json
{
  "id": "rpt_local_001",
  "type": "block",
  "location": {
    "label": "Vía Alpes – Quiba",
    "lat": 4.5336318,
    "lon": -74.1562843
  },
  "comment": "Hay varias personas esperando el colectivo.",
  "createdAt": "2026-09-24T05:41:00-05:00",
  "author": {
    "displayName": "Vecino/a de Ciudad Bolívar",
    "anonymous": true
  },
  "status": "reported",
  "expiresAt": "2026-09-24T08:41:00-05:00"
}
```

Valores sugeridos:

- `type`: `block | delay | route_change | other`;
- `status`: `reported | corroborated | verified | rejected | expired`;
- `anonymous`: `true` de forma predeterminada;
- `expiresAt`: entre 2 y 4 horas para demoras, según acuerdo con David y Ángel.

No enviar teléfono, nombre ni documento por defecto. En producción, aplicar límite de uso, controles contra abuso y registro de moderación.

## 4. Impacto de reportes en la selección de ruta

El agente debe recibir el contexto verificado por separado:

```json
{
  "affectedModes": ["informal"],
  "affectedRouteIds": ["community_quiba_01"],
  "affectedSegments": [2],
  "severity": "high",
  "status": "corroborated",
  "freshnessMinutes": 8
}
```

Un único reporte en estado `reported` puede aparecer en el mapa y entre las advertencias, pero no debe bloquear todas las rutas sin corroboración.

## 5. Datos de David — GeoJSON mínimo

Propiedades recomendadas para cada capa:

```json
{
  "id": "stop_001",
  "name": "Mirador del Paraíso",
  "kind": "station | stop | board | poi",
  "modes": ["TransMiCable"],
  "routeIds": ["CABLE-01"],
  "schedule": {
    "first": "05:00",
    "last": "22:00",
    "frequencyMinutes": 12
  },
  "source": "Secretaría de Movilidad",
  "sourceUrl": "https://datos.gov.co/...",
  "verifiedAt": "2026-09-24T04:00:00-05:00"
}
```

Sistema de coordenadas: usar siempre GeoJSON WGS84 (`EPSG:4326`). Convertir desde el sistema Bogotá `EPSG:31100` antes de enviar la salida.

## 6. WhatsApp Sandbox

Twilio envía una notificación a un webhook:

```text
POST /webhooks/whatsapp
```

Mapear únicamente:

```json
{
  "messageSid": "SM...",
  "from": "+57...",
  "to": "+1...",
  "body": "REPORTE bloqueo en la vía a Quiba",
  "receivedAt": "2026-09-24T05:41:00-05:00"
}
```

Respuesta:

```json
{
  "message": "Recibí el bloqueo. Evita la vía Alpes–Quiba. Te sugiero salir por Las Torres; llega 13 minutos más tarde. Ver ruta: https://..."
}
```

Validar la firma de Twilio antes de procesar. Mantener la respuesta corta: un enlace a la ruta, un resumen y una advertencia.

## 7. Definición de terminado para los contratos del equipo

- [ ] David entrega GeoJSON o un conjunto de muestra determinista.
- [ ] Ángel acepta la petición y devuelve el esquema de ruta.
- [ ] Un ejemplo funciona de extremo a extremo con tildes y `ñ`.
- [ ] Coordenadas inválidas producen un error controlado, no un mapa roto.
- [ ] Una lista vacía de reportes y la ausencia de datos externos generan una alternativa útil.
- [ ] Cada campo sensible al tiempo tiene una marca temporal.
- [ ] WhatsApp y web usan el mismo orquestador.
