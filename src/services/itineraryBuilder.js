/**
 * Un único modelo de itinerario para toda la interfaz.
 *
 * Antes, `RouteSummary` pintaba los `segments` de `ROUTES[id]`, que son datos de
 * demostración: describen una ruta que no es la que el mapa dibuja. Aquí se
 * invierte la prioridad: el resumen se construye a partir del plan que realmente
 * se está pintando, ya sea una alternativa oficial (troncal o SITP zonal) o el
 * plan determinista de `transportRouting`, y declara en cada tramo dónde se
 * aborda y dónde se baja.
 */

const MODE_META = Object.freeze({
  walk: { icon: '🚶', label: 'Caminata' },
  road: { icon: '🛣️', label: 'Ruta vial' },
  trunk: { icon: '🚍', label: 'Troncal' },
  sitp: { icon: '🚌', label: 'SITP' },
  veredal: { icon: '🚐', label: 'Van veredal' },
  cable: { icon: '🚡', label: 'TransMiCable' },
});

const SOURCE_META = Object.freeze({
  sitp_services_2026: { label: 'Servicio oficial · Transmilenio', verified: true },
  sitp_stops_2026: { label: 'Paradero oficial · Transmilenio', verified: true },
  trunk_stations_2026: { label: 'Inventario de estaciones · Transmilenio', verified: true },
  trunk_corridors_2026: { label: 'Trazado troncal · Transmilenio', verified: true },
  // Inventario del cable: estaciones con sus elevadores y línea con sus tramos.
  cable_stations_2026: { label: 'Estación del cable · Transmilenio', verified: true },
  cable_segments_2026: { label: 'Tramo del cable · Transmilenio', verified: true },
  planner_estimate: { label: 'Estimación del planificador', verified: false },
  transmilenio_2026: { label: 'Transmilenio', verified: true },
  gtfs_20260818: { label: 'GTFS SITP · 18-08-2026', verified: true },
  simulated_veredal_fixture: { label: 'Veredal simulado', verified: false },
  osrm: { label: 'OSRM · OpenStreetMap', verified: false },
  'known-boarding-point': { label: 'Punto de abordaje conocido', verified: false },
  eco_cb_demo_fixture: { label: 'Demostración', verified: false },
  transport_plan_snapshot: { label: 'Instantánea del planificador', verified: false },
});

function metaFor(mode) {
  return MODE_META[mode] ?? { icon: '•', label: mode ?? 'Tramo' };
}

function sourceMetaFor(source) {
  return (
    SOURCE_META[source] ?? {
      label: source ? `Fuente: ${source}` : 'Fuente por confirmar',
      verified: false,
    }
  );
}

function formatKm(value) {
  if (!Number.isFinite(value)) return '—';
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;
}

function formatMinutes(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function pointOf(value, fallbackLabel) {
  if (!value) return { label: fallbackLabel, coordinates: null };
  if (Array.isArray(value)) return { label: fallbackLabel, coordinates: [...value] };
  const coordinates =
    Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude))
      ? [Number(value.latitude), Number(value.longitude)]
      : Array.isArray(value.coordinates)
        ? [...value.coordinates]
        : null;
  return { label: value.label || fallbackLabel, coordinates };
}

/* -------------------------------------------------------------------------- */
/* Itinerario oficial del SITP                                                */
/* -------------------------------------------------------------------------- */

/**
 * Traduce el plan oficial a itinerario.
 *
 * `plan.steps` ya viene en orden de abordaje, así que aquí solo se añade qué
 * trustworthy es cada tramo y qué se puede y qué no se puede afirmar.
 */
