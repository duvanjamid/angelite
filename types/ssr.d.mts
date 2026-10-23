import type { Type } from './lite.js';

export interface RenderOptions {
  /** Request URL (path and query) the router should see. */
  url?: string;
  /** `mount` of the AngeLite runtime your app uses; defaults to the bundled full build. */
  mount?: (Comp: Type, el: Element) => { instance: any; destroy(): void };
  /** HTML shell; `<!--app-->` marks where the app goes (or it needs an element matching `selector`). */
  shell?: string;
  /** Runs before the component is mounted, with the DOM globals in place (set up the router here). */
  setup?: () => unknown;
  /** Called with the component instance; await your data here. */
  ready?: (instance: any) => unknown;
  /** Extra macrotask turns to wait after `ready` (default 2). */
  settle?: number;
  selector?: string;
}
export function renderToString(Comp: Type, options?: RenderOptions): Promise<string>;
export function renderPage(Comp: Type, options: RenderOptions & { shell: string; state?: unknown }): Promise<string>;
/** JSON safe to embed in a <script> tag. */
export function serializeState(state: unknown): string;
