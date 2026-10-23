# AngeLite

Un framework de señales con plantillas al estilo de Angular: pequeño, rápido y seguro.

```bash
npm install @duvanjamid/angelite
```

```js
import { signal, component, mount } from '@duvanjamid/angelite';

class Counter {
  count = signal(0);
  inc() { this.count.update(n => n + 1); }
}
component(Counter, { selector: 'app-counter', template: `<button (click)="inc()">{{ count() }}</button>` });
mount(Counter, document.body);
```

Documentación: <https://duvanjamid.github.io/angelite-docs/> · Código: <https://github.com/duvanjamid/angelite> · Licencia MIT
