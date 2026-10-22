import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.EventTarget = window.EventTarget;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.MutationObserver = window.MutationObserver;
globalThis.Node = window.Node;
globalThis.history = window.history;
globalThis.location = window.location;
globalThis.localStorage = window.localStorage;

const document = window.document;
export { window, document };
