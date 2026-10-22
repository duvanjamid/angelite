import type { Signal } from './lite.js';

export type Messages = { [key: string]: string | Messages };

export interface I18n {
  readonly locale: Signal<string>;
  /** `params.count` selects the plural form when the message is an object (`one`, `other`...). */
  t(key: string, params?: Record<string, string | number>): string;
  setLocale(locale: string): void;
  load(locale: string, source: Messages | (() => Promise<Messages | { default: Messages }>)): Promise<void>;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number | string, options?: Intl.DateTimeFormatOptions): string;
  relative(value: number, unit?: Intl.RelativeTimeFormatUnit): string;
  /** Registers the pipes `t`, `num` and `date` bound to this instance. */
  installPipes(): void;
}

export function createI18n(options?: { locale?: string; fallback?: string; messages?: Record<string, Messages> }): I18n;
