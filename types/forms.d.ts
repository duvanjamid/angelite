import type { Signal, ReadonlySignal } from './angelite.js';

export type ValidationErrors = Record<string, any> | null;
export type Validator<T = any> = (value: T) => ValidationErrors;

export const Validators: {
  required: Validator;
  minLength(n: number): Validator;
  maxLength(n: number): Validator;
  min(n: number): Validator;
  max(n: number): Validator;
  pattern(re: RegExp): Validator;
  email: Validator;
  /** The value must equal what `other()` returns. */
  matches(other: () => unknown): Validator;
};

interface Control<T> {
  readonly value: ReadonlySignal<T> | Signal<T>;
  readonly errors: ReadonlySignal<ValidationErrors>;
  readonly valid: ReadonlySignal<boolean>;
  readonly touched: ReadonlySignal<boolean>;
  readonly dirty: ReadonlySignal<boolean>;
  touch(): void;
}

export class FormControl<T = any> implements Control<T> {
  constructor(initial?: T, validators?: Validator<T>[]);
  readonly value: Signal<T>;
  readonly errors: ReadonlySignal<ValidationErrors>;
  readonly valid: ReadonlySignal<boolean>;
  readonly touched: Signal<boolean>;
  readonly dirty: ReadonlySignal<boolean>;
  initial: T;
  touch(): void;
  setValue(value: T): void;
  reset(value?: T): void;
}

export class FormGroup<T extends Record<string, any> = Record<string, any>> implements Control<T> {
  constructor(controls: Record<string, any>, validators?: Validator<T>[]);
  readonly controls: Record<string, any>;
  readonly value: ReadonlySignal<T>;
  readonly errors: ReadonlySignal<ValidationErrors>;
  readonly valid: ReadonlySignal<boolean>;
  readonly touched: ReadonlySignal<boolean>;
  readonly dirty: ReadonlySignal<boolean>;
  /** `get('address.street')` walks nested groups. */
  get(path: string): any;
  touch(): void;
  setValue(value: Partial<T>): void;
  reset(value?: Partial<T>): void;
}

export class FormArray<T = any> implements Control<T[]> {
  constructor(controls?: any[], validators?: Validator<T[]>[]);
  /** Call it to read the current list: `array.controls()`. */
  readonly controls: Signal<any[]>;
  readonly value: ReadonlySignal<T[]>;
  readonly errors: ReadonlySignal<ValidationErrors>;
  readonly valid: ReadonlySignal<boolean>;
  readonly touched: ReadonlySignal<boolean>;
  readonly dirty: ReadonlySignal<boolean>;
  at(index: number): any;
  push(control: any): void;
  removeAt(index: number): void;
  touch(): void;
  setValue(values: T[]): void;
  reset(): void;
}
