import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, document, mountIn, tick } from './setup.mjs';

const { signal, component, mount, inject } = await import('../src/lite/index.js');
const ui = await import('../src/ui/index.js');

let n = 0;
function page(template, init = () => ({}), proto = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  Object.assign(C.prototype, proto);
  component(C, { selector: `x-uipage${++n}`, imports: ui.all, template });
  return C;
}
const fire = (el, type, init) => el.dispatchEvent(new window.Event(type, { bubbles: true, ...init }));
const key = (el, k, init) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

test('the stylesheet is injected once', () => {
  assert.equal(document.querySelectorAll('#angelite-ui-css').length + (document.documentElement.hasAttribute('data-angelite-ui') ? 1 : 0), 1);
});

test('every exported component mounts without errors', async () => {
  assert.equal(ui.all.length, 33);
  for (const Comp of ui.all) {
    const tag = Comp.$meta.selector;
    const { root } = mountIn(mount, page(`<${tag}></${tag}>`));
    assert.ok(root.querySelector(tag), `${tag} rendered`);
  }
});

test('Button: variants, size, type, block, disabled and loading (aria-busy)', async () => {
  const loading = signal(false);
  const { $ } = mountIn(mount, page(`<ui-button id="b" variant="primary" size="sm" type="submit" [block]="true" [loading]="loading()">Save</ui-button>`, () => ({ loading })));
  const btn = $('#b').querySelector('button');
  assert.equal(btn.dataset.variant, 'primary');
  assert.equal(btn.dataset.size, 'sm');
  assert.equal(btn.type, 'submit');
  assert.equal(btn.dataset.block, 'true');
  assert.equal(btn.textContent.trim(), 'Save');
  assert.equal(btn.disabled, false);
  assert.equal(btn.getAttribute('aria-busy'), null);
  loading.set(true); await tick();
  assert.equal(btn.disabled, true);
  assert.equal(btn.getAttribute('aria-busy'), 'true');
  assert.ok(btn.querySelector('.ui-spinner'));
});

test('Badge, Chip, Avatar, Divider, Card, Skeleton, EmptyState render their inputs', async () => {
  const removed = signal(0);
  const { root } = mountIn(mount, page(
    `<ui-badge variant="success" [dot]="true">ok</ui-badge>
     <ui-chip [removable]="true" (removed)="removed.set(removed() + 1)">tag</ui-chip><ui-chip>plain</ui-chip>
     <ui-avatar name="Ada Lovelace" status="online"></ui-avatar><ui-avatar name="X" src="/a.png" shape="square" [size]="50"></ui-avatar>
     <ui-divider label="or"></ui-divider><ui-divider></ui-divider>
     <ui-card title="T">body<span slot="footer">foot</span></ui-card>
     <ui-skeleton [height]="20" width="50%" [circle]="true"></ui-skeleton>
     <ui-empty-state title="Nothing" description="Try again"><b id="act">act</b></ui-empty-state>`, () => ({ removed })));
  assert.equal(root.querySelector('.ui-badge').dataset.variant, 'success');
  assert.ok(root.querySelector('.ui-badge .dot'));
  assert.equal(root.querySelectorAll('.ui-chip').length, 2);
  assert.equal(root.querySelectorAll('.ui-chip button').length, 1, 'only the removable chip has a button');
  root.querySelector('.ui-chip button').click(); await tick();
  assert.equal(removed(), 1);
  const avatars = root.querySelectorAll('.ui-avatar');
  assert.equal(avatars[0].textContent.trim(), 'AL');
  assert.equal(avatars[0].getAttribute('aria-label'), 'Ada Lovelace');
  assert.equal(avatars[0].querySelector('.st').dataset.s, 'online');
  assert.equal(avatars[1].querySelector('img').getAttribute('src'), '/a.png');
  assert.equal(avatars[1].dataset.shape, 'square');
  assert.equal(avatars[1].style.width, '50px');
  const dividers = root.querySelectorAll('.ui-divider');
  assert.equal(dividers[0].textContent.trim(), 'or');
  assert.equal(dividers[0].dataset.plain, 'false');
  assert.equal(dividers[1].dataset.plain, 'true');
  assert.equal(root.querySelector('.ui-card h4').textContent, 'T');
  assert.equal(root.querySelector('.ui-card .body').textContent.trim(), 'body');
  assert.equal(root.querySelector('.ui-card .foot').textContent.trim(), 'foot');
  const sk = root.querySelector('.ui-skeleton');
  assert.equal(sk.style.height, '20px');
  assert.equal(sk.style.width, '50%');
  assert.equal(sk.dataset.circle, 'true');
  assert.equal(root.querySelector('.ui-empty h4').textContent, 'Nothing');
  assert.equal(root.querySelector('.ui-empty p').textContent, 'Try again');
  assert.ok(root.querySelector('#act'));
});

