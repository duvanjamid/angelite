// Compiled by `npm run typecheck`: the public API must accept the documented usage and reject mistakes.
import {
  signal, computed, effect, untracked, component, Component, mount, input, output, inject, provide, viewChild,
  trustHtml, trustUrl, sanitizeUrl, registerPipe, provideRouter, router, enableDevWarnings
} from '../src/lite/full.js';
import type { OnInit, OnDestroy, OnError, Route, RouteGuard, Signal } from './lite.js';
import { render, cleanup, flush } from '../src/lite/testing.js';
import { all, Button, ToastService } from '../src/ui/index.js';
import { compileTemplate, checkTemplate, aotPlugin } from '../tools/aot.mjs';

class Api { get() { return 1; } }

class Counter implements OnInit, OnDestroy, OnError {
  start = input(0);
  count = signal(0);
  double = computed(() => this.count() * 2);
  changed = output<number>();
  box = viewChild<HTMLInputElement>('box');
  api = inject(Api);
  ngOnInit() { this.count.set(this.start()); }
  ngOnDestroy() {}
  ngOnError(error: unknown, where: string) { console.log(error, where); }
}
component(Counter, { selector: 'app-counter', template: '<b>{{ count() }}</b>', providers: [Api, { provide: Api, useValue: new Api() }] });

@Component({ selector: 'app-x', template: '' })
class Decorated {}

const app = mount(Counter, document.body);
const n: number = app.instance.double();
app.instance.changed.emit(1);
app.instance.box()?.focus();
app.destroy();

effect(() => { count: app.instance.count(); return () => {}; });
untracked(() => app.instance.count.peek());
provide(Api, new Api());
registerPipe('twice', (v: number) => v * 2);
const html = trustHtml('<b>x</b>'), url = trustUrl('app:open'), safe: string = sanitizeUrl('x', 'href');

const guard: RouteGuard = async ({ params }) => (params.id === '1' ? true : '/login');
const routes: Route[] = [
  { path: '/', component: Counter },
  { path: 'a', load: () => import('../src/lite/full.js').then(() => Counter), canActivate: [guard], children: [{ path: '', component: Counter }] },
  { path: 'old', redirectTo: '/' }
];
provideRouter(routes);
router.navigate('/a');
const id: string | undefined = router.params().id;
enableDevWarnings();

async function test() {
  const t = render(Counter, { props: { start: 2 }, provide: [[Api, new Api()]] });
  t.click('button');
  await t.flush();
  const s: string = t.text('b');
  t.type('input', 'x');
  cleanup();
  await flush();
}

const ui = [Button, ...all];
new ToastService().show('hi', 'info', 100);
compileTemplate('<p></p>', { components: ['ui-button'], check: 'error' });
checkTemplate('<p></p>', { members: ['a'] });
aotPlugin({ members: 'auto' });

// mistakes the types must catch
// @ts-expect-error a signal holds one type
app.instance.count.set('text');
// @ts-expect-error computed signals are read-only
app.instance.double.set(1);
// @ts-expect-error the template is a string
component(Counter, { template: 42 });
// @ts-expect-error guards return boolean | string
const bad: RouteGuard = () => 42;
// @ts-expect-error routes need a path
const missing: Route = { component: Counter };
// @ts-expect-error trustHtml takes a string
trustHtml(5);
// @ts-expect-error emit() takes the declared payload
app.instance.changed.emit('x');

export { html, url, safe, n, id, ui, bad, missing, Decorated };
export type { Signal };
