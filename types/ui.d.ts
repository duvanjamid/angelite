import type { Type, Signal } from './angelite.js';

/** Every component class. Use them in a component's `imports`; their inputs and outputs are documented in the docs site. */
export const Button: Type, Badge: Type, Chip: Type, Avatar: Type, Divider: Type, Card: Type, Alert: Type, Spinner: Type, Progress: Type, Skeleton: Type, EmptyState: Type, TextField: Type, Textarea: Type, Select: Type, Checkbox: Type, RadioGroup: Type, Toggle: Type, Slider: Type, Rating: Type, Combobox: Type, Tabs: Type, Breadcrumb: Type, Pagination: Type, Stepper: Type, AccordionItem: Type, Dropdown: Type, Modal: Type, Drawer: Type, Popover: Type, Tooltip: Type, Toasts: Type, Table: Type, CodeBlock: Type;

export class ToastService {
  items: Signal<Array<{ id: number; message: string; type: string }>>;
  /** `ms: 0` keeps the toast until it is dismissed. Returns its id. */
  show(message: string, type?: 'info' | 'success' | 'warning' | 'error', ms?: number): number;
  dismiss(id: number): void;
  clear(): void;
}

/** Every component, ready to pass to `imports`. */
export const all: Type[];

/** Elements a keyboard can reach inside `root`. */
export function focusables(root: Element): HTMLElement[];
