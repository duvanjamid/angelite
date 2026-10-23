/** Shared helpers for the UI components: ids, focus handling, overlays. */

import { effect } from '../index.js';

let counter = 0;
/** Unique id for label/aria wiring: nextId('field') -> "ui-field-3". */
export const nextId = prefix => `ui-${prefix}-${++counter}`;

export const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const focusables = root => [...root.querySelectorAll(FOCUSABLE)].filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');

let locks = 0;
const lockScroll = on => {
  locks = Math.max(0, locks + (on ? 1 : -1));
  document.documentElement.style.overflow = locks ? 'hidden' : '';
};

/**
 * Makes an overlay (modal, drawer) behave: moves focus into it, keeps Tab inside, closes on Escape, locks the page
 * scroll and gives focus back to where it was. Call it from the component's constructor with the `open` signal and a
 * function that returns the overlay element; call the returned function from ngOnDestroy.
 */
export function overlay(open, getRoot, close) {
  let release = null;
  const activate = () => {
    const root = getRoot();
    if (release || !root) return;
    const previous = document.activeElement;
    lockScroll(true);
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(root);
      if (!items.length) { e.preventDefault(); root.focus(); return; }
      const first = items[0], last = items[items.length - 1], at = document.activeElement;
      if (e.shiftKey && (at === first || !root.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === last || !root.contains(at))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    (root.querySelector('[data-autofocus]') || focusables(root).find(el => !el.matches('[data-close]')) || root).focus();
    release = () => {
      document.removeEventListener('keydown', onKey, true);
      lockScroll(false);
      if (previous && previous.focus && document.contains(previous)) previous.focus();
      release = null;
    };
  };
  const stop = effect(() => {
    if (open()) queueMicrotask(() => { if (open.peek()) activate(); });
    else if (release) release();
  });
  return () => { stop(); if (release) release(); };
}

/** Calls `fn` for clicks outside `getRoot()` while it returns true for `isOpen()`. Returns a cleanup function. */
export function outsideClick(isOpen, getRoot, fn) {
  const handler = e => {
    const root = getRoot();
    if (isOpen() && root && !root.contains(e.target)) fn();
  };
  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}
