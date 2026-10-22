import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, document, mountIn, tick } from './setup.mjs';

const { signal, component, mount, inject } = await import('../src/lite/index.js');
const ui = await import('../src/ui/index.js');

function page(template, init = () => ({}), proto = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  Object.assign(C.prototype, proto);
  component(C, { selector: 'x-page', imports: ui.all, template });
  return C;
}
const fire = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));

test('the stylesheet is injected once', () => {
  assert.equal(document.querySelectorAll('#angelite-ui-css').length, 1);
});

test('every exported component mounts without errors', async () => {
  assert.equal(ui.all.length, 21);
  for (const Comp of ui.all) {
    const tag = Comp.$meta.selector;
    const { root } = mountIn(mount, page(`<${tag}></${tag}>`));
    assert.ok(root.querySelector(tag), `${tag} rendered`);
  }
});

test('Button: variants, size, disabled and loading', async () => {
  const loading = signal(false);
  const { $ } = mountIn(mount, page(
    `<ui-button id="b" variant="primary" size="sm" [loading]="loading()">Save</ui-button>`, () => ({ loading })));
  const btn = $('#b').querySelector('button');
  assert.equal(btn.dataset.variant, 'primary');
  assert.equal(btn.dataset.size, 'sm');
  assert.equal(btn.textContent.trim(), 'Save');
  assert.equal(btn.disabled, false);
  loading.set(true); await tick();
  assert.equal(btn.disabled, true);
  assert.ok(btn.querySelector('.ui-spinner'));
});

test('Badge, Card, Avatar, Progress, Skeleton, Tooltip render their inputs', async () => {
  const { $, root } = mountIn(mount, page(
    `<ui-badge variant="success">ok</ui-badge>
     <ui-card title="T">body</ui-card>
     <ui-avatar name="Ada Lovelace"></ui-avatar>
     <ui-progress [value]="150"></ui-progress>
     <ui-skeleton [height]="20"></ui-skeleton>
     <ui-tooltip text="tip">hover</ui-tooltip>`));
  assert.equal(root.querySelector('.ui-badge').dataset.variant, 'success');
  assert.equal(root.querySelector('.ui-card h4').textContent, 'T');
  assert.equal(root.querySelector('.ui-card .body').textContent.trim(), 'body');
  assert.equal(root.querySelector('.ui-avatar').textContent.trim(), 'AL');
  assert.equal(root.querySelector('.ui-progress i').style.width, '100%', 'value is clamped');
  assert.equal(root.querySelector('.ui-skeleton').style.height, '20px');
  assert.equal(root.querySelector('.ui-tip').dataset.text, 'tip');
  void $;
});

test('Alert: dismissible alerts hide themselves and emit closed', async () => {
  const log = [];
  const { root } = mountIn(mount, page(
    `<ui-alert type="warning" [dismissible]="true" (closed)="log('x')">careful</ui-alert>`, () => ({}), { log(x) { log.push(x); } }));
  assert.equal(root.querySelector('.ui-alert').dataset.type, 'warning');
  root.querySelector('.ui-alert button').click(); await tick();
  assert.equal(root.querySelector('.ui-alert'), null);
  assert.deepEqual(log, ['x']);
});

test('Toggle and Rating are controlled: they emit, the parent decides', async () => {
  const on = signal(false), stars = signal(1);
  const { root } = mountIn(mount, page(
    `<ui-toggle [checked]="on()" (changed)="on.set($event)" label="L"></ui-toggle><ui-rating [value]="stars()" (valueChange)="stars.set($event)"></ui-rating>`,
    () => ({ on, stars })));
  root.querySelector('.ui-toggle').click(); await tick();
  assert.equal(on(), true);
  assert.equal(root.querySelector('.ui-toggle').dataset.on, 'true');
  root.querySelectorAll('.ui-rating button')[3].click(); await tick();
  assert.equal(stars(), 4);
  assert.equal(root.querySelectorAll('.ui-rating button.on').length, 4);
});

test('TextField and Select report changes and show errors/options', async () => {
  const email = signal(''), country = signal('mx');
  const { root } = mountIn(mount, page(
    `<ui-text-field label="Email" [value]="email()" [error]="email() ? '' : 'required'" (valueChange)="email.set($event)"></ui-text-field>
     <ui-select [options]="opts" [value]="country()" (valueChange)="country.set($event)"></ui-select>`,
    () => ({ email, country, opts: [{ value: 'es', label: 'Spain' }, { value: 'mx', label: 'Mexico' }, 'plain'] })));
  assert.equal(root.querySelector('.err').textContent, 'required');
  const input = root.querySelector('.ui-field input');
  input.value = 'a@b.c'; fire(input, 'input'); await tick();
  assert.equal(email(), 'a@b.c');
  assert.equal(root.querySelector('.err'), null);
  const select = root.querySelector('select');
  assert.deepEqual([...select.options].map(o => o.textContent), ['Spain', 'Mexico', 'plain']);
  assert.equal(select.value, 'mx');
  select.value = 'es'; fire(select, 'change'); await tick();
  assert.equal(country(), 'es');
});