test('Alert: urgent types use role=alert, others role=status; dismissible hides and emits', async () => {
  const log = [];
  const { root } = mountIn(mount, page(
    `<ui-alert id="w" type="warning" title="Careful" [dismissible]="true" closeLabel="Close" (closed)="log('x')">msg</ui-alert><ui-alert id="i" type="info">fyi</ui-alert>`, () => ({}), { log(x) { log.push(x); } }));
  const w = root.querySelector('#w .ui-alert');
  assert.equal(w.getAttribute('role'), 'alert');
  assert.equal(w.dataset.type, 'warning');
  assert.equal(w.querySelector('.ttl').textContent, 'Careful');
  assert.equal(root.querySelector('#i .ui-alert').getAttribute('role'), 'status');
  const close = w.querySelector('button');
  assert.equal(close.getAttribute('aria-label'), 'Close');
  close.click(); await tick();
  assert.equal(root.querySelector('#w .ui-alert'), null);
  assert.deepEqual(log, ['x']);
});

test('Progress: clamps, labels, max, indeterminate; Spinner has a status role', async () => {
  const { root } = mountIn(mount, page(
    `<ui-progress id="a" [value]="150" label="Upload" variant="success"></ui-progress><ui-progress id="b" [value]="5" [max]="20"></ui-progress><ui-progress id="c" [indeterminate]="true" label="Wait"></ui-progress><ui-spinner label="Loading data"></ui-spinner>`));
  const bar = id => root.querySelector(`[id="${id}"] .ui-progress`);
  assert.equal(bar('a').querySelector('i').style.width, '100%', 'value is clamped');
  assert.equal(bar('a').getAttribute('aria-valuenow'), '150');
  assert.equal(bar('a').dataset.variant, 'success');
  assert.match(root.querySelector('[id="a"] .lbl').textContent, /Upload.*100%/);
  assert.equal(bar('b').querySelector('i').style.width, '25%');
  assert.equal(bar('b').getAttribute('aria-valuemax'), '20');
  assert.equal(bar('c').getAttribute('aria-valuenow'), null);
  assert.equal(bar('c').dataset.indeterminate, 'true');
  assert.equal(root.querySelector('.ui-spinner').getAttribute('aria-label'), 'Loading data');
});

test('TextField: label is wired to the input; error beats hint; aria-invalid, disabled, required, name', async () => {
  const email = signal(''), hint = signal('We never share it');
  const { root } = mountIn(mount, page(
    `<ui-text-field label="Email" name="mail" [required]="true" [hint]="hint()" [value]="email()" [error]="email() ? '' : 'required'" (valueChange)="email.set($event)"></ui-text-field>
     <ui-text-field id="d" label="Off" [disabled]="true" [readonly]="true"></ui-text-field>`, () => ({ email, hint })));
  const input = root.querySelector('.ui-field input');
  const label = root.querySelector('.ui-field label');
  assert.equal(label.getAttribute('for'), input.id);
  assert.match(label.textContent, /Email/);
  assert.ok(label.querySelector('.req'));
  assert.equal(input.name, 'mail');
  assert.equal(input.required, true);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(root.querySelector('.err').textContent, 'required');
  assert.equal(root.querySelector('.hint'), null, 'the error replaces the hint');
  assert.equal(document.getElementById(input.getAttribute('aria-describedby')).textContent, 'required');
  input.value = 'a@b.c'; fire(input, 'input'); await tick();
  assert.equal(email(), 'a@b.c');
  assert.equal(root.querySelector('.err'), null);
  assert.equal(input.getAttribute('aria-invalid'), null);
  assert.equal(root.querySelector('.hint').textContent, 'We never share it');
  const off = root.querySelector('#d input');
  assert.equal(off.disabled, true);
  assert.equal(off.readOnly, true);
});

test('Textarea mirrors TextField (rows, label, error, change)', async () => {
  const v = signal('');
  const { root } = mountIn(mount, page(`<ui-textarea label="Bio" [rows]="6" [value]="v()" [error]="v() ? '' : 'empty'" (valueChange)="v.set($event)"></ui-textarea>`, () => ({ v })));
  const area = root.querySelector('textarea');
  assert.equal(area.rows, 6);
  assert.equal(root.querySelector('label').getAttribute('for'), area.id);
  assert.equal(area.getAttribute('aria-invalid'), 'true');
  area.value = 'hi'; fire(area, 'input'); await tick();
  assert.equal(v(), 'hi');
  assert.equal(root.querySelector('.err'), null);
});

