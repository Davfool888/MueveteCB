# Informe de implementación — Agente Eco

## Resultado

- Se integró un agente de IA con arquitectura híbrida: parser/motor determinista primero y Claude como redactor.
- La API serverless `api/chat.js` usa la clave solo en el servidor y devuelve el mismo contrato con o sin proveedor.
- Se procesó el GTFS oficial del SITP del 18-08-2026 y se versionó un extracto liviano de 113 paradas y 75 rutas.
- Se conectaron a la interfaz las paradas relevantes del GTFS, las tarifas oficiales de 2026 y las cuatro estaciones reales de TransMiCable.
- Los bloques por ubicación, la expiración y la respuesta diferenciada para Portal Tunal funcionan sin inventar una alternativa.
- La interfaz usa el nombre **Eco** y el fallback local evita llamadas 404 durante `npm run dev`.

## Evidencia

### Pruebas y compilación

```text
npm ci
added 134 packages
found 0 vulnerabilities

npm run check
20 tests passed
0 failed
Vite build completed successfully
64 modules transformed
```

Las pruebas incluyen:

- interpretación de origen, destino, hora y prioridad;
- selección de ruta económica y formal;
- conocimiento oficial de TransMiCable/SITP;
- bloqueo en Alpes–Quiba versus Portal Tunal;
- expiración de reportes;
- fallback sin clave, error de red y JSON inválido;
- rechazo de afirmaciones de Claude no soportadas;
- endpoint HTTP y cliente del navegador.

### Prueba manual en navegador

En `http://127.0.0.1:5173` se verificó:

1. carga de React + Leaflet sin errores de consola;
2. caso Mochuelo Alto → Portal Tunal;
3. respuesta local estructurada en modo Vite;
4. reporte Alpes–Quiba cambia a la alternativa;
5. reporte en Portal Tunal genera advertencia sin cambiar a una ruta inventada;
6. mapa, capas y datos de resumen.

## Decisiones

1. **No se usa Gemini en el navegador.** La clave de un proveedor no debe terminar en el bundle. Se eliminó `src/services/aiAgent.js`.
2. **Claude no selecciona la ruta.** La IA solo recibe el objeto de ruta y sus advertencias. Esto sigue la guía técnica adjunta y hace auditable la recomendación.
3. **El fallback es una función de primera clase.** Sin `ANTHROPIC_API_KEY`, timeout o red, Eco responde con la misma estructura.
4. **Los datos oficiales y los estimados están separados.** Las tarifas, transbordo, estaciones y presencia de rutas GTFS están verificados; los camperos y tiempos combinados siguen marcados como demostración.
5. **El servidor local no simula una API con un 404.** Vite usa fallback por defecto; `VITE_CHAT_API=true` habilita la prueba local de Vercel.

## Riesgos para la demo

- **Clave de Anthropic no configurada:** el build y la interfaz funcionan, pero la respuesta real del modelo todavía no fue probada contra el proveedor. Configurar `ANTHROPIC_API_KEY` en Vercel antes de ensayo.
- **Geometría del GTFS:** el extracto prueba paradas y servicios; la geometría completa de rutas aún necesita los trazados del GTFS y el GeoJSON de David.
- **Reportes compartidos:** el formulario guarda en `localStorage`; otro dispositivo no ve el reporte hasta que exista una base/API compartida.
- **WhatsApp:** el modal prepara el mensaje; falta el webhook Twilio y el número Sandbox.
- **Rutas informales:** no se deben presentar como operación en tiempo real hasta que la comunidad valide el dataset.

## Pendientes / siguientes pasos

1. Configurar la clave de Anthropic en Vercel y repetir el caso con un mensaje real.
2. Pedir a David `routes.txt`, `trips.txt`, `stop_times.txt` y shapes del GTFS, o su GeoJSON equivalente.
3. Acordar con David el estado de verificación de cada parada informal.
4. Implementar `/api/reports` con almacenamiento persistente y moderación antes de prometer sincronización entre celulares.
5. Implementar `/api/whatsapp` con validación de firma y el mismo `createChatResponse`.
6. Grabar el video de respaldo y generar el QR después de fijar la URL pública.

## Cómo probarlo

```powershell
cd "C:\Users\oscar\OneDrive\Datos adjuntos\Documentos\MueveteCBGit\MueveteCB"
npm ci
npm run check
npm run dev
```

Para probar la función serverless en local:

```powershell
$env:VITE_CHAT_API='true'
$env:ANTHROPIC_API_KEY='tu_clave_de_prueba'
npx vercel dev
```

Para regenerar el extracto GTFS, consultar `docs/FUENTES-Y-DATOS.md`.
