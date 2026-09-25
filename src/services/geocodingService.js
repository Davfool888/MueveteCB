import { POINTS_OF_INTEREST } from '../data/routes';

const DEFAULT_GEOCODING_URL = 'https://nominatim.openstreetmap.org/search';
const GEOCODING_URL = import.meta.env?.VITE_GEOCODING_URL || DEFAULT_GEOCODING_URL;
const BOGOTA_VIEWBOX = '-74.30,4.40,-73.98,4.90';
const MIN_QUERY_LENGTH = 2;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function localLocation(place, source = 'manual') {
  return {
    label: place.name,
    detail: place.detail,
    latitude: place.coordinates[0],
    longitude: place.coordinates[1],
    source,
  };
}

function remoteLocation(place) {
  const latitude = toNumber(place.lat);
  const longitude = toNumber(place.lon);

  if (latitude === null || longitude === null) return null;

  return {
    label: place.display_name || place.name || 'Ubicación encontrada',
    detail: place.type || 'Dirección encontrada en OpenStreetMap',
    latitude,
    longitude,
    source: 'manual',
  };
}

function mergeLocations(...groups) {
  const seen = new Set();
  const merged = [];

  groups.flat().forEach((location) => {
    if (!location) return;

    const key = `${location.latitude.toFixed(5)}:${location.longitude.toFixed(5)}`;
    if (seen.has(key)) return;

    seen.add(key);
    merged.push(location);
  });

  return merged;
}

export function getLocalLocationSuggestions(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return POINTS_OF_INTEREST.filter((place) => {
    const normalizedPlace = normalizeText(`${place.name} ${place.detail}`);
    return normalizedPlace.includes(normalizedQuery);
  }).map((place) => localLocation(place));
}

export function getLocationByLabel(label) {
  const normalizedLabel = normalizeText(label);
  const place = POINTS_OF_INTEREST.find(
    (candidate) => normalizeText(candidate.name) === normalizedLabel,
  );

  return place ? localLocation(place) : null;
}

export async function searchLocations(query, { signal, limit = 6 } = {}) {
  const normalizedQuery = String(query || '').trim();
  const localResults = getLocalLocationSuggestions(normalizedQuery);

  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return localResults.slice(0, limit);
  }

  let remoteResults = [];

  try {
    const url = new URL(GEOCODING_URL);
    url.searchParams.set('q', normalizedQuery);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('countrycodes', 'co');
    url.searchParams.set('accept-language', 'es');
    url.searchParams.set('viewbox', BOGOTA_VIEWBOX);
    url.searchParams.set('bounded', '0');

    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed with status ${response.status}`);
    }

    const payload = await response.json();
    remoteResults = Array.isArray(payload) ? payload.map(remoteLocation).filter(Boolean) : [];
  } catch (error) {
    if (localResults.length > 0) {
      return localResults.slice(0, limit);
    }

    throw error;
  }

  return mergeLocations(localResults, remoteResults).slice(0, limit);
}

export async function resolveLocation(query, options = {}) {
  const localResults = getLocalLocationSuggestions(query);
  if (localResults.length > 0) return localResults[0];

  const results = await searchLocations(query, { ...options, limit: 1 });
  return results[0] || null;
}