test('Select: options as strings or objects (disabled too), label wiring and change', async () => {
  const country = signal('mx');
  const { root } = mountIn(mount, page(
    `<ui-select label="Country" hint="pick one" [options]="opts" [value]="country()" (valueChange)="country.set($event)"></ui-select>`,
    () => ({ country, opts: [{ value: 'es', label: 'Spain' }, { value: 'mx', label: 'Mexico' }, { value: 'xx', label: 'Nowhere', disabled: true }, 'plain'] })));
  const select = root.querySelector('select');
  assert.equal(root.querySelector('label').getAttribute('for'), select.id);
  assert.deepEqual([...select.options].map(o => o.textContent), ['Spain', 'Mexico', 'Nowhere', 'plain']);
  assert.equal(select.options[2].disabled, true);
  assert.equal(select.value, 'mx');
  assert.equal(root.querySelector('.hint').textContent, 'pick one');
  select.value = 'es'; fire(select, 'change'); await tick();
  assert.equal(country(), 'es');
});

test('Checkbox: checked, indeterminate, disabled and the changed output', async () => {
  const on = signal(false), mid = signal(true);
  const { root } = mountIn(mount, page(
    `<ui-checkbox label="Agree" [checked]="on()" [indeterminate]="mid()" name="a" (changed)="on.set($event)"></ui-checkbox><ui-checkbox id="d" [disabled]="true">Slot label</ui-checkbox>`, () => ({ on, mid })));
  const box = root.querySelector('input');
  assert.equal(box.indeterminate, true);
  assert.equal(box.name, 'a');
  assert.match(root.querySelector('.ui-check').textContent, /Agree/);
  box.checked = true; fire(box, 'change'); await tick();
  assert.equal(on(), true);
  const off = root.querySelector('[id="d"]');
  assert.equal(off.querySelector('input').disabled, true);
  assert.match(off.textContent, /Slot label/);
});

