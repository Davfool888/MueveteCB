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

function haversineDistKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function reverseGeocodeLocation(latitude, longitude, { signal } = {}) {
  const lat = toNumber(latitude);
  const lon = toNumber(longitude);
  if (lat === null || lon === null) return null;

  // 1. Verificar si está muy cerca (≤350 m) de un punto de interés conocido
  let nearestPoi = null;
  let minDistance = Infinity;
  for (const poi of POINTS_OF_INTEREST) {
    if (!Array.isArray(poi?.coordinates) || poi.coordinates.length < 2) continue;
    const d = haversineDistKm(lat, lon, poi.coordinates[0], poi.coordinates[1]);
    if (d < minDistance) {
      minDistance = d;
      nearestPoi = poi;
    }
  }

  if (nearestPoi && minDistance <= 0.35) {
    return {
      label: `Ubicación actual (${nearestPoi.name})`,
      detail: nearestPoi.detail,
      latitude: lat,
      longitude: lon,
      source: 'gps',
      accuracyKm: minDistance,
    };
  }

  // 2. Consultar Nominatim reverse de OpenStreetMap
  try {
    const reverseBase = GEOCODING_URL.replace(/\/search\b/, '/reverse');
    const reverseUrl = new URL(reverseBase.startsWith('http') ? reverseBase : 'https://nominatim.openstreetmap.org/reverse');
    reverseUrl.searchParams.set('lat', String(lat));
    reverseUrl.searchParams.set('lon', String(lon));
    reverseUrl.searchParams.set('format', 'jsonv2');
    reverseUrl.searchParams.set('addressdetails', '1');
    reverseUrl.searchParams.set('accept-language', 'es');
    reverseUrl.searchParams.set('zoom', '18');

    const response = await fetch(reverseUrl, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const payload = await response.json();
      const addr = payload.address || {};
      const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential;
      const road = addr.road || addr.pedestrian || addr.street;
      const cityDistrict = addr.city_district || addr.suburb || 'Ciudad Bolívar';

      let shortLabel = neighbourhood || road || payload.name;
      if (!shortLabel && typeof payload.display_name === 'string') {
        shortLabel = payload.display_name.split(',')[0]?.trim();
      }

      const detailParts = [road, neighbourhood, cityDistrict].filter(Boolean);
      const uniqueDetail = [...new Set(detailParts)].join(', ');

      if (shortLabel) {
        return {
          label: `Ubicación actual (${shortLabel})`,
          detail: uniqueDetail || 'Localidad 19 · Ciudad Bolívar',
          latitude: lat,
          longitude: lon,
          source: 'gps',
        };
      }
    }
  } catch {
    // Si la llamada remota falla, usamos el POI local más cercano
  }

  // 3. Fallback a punto de interés cercano local (≤2.5 km)
  if (nearestPoi && minDistance <= 2.5) {
    return {
      label: `Ubicación actual (cerca de ${nearestPoi.name})`,
      detail: nearestPoi.detail,
      latitude: lat,
      longitude: lon,
      source: 'gps',
      accuracyKm: minDistance,
    };
  }

  return {
    label: 'Ubicación actual',
    detail: 'Coordenadas GPS detectadas',
    latitude: lat,
    longitude: lon,
    source: 'gps',
  };
}

