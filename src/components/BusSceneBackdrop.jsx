import { lazy, Suspense, useEffect, useState } from 'react';

/**
 * Fondo animado del Home: la maqueta de buses en Three.js.
 *
 * Es decoracion, no una vista de datos. No recibe props ni reacciona al estado
 * del planificador: la informacion de rutas vive en el mapa de Leaflet y en el
 * resumen de la interfaz. Que sea independiente es justo lo que evita que la
 * escena se vuelva a renderizar cada vez que alguien escribe una direccion.
 *
 * Tres decisiones que importan mas que el 3D en si:
 *
 * 1. **Carga diferida.** `three.js` y el compositor pesan mas que la aplicacion
 *    entera, asi que la escena entra con `lazy()` y un `import()`. El bundle
 *    inicial no crece y el navegador baja la escena despues de pintar la pagina.
 *    Nadie ve una pantalla en blanco esperando a WebGL.
 *
 * 2. **Respeta `prefers-reduced-motion`.** La maqueta tiene buses en marcha,
 *    nubes a la deriva y cabinas de teleférico subiendo y bajando. Para alguien
 *    que pidio menos movimiento eso no es decoracion, es una distraccion
 *    forcada, asi que no se monta: queda el fondo del color de la escena.
 *
 * 3. **Si no hay WebGL, la pagina no se rompe.** Se comprueba antes de montar y,
 *    si falta, el bloque queda como un fondo liso. El planificador de rutas esta
 *    montado encima y no depende de esto para funcionar.
 */
const BusScene = lazy(() => import('../three/BusScene.jsx'));

/** ¿El navegador puede pintar en un canvas? */
function hasWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

/**
 * ¿La persona pidio menos movimiento?
 *
 * Se lee una vez al montar y no se re-evalua: si la preferencia cambiara con la
 * escena ya montada habria que reconstruir el arbol de Three.js entero, y el
 * cambio de preferencia en caliente es un caso marginal.
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function BusSceneBackdrop() {
  // Se resuelve en un efecto y no durante el render: `window` y `document` no
  // existen al renderizar en servidor, y leerlos ahi lo rompe.
  const [state, setState] = useState('pending');

  useEffect(() => {
    if (prefersReducedMotion()) {
      setState('reduced-motion');
      return;
    }
    setState(hasWebGL() ? 'ready' : 'no-webgl');
  }, []);

  return (
    <div
      className={`bus-scene bus-scene--${state}`}
      // El lienzo es decoracion pura. Sin esto el canvas se quedaria con los
      // clics del planificador de rutas montado encima.
      aria-hidden="true"
    >
      {state === 'ready' && (
        <Suspense fallback={null}>
          <BusScene />
        </Suspense>
      )}
    </div>
  );
}
