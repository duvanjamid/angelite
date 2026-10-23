export interface DevtoolsNode {
  name: string;
  el: Element;
  instance: any;
  state: Record<string, unknown>;
  children: DevtoolsNode[];
}
export interface DevtoolsApi {
  tree(root?: Element): DevtoolsNode[];
  inspect(el: Element): any;
  state(instance: any): Record<string, unknown>;
  /** Sets a signal field; returns false if it is not a signal. */
  set(instance: any, key: string, value: unknown): boolean;
  closePanel?: () => void;
}
export function enableDevtools(options?: { panel?: boolean }): DevtoolsApi;
