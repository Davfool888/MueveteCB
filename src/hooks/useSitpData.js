import { useEffect, useRef, useState } from 'react';

/**
 * Carga diferida del extracto oficial del SITP y de la infraestructura troncal.
 *
 * El extracto son unos 630 KB sin comprimir. Importarlo de forma estática desde
 * la página duplicaría el bundle inicial, así que se pide con `import()` solo
 * cuando la persona abre una capa oficial o cuando hay un origen con
 * coordenadas. `sitpRoutesService.js` se carga en el mismo trozo porque depende
 * del extracto, y `trunkService.js` porque las alternativas troncales se
 * comparan con las SITP en la misma respuesta.
 *
 * Si la carga falla, el mapa sigue funcionando con las capas de demostración:
 * el estado queda en `error` y la interfaz lo dice en vez de romper.
 */

const EMPTY = { routes: [], stops: [] };

export function useSitpData(enabled) {
  const [state, setState] = useState({
    status: 'idle',
    data: EMPTY,
    buildAlternative: null,
    findCorridors: null,
    buildAlternatives: null,
    error: null,
  });
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!enabled || requestedRef.current) return undefined;
    requestedRef.current = true;

    let cancelled = false;
    setState((previous) => ({ ...previous, status: 'loading', error: null }));

    Promise.all([
      import('../services/sitpRoutesService.js'),
      import('../services/trunkService.js'),
      import('../services/alternativesService.js'),
      import('../data/sitpIndex.js'),
      import('../data/trunkIndex.js'),
    ])
      .then(([sitp, trunk, alternatives, sitpIndex, trunkIndex]) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: {
            routes: sitpIndex.SITP_ROUTES,
            stops: sitpIndex.SITP_STOPS,
            trunkStations: trunkIndex.TRUNK_STATIONS,
            trunkCorridors: trunkIndex.TRUNK_CORRIDORS,
          },
          buildAlternative: sitp.buildOfficialSitpAlternative,
          findCorridors: sitp.findSitpCorridorOptions,
          buildAlternatives: (input) =>
            alternatives.buildAlternatives({
              ...input,
              buildTroncal: trunk.buildTroncalAlternative,
            }),
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('No fue posible cargar los extractos oficiales del SITP', error);
        requestedRef.current = false;
        setState({ status: 'idle', data: EMPTY, buildAlternative: null, findCorridors: null, buildAlternatives: null, error });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
