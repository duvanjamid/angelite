/** Built-in pipes (opt-in: importing this module registers them). Add your own with registerPipe(name, fn). */

import { pipes } from './runtime.js';

const date = (v, style) => {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return '';
  return style === 'long'
    ? d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
    : style === 'time'
      ? d.toLocaleTimeString()
      : d.toLocaleDateString();
};

Object.assign(pipes, {
  uppercase: v => String(v ?? '').toUpperCase(),
  lowercase: v => String(v ?? '').toLowerCase(),
  titlecase: v => String(v ?? '').replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
  json: v => JSON.stringify(v, null, 2),
  number: (v, digits) => new Intl.NumberFormat(undefined, { maximumFractionDigits: digits ?? 3 }).format(v),
  percent: v => new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(v),
  currency: (v, code = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(v),
  slice: (v, start, end) => (v == null ? v : v.slice(start, end)),
  date
});
