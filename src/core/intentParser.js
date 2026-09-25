import { PLACE_DEFINITIONS, resolvePlaceId } from './routeCatalog.js';

const REPORT_PATTERN = /\b(reporte|reportar|bloqueo|bloquearon|demora|tranc[oó]n|cambio de ruta|esta cerrado|est[aá] cerrado)\b/;
const GREETING_PATTERN = /^(hola|buenas|holi|hey|gracias)( |\!|$)/;
const KNOWLEDGE_PATTERN = /\b(transmicable|transmilenio|tarifa|pasaje|transbordo|estaciones|horarios)\b/;
const VALID_PRIORITIES = new Set(['fastest', 'cheapest', 'accessible']);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatClock(hour, minute = 0) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function extractArrivalTime(message) {
  const normalized = normalizeText(message);
  const match = normalized.match(
    /(?:antes de las?|a las?|para las?|llegar a las?)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\b\.?|p\.?\s*m\b\.?|de la manana|de la tarde|de la noche)?/
  );

  if (!match) return null;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2] ? Number.parseInt(match[2], 10) : 0, 10);
  const suffix = match[3] || '';
  const isPm = suffix.startsWith('p') || /tarde|noche/.test(suffix);
  const isAm = suffix.startsWith('a') || suffix.includes('manana');

  if (hour > 23 || minute > 59) return null;
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  return formatClock(hour, minute);
}

export function extractPriority(message, explicitPriority) {
  if (VALID_PRIORITIES.has(explicitPriority)) return explicitPriority;

  const normalized = normalizeText(message);
  if (/\b(barat[oa]?|economica|economico|presupuesto|plata|sin gastar)\b/.test(normalized)) {
    return 'cheapest';
  }
  if (/\b(silla de ruedas|pmr|accesib|adulto mayor|abuel[ao]|embarazada|coche de bebe)\b/.test(normalized)) {
    return 'accessible';
  }
  if (/\b(rapida|rapido|prisa|urgente|afan|antes de todo)\b/.test(normalized)) {
    return 'fastest';
  }
  return 'fastest';
}

function findKnownPlaces(message) {
  const normalized = normalizeText(message);
  return PLACE_DEFINITIONS.flatMap((place) => {
    const index = place.aliases.reduce((earliest, alias) => {
      const position = normalized.indexOf(alias);
      return position >= 0 && (earliest < 0 || position < earliest) ? position : earliest;
    }, -1);
    return index >= 0 ? [{ ...place, index }] : [];
  }).sort((left, right) => left.index - right.index);
}

function findPlaceAfterCue(message, cuePattern) {
  const normalized = normalizeText(message);
  const match = normalized.match(cuePattern);
  return match ? resolvePlaceId(match[1]) : null;
}

function inferPlacesFromMessage(message) {
  const known = findKnownPlaces(message);
  if (known.length === 0) return { originId: null, destinationId: null };

  const originFromCue = findPlaceAfterCue(
    message,
    /(?:estoy en|estoy ubicado en|estoy ubicada en|salgo de|desde)\s+([^,.?]+?)(?=\s+y\s+(?:quiero|necesito|voy)|,\s|\s+antes\s|\s+para\s+llegar|$)/
  );
  const destinationFromCue = findPlaceAfterCue(
    message,
    /(?:llegar a|llegue a|ir a|ir hasta|destino(?: es)?)\s+(?:a|al|hasta)?\s*([^,.?]+?)(?=\s+antes\s|\s+para\s|$)/
  );

  if (originFromCue || destinationFromCue) {
    return {
      originId: originFromCue || (known[0].id === 'portal_tunal' ? null : known[0].id),
      destinationId:
        destinationFromCue || (known.some((place) => place.id === 'portal_tunal') ? 'portal_tunal' : null),
    };
  }

  if (known.length >= 2) {
    return { originId: known[0].id, destinationId: known[1].id };
  }

  return known[0].id === 'portal_tunal'
    ? { originId: null, destinationId: 'portal_tunal' }
    : { originId: known[0].id, destinationId: null };
}

export function extractIntent(input = {}) {
  const message = String(input.message || '').trim().slice(0, 1000);
  const normalized = normalizeText(message);
  const explicitOriginId = resolvePlaceId(input.origin);
  const explicitDestinationId = resolvePlaceId(input.destination);
  const inferred = inferPlacesFromMessage(message);
  const originId = explicitOriginId || inferred.originId;
  const destinationId = explicitDestinationId || inferred.destinationId;
  const arrivalBy =
    (typeof input.deadline === 'string' && /^\d{2}:\d{2}$/.test(input.deadline)
      ? input.deadline
      : null) || extractArrivalTime(message);
  const priority = extractPriority(message, input.priority);

  if (REPORT_PATTERN.test(normalized)) {
    return {
      type: 'report',
      originId,
      destinationId,
      arrivalBy,
      priority,
      confidence: 'pattern',
      clarificationField: null,
    };
  }

  if (GREETING_PATTERN.test(normalized)) {
    return {
      type: 'greeting',
      originId,
      destinationId,
      arrivalBy,
      priority,
      confidence: 'pattern',
      clarificationField: null,
    };
  }

  // Mencionar TransMiCable o la tarifa dentro de una consulta con origen y destino sigue siendo una ruta.
  if (KNOWLEDGE_PATTERN.test(normalized) && !(originId && destinationId)) {
    return {
      type: 'knowledge',
      originId,
      destinationId,
      arrivalBy,
      priority,
      confidence: 'pattern',
      clarificationField: null,
    };
  }

  let clarificationField = null;
  if (!originId) clarificationField = 'origin';
  else if (!destinationId) clarificationField = 'destination';
  else if (!arrivalBy) clarificationField = 'deadline';

  return {
    type: clarificationField ? 'needs_clarification' : 'route',
    originId,
    destinationId,
    arrivalBy,
    priority,
    confidence: explicitOriginId && explicitDestinationId ? 'structured' : 'parsed',
    clarificationField,
  };
}
