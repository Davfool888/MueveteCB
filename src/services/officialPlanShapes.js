/**
 * Adaptadores entre la alternativa oficial del SITP y las formas que ya consume
 * el mapa.
 *
 * Este módulo es intencionalmente independiente de `sitpIndex.js`: no importa el
 * extracto de 630 KB, así que puede entrarse de forma estática desde la página
 * sin arrastrar los datos al bundle inicial.
 */

const SEGMENT_TYPE_BY_MODE = {
  walk: 'walk',
  sitp: 'sitp',
  trunk: 'sitp',
  cable: 'cable',
};

/** Modo principal de un plan oficial, para el `TransportPlan` que consume la interfaz. */
function primaryMode(plan) {
  if (plan.kind === 'official-trunk') return 'trunk';
  if (plan.cableIntegration) return 'cable';
  return 'sitp';
}

/**
 * Traduce el plan oficial a la forma de `ROUTES[id]` que usan `LeafletMap`,
 * `Message` y `RouteSummary`, para que la alternativa se dibuje y se lea con el
 * mismo código que las rutas de demostración.
 *
 * Lo que no se rellena a propósito: `departureClock`, `arrivalClock` y
 * `arrivalMinutes`. El extracto no trae `stop_times`, y poner un reloj estimado
 * sería exactamente el tipo de dato que el proyecto se niega a publicar como
 * hecho.
 */
export function toOfficialRouteShape(plan) {
  if (!plan) return null;

  const segments = plan.steps.map((step) => ({
    type: SEGMENT_TYPE_BY_MODE[step.mode] ?? 'walk',
    title: step.instruction,
    detail: step.detail,
    time: step.durationMinutes > 0 ? `${step.durationMinutes} min` : 'a pie',
    cost: step.estimatedCostCop ? `$${step.estimatedCostCop.toLocaleString('es-CO')}` : '$0',
    source: step.source,
  }));

  return {
    id: plan.id,
    isOfficialSitp: true,
    isOfficialTrunk: plan.kind === 'official-trunk',
    mode: primaryMode(plan),
    modeLabel:
      plan.kind === 'official-trunk'
        ? `Troncal ${plan.routeCode} · Transmilenio`
        : plan.cableIntegration
          ? `SITP ${plan.routeCode} + TransMiCable`
          : `SITP ${plan.routeCode}`,
    title: plan.title,
    origin: plan.boarding?.name ?? 'Origen',
    destination: plan.cableIntegration?.stationName ?? 'Destino',
    duration: plan.estimatedMinutes > 0 ? `${plan.estimatedMinutes} min est.` : 'Tiempo por validar',
    costFormatted: plan.costFormatted,
    costBreakdown: `${plan.serviceType} ${plan.routeCode} · ${plan.operator ?? 'operador por confirmar'}`,
    paymentMethod: 'Efectivo + TuLlave',
    confidence: 92,
    confidenceLabel: 'Trazado y paraderos oficiales',
    qualityBadge: 'Fuente oficial',
    accessibilityLabel: 'Verificar en el paradero',
    reason: plan.matchReason,
    mapPath: plan.path,
    segments,
    dataStatus: plan.dataStatus,
    dataVersion: plan.dataVersion,
    warnings: plan.warnings,
    officialRouteCode: plan.routeCode,
    cableStationId: plan.cableIntegration?.stationId ?? null,
  };
}

/** Traduce el plan oficial a la forma de `TransportPlan` que consume la interfaz. */
export function toOfficialTransportPlanShape(plan) {
  if (!plan) return null;

  const legs = plan.steps.map((step) => ({
    order: step.order,
    role: step.order === 1 && step.mode === 'walk' ? 'access' : 'first',
    mode: step.mode,
    label: step.instruction,
    status: 'ready',
    source: step.source,
    simulated: false,
  }));

  const mode = primaryMode(plan);

  return {
    schemaVersion: 'transport-plan.official-sitp.v1',
    status: 'route-selected',
    mode,
    modeLabel:
      plan.kind === 'official-trunk'
        ? `Troncal ${plan.routeCode} · Transmilenio`
        : `SITP ${plan.routeCode} + TransMiCable`,
    isOfficialSitp: true,
    isOfficialTrunk: plan.kind === 'official-trunk',
    origin: plan.boarding?.coordinates ?? null,
    destination: plan.cableIntegration?.coordinates ?? null,
    originStop: plan.boarding
      ? { id: plan.boarding.stopId, name: plan.boarding.name, coordinates: plan.boarding.coordinates }
      : null,
    nearestIntegration: plan.cableIntegration
      ? {
          id: plan.cableIntegration.stationId,
          name: plan.cableIntegration.stationName,
          coordinates: plan.cableIntegration.coordinates,
          source: 'transmilenio_2026',
        }
      : null,
    integration: plan.cableIntegration
      ? {
          id: plan.cableIntegration.stationId,
          name: plan.cableIntegration.stationName,
          coordinates: plan.cableIntegration.coordinates,
          kind: 'cable_station',
          source: 'transmilenio_2026',
        }
      : null,
    availableModes: [mode, ...(plan.cableIntegration ? ['cable'] : [])],
    modesUsed: plan.cableIntegration ? [mode, 'cable'] : [mode],
    showCable: Boolean(plan.cableIntegration),
    access: {
      mode: 'walk',
      modeLabel: 'Caminata',
      distanceKm: plan.boarding?.walkKm ?? 0,
      status: 'ready',
      source: 'sitp_stops_2026',
      dataStatus: 'verified',
    },
    legs,
    geometry: {
      segments: legs.map((leg) => ({
        order: leg.order,
        mode: leg.mode,
        path: plan.path,
        status: 'ready',
        source: leg.source,
        simulated: false,
      })),
      complete: true,
    },
    routePath: plan.sitpPath.flat(),
    continuationPath: plan.cablePath,
    fitPath: plan.path,
    price: {
      currency: 'COP',
      knownCop: plan.totalCostCop,
      estimateCop: plan.totalCostCop,
      amountCop: plan.totalCostCop,
      formatted: plan.costFormatted,
      status: 'known',
    },
    source: 'sitp_services_2026',
    sourceNote: 'Trazado oficial de TRANSMILENIO S.A.; tiempo estimado por distancia.',
    simulated: false,
    reason: plan.matchReason,
    dataStatus: plan.dataStatus,
    dataVersion: plan.dataVersion,
    warnings: plan.warnings,
  };
}
