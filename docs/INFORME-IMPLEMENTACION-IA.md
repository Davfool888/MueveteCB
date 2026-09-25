# Informe de implementación — Agente Eco

## Resultado

- Eco usa una arquitectura híbrida: parser y motor determinista primero; Gemini redacta después con salida estructurada.
- La API serverless `api/chat.js` conserva la clave únicamente en el servidor y mantiene el mismo contrato con o sin proveedor.
- Gemini también puede responder saludos y preguntas generales sin inventar una ruta.
- Las afirmaciones de precio, tiempo, horario y accesibilidad se validan contra el contexto autorizado.
- El mapa consulta una geometría vial entre A y B, conserva la alternativa de menor distancia entre las respuestas de OSRM y no sustituye sus extremos por una geometría fija.
- La parte inferior del mapa muestra distancia vial, precio estimado y los transportes disponibles.
- Se procesó el GTFS oficial del SITP del 18-08-2026 y se versionó un extracto liviano de 113 paradas y 75 rutas.

## Evidencia

### Pruebas y compilación

```text
npm test
42 tests passed
0 failed

npm run build
Vite build completed successfully
105 modules transformed
```

Las pruebas incluyen:

- interpretación de origen, destino, hora y prioridad;
- selección de ruta económica y formal;
- conocimiento oficial de TransMiCable/SITP;
- bloqueo en Alpes–Quiba versus Portal Tunal;
- expiración de reportes;
- normalización GeoJSON y alternativa vial de menor distancia entre las opciones de OSRM;
- timeout y errores controlados del router;
- éxito, saludos genéricos, fallback y validación de Gemini;
- endpoint HTTP y cliente del navegador.

### Prueba manual en navegador

En `http://127.0.0.1:5173` se verificó:

1. carga de React + Leaflet sin errores de consola;
2. caso Mochuelo Alto → Portal Tunal;
3. solicitud real a OSRM y geometría vial visible sobre el mapa;
4. Marcadores A/B, distancia y fuente OSRM visibles;
5. selección de Van veredal y TransMiCable desde la parte inferior;
6. respuesta local estructurada en modo Vite;
7. reporte Alpes–Quiba cambia a la alternativa;
8. reporte en Portal Tunal genera advertencia sin cambiar a una ruta inventada.

## Decisiones

1. **No se usa Gemini en el navegador.** La clave de un proveedor no debe terminar en el bundle; la función serverless la recibe por `process.env`.
2. **Gemini no selecciona la ruta.** Recibe el objeto de ruta, knowledgeContext, advertencias y una respuesta determinista base.
3. **La ruta vial es independiente del modelo.** OSRM entrega la geometría; Gemini no dibuja ni modifica A/B.
4. **El fallback es una función de primera clase.** Sin `GEMINI_API_KEY`, timeout o red, Eco responde con la misma estructura.
5. **Los datos oficiales y los estimados están separados.** Las tarifas, transbordo, estaciones y presencia de rutas GTFS están verificados; los camperos y tiempos combinados siguen marcados como demostración.
6. **El servidor local no simula una API con un 404.** Vite usa fallback por defecto; `VITE_CHAT_API=true` habilita la prueba local de Vercel.

## Riesgos para la demo

- **Clave de Gemini:** hace falta configurar `GEMINI_API_KEY` en Vercel para probar la respuesta real. No se registra ni se expone esa clave.
- **OSRM público:** el servidor de demostración no ofrece SLA ni garantía de mínimo global. Para producción se requiere un router alojado con cuota, SLA y actualización de datos; la interfaz etiqueta el resultado como “más corta disponible”.
- **Geocodificación:** Nominatim público se usa para el prototipo. Antes de producción se debe migrar el autocomplete a un proveedor o instancia con política de uso compatible.
- **Geometría del GTFS:** el extracto prueba paradas y servicios; la geometría completa de rutas aún necesita los trazados del GTFS y el GeoJSON comunitario.
- **Reportes compartidos:** el formulario guarda en `localStorage`; otro dispositivo no ve el reporte hasta que exista una base/API compartida.
- **WhatsApp:** el modal prepara el mensaje; falta el webhook Twilio y el número Sandbox.
- **Rutas informales:** no se deben presentar como operación en tiempo real hasta que la comunidad valide el dataset.

## Pendientes / siguientes pasos

1. Configurar `GEMINI_API_KEY` en Vercel y repetir el caso con mensajes reales.
2. Configurar un router con SLA para producción y revisar sus límites de uso.
3. Pedir a la comunidad `routes.txt`, `trips.txt`, `stop_times.txt` y shapes del GTFS, o su GeoJSON equivalente.
4. Acordar el estado de verificación de cada parada informal.
5. Implementar `/api/reports` con almacenamiento persistente y moderación.
6. Implementar `/api/whatsapp` con validación de firma y el mismo agente.
7. Grabar el video de respaldo y generar el QR después de fijar la URL pública.

## Cómo probarlo

```powershell
cd MueveteCB
npm install
npm run check
npm run dev
```

Para probar la función serverless y Gemini en local:

```powershell
$env:VITE_CHAT_API='true'
$env:GEMINI_API_KEY='tu_clave_de_prueba'
npx vercel dev
```

Para regenerar el extracto GTFS, consultar `docs/FUENTES-Y-DATOS.md`.
