/**
 * Catálogo de alternativas para un par A → B.
 *
 * Cada medio se consulta con su propio motor y se traduce al mismo contrato, de
 * modo que la interfaz pueda=listarlos, compararlos y dejar que la persona elija
 * sin que ninguna opción se imponga por defecto:
 *
 *   - `trunk`  : estación y corredor troncales del inventario de Transmilenio;
 *   - `sitp`   : corredor zonal y paraderos del servicio oficial del SITP;
 *   - `veredal`: la van veredal del prototipo, con su geometría marcada como
 *                simulada.
 *
 * La ausencia de una alternativa es información: si el veredal aparece donde el
 * SITP no llega, esa es justamente la razón de existir del veredal.
 */

import { buildOfficialSitpAlternative, findSitpCorridorOptions } from './sitpRoutesService.js';

export const ALTERNATIVE_KINDS = Object.freeze({
  cable: { label: 'TransMiCable', icon: '🚡', tone: 'official' },
  trunk: { label: 'Troncal', icon: '🚍', tone: 'official' },
  sitp: { label: 'SITP zonal', icon: '🚌', tone: 'official' },
  veredal: { label: 'Van veredal', icon: '🚐', tone: 'simulated' },
});

/**
 * Orden en que se ofrecen los medios. No es un ranking de calidad: es el orden en
 * que se leen, del modo más especializado al más general. La persona elige.
 */
const KIND_ORDER = ['cable', 'trunk', 'sitp', 'veredal'];

function kindOf(plan) {
  if (plan.kind === 'official-cable') return 'cable';
  if (plan.kind === 'official-trunk') return 'trunk';
  if (plan.kind === 'official-sitp') return 'sitp';
  return 'veredal';
}

function summarize(plan) {
  const kind = kindOf(plan);
  const meta = ALTERNATIVE_KINDS[kind];
  return {
    id: plan.id,
    kind,
    label: meta.label,
    icon: meta.icon,
    title: plan.title,
    corridorLabel: plan.corridorLabel,
    routeCode: plan.routeCode,
    serviceType: plan.serviceType,
    busType: plan.busType,
    /** Dónde abordar y dónde termina, para decidir sin abrir la pestaña. */
    boardAt: plan.boarding?.name ?? plan.boarding?.stopId ?? null,
    alightAt: plan.cableIntegration?.stationName ?? plan.alighting?.name ?? null,
    estimatedMinutes: plan.estimatedMinutes ?? null,
    totalDistanceKm: plan.totalDistanceKm ?? null,
    totalCostCop: plan.totalCostCop ?? null,
    costFormatted: plan.costFormatted ?? null,
    dataStatus: plan.dataStatus ?? null,
    isSimulated: (plan.warnings ?? []).some((warning) => /simulad/i.test(warning)),
    matchReason: plan.matchReason ?? null,
  };
}

/**
 * Devuelve todas las alternativas disponibles para el viaje, agrupadas por medio.
 *
 * Cada medio puede aportar más de una opción: la persona elige, y el mapa marca
 * la que tenga seleccionada. El orden dentro de cada grupo es el del puntaje del
 * motor, no un juicio sobre cuál es mejor.
 *
 * @param {object} input
 * @param {object} input.originLocation
 * @param {object} [input.destinationLocation]
 * @param {string} [input.destinationLabel]
 * @param {number} [input.maxPerKind] Cuántas opciones por medio.
 * @param {() => object|null} [input.buildCable]
 * @param {() => object|null} [input.buildTroncal]
 * @param {() => object[]|null} [input.listTrunk] Alternativas troncales ya construidas.
 * @param {() => object[]|null} [input.listSitp] Alternativas SITP ya construidas.
 * @param {() => object|null} [input.buildVeredal]
 */
export function buildAlternatives({
  originLocation,
  destinationLocation = null,
  destinationLabel = '',
  maxPerKind = 3,
  buildCable = null,
  buildTroncal = null,
  listTrunk = null,
  listSitp = null,
  buildVeredal = null,
} = {}) {
  if (!originLocation) return { alternatives: [], summaries: [], groups: [] };

  const collected = [];

  if (typeof buildCable === 'function') {
    const cable = buildCable({ originLocation, destinationLocation, destinationLabel });
    if (cable) collected.push(cable);
  }

  // El mismo límite por medio se propaga a los motores que devienen varias
  // opciones, para que el número de pestañas sea el que la persona pidió y no el
  // que cada motor decida por su cuenta.
  const perMedium = { maxAlternatives: maxPerKind };

  if (typeof listTrunk === 'function') {
    collected.push(
      ...(listTrunk({ originLocation, destinationLocation, destinationLabel, ...perMedium }) ?? []),
    );
  } else if (typeof buildTroncal === 'function') {
    const trunk = buildTroncal({ originLocation, destinationLocation, destinationLabel });
    if (trunk) collected.push(trunk);
  }

  if (typeof listSitp === 'function') {
    collected.push(
      ...(listSitp({ originLocation, destinationLocation, destinationLabel, ...perMedium }) ?? []),
    );
  } else {
    const sitp = buildOfficialSitpAlternative({ originLocation, destinationLocation });
    if (sitp) collected.push(sitp);
  }

  if (typeof buildVeredal === 'function') {
    const veredal = buildVeredal({ originLocation, destinationLocation });
    if (veredal) collected.push({ ...veredal, kind: 'veredal' });
  }

  const ranked = collected.sort(
    (left, right) => KIND_ORDER.indexOf(kindOf(left)) - KIND_ORDER.indexOf(kindOf(right)),
  );

  // Se limita por medio, pero el orden global se conserva para que la interfaz
  // pueda recorrer todas las pestañas en la misma secuencia.
  const seenByKind = new Map();
  const limited = [];
  for (const plan of ranked) {
    const kind = kindOf(plan);
    const count = seenByKind.get(kind) ?? 0;
    if (count >= maxPerKind) continue;
    seenByKind.set(kind, count + 1);
    limited.push(plan);
  }

  const groups = KIND_ORDER.filter((kind) => limited.some((plan) => kindOf(plan) === kind)).map(
    (kind) => ({
      kind,
      ...ALTERNATIVE_KINDS[kind],
      count: limited.filter((plan) => kindOf(plan) === kind).length,
    }),
  );

  return {
    alternatives: limited,
    summaries: limited.map(summarize),
    groups,
    corridorOptions: destinationLocation ? findSitpCorridorOptions(originLocation, destinationLocation) : null,
  };
}
