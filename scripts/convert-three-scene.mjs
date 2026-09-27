/**
 * Conversion de la maqueta 3D de TypeScript a JavaScript.
 *
 * El proyecto principal es JavaScript: no tiene `tsconfig`, ni `tsc` en el
 * build, ni tipos en ninguna parte. La escena 3D llega desde un proyecto
 * aparte escrito en TypeScript, asi que hay que bajarla de tipo.
 *
 * No se hace con expresiones regulares. El archivo de composicion son datos
 * (`{ kind: 'bus', speed: 1.15 }`) y cualquier regex que quite anotaciones
 * termina comiendose tambien los valores: una sustitucion que en principio
 * solo tocaba `moving: true` arrastro `kind: 'bus'` a `kind`. Para eso esta
 * esbuild, que ya es dependencia del proyecto y sabe distinguir un tipo de un
 * valor. Se usa su transformador directamente para no anadir dependencias.
 *
 * Uso:  node scripts/convert-three-scene.mjs
 */

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(projectRoot, 'src/components/animacionbuses/src');
const targetRoot = resolve(projectRoot, 'src/three');

/**
 * Archivos que no seportedan a `src/three`.
 *
 * - `App.tsx` se rehace como componente de React del proyecto principal: es el
 *   punto de entrada y aqui se decide como se monta la escena.
 * - `TerritoryText.tsx` se descarta: dibuja "Tu camino, sin adivinar." con
 *   tipografia 3D y 90 KB de fuente, y ese mismo titular ya esta en el `<h1>`
 *   de la pagina, donde se lee mejor y es accesible.
 * - `main.tsx` es el arranque del proyecto aparte: monta la escena en su propio
 *   `#root` y con su hoja de estilos. En el proyecto principal la escena es un
 *   componente mas del Home.
 */
const SKIPPED = new Set(['App.tsx', 'TerritoryText.tsx', 'main.tsx']);

/**
 * Archivos que se ajustan a mano despues de convertirlos.
 *
 * Son los tres que tocaron `drei` o que montaban el texto 3D. El conversor no
 * los reescribe: si lo hiciera, el proximo `npm run convert:three` devolvería
 * `RoundedBox` y el cable volveria a ser una linea de un pixel.
 */
const HAND_EDITED = new Set([
  'components/scene/primitives.tsx',
  'components/scene/CableCar.tsx',
  'components/scene/MainScene.tsx',
]);

/** Recorre un directorio y devuelve la lista de archivos por ruta relativa. */
async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full, base)));
    else files.push(full.slice(base.length + 1));
  }
  return files;
}

/**
 * Aplana la estructura del proyecto de origen.
 *
 * En el standalone todo cuelga de `components/`, porque es una app con un
 * unico componente. Aqui la escena es una pieza mas del proyecto, asi que
 * `components/scene/*` pasa a `scene/*` y `lib/*` sube a la raiz de `src/three`.
 */
function targetPathFor(file) {
  const flattened = file.replace(/^components[\\/]/, '');
  return flattened.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js');
}

/**
 * Ayudas que sustituyen a los tres componentes que se usaban de @react-three/drei.
 *
 * Se añaden aqui y no a mano en el archivo generado: si se escribieran
 * directamente sobre `src/three/lib/geometry.js`, el proximo `npm run
 * convert:three` las borraria y el proyecto se quedaria sin `RoundedBox` ni con
 * el cable dibujado.
 */
const GEOMETRY_HELPERS = `

/* ------------------------------------------------------------------ *
 * Sustitutos de @react-three/drei
 * ------------------------------------------------------------------ */

const boxCache = new Map();

/**
 * Caja con los cantos muy redondeados, centrada en el origen.
 *
 * Reemplaza a \`RoundedBox\`. Se resuelve con \`ExtrudeGeometry\` sobre un
 * rectangulo de esquinas redondeadas: el bisel redondea las cuatro aristas del
 * frente y de la espalda, y el radio de la forma redondea las cuatro verticales.
 * Es la misma tecnica que ya usaba \`roundedSlab\` en esta escena, con la que
 * comparte lectura visual.
 *
 * Sin \`drei\` no arrastramos la mayor parte de su arbol de dependencias, y la
 * geometria se cachea: las cajas se reutilizan entre buses, edificios y
 * elementos de utileria en lugar de reconstruirse en cada render.
 *
 * @param {number} width  Ancho en X.
 * @param {number} height Alto en Y.
 * @param {number} depth  Fondo en Z.
 * @param {number} radius Radio de redondeo; se recorta para no romper la forma.
 * @param {number} smoothness Segmentos del bisel.
 * @returns {THREE.BufferGeometry}
 */
export function roundedBoxGeometry(width, height, depth, radius = 0.1, smoothness = 2) {
  const r = Math.max(0.001, Math.min(radius, Math.min(width, height, depth) * 0.48));
  const segments = Math.max(1, Math.round(smoothness));
  const key = [width, height, depth, r, segments].map((n) => Number(n).toFixed(4)).join('|');

  const hit = boxCache.get(key);
  if (hit) return hit;

  // El bisel consume \`r\` en cada lado: el perfil se recorta en esa medida y la
  // extraccion se ajusta para que el resultado mida exactamente el tamano pedido.
  const shape = roundedRectShape(
    Math.max(0.001, width - 2 * r),
    Math.max(0.001, height - 2 * r),
    Math.max(0.001, r),
  );
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * r),
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: Math.max(4, segments * 2),
  });

  // El extrude crece desde z = 0 hacia +Z y el perfil esta centrado en XY:
  // se centra en Z para que la caja quede simetrica.
  geo.translate(0, 0, -(depth - 2 * r) / 2);
  geo.computeVertexNormals();

  boxCache.set(key, geo);
  return geo;
}
`;

