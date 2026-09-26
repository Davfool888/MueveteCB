export const DATA_CHECKED_AT = '2026-09-24T00:00:00-05:00';

export const MOBILITY_SOURCES = Object.freeze({
  transMiCableStations: {
    title: 'Abecé de TransMiCable — TransMilenio',
    url: 'https://www.transmilenio.gov.co/comunicaciones/comunidades/transmicable/noticias-transmicable/abece-de-transmicable',
    publisher: 'TransMilenio S.A.',
    checkedAt: DATA_CHECKED_AT,
  },
  fares: {
    title: 'Tarifas del Sistema TransMilenio 2026',
    url: 'https://www.transmilenio.gov.co/viaje-en-transmi/medios-de-pago/tarifas-del-sistema-transmilenio',
    publisher: 'TransMilenio S.A.',
    checkedAt: DATA_CHECKED_AT,
  },
  transferWindow: {
    title: 'Tarifa del SITP 2026 y ventana de transbordo',
    url: 'https://www.movilidadbogota.gov.co/tarifa-del-sitp-subira-100-mas-de-lo-proyectado-debido-al-incremento-del-salario-minimo',
    publisher: 'Secretaría Distrital de Movilidad',
    checkedAt: DATA_CHECKED_AT,
  },
  gtfs: {
    title: 'Especificación GTFS — SITP',
    url: 'https://www.datos.gov.co/dataset/Especificaci-n-GTFS-General-Transport-Feed-Specifi/nysb-4689',
    publisher: 'TransMilenio S.A. / Datos Abiertos Colombia',
    snapshotDate: '2026-08-18',
    snapshotUrl: 'https://storage.googleapis.com/gtfs-estaticos/GTFS_20260818.zip',
    localSnapshot: 'src/data/gtfs-ciudad-bolivar-snapshot.json',
    checkedAt: DATA_CHECKED_AT,
  },
  sitpServices: {
    title: 'Servicios (Rutas Troncales y Zonales) del SITP',
    url: 'https://gis.transmilenio.gov.co/arcgis/rest/services/ConsultaSubgerenciaPlanificacionSITP/Consulta_Planificacion_SITP/FeatureServer/15',
    publisher: 'TransMilenio S.A.',
    license: 'CC BY 4.0',
    localSnapshot: 'src/data/sitp-routes-snapshot.json',
    note: 'Trazados, longitud, tipo de bus, operador y ventanas de horario. No incluye despachos programados.',
    checkedAt: DATA_CHECKED_AT,
  },
  sitpStops: {
    title: 'Paraderos Zonales del SITP',
    url: 'https://gis.transmilenio.gov.co/arcgis/rest/services/Zonal/consulta_paraderos/FeatureServer/0',
    publisher: 'TransMilenio S.A.',
    license: 'CC BY 4.0',
    localSnapshot: 'src/data/sitp-stops-snapshot.json',
    note: 'Paraderoszonales de Ciudad Bolívar. La cenefa identifica el paradero, no la ruta que lo sirve.',
    checkedAt: DATA_CHECKED_AT,
  },
  openStreetMap: {
    title: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/copyright',
    publisher: 'OpenStreetMap contributors',
    checkedAt: DATA_CHECKED_AT,
  },
});

export const VERIFIED_FACTS = Object.freeze({
  sitpFareCop: 3550,
  transferWindowMinutes: 125,
  transMiCableStations: Object.freeze([
    'Tunal',
    'Juan Pablo II',
    'Manitas',
    'Mirador del Paraíso',
  ]),
  gtfsSnapshotDate: '2026-08-18',
  verifiedLocalRouteIds: Object.freeze(['6-18', '10-12', 'CABLE']),
  verifiedLocalStops: Object.freeze([
    'Ladrillera Los Mochuelos',
    'Pq. El Tunal',
    'Quiba',
    'IED Paraíso Mirador',
    'Juan Pablo II',
    'Manitas',
    'Mirador del Paraíso',
    'Portal Tunal',
    'Hospital Meissen',
  ]),
});

export const DATA_BOUNDARIES = Object.freeze([
  'Las tarifas y transbordos del SITP provienen de fuentes oficiales de 2026.',
  'La línea y los nombres de estación de TransMiCable están verificados.',
  'Los trazados, paraderos, tipos de bus y ventanas de horario de la alternativa oficial vienen del servicio de TransMilenio; el tiempo de viaje se estima por distancia porque el extracto no trae despachos programados.',
  'Los tramos veredales, frecuencias, costos informales y tiempos combinados siguen marcados como demostración hasta validarlos con la comunidad.',
  'Los reportes ciudadanos no sustituyen una verificación operativa ni garantizan que una vía esté segura.',
]);
