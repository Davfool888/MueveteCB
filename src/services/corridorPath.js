/**
 * Recorte de un corredor al tramo que realmente se viaja.
 *
 * Este es el motivo de que las rutas "no apuntaran" al destino. El extracto
 * oficial trae el corredor completo, y el motor elegía el más cercano al origen
 * sin más: si la persona se sube a mitad de camino, la línea dibujada sale en las
 * dos direcciones, y la mitad va en sentido contrario al viaje.
 *
 * La solución no es suponer el sentido del corredor, sino medir dónde caen los
 * dos extremos sobre la geometría real y devolver solo el tramo entre ellos. Como
 * el servicio tampoco siempre dibuja la geometría en el orden que declara
 * (el tramo Juan Pablo II → Manitas viene al revés), el recorte se hace en el
 * orden que impone la geometría y no en el que dice el texto.
 */

import { haversineKm, joinPaths } from './transportRouting.js';

function isUsablePoint(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

/** Proyección local suficiente a escala de corredor urbano. */
function toMeters([latitude, longitude], referenceLatitude) {
  const scale = Math.max(0.1, Math.cos((referenceLatitude * Math.PI) / 180));
  return [longitude * 111320 * scale, latitude * 110574];
}

/**
 * Posición de un punto sobre un trazado, en metros recorridos desde el inicio.
 *
 * Devuelve además el índice de segmento, que permite recortar sin depender de la
 * parametrización continua.
 */
function projectOnPath(point, path) {
  if (!Array.isArray(path) || path.length < 2) return null;

  const referenceLatitude = point[0];
  const [px, py] = toMeters(point, referenceLatitude);
  let walked = 0;
  let best = null;

  for (let index = 1; index < path.length; index += 1) {
    const [x1, y1] = toMeters(path[index - 1], referenceLatitude);
    const [x2, y2] = toMeters(path[index], referenceLatitude);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
      walked += 0;
      continue;
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    const distanceMeters = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    if (!best || distanceMeters < best.distanceMeters) {
      best = {
        distanceMeters,
        alongMeters: walked + Math.sqrt(lengthSquared) * t,
        segmentIndex: index - 1,
        t,
        point: [path[index - 1][0] + (path[index][0] - path[index - 1][0]) * t,
          path[index - 1][1] + (path[index][1] - path[index - 1][1]) * t],
      };
    }
    walked += Math.sqrt(lengthSquared);
  }
  return best;
}

/** Parte del trazado que contiene un punto, entre todas las bandas. */
function findContainingPart(point, paths) {
  let best = null;
  for (let partIndex = 0; partIndex < paths.length; partIndex += 1) {
    const projection = projectOnPath(point, paths[partIndex]);
    if (!projection) continue;
    if (!best || projection.distanceMeters < best.projection.distanceMeters) {
      best = { partIndex, projection };
    }
  }
  return best;
}

/** Sub-tramo de una polilínea entre dos posiciones ya proyectadas. */
function slicePath(path, from, to) {
  if (from.segmentIndex === to.segmentIndex && from.t <= to.t) {
    return [from.point, to.point];
  }
  if (from.segmentIndex === to.segmentIndex) {
    return [from.point, to.point];
  }
  const ascending = from.segmentIndex < to.segmentIndex;
  const head = ascending ? from : to;
  const tail = ascending ? to : from;
  const segment = [head.point];
  for (let index = head.segmentIndex + 1; index <= tail.segmentIndex; index += 1) {
    segment.push(path[index]);
  }
  segment.push(tail.point);
  return ascending ? segment : [...segment].reverse();
}

/**
 * Recorta un corredor entre dos puntos.
 *
 * Cuando los dos extremos caen en bandas distintas del MultiLineString, el bus
 * recorre el corredor entero uniendo las bandas intermedias. Una versión anterior
 * de esta función solo conservaba la primera y la última, y con tres bandas o más
 * saltaba el tramo intermedio: el trazado dibujado terminaba en un punto que no
 * era la estación de bajada. Aquí se concatenan todas, sustituyendo el primer y
 * el último vértice por la proyección exacta de cada extremo.
 *
 * @param {Array<Array<[number, number]>>} paths Bandas del corredor, en [lat, lng].
 * @param {[number, number]} from Punto de abordaje.
 * @param {[number, number]} to Punto de bajada.
 * @returns {{
 *   path: Array<[number, number]>,
 *   distanceKm: number,
 *   fromAlongKm: number,
 *   toAlongKm: number,
 *   reversed: boolean,
 *   fromProjection: object,
 *   toProjection: object,
 * } | null}
 */
export function sliceCorridorPath(paths, from, to) {
  if (!Array.isArray(paths) || paths.length === 0) return null;
  if (!isUsablePoint(from) || !isUsablePoint(to)) return null;

  const fromHit = findContainingPart(from, paths);
  const toHit = findContainingPart(to, paths);
  if (!fromHit || !toHit) return null;

  const samePart = fromHit.partIndex === toHit.partIndex;

  // Todo se construye en el orden en que vienen almacenadas las bandas, de la de
  // índice menor a la mayor, y al final se invierte la lista de puntos si el viaje
  // va al revés. Cada banda se recorta entre su proyección y el extremo por el que
  // el bus continúa, que no es siempre el mismo: al ir en reverso hay que recortar
  // la banda de abordaje hacia su comienzo, no hacia su final.
  const continueForward = samePart
    ? fromHit.projection.alongMeters <= toHit.projection.alongMeters
    : fromHit.partIndex < toHit.partIndex;

  /** Recorta una banda entre una proyección y el extremo por el que se sigue. */
  const sliceToEnd = (part, projection) =>
    continueForward
      ? slicePath(part, projection, { segmentIndex: part.length - 2, t: 1, point: part.at(-1) })
      : slicePath(part, { segmentIndex: 0, t: 0, point: part[0] }, projection);

  /** Recorta una banda desde el extremo por el que se llega hasta una proyección. */
  const sliceFromEnd = (part, projection) =>
    continueForward
      ? slicePath(part, { segmentIndex: 0, t: 0, point: part[0] }, projection)
      : slicePath(part, projection, { segmentIndex: part.length - 2, t: 1, point: part.at(-1) });

  const segments = [];

  if (samePart) {
    const part = paths[fromHit.partIndex];
    const low = continueForward ? fromHit.projection : toHit.projection;
    const high = continueForward ? toHit.projection : fromHit.projection;
    segments.push(slicePath(part, low, high));
  } else {
    const low = Math.min(fromHit.partIndex, toHit.partIndex);
    const high = Math.max(fromHit.partIndex, toHit.partIndex);

    for (let partIndex = low; partIndex <= high; partIndex += 1) {
      const part = paths[partIndex];
      if (partIndex === fromHit.partIndex) {
        segments.push(sliceToEnd(part, fromHit.projection));
      } else if (partIndex === toHit.partIndex) {
        segments.push(sliceFromEnd(part, toHit.projection));
      } else {
        segments.push(part.map((point) => [...point]));
      }
    }
  }

  const stored = joinPaths(...segments);
  const path = continueForward ? stored : stored.slice().reverse();
  if (path.length < 2) return null;

  // Posición global desde el inicio del corredor, contando las bandas previas.
  const offsetMeters = (partIndex) =>
    paths.slice(0, partIndex).reduce((total, part) => total + measureMeters(part), 0);

  return {
    path,
    distanceKm: measure(path),
    fromAlongKm: Number(((offsetMeters(fromHit.partIndex) + fromHit.projection.alongMeters) / 1000).toFixed(3)),
    toAlongKm: Number(((offsetMeters(toHit.partIndex) + toHit.projection.alongMeters) / 1000).toFixed(3)),
    reversed: !continueForward,
    fromProjection: fromHit.projection,
    toProjection: toHit.projection,
  };
}

/** Longitud de una polilínea en metros. */
function measureMeters(path) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += haversineKm(path[index - 1], path[index]) * 1000;
  }
  return total;
}

function measure(path) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += haversineKm(path[index - 1], path[index]);
  }
  return Number(total.toFixed(3));
}

/**
 * ¿El tramo recorrido pasa más cerca del destino que el punto de abordaje?
 *
 * Es el filtro que descarta corredores que Meets el origen pero se van en
 * dirección contraria: subirse a un bus que no acerca al destino no es una
 * alternativa, por mucho que el corredor pase a cien metros de casa.
 */
export function doesCorridorApproachDestination(path, origin, destination) {
  if (!Array.isArray(path) || path.length < 2) return false;
  if (!isUsablePoint(origin) || !isUsablePoint(destination)) return false;
  const straight = haversineKm(origin, destination);
  if (!Number.isFinite(straight)) return false;
  // La distancia del destino al trazado recorrido, no al punto final.
  let closest = Infinity;
  for (const point of path) {
    const distance = haversineKm(point, destination);
    if (distance < closest) closest = distance;
  }
  // Ganar menos de 30 m no es avanzar: es ruido de la propia línea del bus.
  return straight - closest > 0.03;
}
