/** Type definitions for AngeLite Lite (`@duvanjamid/angelite/lite`). */

/* ---------- signals ---------- */

export interface ReadonlySignal<T> {
  (): T;
  /** Reads the value without subscribing the running effect. */
  peek(): T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  set(value: T): void;
  update(fn: (current: T) => T): void;
}

export function signal<T>(initial: T): Signal<T>;
export function signal<T = undefined>(): Signal<T | undefined>;
export function computed<T>(fn: () => T): ReadonlySignal<T>;
/** Runs `fn` now and whenever the signals it reads change. `fn` may return a cleanup function. Returns a stop function. */
export function effect(fn: () => void | (() => void), owner?: Array<() => void>): () => void;
export function untracked<T>(fn: () => T): T;

/* ---------- components ---------- */

export type Type<T = any> = abstract new (...args: any[]) => T;

export interface ClassProvider { provide: Type; useClass: Type }
export interface ValueProvider { provide: Type; useValue: unknown }
export interface FactoryProvider { provide: Type; useFactory: () => unknown }
/** A class (instantiated lazily, once per component) or an explicit provider. */
export type Provider = Type | ClassProvider | ValueProvider | FactoryProvider;

/** The function produced by `tools/aot.mjs` for a template. */
export type AotTemplate = (components: Record<string, Type>, kit: object) => object;

export interface ComponentMeta {
  /** Tag name, default `app-root`. */
  selector?: string;
  /** Template source (compiled in the browser). Use `aot` for precompiled templates. */
  template?: string;
  aot?: AotTemplate;
  /** Components used in the template. */
  imports?: Type[];
  /** Services scoped to this component and its descendants. */
  providers?: Provider[];
}

export function component<T extends Type>(Class: T, meta: ComponentMeta): T;
/** Decorator form: `@Component({ ... }) class X {}` */
export function Component(meta: ComponentMeta): <T extends Type>(Class: T) => T;

export interface MountedApp<T = any> {
  /** The component instance. */
  instance: T;
  destroy(): void;
}
export function mount<T>(Comp: Type<T>, el: Element, up?: object | null): MountedApp<T>;

/** A writable signal a parent can bind with `[name]="expr"`. */
export function input<T>(initial: T): Signal<T>;

export interface OutputEmitter<T = void> {
  emit(value: T): void;
  subscribe(fn: (value: T) => void): () => void;
}
/** An event a parent can bind with `(name)="handler($event)"`. */
export function output<T = void>(): OutputEmitter<T>;

/** Lifecycle hooks a component class may implement. */
export interface OnInit { ngOnInit(): void }
export interface AfterViewInit { ngAfterViewInit(): void }
export interface OnDestroy { ngOnDestroy(): void }
/**
 * Error boundary: receives errors thrown by the component's bindings and event handlers, and by the content
 * projected into it. `where` is e.g. "template expression" or "(click)".
 */
export interface OnError { ngOnError(error: unknown, where: string): void }

/* ---------- dependency injection ---------- */

export function inject<T>(Token: Type<T>): T;
export function provide<T>(Token: Type<T>, value: T): void;

/* ---------- security ---------- */

export interface TrustedValue { readonly kind: 'html' | 'url'; readonly value: string }
/** Marks HTML you have already sanitized so `[innerHTML]` renders it. */
export function trustHtml(html: string): TrustedValue;
/** Allows a URL with a scheme outside the default list. */
export function trustUrl(url: string): TrustedValue;
export function sanitizeUrl(value: unknown, attr: string): string;

/* ---------- pipes ---------- */

export function registerPipe(name: string, fn: (value: any, ...args: any[]) => any): void;

/* ---------- template references ---------- */

/** Receives the element (or component instance) of `#name` in the template; null while it is not rendered. */
export function viewChild<T = Element>(name: string): Signal<T | null>;

/* ---------- router ---------- */

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  route: Route;
}
/** Return true to allow, false to stay, or a path to redirect to. */
export type RouteGuard = (to: RouteContext) => boolean | string | void | Promise<boolean | string | void>;

export interface Route {
  /** `users/:id`, `''` for an index route, `**` for anything else. */
  path: string;
  component?: Type;
  /** Code splitting: loaded on the first visit. Resolves to the component or to a module with a default export. */
  load?: () => Promise<Type | { default: Type }>;
  children?: Route[];
  canActivate?: RouteGuard[];
  /** Data loaded before the page renders; read it with `router.data()`. */
  resolve?: Record<string, (to: RouteContext) => unknown | Promise<unknown>>;
  redirectTo?: string;
}

export interface Router {
  readonly path: Signal<string>;
  /** `?page=2` as `{ page: '2' }`. */
  readonly query: ReadonlySignal<Record<string, string>>;
  /** What the matched routes' `resolve` functions returned. */
  readonly data: Signal<Record<string, any>>;
  readonly current: ReadonlySignal<{ component: Type | undefined; params: Record<string, string> } | null>;
  params(): Record<string, string>;
  navigate(to: string, options?: { replace?: boolean }): void;
}
export const router: Router;
export interface RouterOptions {
  /** `hash` (default) works on any static host; `history` uses real paths and needs server support. */
  mode?: 'hash' | 'history';
  /** Path prefix in history mode, e.g. `/app`. */
  base?: string;
}
export function provideRouter(routes: Route[], options?: RouterOptions): Router;

/* ---------- development ---------- */

/** Logs mistakes that are otherwise silent (unknown inputs, duplicate @for keys, unknown elements). Call it in development only. */
export function enableDevWarnings(log?: (message: string) => void): void;
