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
  trunk: { label: 'Troncal', icon: '🚍', tone: 'official' },
  sitp: { label: 'SITP zonal', icon: '🚌', tone: 'official' },
  veredal: { label: 'Van veredal', icon: '🚐', tone: 'simulated' },
});

function summarize(plan) {
  return {
    id: plan.id,
    kind: plan.kind === 'official-trunk' ? 'trunk' : plan.kind === 'official-sitp' ? 'sitp' : 'veredal',
    title: plan.title,
    corridorLabel: plan.corridorLabel,
    routeCode: plan.routeCode,
    serviceType: plan.serviceType,
    busType: plan.busType,
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
 * Devuelve todas las alternativas disponibles para el viaje, o una lista vacía si
 * no hay con las que cerrar el trayecto.
 *
 * @param {object} input
 * @param {object} input.originLocation
 * @param {object} [input.destinationLocation]
 * @param {string} [input.destinationLabel]
 * @param {() => object|null} [input.buildTroncal] Inyectado para no acoplar este
 *   módulo al inventario troncal.
 * @param {() => object|null} [input.buildVeredal] Inyectado para no acoplar este
 *   módulo a `transportRouting`.
 */
export function buildAlternatives({
  originLocation,
  destinationLocation = null,
  destinationLabel = '',
  buildTroncal = null,
  buildVeredal = null,
} = {}) {
  if (!originLocation) return { alternatives: [], summaries: [], corridorOptions: null };

  const alternatives = [];

  if (typeof buildTroncal === 'function') {
    const trunk = buildTroncal({ originLocation, destinationLocation, destinationLabel });
    if (trunk) alternatives.push(trunk);
  }

  const sitp = buildOfficialSitpAlternative({ originLocation, destinationLocation });
  if (sitp) alternatives.push(sitp);

  if (typeof buildVeredal === 'function') {
    const veredal = buildVeredal({ originLocation, destinationLocation });
    if (veredal) alternatives.push({ ...veredal, kind: 'veredal' });
  }

  const rank = (plan) => {
    if (plan.kind === 'official-trunk') return 0;
    if (plan.kind === 'official-sitp') return 1;
    return 2;
  };

  const ranked = alternatives.sort((left, right) => rank(left) - rank(right));

  return {
    alternatives: ranked,
    summaries: ranked.map(summarize),
    corridorOptions: destinationLocation ? findSitpCorridorOptions(originLocation, destinationLocation) : null,
  };
}
