<p align="center">
  <img src="./assets/images/angelite-logo.svg" alt="AngeLite" width="160">
</p>

<h1 align="center">AngeLite</h1>

<p align="center">
  Un framework de señales con plantillas al estilo de Angular: pequeño, rápido y seguro.
</p>

<p align="center">
  <a href="https://duvanjamid.github.io/angelite-docs/">Documentación</a> ·
  <a href="https://duvanjamid.github.io/angelite-docs/ui.html">Componentes</a> ·
  <a href="https://duvanjamid.github.io/angelite-docs/benchmarks.html">Benchmark</a>
</p>

## Por qué AngeLite

- **Pequeño:** el núcleo pesa unos 6 KB gzip con las plantillas precompiladas (Preact: 6,2 KB).
- **Rápido:** actualiza solo lo que cambia, sin Zone.js ni DOM virtual. Un presupuesto de rendimiento en el CI evita que una función nueva lo dañe.
- **Seguro por defecto:** la interpolación siempre es texto, las URL se filtran, no usa `eval` ni `new Function` y funciona con Trusted Types.
- **Completo, pero a la carta:** formularios, HTTP, i18n, animaciones, router, SSR, DevTools y 33 componentes accesibles son módulos opcionales; solo pagas por los que importas.

## Empezar

```bash
npm install @duvanjamid/angelite
```

```js
import { signal, component, mount } from '@duvanjamid/angelite';

class Counter {
  count = signal(0);
  inc() { this.count.update(n => n + 1); }
}

component(Counter, {
  selector: 'app-counter',
  template: `<button (click)="inc()">Clics: {{ count() }}</button>`
});

mount(Counter, document.body);
```

Sin bundler, con una etiqueta `<script>`:

```html
<script src="https://unpkg.com/@duvanjamid/angelite/dist/angelite.min.js"></script>
<script>
  const { signal, component, mount } = AngeLite;
</script>
```

## Módulos

| Importa | Para |
|---|---|
| `@duvanjamid/angelite` | señales, plantillas (`@if`, `@for`, `@defer`), componentes, DI, pipes y router |
| `@duvanjamid/angelite/runtime` | solo el runtime, para plantillas precompiladas |
| `@duvanjamid/angelite/forms` | formularios reactivos |
| `@duvanjamid/angelite/http` | cliente HTTP, interceptores y `resource()` |
| `@duvanjamid/angelite/i18n` | idiomas, plurales y formatos |
| `@duvanjamid/angelite/ui` | biblioteca de 33 componentes accesibles |
| `@duvanjamid/angelite/testing` | utilidades de test |
| `@duvanjamid/angelite/devtools` | inspector de componentes y señales |
| `@duvanjamid/angelite/hydrate` | hidratación de HTML renderizado en el servidor |
| `@duvanjamid/angelite/tools/aot.mjs` | compilador de plantillas para el build |
| `@duvanjamid/angelite/tools/ssr.mjs` | renderizado en servidor |
| `@duvanjamid/angelite/tools/vite.mjs` | plugin de Vite |

La guía completa, con ejemplos que se ejecutan, está en <https://duvanjamid.github.io/angelite-docs/>
(repositorio: [`angelite-docs`](https://github.com/duvanjamid/angelite-docs)).

## Desarrollo

```bash
npm ci
npm run build       # genera dist/
npm test            # tests unitarios y de seguridad
npm run typecheck   # tipos del paquete
npm run size        # presupuesto de tamaño
npm run perf        # benchmark rápido frente a Preact
```

Lee [CONTRIBUTING.md](./CONTRIBUTING.md) antes de abrir un PR y [SECURITY.md](./SECURITY.md) para el modelo de seguridad.

## Licencia

MIT
