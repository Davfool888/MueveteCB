# Fuentes de datos y límites de confianza

## Fuente arquitectónica

La guía técnica `Guia_integracion_IA_Muevete_Ciudad_Bolivar.docx` establece la decisión central:

```text
datos → red/motor determinista → agente de IA → respuesta
```

Eco no memoriza la red de transporte. El motor selecciona una ruta estructurada; Gemini solo la interpreta y redacta. Si el modelo no está disponible, la misma ruta se explica con una respuesta determinista.

## GTFS oficial procesado

Se descargó y procesó el feed oficial:

- **Publicador:** TransMilenio S.A. / Datos Abiertos Colombia.
- **Dataset:** [Especificación GTFS — SITP](https://www.datos.gov.co/dataset/Especificaci-n-GTFS-General-Transport-Feed-Specifi/nysb-4689).
- **Corte:** `2026-08-18`.
- **Archivo original:** `GTFS_20260818.zip` (117 MB).
- **Extracto liviano:** `src/data/gtfs-ciudad-bolivar-snapshot.json` (113 paradas y 75 rutas dentro del área de interés).
- **Generador reproducible:** `scripts/build-gtfs-snapshot.mjs`.

El extracto permite comprobar, entre otros:

| Servicio | Evidencia en el extracto | Uso en ECO CB |
|---|---|---|
| `CABLE` | Tunal ↔ Mirador del Paraíso; incluye Juan Pablo II y Manitas | Topología y nombres de estaciones |
| `10-12` | Paradas en Quiba y Paraíso | Conexión formal de la ruta Quiba → Tunal |
| `6-18` | Sector Mochuelo Bajo, Meissen, Tunal y otros | Alternativa económica desde Mochuelo Bajo |
| Portal Tunal | Paradas troncales y zonales | Punto de integración y destino |

### Regenerar el extracto

1. Descargar `GTFS_20260818.zip` desde la fuente oficial.
2. Extraerlo en una carpeta temporal.
3. Ejecutar:

```powershell
npm run extract:gtfs -- "C:\ruta\GTFS_20260818" "src\data\gtfs-ciudad-bolivar-snapshot.json"
```

No se versiona el GTFS completo porque pesa 117 MB. El proyecto versiona únicamente el extracto necesario para la demostración.

## Datos formales verificados

### TransMiCable

Fuente: [Abecé de TransMiCable](https://www.transmilenio.gov.co/comunicaciones/comunidades/transmicable/noticias-transmicable/abece-de-transmicable).

Las cuatro estaciones son:

1. Tunal.
2. Juan Pablo II.
3. Manitas.
4. Mirador del Paraíso.

Las coordenadas usadas en el mapa provienen del corte GTFS `2026-08-18`. No se presenta “Villa del Rosario” como estación.

### Tarifas

Fuente oficial: [Tarifas del Sistema TransMilenio](https://www.transmilenio.gov.co/viaje-en-transmi/medios-de-pago/tarifas-del-sistema-transmilenio), actualizada el 22 de abril de 2026.

- TransMi, TransMiZonal y TransMiCable: **$3.550 COP**.
- Ventana de transbordo integrado: **125 minutos**, según la [Secretaría Distrital de Movilidad](https://www.movilidadbogota.gov.co/tarifa-del-sitp-subira-100-mas-de-lo-proyectado-debido-al-incremento-del-salario-minimo).
- Los Subsidios y beneficios dependen del perfil de cada usuario.

## Datos que siguen marcados como demostración

No existe en las fuentes oficiales una red completa y actualizada de camperos, colectivos y rutas veredales. Por eso siguen estimados:

- trazados Mochuelo Alto–Quiba–Paraíso;
- frecuencias de camperos;
- tarifa informal;
- tiempo del enlace veredal;
- desvío por Las Torres;
- duración combinada de extremo a extremo;
- accesibilidad de un camino rural específico.

Cada tramo informal incluye `dataStatus: demo` y una advertencia. El agente debe decir “estimado” o “confirma con la comunidad”, nunca “garantizado”.

## Regla para la IA

1. La IA recibe una ruta ya seleccionada.
2. No puede cambiar IDs, coordenadas, tiempos, precios o estaciones.
3. Las respuestas se limitan a 450 caracteres.
4. Se rechazan afirmaciones como “100 % accesible”, “garantizada” o referencias a Villa del Rosario como estación.
5. Sin clave, red o respuesta válida, se usa el fallback determinista.
6. La clave de Gemini vive únicamente en la función serverless `/api/chat`.
