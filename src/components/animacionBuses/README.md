# animacionbuses — origen de la escena 3D

Esta carpeta es el **proyecto de origen** de la maqueta de buses. Ya no es una
aplicación: es el fuente desde el que se genera `src/three/`.

## Qué pasó aquí

La maqueta nació como un proyecto de Vite aparte, con su propio `package.json`,
su `node_modules` de 286 MB y su `package-lock.json`. Eso significaba dos copias
de React, dos de Vite y dos conjuntos de `node_modules` en el mismo repositorio,
con versiones distintas de todo.

Se integró al proyecto principal y se quedó solo el fuente:

- `npm run convert:three` traduce estos `.ts` / `.tsx` a `src/three/**/*.js`.
  Usa el transformador de **esbuild** (ya dependencia del proyecto) en lugar de
  expresiones regulares: el archivo `lib/layout.ts` es sobre todo datos, y
  cualquier regex que quite anotaciones de tipo termina comiéndose también los
  valores.
- La escena vive ahora en `src/three/`, con `palette`, `materials`, `geometry`
  y `layout` como módulos JavaScript.
- La monta `src/components/BusSceneBackdrop.jsx`, que es un componente más del
  Home, cargado con `lazy()`.

## Lo que cambió al traducirla

Tres componentes de `@react-three/drei` se sustituyeron, y con ellos desaparece
esa dependencia:

| Original | Ahora | Por qué |
|---|---|---|
| `RoundedBox` | `roundedBoxGeometry` (`lib/geometry.js`) | `ExtrudeGeometry` con cache; ~350 cajas comparten geometría |
| `Line` | `Cable` con `TubeGeometry` (`scene/CableCar.jsx`) | WebGL ignora `linewidth`: una línea se ve de un píxel |
| `useFont` + `TextGeometry` | nada | El texto 3D se eliminó (ver abajo) |

`TerritoryText.tsx` no se tradujo. Dibujaba "Tu camino, sin adivinar." con
tipografía 3D extruida, y ese mismo titular ya está en el `<h1>` de la página,
donde se lee mejor, escala con el navegador y es accesible a un lector de
pantalla. Solo servía para arrastrar 90 KB de fuente (un `.typeface.json` de
68 KB y un `.woff` de 21 KB) y `three-stdlib` entero.

`App.tsx` y `main.tsx` tampoco: eran el arranque del proyecto aparte, con su
propio `#root` y su hoja de estilos.

## Cómo volver a traducirla

```bash
npm run convert:three
```

El conversor **no** toca estos tres archivos, porque se ajustaron a mano después
de la primera traducción:

- `components/scene/primitives.tsx` — se quitó `RoundedBox`
- `components/scene/CableCar.tsx` — se quitó `Line`
- `components/scene/MainScene.tsx` — se quitó `TerritoryText`

## Una advertencia sobre los comentarios

esbuild quita los tipos pero **reimprime el archivo**, y con ello se pierden los
comentarios. Los comentarios de estos `.tsx` explicaban por qué cada pieza está
hecha como está — decisiones de encuadre, de radios, de luz — y no sobrevivieron
a la traducción.

Los que sí importan se restauraron a mano en los tres archivos editados y en
`lib/geometry.js`. El resto del código traducido es correcto pero está menos
documentado que el original. A partir de ahora se edita `src/three/`, que es
donde vive la escena.
