# AngeLite Lite frente a React, Preact, Vue y Angular

Qué tienen ellos que nosotros no, qué tenemos nosotros que ellos no, y en qué orden conviene cerrar la brecha.
La tabla completa está en [`benchmarks.html`](benchmarks.html#features) (37 filas, con la fuente de cada dato).

## Cómo se comprobó

Cada afirmación lleva una fuente:

- **V** — comprobado en esta sesión: ejecutando el código o leyendo el paquete instalado
  (React 19.3.1, Preact 10.29.8, Vue 3.5.44, Angular 20.3). Las pruebas de seguridad se pueden repetir con
  `cd benchmarks && npm install && npm run probe:security`.
- **D** — documentación oficial.
- **G** — conocimiento general que no se comprobó aquí. Revísalo antes de citarlo.

De las 37 filas de la tabla: 16 son V, 2 son D y 19 son G. Las filas de seguridad son casi todas V.

## Resumen

1. **Estado: los seis huecos de seguridad que encontramos están cerrados** (ver la sección 1), con un test real para cada uno
   y para su variante precompilada. Lite pasa de peor a mejor del grupo en las pruebas de ataque que ejecutamos.
2. **Donde ganamos es tamaño, memoria y velocidad de listas** (ver el benchmark). Somos además el único con
   un modo «sin build» pequeño: ~9 KB gzip frente a 63,7 KB de Vue con su compilador, y sin `eval`.
3. **Donde perdemos es todo lo que rodea al núcleo**: tipos, SSR, router, formularios, herramientas, comunidad.
   La tabla nos da 19,5 de 38 frente a 24,5 (Preact), 27 (Vue), 28,5 (React) y 33 (Angular). No es un ranking, pero la brecha es real.

## 1. Seguridad

### Lo que comprobamos que hace cada uno

Se repite con `cd benchmarks && npm install && npm run probe:security`.

| Prueba | Lite (antes) | **Lite (ahora)** | Preact | Vue | React | Angular |
|---|---|---|---|---|---|---|
| Texto escapado por defecto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `href` con `javascript:` | pasaba | **`unsafe:` + aviso** | pasa | pasa | lo neutraliza | lo sanea |
| `onclick` como texto | creaba el atributo | **error de compilación** | no lo crea | crea el atributo | no lo crea | lo prohíbe |
| HTML en `innerHTML` | sin sanear | **solo con `trustHtml()`; si no, texto** | sin sanear | sin sanear | sin sanear | sanea |
| Expresiones llegan a `window` | sí, vía `$el` | **no, por ningún camino** | n/a (JSX) | no | n/a (JSX) | no |
| Funciona sin `eval` | sí | **sí** | sí | solo la build runtime-only | sí | solo AOT; el JIT usa `new Function` |
| Trusted Types | no | **sí (política `angelite`)** | no | una referencia | no | integrado |
| Estilos bajo CSP estricta | `<style>` sin nonce | **hojas construibles; fallback con nonce** | n/a | n/a | n/a | nonce |

Vue y Preact siguen sin cerrar las URL; solo React y Angular lo hacen. Con estos cambios Lite cierra todo lo que cierran ellos,
más lo que nadie más hace (compilación que rechaza bindings peligrosos, valor-guardia contra `window`).

### Cómo se cerró cada hueco

| # | Hueco | Cierre | Test |
|---|---|---|---|
| 1 | `[href]` / `href="{{ }}"` aceptaban `javascript:` | Lista de esquemas (`http`, `https`, `mailto`, `tel`, `sms`, `ftp`, relativas) en `href`, `src`, `action`, `formaction`, `data` y `xlink:href`; ignora los caracteres que los navegadores descartan dentro del esquema (`java\tscript:`); el resto pasa a `unsafe:<url>` con aviso. `trustUrl()` como salida explícita. | matriz de 12 URLs peligrosas y 13 seguras en 7 contextos |
| 2 | `[attr.onclick]` creaba un manejador | Error de compilación para `[on*]`, `[attr.on*]` y `on*="{{ }}"`, en el compilador del navegador y en el AOT | 5 variantes, también con mayúsculas |
| 3 | `[innerHTML]` sin sanear | Solo se renderiza si está envuelto en `trustHtml()`; cualquier otro valor se inserta como texto y avisa | 3 tests |
| 4 | `[srcdoc]` aceptado | Error de compilación (y `[outerHTML]`) | 3 tests |
| 5 | Una plantilla llegaba a `window` con `$el.ownerDocument.defaultView.fn()` | Filtro **por valor**: el objeto global y los documentos nunca se devuelven a una plantilla, vengan de donde vengan (`$el.ownerDocument`, `$event.view`, `getRootNode()`, `composedPath()[n]`, un campo del componente). Además, métodos del DOM que convierten texto en marcado o atributos (`insertAdjacentHTML`, `setAttribute`, `write`…) quedan bloqueados por nombre. | 8 caminos de ataque + eventos |
| 6 | El paquete UI inyectaba `<style>` sin nonce | `adoptedStyleSheets` (no necesita nonce); si no existen, `<style>` con el nonce de `<meta name="csp-nonce">` | 3 tests |

Además: bindings e interpolación en `<script>`, `<style>`, `<base>`, `<link>` y `<meta>` son error de compilación;
Trusted Types con una única política `angelite` para las plantillas y `trustHtml()`; `SECURITY.md` con el modelo de confianza y
cómo reportar; CodeQL con consultas ampliadas, Dependabot y `npm audit` en el CI.

### Lo que queda (y es honesto)

- **El sandbox de expresiones no es un límite de seguridad.** Una plantilla sigue pudiendo llamar métodos de su componente y de
  los elementos que alcance. Es defensa en profundidad: **nunca se compilan plantillas con datos de usuario** (Vue dice lo mismo).
  En producción, precompila con `tools/aot.mjs`: no se compila nada en el navegador.
- **No incluimos un sanitizador de HTML.** Angular trae uno; nosotros exigimos `trustHtml()` y recomendamos DOMPurify
  antes de envolver. Incluir un sanitizador propio costaría varios KB y es fácil equivocarse.
- **Sin revisión externa ni historial.** Los demás llevan años de auditorías; nosotros, no.
- **El framework antiguo (`src/angelite.js` y sus carpetas) no está endurecido** y está deprecado. Usa `lite`.

### Qué tienen ellos que nosotros no (seguridad)

- **Angular**: un sanitizador de HTML y URL por contexto integrado, años de revisión de seguridad.
- **Todos**: procesos de divulgación consolidados y una comunidad que encuentra y corrige fallos.

## 2. Velocidad y rendimiento

Medido: somos primeros o empatados en la mayoría de operaciones de filas y los más ligeros en memoria.
Lo que **no** tenemos:

| Falta | Quién lo tiene | Qué aportaría |
|---|---|---|
| Optimizaciones de compilación (subárboles estáticos elevados, constantes plegadas, banderas por nodo) | Vue (patch flags + hoisting), React Compiler, Angular AOT | Menos trabajo por actualización; hoy el AOT precompila pero no optimiza |
| Renderizado concurrente y transiciones | React | Interfaz fluida con actualizaciones pesadas. **No lo recomendamos copiar**: la complejidad es enorme para un framework ligero |
| SSR e hidratación | React, Vue, Angular (incluida la incremental), Preact (paquete aparte) | Primer pintado y SEO. Ver la ventaja arquitectónica abajo |
| Carga diferida declarativa (`@defer`, `lazy`) | Todos | Dividir el código |
| Detección de regresiones de rendimiento en CI | — | Hoy el benchmark es manual: una PR podría empeorar la velocidad sin que nadie lo vea |

Límites propios que conviene conocer (verificados en el código):

- **Un efecto por vista, no por binding.** Una señal que cambia re-evalúa todos los bindings de esa vista
  (solo escribe en el DOM si el valor cambió). En filas con pocos bindings es lo más barato; en un componente
  con cientos de bindings y una señal que cambia muchas veces por segundo puede costar. Vue y Solid son más finos.
- **Listas inmutables.** Se compara identidad: mutar un array en el sitio y volver a asignar el mismo no actualiza.
- **Ruido de la medición.** Los números salen de un contenedor compartido y sin pintado; las diferencias
  menores del 10 % no son concluyentes.

Ideas para seguir mejorando (en este orden): elevar subárboles estáticos en el AOT, scope plano en las filas
(menos objetos por fila), propiedades internas con nombre reducido (~0,5 KB), y arranque más rápido (hoy
empatamos con Preact con 28 ms).

## 3. Arquitectura y estructura (mirándolo como arquitecto)

Puntos débiles reales del diseño actual:

1. **Estado global de módulo.** El registro de pipes, el mapa de servicios de `inject()`, el router, el conjunto de
   eventos delegados y el enganche del router son singletons. No se puede tener dos aplicaciones aisladas en la misma
   página, ni renderizar en servidor sin mezclar peticiones, ni ejecutar tests en paralelo con garantías.
   *Dirección*: un objeto `app` (`createApp()`) que contenga registros, inyector y router.
2. **Acoplamiento al DOM global.** El runtime llama a `document` directamente. Eso impide SSR y otros renderizadores.
   *Dirección*: abstraer las pocas operaciones DOM (crear plantilla, insertar, mover, quitar).
3. **Dos bases de código.** El framework antiguo (~7.000 líneas, `src/angelite.js`) convive con Lite. Duplica conceptos y
   mantenimiento, y los tests del antiguo son humo y lógica de formularios. *Dirección*: congelarlo, marcarlo como
   deprecado y portar a Lite lo que valga (formularios reactivos, guards y resolvers del router).
4. **Ámbito por cadena de prototipos y claves de texto.** Cada fila crea un objeto con prototipo del padre y las
   expresiones buscan por nombre. Es rápido y compacto, pero no se puede analizar estáticamente (sin tipos, sin
   comprobación de plantillas) y `$event` / `$index` pueden colisionar con campos del usuario.
5. **Eventos delegados en `document`.** Es lo que da la memoria baja, pero no funciona dentro de Shadow DOM ni iframes
   y `event.currentTarget` no es el elemento. *Dirección*: delegar en la raíz de cada app (no en `document`).
6. **Propiedades añadidas a los elementos** (`$s`, `$click`…) pueden colisionar con otras librerías. *Dirección*:
   un `WeakMap` o prefijo con símbolo, si la medición lo permite.
7. **Sin contrato de versionado ni de API estable**, sin tipos y sin modo desarrollo con avisos. Es lo que más frena
   su adopción, más que cualquier medida de rendimiento.

Qué tienen ellos aquí que nosotros no: inyección de dependencias con ámbitos (Angular, Vue, React con Context),
router completo (rutas anidadas, guards, carga diferida), formularios reactivos, cliente HTTP, TypeScript de
primera clase, comprobación de plantillas en compilación, límites de error, portales, animaciones, slots con nombre,
referencias a hijos, i18n, DevTools, utilidades de testing y CLI.

### Una ventaja arquitectónica que sí tenemos

El **blueprint es datos**: el AOT ya serializa la lista de instrucciones por posición de nodo. Eso hace que
**SSR e hidratación sean un paso natural**: renderizar a texto evaluando las instrucciones sin DOM, y en el cliente
recorrer el DOM existente con las mismas instrucciones (la numeración por posición ya existe). Pocos frameworks
tienen esa base; hay que aprovecharla antes de añadir más funciones.

## 4. Lo que tenemos y ellos no (o no tanto)

Todo verificado:

- **Modo «sin build» pequeño**: 8,3 KB gzip con compilador incluido, frente a 63,7 KB de la build con compilador de Vue.
  Angular no tiene equivalente utilizable (su compilador JIT es grande y usa `new Function`).
- **Sin `eval` ni `new Function` en ningún bundle**, también en el modo sin build. La build con compilador de Vue y el
  JIT de Angular sí los usan, y requieren `unsafe-eval` en CSP.
- **Cero dependencias de runtime** (Vue: 5, Angular: `tslib` más peers, React: `scheduler`).
- **Memoria**: 6,4 MB con 10.000 filas frente a 11,8 – 17,8 MB.
- **Un mismo código en dos modos** (navegador y precompilado) con un compilador de plantillas con backend intercambiable.
- **Sintaxis de Angular (`@if`, `@for`, señales) sin Zone.js ni CLI.**
- **Bloqueo de `constructor`, `__proto__` y `prototype`** en las expresiones.

Hay que ser honestos con el peso real de esto: casi todo son ventajas de tamaño, memoria y simplicidad. En
funciones, ecosistema y madurez estamos muy por detrás.

## 5. Hoja de ruta propuesta

Esfuerzo: S = horas, M = días, L = semanas.

**P0 — seguridad y confianza (S–M):**

1. Sanear URL en bindings y atributos interpolados (hueco 1). *S*
2. Rechazar `on*` y `srcdoc` (huecos 2 y 4). *S*
3. `[innerHTML]` solo con `trustHtml()` (hueco 3). *S*
4. Denylist de globales en el evaluador y documentación sobre plantillas no confiables (hueco 5). *S*
5. `SECURITY.md`. *S*
6. `adoptedStyleSheets` en el paquete UI (hueco 6). *S*
7. Política opcional de Trusted Types para el compilador del navegador. *M*

Al arreglar cada uno, quitar el `todo` de su test en `tests/security.test.mjs`.

**P1 — que sea adoptable (M):**

8. Tipos `.d.ts` (JSDoc más `tsc --emitDeclarationOnly`).
9. Modo desarrollo con avisos (etiqueta desconocida, input inexistente, URL insegura, claves duplicadas) y un gancho
   de errores por componente y global.
10. Router: rutas anidadas, guards y resolvers (portarlos del código antiguo), carga diferida, parámetros de consulta
    y modo `history`.
11. Formularios reactivos sobre señales (portar los validadores).
12. Utilidades de testing (`renderComponent`, `flush`).
13. Slots con nombre, referencias (`viewChild`) y portales.
14. `createApp()` con registros e inyector por aplicación (arregla el estado global).

**P2 — plataforma y rendimiento (L):**

15. SSR e hidratación sobre los blueprints.
16. `@defer` y componentes perezosos.
17. Optimizaciones del AOT: subárboles estáticos elevados, scope plano, constantes plegadas.
18. Gancho para DevTools y un panel mínimo.
19. Presupuesto de rendimiento en CI con métricas deterministas (número de operaciones DOM por escenario), no tiempos.
20. Retirar el código antiguo.

**P3 — según demanda:** transiciones y animaciones, i18n, virtual scroll, plugin de Vite, servicio de lenguaje
para el editor.

**Qué no copiar:** Zone.js; reactividad profunda por proxies (más lenta y más memoria); renderizado concurrente completo;
un cliente HTTP al estilo Angular (basta `fetch`).
