/**
 * The components page, built with AngeLite itself (Lite core + AngeLite UI).
 * Content lives in components-data.js; this file only holds the app.
 */
const { signal, computed, component, mount, input } = AngeLite;
const ui = AngeLiteUI;

const PRELUDE = 'const { signal, computed, component, input, output, inject } = AngeLite; const ui = AngeLiteUI;\n';

/** Runs an example's code into its own box and shows the source on demand. */
class Playground {
  code = input('');
  showCode = signal(false);
  handles = [];

  toggle() { this.showCode.update(v => !v); }

  ngAfterViewInit() {
    const root = this.$el.querySelector('.demo');
    // Track every mount() the example makes so it is destroyed with this component.
    const tracked = (Comp, el) => {
      const handle = mount(Comp, el);
      this.handles.push(handle);
      return handle;
    };
    try {
      new Function('AngeLite', 'AngeLiteUI', 'mount', 'root', PRELUDE + this.code())(
        { ...AngeLite, mount: tracked }, ui, tracked, root);
    } catch (e) {
      root.textContent = 'Error: ' + e.message;
    }
  }

  ngOnDestroy() { this.handles.forEach(h => h.destroy()); }
}
component(Playground, {
  selector: 'docs-playground',
  imports: [ui.Button],
  template: `
    <div class="example">
      <div class="demo"></div>
      <div class="bar"><ui-button size="sm" variant="ghost" (click)="toggle()">{{ showCode() ? 'Ocultar código' : 'Ver código' }}</ui-button></div>
      @if (showCode()) {<pre><code>{{ code() }}</code></pre>}
    </div>`
});

/** One component's documentation block. */
class DocSection {
  item = input(null);
  columns = [
    { key: 'name', label: 'Nombre' }, { key: 'kind', label: 'Tipo' },
    { key: 'type', label: 'Valores' }, { key: 'desc', label: 'Descripción' }
  ];
}
component(DocSection, {
  selector: 'docs-section',
  imports: [Playground, ui.Badge, ui.Table],
  template: `
    <section [id]="item().id">
      <h3>{{ item().title }} <ui-badge>{{ item().tag }}</ui-badge></h3>
      <p>{{ item().desc }}</p>
      <docs-playground [code]="item().code"></docs-playground>
      @if (item().api.length) {<ui-table [columns]="columns" [rows]="item().api"></ui-table>}
    </section>`
});

class App {
  query = signal('');
  total = window.DOCS.reduce((n, g) => n + g.items.length, 0);

  groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    return window.DOCS
      .map(g => ({
        group: g.group,
        items: g.items.filter(i => !q || (i.title + ' ' + i.tag + ' ' + i.desc).toLowerCase().includes(q))
      }))
      .filter(g => g.items.length);
  });
  shown = computed(() => this.groups().reduce((n, g) => n + g.items.length, 0));

  // Rendered through {{ }} so the braces inside the snippet are shown, not evaluated.
  usage = `<script src="angelite-lite.min.js"></script>
<script src="angelite-ui.min.js"></script>
<script>
  const { component, mount, signal } = AngeLite;
  const ui = AngeLiteUI;

  class MiApp { n = signal(0); }
  component(MiApp, {
    imports: [ui.Button],             // o: imports: ui.all
    template: '<ui-button variant="primary" (click)="n.set(n() + 1)">Clicks: {{ n() }}</ui-button>'
  });
  mount(MiApp, document.body);
</script>`;
}
component(App, {
  selector: 'docs-app',
  imports: [DocSection, ui.TextField],
  template: `
    <div class="layout">
      <aside>
        <a class="brand" href="index.html">AngeLite <span class="accent">UI</span></a>
        @for (g of groups(); track g.group) {
          <div class="grp">{{ g.group }}</div>
          @for (i of g.items; track i.id) {<a [href]="'#' + i.id">{{ i.title }}</a>}
        }
        <div class="grp">Más</div>
        <a href="index.html">Guía de Lite</a>
        <a href="benchmarks.html">Benchmarks</a>
      </aside>
      <main>
        <h1>Componentes</h1>
        <p class="lead">{{ total }} páginas de componentes listas para usar, construidas con AngeLite Lite. JS + CSS de la librería: ~5 KB gzip. <b>Esta misma página es una app de AngeLite</b> (mira <code>components-app.js</code>): el menú, el buscador, las secciones y las tablas de API son componentes y señales.</p>
        <ui-text-field label="Buscar componente" placeholder="p. ej. modal, tabla, formulario…"
          [value]="query()" (valueChange)="query.set($event)"></ui-text-field>
        <p class="small">Mostrando {{ shown() }} de {{ total }}.</p>

        @for (g of groups(); track g.group) {
          <h2 class="group">{{ g.group }}</h2>
          @for (i of g.items; track i.id) {<docs-section [item]="i"></docs-section>}
        } @empty {
          <p class="note">Ningún componente coincide con «{{ query() }}».</p>
        }
        <h2 class="group">Uso</h2>
        <pre class="plain"><code>{{ usage }}</code></pre>
        <p class="note">Los componentes son controlados: el valor vive en tu señal y el componente avisa con un <code>output</code>. Los colores salen de variables CSS <code>--ui-*</code> y respetan el modo oscuro. Las expresiones de plantilla no admiten funciones flecha: usa métodos de la clase.</p>
      </main>
    </div>`
});

mount(App, document.getElementById('app'));