export function officialPlanToItinerary(plan) {
  if (!plan) return null;

  const steps = plan.steps.map((step) => {
    const meta = metaFor(step.mode);
    const source = sourceMetaFor(step.source);
    const minutes = formatMinutes(step.durationMinutes);
    // Solo el primer tramo a pie es un "camina hasta el punto de abordaje"; el
    // de bajada es "sales del bus aquí" y no tiene dónde abordarse.
    const isApproachWalk = step.mode === 'walk' && step.order === 1;
    return {
      order: step.order,
      mode: step.mode,
      icon: meta.icon,
      modeLabel: meta.label,
      title: step.instruction,
      detail: step.detail,
      boardAt: isApproachWalk ? plan.boarding?.name ?? null : null,
      alightAt: null,
      durationLabel: minutes,
      costFormatted: step.estimatedCostCop
        ? `$${step.estimatedCostCop.toLocaleString('es-CO')}`
        : step.mode === 'walk'
          ? '$0'
          : null,
      sourceLabel: source.label,
      verified: source.verified,
      simulated: false,
    };
  });

  // Los puntos de abordaje y transbordo son la pregunta que hace la gente, así
  // que se declaran de forma explícita en vez de deducirse del texto. El tramo en
  // vehículo vale lo mismo si es troncal, SITP zonal o cable.
  const rideStep = steps.find(
    (step) => step.mode === 'sitp' || step.mode === 'trunk' || step.mode === 'cable',
  );
  if (rideStep) {
    rideStep.boardAt = plan.boarding?.name ?? null;
    rideStep.alightAt = plan.alighting?.name ?? plan.cableIntegration?.stationName ?? null;
  }

  // El cable solo se marca como transbordo cuando el viaje llega en bus. Si el
  // cable *es* el medio principal, sobrescribir su abordaje con la estación de
  // bajada diría que se sube donde se baja.
  const cableStep = steps.find((step) => step.mode === 'cable');
  const cableIsTransfer = cableStep && rideStep !== cableStep;
  if (cableIsTransfer && plan.cableIntegration) {
    // Se sube en la estación del cable, no en el paradero donde baja el bus. Son
    // lugares distintos: el corredor del SITP pasa cerca de la estación y la
    // persona termina el tramo a pie. Nombrar el paradero aquí hacía creer que el
    // teleférico se aborda en la calle, a 336 m de la estación.
    cableStep.boardAt = plan.cableLeg?.boardingStationName ?? plan.cableIntegration.stationName;
    cableStep.alightAt = plan.cableLeg?.alightingStationName ?? 'la estación más cercana a tu destino';
  }

  return {
    kind:
      plan.kind === 'official-trunk'
        ? 'official-trunk'
        : plan.kind === 'official-cable'
          ? 'official-cable'
          : 'official-sitp',
    kicker:
      plan.kind === 'official-trunk'
        ? 'Alternativa troncal'
        : plan.kind === 'official-cable'
          ? 'Alternativa TransMiCable'
          : 'Alternativa oficial SITP',
    title: plan.title,
    subtitle: plan.corridorLabel,
    badge: 'Datos oficiales',
    badgeTone: 'official',
    reason: plan.matchReason,
    stats: [
      { label: 'Corredor', value: formatKm(plan.lengthKm), id: 'itinerary-corridor' },
      { label: 'Recorrido', value: formatKm(plan.totalDistanceKm), id: 'itinerary-distance' },
      { label: 'Tiempo estimado', value: formatMinutes(plan.estimatedMinutes) ?? '—', id: 'itinerary-time' },
      { label: 'Tarifa', value: plan.costFormatted, id: 'itinerary-cost' },
    ],
    facts: [
      { label: 'Tipo de servicio', value: `${plan.serviceType}${plan.isRural ? ' · rural' : ''}` },
      { label: 'Vehículo', value: plan.busType },
      { label: 'Operador', value: plan.operator || 'Por confirmar' },
      { label: 'Días', value: plan.daysLabel },
      { label: 'Horario del operador', value: plan.schedule.weekday || 'Sin dato' },
      { label: 'Franja', value: plan.scheduleType },
    ],
    steps,
    warnings: plan.warnings,
    geometry: plan.path,
    totalCostFormatted: plan.costFormatted,
    disclaimer: plan.disclaimer,
    dataStatus: plan.dataStatus,
    dataVersion: plan.dataVersion,
  };
}

/* -------------------------------------------------------------------------- */
/* Itinerario del planificador                                                */
/* -------------------------------------------------------------------------- */

/**
 * Traduce un `TransportPlan` a itinerario.
 *
 * Es la ruta que el mapa dibuja, con sus nombres de abordaje reales. A diferencia
 * de la oficial, aquí los tramos veredales son simulación, y el itinerario lo
 * dice en cada paso en vez de esconderlo en una nota al pie.
 */
