// ─── Utility functions migrated from app.js ───────────────────────────────

/** Normalise text: remove accents and lowercase */
export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Destination phrase: "al Portal Tunal" vs "a Quiba" */
export function destinationPhrase(value) {
  const destination = String(value || 'el destino').trim();
  return normalizeText(destination).includes('portal tunal')
    ? `al ${destination}`
    : `a ${destination}`;
}

/** Format "07:00" → "7:00 a. m." */
export function formatDeadlineLabel(value) {
  const normalized = String(value || '07:00');
  const [hour, minute] = normalized.split(':').map(Number);
  const suffix = hour < 12 ? 'a. m.' : 'p. m.';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute || 0).padStart(2, '0')} ${suffix}`;
}

/** Convert "07:00" → 420 (minutes since midnight) */
export function timeToMinutes(value) {
  const [hour, minute] = String(value || '07:00').split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}