test('Tabs, Pagination and Stepper navigate through outputs', async () => {
  const tab = signal('a'), page_ = signal(1), step = signal(0);
  const { root } = mountIn(mount, page(
    `<ui-tabs [tabs]="tabs" [active]="tab()" (activeChange)="tab.set($event)"></ui-tabs>
     <ui-pagination [total]="25" [pageSize]="10" [page]="page_()" (pageChange)="page_.set($event)"></ui-pagination>
     <ui-stepper [steps]="['one','two','three']" [current]="step()"></ui-stepper>`,
    () => ({ tab, page_, step, tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] })));
  root.querySelectorAll('.ui-tabs button')[1].click(); await tick();
  assert.equal(tab(), 'b');
  assert.ok(root.querySelectorAll('.ui-tabs button')[1].classList.contains('active'));
  const pager = () => [...root.querySelectorAll('.ui-pager button')];
  assert.equal(pager().length, 5, 'prev + 3 pages + next');
  assert.equal(pager()[0].disabled, true, 'prev disabled on first page');
  pager()[3].click(); await tick();
  assert.equal(page_(), 3);
  assert.equal(pager()[4].disabled, true, 'next disabled on last page');
  step.set(1); await tick();
  assert.equal(root.querySelectorAll('.ui-stepper .st.done').length, 1);
  assert.equal(root.querySelector('.ui-stepper .st.now').textContent.includes('two'), true);
});

test('Accordion and Dropdown open/close and keep projected content alive', async () => {
  const picked = signal('');
  const { root } = mountIn(mount, page(
    `<ui-accordion-item title="Q">answer</ui-accordion-item>
     <ui-dropdown label="Menu" [items]="items" (picked)="picked.set($event)"></ui-dropdown>`,
    () => ({ picked, items: ['one', 'two'] })));
  assert.equal(root.querySelector('.ui-acc .body'), null);
  root.querySelector('.ui-acc > button').click(); await tick();
  assert.equal(root.querySelector('.ui-acc .body').textContent.trim(), 'answer');
  root.querySelector('.ui-acc > button').click(); await tick();
  root.querySelector('.ui-acc > button').click(); await tick();
  assert.equal(root.querySelector('.ui-acc .body').textContent.trim(), 'answer', 'content survives toggling');
  root.querySelector('.ui-dd > button').click(); await tick();
  const items = [...root.querySelectorAll('.ui-dd .menu button')];
  assert.deepEqual(items.map(i => i.textContent), ['one', 'two']);
  items[1].click(); await tick();
  assert.equal(picked(), 'two');
  assert.equal(root.querySelector('.ui-dd .menu'), null, 'menu closes after picking');
});

test('Modal: opens, closes from the X, the backdrop and not from inside the dialog', async () => {
  const open = signal(true);
  const { root } = mountIn(mount, page(
    `<ui-modal title="Hi" [open]="open()" (closed)="open.set(false)"><p id="inside">content</p></ui-modal>`, () => ({ open })));
  assert.equal(root.querySelector('.ui-modal header span').textContent, 'Hi');
  root.querySelector('#inside').click(); await tick();
  assert.equal(open(), true, 'clicking inside does not close');
  root.querySelector('.ui-backdrop').click(); await tick();
  assert.equal(open(), false);
  assert.equal(root.querySelector('.ui-modal'), null);
  open.set(true); await tick();
  assert.equal(root.querySelector('#inside').textContent, 'content', 'content is back on reopen');
  root.querySelector('.ui-modal header button').click(); await tick();
  assert.equal(open(), false);
});

test('Table sorts ascending, then descending, by clicking a header', async () => {
  const { root } = mountIn(mount, page(
    `<ui-table [columns]="cols" [rows]="rows"></ui-table>`,
    () => ({ cols: [{ key: 'n', label: 'Name' }, { key: 'v', label: 'Val' }], rows: [{ n: 'b', v: 2 }, { n: 'c', v: 3 }, { n: 'a', v: 1 }] })));
  const names = () => [...root.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent);
  assert.deepEqual(names(), ['b', 'c', 'a']);
  root.querySelectorAll('th')[0].click(); await tick();
  assert.deepEqual(names(), ['a', 'b', 'c']);
  root.querySelectorAll('th')[0].click(); await tick();
  assert.deepEqual(names(), ['c', 'b', 'a']);
  root.querySelectorAll('th')[1].click(); await tick();
  assert.deepEqual(names(), ['a', 'b', 'c'], 'switching column resets to ascending');
});

test('ToastService + Toasts: show, auto-dismiss and manual dismiss', async () => {
  const toasts = inject(ui.ToastService);
  const { root } = mountIn(mount, page(`<ui-toasts></ui-toasts>`));
  toasts.show('saved', 'success', 30);
  const id = toasts.show('error!', 'error', 5000);
  await tick();
  assert.deepEqual([...root.querySelectorAll('.ui-toast')].map(t => t.dataset.type), ['success', 'error']);
  await new Promise(r => setTimeout(r, 60));
  assert.equal(root.querySelectorAll('.ui-toast').length, 1, 'first one timed out');
  toasts.dismiss(id); await tick();
  assert.equal(root.querySelectorAll('.ui-toast').length, 0);
});
