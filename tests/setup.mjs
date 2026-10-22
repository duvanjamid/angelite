import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.EventTarget = window.EventTarget;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.Element = window.Element;

const document = window.document;
export { window, document };
