/**
 * Internationalization on signals: translations, plurals (Intl.PluralRules) and number/date formatting.
 * Reading `t()` inside a template makes it re-render when the locale or the messages change.
 *
 *   const i18n = createI18n({ locale: 'es', fallback: 'en', messages: {
 *     en: { hello: 'Hello, {name}!', items: { one: '{count} item', other: '{count} items' } },
 *     es: { hello: '¡Hola, {name}!', items: { one: '{count} elemento', other: '{count} elementos' } }
 *   } });
 *
 *   i18n.t('hello', { name: 'Ada' })      // "¡Hola, Ada!"
 *   i18n.t('items', { count: 3 })         // "3 elementos"
 *   i18n.setLocale('en');
 *   await i18n.load('fr', () => import('./fr.json'));   // lazy locales
 *
 * With `installPipes(i18n)`: {{ 'hello' | t }} and {{ 'items' | t:count }} work in templates too.
 */

import { signal } from './signals.js';
import { registerPipe } from './runtime.js';

const lookup = (messages, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), messages) ?? messages[key];

export function createI18n({ locale = 'en', fallback = locale, messages = {} } = {}) {
  const current = signal(locale);
  const catalog = signal(messages);

  const format = (template, params) => String(template).replace(/\{(\w+)\}/g, (_, k) => (params && params[k] != null ? params[k] : `{${k}}`));

  function find(key, loc) {
    const all = catalog();
    const lang = loc.split('-')[0];
    return [all[loc], all[lang], all[fallback], all[fallback.split('-')[0]]].map(m => m && lookup(m, key)).find(v => v != null);
  }

  const i18n = {
    locale: current,
    /** Translates `key`. A message that is an object is a plural set (`zero`, `one`, `two`, `few`, `many`, `other`) chosen with `params.count`. */
    t(key, params) {
      const loc = current();
      let message = find(key, loc);
      if (message == null) return key;
      if (typeof message === 'object') {
        const n = params && params.count;
        const category = n === 0 && message.zero != null ? 'zero' : new Intl.PluralRules(loc).select(n);
        message = message[category] ?? message.other ?? '';
      }
      return format(message, params);
    },
    setLocale(next) { current.set(next); },
    /** Adds or replaces messages for a locale; `source` may be an object or a function returning a promise of one. */
    async load(loc, source) {
      const mod = typeof source === 'function' ? await source() : source;
      catalog.update(all => ({ ...all, [loc]: mod && mod.default ? mod.default : mod }));
    },
    number: (value, options) => new Intl.NumberFormat(current(), options).format(value),
    date: (value, options = { dateStyle: 'medium' }) => new Intl.DateTimeFormat(current(), options).format(value instanceof Date ? value : new Date(value)),
    relative(value, unit = 'day') { return new Intl.RelativeTimeFormat(current(), { numeric: 'auto' }).format(value, unit); }
  };

  /** Registers the pipes `t`, `num` and `date` bound to this instance. */
  i18n.installPipes = () => {
    registerPipe('t', (key, count) => i18n.t(key, typeof count === 'object' && count !== null ? count : count == null ? undefined : { count }));
    registerPipe('num', (v, options) => i18n.number(v, options));
    registerPipe('date', (v, options) => i18n.date(v, typeof options === 'string' ? { dateStyle: options } : options));
  };
  return i18n;
}
