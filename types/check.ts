// Compiled by `npm run typecheck`: the public API must accept the documented usage and reject mistakes.
import {
  signal, computed, effect, untracked, component, Component, mount, input, output, inject, provide, viewChild,
  trustHtml, trustUrl, sanitizeUrl, registerPipe, provideRouter, router, enableDevWarnings
} from '../src/lite/full.js';
import type { OnInit, OnDestroy, OnError, Route, RouteGuard, Signal } from './lite.js';
import { render, cleanup, flush } from '../src/lite/testing.js';
import { all, Button, ToastService } from '../src/ui/index.js';
import { compileTemplate, checkTemplate, aotPlugin } from '../tools/aot.mjs';
import { FormControl, FormGroup, FormArray, Validators } from '../src/lite/forms.js';
import { createHttp, retry, resource, HttpError } from '../src/lite/http.js';
import { createI18n } from '../src/lite/i18n.js';
import { enableDevtools } from '../src/lite/devtools.js';
import { hydrate } from '../src/lite/hydrate.js';
import { renderToString, renderPage, serializeState } from '../tools/ssr.mjs';
import vitePlugin from '../tools/vite.mjs';
import { checkFolder } from '../tools/check.mjs';

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

// wave 2
const form = new FormGroup({ name: new FormControl('', [Validators.required, Validators.minLength(2)]), tags: new FormArray([new FormControl('a')]) });
const nameValid: boolean = form.get('name').valid();
const formValue = form.value();
form.get('name').value.set('x');
form.setValue({ name: 'y' });
form.touch();
const http = createHttp({ baseUrl: '/api', interceptors: [retry(2), (req, next) => next({ ...req, headers: { ...req.headers, A: 'b' } })] });
async function load() {
  const u = await http.get<{ id: number }>('/users', { params: { page: 1 }, timeout: 500 });
  const id: number = u.id;
  await http.post('/users', { name: 'x' });
  try { await http.get('/x'); } catch (e) { if (e instanceof HttpError) console.log(e.status); }
}
const users = resource(() => http.get<string[]>('/users'));
const list: string[] | undefined = users.data();
users.reload();
const i18n = createI18n({ locale: 'es', fallback: 'en', messages: { en: { hi: 'Hi' } } });
const hi: string = i18n.t('hi', { name: 'x', count: 2 });
i18n.setLocale('en');
i18n.installPipes();
const tools = enableDevtools({ panel: true });
tools.tree()[0]?.children;
hydrate(Counter, document.body).destroy();
renderToString(Counter, { url: '/a', setup: () => {}, ready: i => i, settle: 1 }).then((html: string) => html);
renderPage(Counter, { shell: '<!--app-->', state: { a: 1 } });
const safe2: string = serializeState({});
vitePlugin({ members: 'auto', check: 'error' }).enforce;
checkFolder('src', { members: 'auto' })[0]?.message;
provideRouter([{ path: 'a', component: Counter, resolve: { user: ({ params }) => params.id } }], { mode: 'history', base: '/app' });
router.navigate('/x', { replace: true });
const q: Record<string, string> = router.query();

// mistakes the types must catch
// @ts-expect-error validators take a number
Validators.minLength('3');
// @ts-expect-error get() paths are strings
form.get(3);
// @ts-expect-error the router mode is hash or history
provideRouter([], { mode: 'memory' });
// @ts-expect-error interceptors receive a request and next
createHttp({ interceptors: [() => 1] });

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

export { html, url, safe, n, id, ui, bad, missing, Decorated, nameValid, formValue, load, list, hi, safe2, q };
export type { Signal };
