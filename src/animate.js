/**
 * Enter and leave animations driven by CSS classes. Importing this module enables them.
 *
 *   <div animate.enter="fade-in" animate.leave="fade-out">...</div>
 *
 *   .fade-in  { animation: fade .25s ease both; }
 *   .fade-out { animation: fade .25s ease reverse both; }
 *
 * The enter class is added when the element is created and removed when its animation or transition ends.
 * On removal (an @if branch or an @for row going away) the leave class is added and the element stays in the DOM
 * until its animation or transition ends (or after a safety timeout), then it is removed.
 * With `prefers-reduced-motion: reduce` elements are added and removed immediately.
 */

import { ops } from './runtime.js';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Calls `done` when the element's CSS animation/transition finishes (or after `limit` ms if none runs). */
function whenDone(el, done, limit = 1500) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    el.removeEventListener('animationend', onEnd);
    el.removeEventListener('transitionend', onEnd);
    done();
  };
  const onEnd = e => { if (e.target === el) finish(); };
  el.addEventListener('animationend', onEnd);
  el.addEventListener('transitionend', onEnd);
  const style = getComputedStyle(el);
  const seconds = s => Math.max(0, ...String(s).split(',').map(parseFloat).filter(n => !isNaN(n)));
  const total = Math.max(seconds(style.animationDuration) + seconds(style.animationDelay), seconds(style.transitionDuration) + seconds(style.transitionDelay)) * 1000;
  const timer = setTimeout(finish, total ? Math.min(total + 50, limit) : 0);
}

ops.anim = (op, el) => {
  if (op.leave) {
    el.$leave = () => {
      if (reduced()) return el.remove();
      el.$leave = null;
      el.classList.add(...op.leave.split(/\s+/).filter(Boolean));
      whenDone(el, () => el.remove());
    };
  }
  if (op.enter && !reduced()) {
    const classes = op.enter.split(/\s+/).filter(Boolean);
    el.classList.add(...classes);
    whenDone(el, () => el.classList.remove(...classes));
  }
};
