import type { Type } from './lite.js';

export const Button: Type, Badge: Type, Card: Type, Alert: Type, Avatar: Type, Spinner: Type, Progress: Type,
  Skeleton: Type, Toggle: Type, TextField: Type, Select: Type, Tabs: Type, AccordionItem: Type, Modal: Type,
  Dropdown: Type, Table: Type, Pagination: Type, Stepper: Type, Rating: Type, Tooltip: Type, Toasts: Type;
import type { Signal } from './lite.js';
export class ToastService {
  items: Signal<Array<{ id: number; message: string; type: string }>>;
  show(message: string, type?: string, ms?: number): number;
  dismiss(id: number): void;
}
/** Every component, ready to pass to `imports`. */
export const all: Type[];
