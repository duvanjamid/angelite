import type { Type } from './angelite.js';

export interface RenderOptions {
  /** Inputs to set (signals get `.set(value)`; other properties are assigned). */
  props?: Record<string, unknown>;
  /** Services visible to the whole tree: `[[Api, fakeApi]]`. */
  provide?: Array<[Type, unknown]>;
  /** Container element. By default a new <div> in document.body. */
  into?: Element;
}

export interface Rendered<T = any> {
  container: Element;
  host: Element | null;
  instance: T;
  $(selector: string): Element | null;
  $$(selector: string): Element[];
  text(target: string | Element): string;
  click(target: string | Element): void;
  /** Types into an input/textarea/select (fires `input` and `change`), or sets a checkbox. */
  type(target: string | Element, value: string | boolean): void;
  fire(target: string | Element, type: string, init?: EventInit): boolean;
  /** Resolves after pending signal updates have reached the DOM. */
  flush(): Promise<void>;
  unmount(): void;
}

export function render<T>(Comp: Type<T>, options?: RenderOptions): Rendered<T>;
export function fire(el: Element, type: string, init?: EventInit): boolean;
export function flush(): Promise<void>;
/** Unmounts everything rendered so far (use in afterEach). */
export function cleanup(): void;
