import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountIn, tick } from './setup.mjs';

const angelite = await import('../src/full.js');
const { createI18n } = await import('../src/i18n.js');
const { component, mount, signal } = angelite;

const messages = {
  en: { hello: 'Hello, {name}!', nav: { home: 'Home' }, items: { one: '{count} item', other: '{count} items' }, none: { zero: 'no items', one: 'one', other: '{count}' }, only: 'only english' },
  es: { hello: '¡Hola, {name}!', nav: { home: 'Inicio' }, items: { one: '{count} elemento', other: '{count} elementos' } },
  'pt-BR': { hello: 'Olá, {name}!' }
};

test('t(): parameters, nested keys, plurals, missing params and keys', () => {
  const i = createI18n({ locale: 'es', fallback: 'en', messages });
  assert.equal(i.t('hello', { name: 'Ada' }), '¡Hola, Ada!');
  assert.equal(i.t('hello'), '¡Hola, {name}!', 'a missing parameter stays visible');
  assert.equal(i.t('nav.home'), 'Inicio');
  assert.equal(i.t('items', { count: 1 }), '1 elemento');
  assert.equal(i.t('items', { count: 3 }), '3 elementos');
  assert.equal(i.t('missing.key'), 'missing.key');
  assert.equal(i.t('only'), 'only english', 'falls back to the fallback locale');
  i.setLocale('en');
  assert.equal(i.t('none', { count: 0 }), 'no items', 'zero form when present');
  assert.equal(i.t('none', { count: 1 }), 'one');
  assert.equal(i.t('none', { count: 5 }), '5');
});

test('regional locales fall back to their language and then to the fallback', () => {
  const i = createI18n({ locale: 'es-MX', fallback: 'en-US', messages });
  assert.equal(i.t('hello', { name: 'x' }), '¡Hola, x!', 'es-MX -> es');
  i.setLocale('pt-BR');
  assert.equal(i.t('hello', { name: 'x' }), 'Olá, x!');
  assert.equal(i.t('nav.home'), 'Home', 'en-US -> en');
});

test('flat keys with dots and an object message without matching category', () => {
  const i = createI18n({ messages: { en: { 'a.b': 'flat', pl: { other: 'many' } } } });
  assert.equal(i.t('a.b'), 'flat');
  assert.equal(i.t('pl', { count: 1 }), 'many', 'falls back to "other"');
  const odd = createI18n({ messages: { en: { weird: { x: 'y' } } } });
  assert.equal(odd.t('weird', { count: 2 }), '');
});

test('load(): objects, lazy functions and modules with a default export', async () => {
  const i = createI18n({ locale: 'fr', fallback: 'en', messages: { en: { hi: 'hi' } } });
  assert.equal(i.t('hi'), 'hi');
  await i.load('fr', async () => ({ default: { hi: 'salut' } }));
  assert.equal(i.t('hi'), 'salut');
  await i.load('de', { hi: 'hallo' });
  i.setLocale('de');
  assert.equal(i.t('hi'), 'hallo');
});

test('formatting follows the locale: number, date and relative time', () => {
  const i = createI18n({ locale: 'de-DE' });
  assert.equal(i.number(1234.5), '1.234,5');
  assert.match(i.number(0.5, { style: 'percent' }), /^50\s%$/);
  assert.match(i.date(new Date(Date.UTC(2020, 0, 15, 12))), /2020/);
  assert.match(i.date('2020-01-15T12:00:00Z', { year: 'numeric' }), /2020/);
  assert.equal(createI18n({ locale: 'en' }).relative(-1), 'yesterday');
  assert.equal(createI18n({ locale: 'en' }).relative(2, 'hour'), 'in 2 hours');
});

test('templates re-render when the locale changes; pipes t, num and date are bound to the instance', async () => {
  const i18n = createI18n({ locale: 'en', messages });
  i18n.installPipes();
  const count = signal(1);
  // object literals are not part of the expression language, so use the pipe forms
  class App2 { constructor() { this.count = count; this.n = 1234.5; this.d = new Date(Date.UTC(2020, 0, 15, 12)); } }
  component(App2, {
    selector: 'x-i18n2',
    template: '<p id="a">{{ \'nav.home\' | t }}</p><p id="b">{{ \'items\' | t:count() }}</p><p id="c">{{ n | num }}</p><p id="d">{{ d | date:\'long\' }}</p><p id="e">{{ n | num:\'x\' }}</p>'
  });
  const { text } = mountIn(mount, App2);
  assert.equal(text('#a'), 'Home');
  assert.equal(text('#b'), '1 item');
  count.set(4);
  await tick();
  assert.equal(text('#b'), '4 items');
  i18n.setLocale('es');
  await tick();
  assert.equal(text('#a'), 'Inicio');
  assert.equal(text('#b'), '4 elementos');
  assert.equal(text('#c'), '1234,5');
  assert.match(text('#d'), /2020/);
});

test('a component can call t() directly and re-renders with the locale', async () => {
  const i18n = createI18n({ locale: 'en', messages });
  class App { constructor() { this.i18n = i18n; } label() { return i18n.t('hello', { name: 'Ada' }); } }
  component(App, { selector: 'x-i18n3', template: '<p id="a">{{ label() }}</p>' });
  const { text } = mountIn(mount, App);
  assert.equal(text('#a'), 'Hello, Ada!');
  i18n.setLocale('es');
  await tick();
  assert.equal(text('#a'), '¡Hola, Ada!');
});

test('messages are text: HTML in a message or in a parameter is never rendered as markup', async () => {
  const i18n = createI18n({ messages: { en: { bold: '<b>{who}</b>' } } });
  class App { constructor() { this.i18n = i18n; } label() { return i18n.t('bold', { who: '<img src=x onerror=alert(1)>' }); } }
  component(App, { selector: 'x-i18nsec', template: '<p id="a">{{ label() }}</p>' });
  const { $ } = mountIn(mount, App);
  assert.equal($('#a').querySelector('b'), null);
  assert.equal($('#a').querySelector('img'), null);
  assert.equal($('#a').textContent, '<b><img src=x onerror=alert(1)></b>');
});