/**
 * Deja el resultado con la forma del proyecto principal.
 *
 * esbuild convierte los comentarios de JSX en expresiones sueltas dentro de
 * llaves, que es valido pero se lee como codigo roto. El resto del proyecto
 * usa comillas simples y comentarios de una linea.
 */
function tidy(code) {
  return code.replace(/\{\s*(\/\*[\s\S]*?\*\/)\s*\}/g, '{$1}');
}

/**
 * Corrige la profundidad de los imports.
 *
 * En el proyecto de origen la escena vivia en `src/components/scene/` y
 * buscaba la paleta en `src/lib/`, o sea `../../lib/`. Al aplanarla a
 * `src/three/scene/` y `src/three/lib/` los dos archivos quedan un nivel mas
 * juntos, asi que la ruta correcta es `../lib/`. Sin esta correccion los
 * imports apuntarian a `src/lib/`, que no existe.
 */
function rewriteImports(code) {
  return code
    .replace(/(['"])\.\.\/\.\.\/lib\//g, '$1../lib/')
    .replace(/(['"])\.\.\/\.\.\/components\//g, '$1./')
    .replace(/(['"])\.\/([A-Za-z0-9_-]+)\.tsx\1/g, '$1./$2$1');
}

const allFiles = await walk(sourceRoot);
const files = allFiles.filter((file) => {
  const name = file.split(/[\\/]/).pop();
  if (SKIPPED.has(name)) return false;
  if (!/\.tsx?$/.test(file)) return false;
  if (HAND_EDITED.has(file.replace(/\\/g, '/'))) return false;
  return true;
});
const converted = [];
const failed = [];
const skipped = [];

for (const file of files) {
  const source = join(sourceRoot, file);
  const relative = targetPathFor(file);
  const target = join(targetRoot, relative);
  const loader = extname(file) === '.tsx' ? 'tsx' : 'ts';

  const code = await readFile(source, 'utf8');
  try {
    // `jsx: 'preserve'` es lo que hace falta aqui: quita los tipos de TypeScript
    // y deja el JSX como JSX. Con la opcion por defecto esbuild compila el JSX a
    // llamadas `jsx(...)`, y con ella se pierden todos los comentarios que
    // explican por que cada pieza esta hecha como esta.
    const result = await transform(code, { loader, jsx: 'preserve', target: 'es2022' });
    const withHelpers = file.endsWith('geometry.ts') ? result.code + GEOMETRY_HELPERS : result.code;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, tidy(rewriteImports(withHelpers)), 'utf8');
    converted.push(`${file.replace(/\\/g, '/')} -> ${relative.replace(/\\/g, '/')}`);
  } catch (error) {
    // Un archivo que no convierte se reporta con su ruta: es preferible saber
    // cual es a que la conversion se detenga en silencio y deje la escena a medias.
    failed.push(`${file}: ${error.message?.split('\n')[0] ?? error}`);
  }
}

// La escena usaba `import COLORS from './palette'` con extension de TypeScript.
for (const file of converted) {
  // Nota: los imports ya apuntan a rutas relativas sin extension, que es lo que
  // espera el resto del proyecto.
}

console.log('Escena 3D convertida a JavaScript:');
for (const line of converted) console.log('  ', line);
for (const name of SKIPPED) skipped.push(name);
console.log('descartados a proposito:');
for (const name of skipped) {
  console.log(
    `   ${name} — ${
      name === 'App.tsx'
        ? 'se rehace como componente del proyecto principal'
        : name === 'main.tsx'
          ? 'arranque del proyecto aparte, con su propio #root'
          : 'texto 3D: el titular ya esta en el h1 de la pagina'
    }`,
  );
}

console.log('ajustados a mano (el conversor no los toca):');
for (const name of HAND_EDITED) {
  console.log(`   ${name} — se quito drei o el texto 3D`);
}

if (failed.length > 0) {
  console.log('\nNO CONVERTIDOS:');
  for (const line of failed) console.log('  ', line);
  process.exitCode = 1;
}
