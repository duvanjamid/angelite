/** Development warnings channel: the in-browser compiler reports through it, dev.js turns it on. */

let log = null;
export const setWarn = fn => { log = fn; };
export const warn = message => { if (log) log(message); };
