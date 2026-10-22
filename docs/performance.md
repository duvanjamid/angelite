# Rendimiento: cómo añadir funciones sin dañarlo

El objetivo es que **cada función nueva llegue sin que el núcleo se vuelva más lento, más grande o más hambriento de
memoria**. Para eso hay cuatro capas de control, de la más barata a la más cara, y unas reglas de diseño.

## Las cuatro capas

| Capa | Qué mide | Dónde corre | Ruido |
|---|---|---|---|
| 1. Tamaño | Bytes gzip de cada bundle (`npm run size`) y de **lo que realmente se envía** a un usuario: la app de la tabla con esbuild (`npm run size:apps`) | CI, en cada PR | ninguno |
| 2. Trabajo | Llamadas al DOM y ejecuciones de efectos por escenario (1.000 filas): `tests/perf-budget.test.mjs` contra `tests/perf-budget.json` | CI (`npm test`), en cada PR | ninguno: es determinista |
| 3. Tiempo relativo | AngeLite frente a Preact **en la misma ejecución** (`npm run perf`, workflow `perf.yml`); se compara el cociente con `benchmarks/baseline.json`: falla una operación suelta si empeora más de un 35 %, o la media geométrica de todas si empeora más de un 10 % | a demanda, semanal y en PR que tocan el núcleo; no bloquea | medio (una operación sola varía hasta ~30 %; la media, mucho menos) |
| 4. Benchmark completo | Los cinco frameworks, 12 mediciones, memoria y arranque (`benchmarks/run.mjs`) | a mano, antes de publicar; actualiza `docs/benchmarks.html` | alto: hay que leerlo con la regla del 10 % |

Por qué así: el tiempo en un runner compartido varía un 10–20 % de una ejecución a otra, así que no sirve para frenar un
PR por unos pocos puntos. Lo que sí es exacto es **cuánto trabajo hace el núcleo**: si una función añade una llamada al
DOM por fila o una evaluación más por operación, la capa 2 lo ve aunque el tiempo no se mueva. Y lo que sí es exacto
también es el tamaño. El tiempo relativo (capa 3) caza lo que las otras no ven (por ejemplo, un acceso a propiedad
nuevo en un bucle caliente) y la capa 4 es la que se publica.

### Capa 2 en detalle

`tests/perf-budget.test.mjs` monta la app de la tabla con **todos los módulos opcionales cargados** (portal, `@defer`,
animaciones…) y cuenta, por escenario, las llamadas a `createElement`, `cloneNode`, `appendChild`, `insertBefore`,
`remove`, `after`, `before`, `setAttribute`, `classList.toggle`, `data =`, `textContent =`, `addEventListener`… y las
ejecuciones de `Effect.run`. También comprueba que el compilador del navegador y la plantilla precompilada hacen
**exactamente** el mismo trabajo. Hoy (1.000 filas):

| Escenario | Llamadas al DOM | Efectos |
|---|---|---|
| crear 1.000 | 5.002 | 1.001 |
| reemplazar 1.000 | 5.004 | 1.001 |
| actualizar 1 de cada 10 | 100 | 101 |
| seleccionar una fila | 1 | 1.000 |
| intercambiar 2 filas | 2 | 1 |
| eliminar una fila | 1 | 1 |
| añadir 1.000 | 5.000 | 1.001 |
| vaciar | 4 | 1 |

Si un cambio sube cualquier cifra, el test falla y dice cuál. Si es a propósito, se explica en el PR y se ejecuta
`UPDATE_PERF=1 npm test`, que reescribe el presupuesto en el mismo commit. Si **baja**, el test lo avisa para que se
fije la mejora (el presupuesto solo debe moverse con una razón escrita).

## Reglas de diseño para funciones nuevas

1. **Módulo opcional por defecto.** Una función que no todas las apps usan va en su propio archivo y se engancha por el
   registro `ops` (instrucciones de plantilla como `portal`, `defer`, `anim`) o por un módulo que solo se importa si se
   usa (`forms`, `http`, `i18n`). Así una app que no la importa no la paga, ni en bytes ni en tiempo. Es lo que pasa
   con las 14 funciones de las olas 1 y 2.