export function transportPlanToItinerary(transportPlan, { activeRoute = null, originLabel = '', destinationLabel = '' } = {}) {
  if (!transportPlan || !Array.isArray(transportPlan.legs) || transportPlan.legs.length === 0) return null;

  const steps = [];

  const access = transportPlan.access;
  if (access && access.status !== 'not-required' && access.distanceKm > 0.02) {
    const meta = metaFor('walk');
    const source = sourceMetaFor(access.source);
    steps.push({
      order: 1,
      mode: 'walk',
      icon: meta.icon,
      modeLabel: 'Caminata',
      title: `Camina ${formatKm(access.distanceKm)} hasta el punto de abordaje`,
      detail: access.to?.label || 'Punto de abordaje del modo seleccionado',
      boardAt: access.to?.label ?? null,
      alightAt: null,
      durationLabel: formatMinutes(Math.round((access.distanceKm / 4.5) * 60)),
      costFormatted: '$0',
      sourceLabel: source.label,
      verified: source.verified,
      simulated: false,
    });
  }

  for (const leg of transportPlan.legs) {
    const meta = metaFor(leg.mode);
    const source = sourceMetaFor(leg.source ?? leg.dataStatus);
    const component = (transportPlan.price?.components ?? []).find((item) => item.mode === leg.mode);
    steps.push({
      order: steps.length + 1,
      mode: leg.mode,
      icon: meta.icon,
      modeLabel: meta.label,
      title: leg.label,
      detail: leg.dataStatus === 'coverage-only'
        ? 'Este modo solo cubre el corredor; la geometría la aporta la ruta vial'
        : leg.status === 'pending'
          ? 'Calculando la geometría de este tramo'
          : null,
      boardAt: leg.from?.label ?? null,
      alightAt: leg.to?.label ?? null,
      durationLabel: null,
      costFormatted: component?.formatted ?? null,
      // `sourceLabel` ya nombra la fuente con su estado ("Veredal simulado",
      // "Paradero oficial · Transmilenio"), así que no se le añade otro sufijo.
      sourceLabel: source.label,
      verified: source.verified && !leg.simulated,
      simulated: Boolean(leg.simulated),
      pending: leg.status === 'pending',
    });
  }

  if (steps.length === 0) return null;

  const hasSimulated = steps.some((step) => step.simulated);
  const warnings = [];
  if (hasSimulated) {
    warnings.push('Al menos un tramo usa una geometría veredal simulada del prototipo, no un trazado del operador.');
  }
  if (transportPlan.warnings?.length) warnings.push(...transportPlan.warnings);
  if (transportPlan.price?.status === 'partial') {
    warnings.push('El precio total está incompleto: algún tramo no tiene tarifa confirmada.');
  }

  return {
    kind: 'planner',
    title: activeRoute?.title ?? transportPlan.modeLabel ?? 'Itinerario',
    subtitle: [originLabel, destinationLabel].filter(Boolean).join(' → ') || null,
    badge: hasSimulated ? 'Incluye tramo simulado' : 'Plan calculado',
    badgeTone: hasSimulated ? 'alert' : 'neutral',
    reason: transportPlan.reason,
    stats: [
      { label: 'Modo', value: transportPlan.modeLabel ?? metaFor(transportPlan.mode).label, id: 'itinerary-mode' },
      { label: 'Integración', value: transportPlan.integration?.name ?? '—', id: 'itinerary-integration' },
      { label: 'Distancia', value: formatKm(pathLength(transportPlan.fitPath)), id: 'itinerary-distance' },
      { label: 'Precio', value: transportPlan.price?.formatted ?? 'Por confirmar', id: 'itinerary-cost' },
    ],
    facts: [
      { label: 'Disponibles', value: (transportPlan.availableModes ?? []).map((mode) => metaFor(mode).label).join(', ') || '—' },
      { label: 'Punto de transbordo', value: transportPlan.integration?.name ?? 'Sin transbordo' },
      { label: 'Origen', value: originLabel || transportPlan.access?.from?.label || '—' },
      { label: 'Destino', value: destinationLabel || transportPlan.integration?.name || '—' },
    ],
    steps,
    warnings,
    geometry: transportPlan.fitPath,
    totalCostFormatted: transportPlan.price?.formatted ?? null,
    disclaimer: 'Tiempos y tarifas del prototipo; confirma con el operador.',
    dataStatus: transportPlan.dataStatus ?? 'planner',
    dataVersion: transportPlan.dataVersion ?? null,
  };
}

function pathLength(path) {
  if (!Array.isArray(path) || path.length < 2) return Number.NaN;
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1];
    const b = path[index];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLon = ((b[1] - a[1]) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    total += 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  return total;
}

/**
 * Elige el itinerario que se muestra, con prioridad explícita.
 *
 * Si la persona activó la alternativa oficial, manda esa. Si no, se paints el
 * plan del planificador. El orden importa: si se invirtiera, el resumen volvería
 * a describir una ruta que el mapa no está pintando.
 */
export function buildItinerary({ officialPlan = null, isOfficialActive = false, transportPlan = null, activeRoute = null, originLabel = '', destinationLabel = '' } = {}) {
  if (isOfficialActive && officialPlan) return officialPlanToItinerary(officialPlan);
  return transportPlanToItinerary(transportPlan, { activeRoute, originLabel, destinationLabel });
}

export { MODE_META, formatKm, formatMinutes };
