import type { Type, MountedApp } from './lite.js';
/** Replaces the server-rendered markup in `el` with the live app. */
export function hydrate<T>(Comp: Type<T>, el: Element): MountedApp<T>;