2. **No tocar los caminos calientes sin medir.** Son `instantiate`, `runView`, `ForState.reconcile` y `removeView`. Una
   propiedad nueva en cada fila o en cada nodo, o una llamada extra por binding, se multiplica por miles. Si de verdad
   hace falta, la capa 2 y la 3 deben demostrar que no se nota.
3. **Pagar por componente o por plantilla, no por fila.** El trabajo que se puede hacer una vez al compilar (el AOT lo
   hace en el build) o una vez al crear un componente es casi gratis; el que se hace por fila no lo es.
4. **Cuidado con la forma de los objetos.** Añadir campos a `View`, al contexto o a los elementos cambia su forma y
   puede frenar todo lo que los toca. Los campos opcionales se crean solo cuando se usan (así se hizo con los
   proveedores de DI: el mapa se crea al primer `inject`).
5. **Los avisos de desarrollo no van en el núcleo.** `enableDevWarnings()` los pone envolviendo `A.prop`, `A.state` y
   `ops` desde fuera; la versión de producción no incluye ni un byte de ellos.
6. **Cada byte del núcleo se discute.** Los presupuestos están en `scripts/check-size.mjs` y `scripts/check-app-size.mjs`
   y solo suben en el commit que explica por qué.

## Qué cuesta hoy cada función del núcleo

Medido sobre la app precompilada de la tabla (gzip): antes de la ola 1, 5.968 B; hoy, 6.223 B (+255 B, **+4 %**).

| Pieza | Aprox. | Por qué está en el núcleo |
|---|---|---|
| Contexto de componente + `reportError` (límites de error) | ~110 B | errores, DI con ámbitos y slots lo comparten |
| Registro `ops` y su despacho | ~55 B | permite que portales, `@defer`, refs y animaciones no pesen si no se usan |
| Slots con nombre | ~40 B | cambia cómo se proyecta el contenido |
| `detach` (salida animada) y `host.$c` (DevTools) | ~28 B | gancho mínimo para dos módulos opcionales |

Lo demás (portales, `@defer`, refs, formularios, HTTP, i18n, animaciones, DevTools, SSR, testing) no aparece en esa
app: son 0,1–1,4 KB cada uno, solo para quien los importa.

## Cómo medir

```bash
npm test                 # incluye el presupuesto de trabajo (capa 2)
npm run size && npm run size:apps       # capa 1
npm run perf             # capa 3: construye y mide AngeLite y Preact, compara con benchmarks/baseline.json (unos 5 minutos)
cd benchmarks && node build.mjs && node run.mjs      # capa 4, a mano
```

Actualizar el punto de comparación de la capa 3 se hace a propósito, tras una corrida completa limpia:
`node benchmarks/compare.mjs --update benchmarks/results.json`.

## Mejoras de rendimiento pendientes, con datos

Ordenadas por lo que el presupuesto de trabajo ya muestra:

- **Seleccionar una fila ejecuta 1.000 efectos.** Cada fila lee `selected()` y se reevalúa entera para cambiar una
  clase en dos filas. Cuesta ~1,3 ms (empata con Preact y Angular), pero es el mejor candidato: efectos por binding
  solo para los que leen señales externas a la fila.
- **`remove`/`swap` rondan el empate con Preact** (4,5–5,2 ms según la corrida). Falta un perfil con el modo de
  trazas de Chromium para separar ruido de coste real antes de tocar nada.
- **`create1k`: 5 llamadas al DOM por fila.** `cloneNode`, `append`, dos `data =` (los huecos de texto) y un
  `classList.toggle` inicial que no cambia nada. Los dos últimos se pueden saltar (empezar los textos con su valor
  en la plantilla y no alternar una clase a `false`).
- **Arranque:** 22–25 ms frente a 21 de Preact en esta máquina. El techo es el análisis del script; reducir bytes del
  núcleo es lo único que lo mueve.