test('RadioGroup: one name per group, checked follows value, emits the picked value, disabled options', async () => {
  const v = signal('b');
  const { root } = mountIn(mount, page(
    `<ui-radio-group label="Size" [options]="opts" [value]="v()" (valueChange)="v.set($event)"></ui-radio-group>`,
    () => ({ v, opts: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C', disabled: true }] })));
  const radios = [...root.querySelectorAll('input[type=radio]')];
  assert.equal(root.querySelector('legend').textContent, 'Size');
  assert.equal(new Set(radios.map(r => r.name)).size, 1);
  assert.deepEqual(radios.map(r => r.checked), [false, true, false]);
  assert.equal(radios[2].disabled, true);
  radios[0].checked = true; fire(radios[0], 'change'); await tick();
  assert.equal(v(), 'a');
});

test('Toggle is a switch: aria-checked, keyboard-friendly button, disabled does not emit', async () => {
  const on = signal(false), off = signal(false);
  const { root } = mountIn(mount, page(
    `<ui-toggle id="t" [checked]="on()" (changed)="on.set($event)" label="Dark"></ui-toggle><ui-toggle id="d" [disabled]="true" [checked]="off()" (changed)="off.set($event)"></ui-toggle>`, () => ({ on, off })));
  const sw = root.querySelector('[id="t"] button');
  assert.equal(sw.getAttribute('role'), 'switch');
  assert.equal(sw.getAttribute('aria-checked'), 'false');
  sw.click(); await tick();
  assert.equal(on(), true);
  assert.equal(sw.getAttribute('aria-checked'), 'true');
  assert.equal(sw.dataset.on, 'true');
  const dead = root.querySelector('[id="d"] button');
  assert.equal(dead.disabled, true);
  dead.click(); await tick();
  assert.equal(off(), false);
});

test('Slider emits numbers and shows its value', async () => {
  const v = signal(30);
  const { root } = mountIn(mount, page(`<ui-slider label="Volume" [min]="0" [max]="50" [step]="5" [value]="v()" (valueChange)="v.set($event)"></ui-slider><ui-slider [showValue]="false"></ui-slider>`, () => ({ v })));
  const range = root.querySelector('input[type=range]');
  assert.equal(range.max, '50');
  assert.equal(range.step, '5');
  assert.equal(root.querySelector('output').textContent, '30');
  assert.equal(root.querySelector('label').getAttribute('for'), range.id);
  range.value = '45'; fire(range, 'input'); await tick();
  assert.strictEqual(v(), 45);
  assert.equal(root.querySelectorAll('output').length, 1);
});

test('Rating: radiogroup semantics, roving tabindex, arrows, readonly', async () => {
  const stars = signal(2), ro = signal(3);
  const { root } = mountIn(mount, page(
    `<ui-rating id="r" [value]="stars()" (valueChange)="stars.set($event)"></ui-rating><ui-rating id="ro" [readonly]="true" [value]="ro()" (valueChange)="ro.set($event)"></ui-rating>`, () => ({ stars, ro })));
  const btns = () => [...root.querySelectorAll('#r button')];
  assert.equal(root.querySelector('#r [role=radiogroup]').getAttribute('aria-label'), 'Valoración');
  assert.deepEqual(btns().map(b => b.getAttribute('aria-checked')), ['false', 'true', 'false', 'false', 'false']);
  assert.deepEqual(btns().map(b => b.getAttribute('tabindex')), ['-1', '0', '-1', '-1', '-1']);
  btns()[3].click(); await tick();
  assert.equal(stars(), 4);
  assert.equal(root.querySelectorAll('#r button.on').length, 4);
  key(btns()[3], 'ArrowRight'); await tick();
  assert.equal(stars(), 5);
  assert.equal(document.activeElement, btns()[4]);
  key(btns()[4], 'ArrowRight'); await tick();
  assert.equal(stars(), 5, 'stops at max');
  key(btns()[4], 'ArrowLeft'); await tick();
  assert.equal(stars(), 4);
  key(btns()[3], 'x');
  assert.equal(stars(), 4);
  const roBtn = root.querySelectorAll('#ro button')[0];
  roBtn.click(); key(roBtn, 'ArrowRight'); await tick();
  assert.equal(ro(), 3, 'readonly never emits');
  assert.equal(root.querySelector('#ro [role=radiogroup]').getAttribute('aria-readonly'), 'true');
});

test('Combobox: filters while typing, keyboard selection, Escape, outside click, empty message', async () => {
  const v = signal('mx');
  const { root, app } = mountIn(mount, page(
    `<ui-combobox label="Country" [options]="opts" [value]="v()" (valueChange)="v.set($event)"></ui-combobox><button id="out">outside</button>`,
    () => ({ v, opts: [{ value: 'es', label: 'Spain' }, { value: 'mx', label: 'Mexico' }, { value: 'pe', label: 'Peru' }, { value: 'xx', label: 'Nowhere', disabled: true }] })));
  const input = root.querySelector('input');
  assert.equal(input.getAttribute('role'), 'combobox');
  assert.equal(input.value, 'Mexico', 'shows the label of the current value');
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  fire(input, 'focus'); await tick();
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  assert.equal(root.querySelectorAll('[role=option]').length, 4, 'all options when not typing');
  assert.equal(root.querySelector('[data-current=true]').textContent, 'Mexico');
  input.value = 'pe'; fire(input, 'input'); await tick();
  assert.deepEqual([...root.querySelectorAll('[role=option]')].map(o => o.textContent), ['Peru']);
  assert.equal(input.getAttribute('aria-activedescendant'), root.querySelector('[role=option]').id);
  key(input, 'Enter'); await tick();
  assert.equal(v(), 'pe');
  assert.equal(root.querySelector('[role=listbox]'), null, 'closes after choosing');
  key(input, 'ArrowDown'); await tick();
  assert.equal(input.getAttribute('aria-expanded'), 'true');
  key(input, 'ArrowDown'); key(input, 'ArrowUp'); key(input, 'End'); key(input, 'Home'); await tick();
  key(input, 'Escape'); await tick();
  assert.equal(root.querySelector('[role=listbox]'), null);
  input.value = 'zzz'; fire(input, 'input'); await tick();
  assert.equal(root.querySelector('.none').textContent, 'Sin coincidencias');
  click(root.querySelector('[id="out"]')); await tick();
  assert.equal(root.querySelector('[role=listbox]'), null, 'outside click closes');
  input.value = ''; fire(input, 'input'); await tick();
  const disabled = root.querySelectorAll('[role=option]')[3];
  disabled.click(); await tick();
  assert.equal(v(), 'pe', 'disabled options cannot be chosen');
  root.querySelectorAll('[role=option]')[0].click(); await tick();
  assert.equal(v(), 'es');
  app.destroy();
});

test('Tabs: aria-selected, roving tabindex and arrow/Home/End keys', async () => {
  const tab = signal('a');
  const { root } = mountIn(mount, page(
    `<ui-tabs label="Sections" [tabs]="tabs" [active]="tab()" (activeChange)="tab.set($event)"></ui-tabs>`,
    () => ({ tab, tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] })));
  const tabs = () => [...root.querySelectorAll('[role=tab]')];
  assert.equal(root.querySelector('[role=tablist]').getAttribute('aria-label'), 'Sections');
  assert.deepEqual(tabs().map(t => t.getAttribute('aria-selected')), ['true', 'false', 'false']);
  assert.deepEqual(tabs().map(t => t.getAttribute('tabindex')), ['0', '-1', '-1']);
  tabs()[1].click(); await tick();
  assert.equal(tab(), 'b');
  key(tabs()[1], 'ArrowRight'); await tick();
  assert.equal(tab(), 'c');
  assert.equal(document.activeElement, tabs()[2]);
  key(tabs()[2], 'ArrowRight'); await tick();
  assert.equal(tab(), 'a', 'wraps around');
  key(tabs()[0], 'ArrowLeft'); await tick();
  assert.equal(tab(), 'c');
  key(tabs()[2], 'Home'); await tick();
  assert.equal(tab(), 'a');
  key(tabs()[0], 'End'); await tick();
  assert.equal(tab(), 'c');
  key(tabs()[2], 'q'); await tick();
  assert.equal(tab(), 'c');
});

test('Breadcrumb: links except the last item, which is aria-current', async () => {
  const { root } = mountIn(mount, page(`<ui-breadcrumb [items]="items" separator=">"></ui-breadcrumb>`, () => ({ items: [{ label: 'Home', href: '/' }, { label: 'Docs', href: '/docs' }, { label: 'Page' }] })));
  assert.equal(root.querySelector('nav').getAttribute('aria-label'), 'Ruta de navegación');
  const lis = [...root.querySelectorAll('li')];
  assert.equal(lis.length, 3);
  assert.equal(lis[0].querySelector('a').getAttribute('href'), '/');
  assert.equal(lis[1].dataset.sep, '>');
  assert.equal(lis[0].dataset.sep, undefined);
  assert.equal(lis[2].querySelector('a'), null);
  assert.equal(lis[2].querySelector('[aria-current=page]').textContent, 'Page');
});

test('Pagination: windowed with ellipsis, aria-current, disabled ends, labels', async () => {
  const p = signal(1);
  const { root } = mountIn(mount, page(`<ui-pagination [total]="1000" [pageSize]="10" [page]="p()" (pageChange)="p.set($event)"></ui-pagination><ui-pagination id="s" [total]="25" [pageSize]="10" [page]="1"></ui-pagination>`, () => ({ p })));
  const shown = () => [...root.querySelectorAll('nav')[0].querySelectorAll('button:not([aria-label=Anterior]):not([aria-label=Siguiente]), .gap')].map(e => e.textContent);
  assert.deepEqual(shown(), ['1', '2', '…', '100']);
  const nav = root.querySelector('nav');
  assert.equal(nav.getAttribute('aria-label'), 'Paginación');
  assert.equal(nav.querySelector('[aria-label=Anterior]').disabled, true);
  p.set(50); await tick();
  assert.deepEqual(shown(), ['1', '…', '49', '50', '51', '…', '100']);
  assert.equal(nav.querySelector('[aria-current=page]').textContent, '50');
  nav.querySelector('[aria-label=Siguiente]').click(); await tick();
  assert.equal(p(), 51);
  nav.querySelector('[aria-label="Página 100"]').click(); await tick();
  assert.equal(p(), 100);
  assert.equal(nav.querySelector('[aria-label=Siguiente]').disabled, true);
  nav.querySelector('[aria-label="Página 100"]').click(); await tick();
  assert.equal(p(), 100, 'clicking the current page does nothing');
  assert.equal(root.querySelectorAll('#s button').length, 5, 'prev + 3 pages + next when short');
});

test('Stepper: ordered list, done/now classes and aria-current=step', async () => {
  const step = signal(0);
  const { root } = mountIn(mount, page(`<ui-stepper [steps]="['one','two','three']" [current]="step()"></ui-stepper>`, () => ({ step })));
  assert.equal(root.querySelector('ol').getAttribute('aria-label'), 'Progreso');
  step.set(1); await tick();
  assert.equal(root.querySelectorAll('.st.done').length, 1);
  assert.equal(root.querySelector('.st.now').textContent.includes('two'), true);
  assert.equal(root.querySelector('.st.now').getAttribute('aria-current'), 'step');
  assert.equal(root.querySelectorAll('.st[aria-current]').length, 1);
});

test('AccordionItem: aria-expanded/controls, region, initial open, toggled output, content survives', async () => {
  const seen = [];
  const { root } = mountIn(mount, page(
    `<ui-accordion-item title="Q" (toggled)="log($event)">answer</ui-accordion-item><ui-accordion-item id="o" title="Open" [open]="true">shown</ui-accordion-item>`, () => ({}), { log(v) { seen.push(v); } }));
  const first = root.querySelectorAll('ui-accordion-item')[0];
  const btn = first.querySelector('.ui-acc > button');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(first.querySelector('.ui-acc .body'), null);
  btn.click(); await tick();
  const region = first.querySelector('.ui-acc .body');
  assert.equal(region.textContent.trim(), 'answer');
  assert.equal(region.getAttribute('role'), 'region');
  assert.equal(btn.getAttribute('aria-controls'), region.id);
  assert.equal(region.getAttribute('aria-labelledby'), btn.id);
  btn.click(); await tick();
  btn.click(); await tick();
  assert.equal(first.querySelector('.ui-acc .body').textContent.trim(), 'answer', 'content survives toggling');
  assert.deepEqual(seen, [true, false, true]);
  assert.equal(root.querySelector('[id="o"] .body').textContent.trim(), 'shown', 'open input sets the initial state');
});

test('Dropdown: menu roles, keyboard navigation, Escape returns focus, disabled items, outside click', async () => {
  const picked = signal('');
  const { root } = mountIn(mount, page(
    `<ui-dropdown label="Menu" [items]="items" (picked)="picked.set($event)"></ui-dropdown><button id="out">out</button>`,
    () => ({ picked, items: ['one', { value: 2, label: 'two' }, { value: 3, label: 'three', disabled: true }, 'four'] })));
  const trigger = root.querySelector('.ui-dd > button');
  assert.equal(trigger.getAttribute('aria-haspopup'), 'menu');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  trigger.click(); await tick(); await tick();
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  const items = () => [...root.querySelectorAll('[role=menuitem]')];
  assert.deepEqual(items().map(i => i.textContent), ['one', 'two', 'three', 'four']);
  assert.equal(document.activeElement, items()[0], 'opening focuses the first item');
  key(items()[0], 'ArrowDown'); await tick();
  assert.equal(document.activeElement, items()[1]);
  key(items()[1], 'ArrowDown'); await tick();
  assert.equal(document.activeElement, items()[3], 'disabled items are skipped');
  key(items()[3], 'ArrowDown'); await tick();
  assert.equal(document.activeElement, items()[0], 'wraps');
  key(items()[0], 'ArrowUp'); await tick();
  assert.equal(document.activeElement, items()[3]);
  key(items()[3], 'Home'); await tick();
  assert.equal(document.activeElement, items()[0]);
  key(items()[0], 'End'); await tick();
  assert.equal(document.activeElement, items()[3]);
  key(items()[3], 'Escape'); await tick();
  assert.equal(root.querySelector('[role=menu]'), null);
  assert.equal(document.activeElement, trigger, 'Escape gives focus back');
  key(trigger, 'ArrowDown'); await tick(); await tick();
  assert.ok(root.querySelector('[role=menu]'));
  items()[2].click(); await tick();
  assert.ok(root.querySelector('[role=menu]'), 'a disabled item does nothing');
  items()[1].click(); await tick();
  assert.equal(picked(), 2);
  assert.equal(root.querySelector('[role=menu]'), null);
  trigger.click(); await tick();
  click(root.querySelector('[id="out"]')); await tick();
  assert.equal(root.querySelector('[role=menu]'), null, 'outside click closes');
  trigger.click(); await tick();
  key(trigger, 'Tab'); await tick();
  assert.equal(root.querySelector('[role=menu]'), null, 'Tab closes');
  key(trigger, 'ArrowUp'); key(trigger, 'Escape');
});

test('Modal: dialog semantics, focus moves in and returns, Tab is trapped, Escape and backdrop close, scroll lock', async () => {
  const open = signal(false);
  const { root } = mountIn(mount, page(
    `<button id="opener">open</button><ui-modal title="Hi" [open]="open()" size="lg" (closed)="open.set(false)"><input id="first"><button id="last">ok</button></ui-modal>`, () => ({ open })));
  const opener = root.querySelector('#opener');
  opener.focus();
  open.set(true); await tick(); await tick();
  const dialog = root.querySelector('[role=dialog]');
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.equal(dialog.dataset.size, 'lg');
  assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, 'Hi');
  assert.equal(document.activeElement, root.querySelector('#first'), 'focus goes to the first control (not the close button)');
  assert.equal(document.documentElement.style.overflow, 'hidden');
  root.querySelector('#last').focus();
  key(root.querySelector('#last'), 'Tab'); await tick();
  assert.equal(document.activeElement.hasAttribute('data-close'), true, 'Tab from the last control wraps to the first focusable (the close button)');
  key(document.activeElement, 'Tab', { shiftKey: true }); await tick();
  assert.equal(document.activeElement, root.querySelector('#last'), 'Shift+Tab from the first wraps to the last');
  root.querySelector('#first').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(open(), true, 'clicking inside does not close');
  key(document.activeElement, 'Escape'); await tick(); await tick();
  assert.equal(open(), false);
  assert.equal(root.querySelector('[role=dialog]'), null);
  assert.equal(document.documentElement.style.overflow, '', 'scroll lock released');
  assert.equal(document.activeElement, opener, 'focus is given back');
  open.set(true); await tick(); await tick();
  assert.equal(root.querySelector('#first') !== null, true, 'content is back on reopen');
  root.querySelector('.ui-backdrop').click(); await tick();
  assert.equal(open(), false, 'backdrop closes');
  open.set(true); await tick(); await tick();
  root.querySelector('[data-close]').click(); await tick();
  assert.equal(open(), false, 'the X closes');
});

test('Modal: closeOnBackdrop=false ignores the backdrop; destroying an open modal unlocks the page', async () => {
  const open = signal(true);
  const { root, app } = mountIn(mount, page(`<ui-modal title="x" [open]="open()" [closeOnBackdrop]="false" (closed)="open.set(false)">c</ui-modal>`, () => ({ open })));
  await tick(); await tick();
  assert.equal(document.documentElement.style.overflow, 'hidden');
  root.querySelector('.ui-backdrop').click(); await tick();
  assert.equal(open(), true);
  app.destroy();
  assert.equal(document.documentElement.style.overflow, '');
});

test('Drawer: side, labelled dialog, Escape closes, backdrop closes', async () => {
  const open = signal(true);
  const { root, app } = mountIn(mount, page(`<ui-drawer title="Menu" side="right" [open]="open()" (closed)="open.set(false)"><a href="#x" id="link">go</a></ui-drawer>`, () => ({ open })));
  await tick(); await tick();
  const wrap = root.querySelector('.ui-drawer-wrap');
  assert.equal(wrap.dataset.side, 'right');
  const dlg = root.querySelector('.ui-drawer');
  assert.equal(dlg.getAttribute('role'), 'dialog');
  assert.equal(document.activeElement, root.querySelector('#link'));
  key(document.activeElement, 'Escape'); await tick();
  assert.equal(open(), false);
  open.set(true); await tick(); await tick();
  root.querySelector('.ui-drawer-wrap').click(); await tick();
  assert.equal(open(), false);
  open.set(true); await tick(); await tick();
  root.querySelector('.ui-drawer').click(); await tick();
  assert.equal(open(), true, 'clicking inside the panel keeps it open');
  app.destroy(); // an open drawer owns Escape and the page scroll: do not leak it into the next test
});

test('Popover: toggles, announces state, closes on Escape (focus returns) and outside click', async () => {
  const seen = [];
  const { root } = mountIn(mount, page(`<ui-popover label="Info" placement="top" align="end" (toggled)="log($event)"><p id="content">hello</p></ui-popover><button id="out">out</button>`, () => ({}), { log(v) { seen.push(v); } }));
  const btn = root.querySelector('.ui-pop > button');
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  btn.click(); await tick();
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(root.querySelector('#content').textContent, 'hello');
  assert.equal(root.querySelector('.ui-pop').dataset.placement, 'top');
  assert.equal(btn.getAttribute('aria-controls'), root.querySelector('.panel').id);
  key(root.querySelector('#content'), 'Escape'); await tick();
  assert.equal(root.querySelector('.panel'), null);
  assert.equal(document.activeElement, btn);
  btn.click(); await tick();
  click(root.querySelector('[id="out"]')); await tick();
  assert.equal(root.querySelector('.panel'), null);
  key(btn, 'Escape');
  assert.deepEqual(seen, [true, false, true, false]);
});

test('Tooltip: described by a role=tooltip element, focusable, placement', async () => {
  const { root } = mountIn(mount, page(`<ui-tooltip text="Save the file" placement="bottom">Save</ui-tooltip>`));
  const tip = root.querySelector('.ui-tip');
  assert.equal(tip.getAttribute('tabindex'), '0');
  assert.equal(tip.dataset.placement, 'bottom');
  const bubble = root.querySelector('[role=tooltip]');
  assert.equal(bubble.textContent, 'Save the file');
  assert.equal(tip.getAttribute('aria-describedby'), bubble.id);
});

test('ToastService + Toasts: live region, auto-dismiss, sticky (ms 0), manual dismiss and clear', async () => {
  const toasts = inject(ui.ToastService);
  const { root } = mountIn(mount, page(`<ui-toasts closeLabel="Close"></ui-toasts>`));
  assert.equal(root.querySelector('.ui-toasts').getAttribute('aria-live'), 'polite');
  toasts.show('saved', 'success', 30);
  const id = toasts.show('error!', 'error', 5000);
  const sticky = toasts.show('stay', 'info', 0);
  await tick();
  assert.deepEqual([...root.querySelectorAll('.ui-toast')].map(t => t.dataset.type), ['success', 'error', 'info']);
  assert.equal(root.querySelector('.ui-toast button').getAttribute('aria-label'), 'Close');
  await new Promise(r => setTimeout(r, 70));
  assert.equal(root.querySelectorAll('.ui-toast').length, 2, 'first one timed out; the sticky one stays');
  root.querySelectorAll('.ui-toast button')[0].click(); await tick();
  assert.equal(root.querySelectorAll('.ui-toast').length, 1);
  assert.equal(toasts.items()[0].id, sticky);
  toasts.show('again');
  toasts.dismiss(id);
  toasts.clear(); await tick();
  assert.equal(root.querySelectorAll('.ui-toast').length, 0);
});

test('Table: aria-sort, sortable columns, alignment, caption, empty state, dense/striped, row keys', async () => {
  const { root } = mountIn(mount, page(
    `<ui-table caption="People" [columns]="cols" [rows]="rows" rowKey="n" [dense]="true" [striped]="true"></ui-table><ui-table id="e" [columns]="cols" [rows]="[]" empty="Nothing here"></ui-table>`,
    () => ({ cols: [{ key: 'n', label: 'Name' }, { key: 'v', label: 'Val', align: 'right' }, { key: 'x', label: 'Fixed', sortable: false }], rows: [{ n: 'b', v: 2, x: 1 }, { n: 'c', v: 3, x: 2 }, { n: 'a', v: 1, x: 3 }] })));
  const table = root.querySelector('table');
  assert.equal(table.querySelector('caption').textContent, 'People');
  assert.equal(table.dataset.dense, 'true');
  assert.equal(table.dataset.striped, 'true');
  const names = () => [...table.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent);
  const ths = () => [...table.querySelectorAll('th')];
  assert.deepEqual(names(), ['b', 'c', 'a']);
  assert.deepEqual(ths().map(t => t.getAttribute('aria-sort')), ['none', 'none', null], 'non-sortable columns have no aria-sort');
  assert.equal(ths()[2].querySelector('button'), null);
  assert.equal(ths()[1].style.textAlign, 'right');
  ths()[0].querySelector('button').click(); await tick();
  assert.deepEqual(names(), ['a', 'b', 'c']);
  assert.equal(ths()[0].getAttribute('aria-sort'), 'ascending');
  ths()[0].querySelector('button').click(); await tick();
  assert.deepEqual(names(), ['c', 'b', 'a']);
  assert.equal(ths()[0].getAttribute('aria-sort'), 'descending');
  ths()[1].querySelector('button').click(); await tick();
  assert.deepEqual(names(), ['a', 'b', 'c'], 'switching column resets to ascending');
  assert.equal(root.querySelector('#e td.empty').textContent, 'Nothing here');
  assert.equal(root.querySelector('#e td.empty').getAttribute('colspan'), '3');
});

test('CodeBlock: shows the code and copies it (Clipboard API, with a fallback)', async () => {
  const written = [];
  Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async t => { written.push(t); } } }, configurable: true });
  const { root, app } = mountIn(mount, page(`<ui-code-block language="js" code="const a = 1;" copyLabel="Copy" copiedLabel="Done"></ui-code-block>`));
  assert.equal(root.querySelector('pre code').textContent, 'const a = 1;');
  assert.equal(root.querySelector('.bar span').textContent, 'js');
  const btn = root.querySelector('.ui-code button');
  btn.click(); await tick(); await tick();
  assert.deepEqual(written, ['const a = 1;']);
  assert.equal(btn.textContent, 'Done');
  await new Promise(r => setTimeout(r, 1600));
  assert.equal(btn.textContent, 'Copy');

  // without the Clipboard API: textarea + execCommand
  let executed = 0;
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
  document.execCommand = () => { executed++; return true; };
  btn.click(); await tick(); await tick();
  assert.equal(executed, 1);
  assert.equal(btn.textContent, 'Done');

  // a failing copy leaves the label alone
  Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => { throw new Error('denied'); } } }, configurable: true });
  await new Promise(r => setTimeout(r, 1600));
  btn.click(); await tick(); await tick();
  assert.equal(btn.textContent, 'Copy');
  app.destroy();
  delete globalThis.navigator;
  delete document.execCommand;
});

test('the library goes through the same sanitizing as the core: hostile URLs and markup stay inert', async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const { root } = mountIn(mount, page(
      `<ui-breadcrumb [items]="items"></ui-breadcrumb><ui-avatar name="x" [src]="evil"></ui-avatar><ui-code-block [code]="html"></ui-code-block><ui-alert title="<b>t</b>">&lt;i&gt;</ui-alert>`,
      () => ({ evil: 'javascript:alert(1)', html: '<img src=x onerror=alert(1)>', items: [{ label: 'a', href: 'javascript:alert(1)' }, { label: 'b' }] })));
    assert.equal(root.querySelector('.ui-crumbs a').getAttribute('href'), 'unsafe:javascript:alert(1)');
    assert.equal(root.querySelector('.ui-avatar img').getAttribute('src'), 'unsafe:javascript:alert(1)');
    assert.equal(root.querySelector('.ui-code pre code').textContent, '<img src=x onerror=alert(1)>');
    assert.equal(root.querySelector('.ui-code img'), null);
    assert.equal(root.querySelector('.ui-alert .ttl b'), null, 'a title is text, not markup');
  } finally { console.warn = warn; }
});
