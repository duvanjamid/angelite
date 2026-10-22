/**
 * A small HTTP client over fetch with interceptors, plus `resource()` to load data into signals.
 *
 *   const http = createHttp({
 *     baseUrl: '/api',
 *     interceptors: [
 *       (req, next) => next({ ...req, headers: { ...req.headers, Authorization: `Bearer ${token()}` } }),
 *       retry(2)
 *     ]
 *   });
 *   const user = await http.get('/users/1');                        // parsed JSON (or text/blob, see responseType)
 *   await http.post('/users', { name: 'Ada' });                     // objects are sent as JSON
 *
 *   const users = resource(() => http.get('/users?page=' + page()));   // re-runs when `page` changes
 *   users.data(), users.loading(), users.error()
 *
 * An interceptor is `(request, next) => Promise<response>`; it can change the request, the response, or both.
 * Non-2xx answers reject with an HttpError (`status`, `data`, `response`).
 */

import { signal, effect } from './signals.js';

export class HttpError extends Error {
  constructor(response) {
    super(`HTTP ${response.status} ${response.statusText || ''}`.trim());
    this.name = 'HttpError';
    this.status = response.status;
    this.data = response.data;
    this.response = response;
  }
}

const join = (base, url) => (/^[a-z][a-z\d+.-]*:|^\/\//i.test(url) ? url : base.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, ''));

function withQuery(url, params) {
  if (!params) return url;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) q.append(k, v);
  const s = q.toString();
  return s ? url + (url.includes('?') ? '&' : '?') + s : url;
}

async function parse(res, type) {
  if (type === 'response') return res;
  if (type === 'blob') return res.blob();
  if (type === 'text') return res.text();
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export function createHttp({ baseUrl = '', headers = {}, interceptors = [], fetch: doFetch } = {}) {
  const send = async req => {
    const f = doFetch || globalThis.fetch;
    const controller = new AbortController();
    const abort = () => controller.abort(req.signal && req.signal.reason);
    if (req.signal) req.signal.aborted ? abort() : req.signal.addEventListener('abort', abort, { once: true });
    const timer = req.timeout ? setTimeout(() => controller.abort(new Error(`Timeout after ${req.timeout} ms`)), req.timeout) : null;
    try {
      const raw = await f(req.url, { method: req.method, headers: req.headers, body: req.body, signal: controller.signal, credentials: req.credentials });
      const response = { status: raw.status, statusText: raw.statusText, ok: raw.ok, headers: raw.headers, url: raw.url || req.url, request: req };
      response.data = await parse(raw, req.responseType);
      return response;
    } finally { if (timer) clearTimeout(timer); }
  };

  // interceptors[0] runs first on the way out and last on the way back
  const pipeline = interceptors.reduceRight((next, fn) => req => fn(req, next), send);

  async function request(method, url, { body, params, headers: extra, ...rest } = {}) {
    const h = { ...headers, ...extra };
    let payload = body;
    if (body != null && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof URLSearchParams)) {
      payload = JSON.stringify(body);
      if (!Object.keys(h).some(k => k.toLowerCase() === 'content-type')) h['Content-Type'] = 'application/json';
    }
    const response = await pipeline({ responseType: 'json', ...rest, method, url: withQuery(join(baseUrl, url), params), headers: h, body: payload });
    if (!response.ok) throw new HttpError(response);
    return rest.responseType === 'response' ? response : response.data;
  }

  return {
    request,
    get: (url, options) => request('GET', url, options),
    delete: (url, options) => request('DELETE', url, options),
    post: (url, body, options) => request('POST', url, { ...options, body }),
    put: (url, body, options) => request('PUT', url, { ...options, body }),
    patch: (url, body, options) => request('PATCH', url, { ...options, body })
  };
}

/** Interceptor: retries network errors and 5xx answers `times` times, waiting `delay * attempt` ms between tries. */
export const retry = (times = 2, delay = 200) => async (req, next) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await next(req);
      if (res.status < 500 || attempt >= times) return res;
    } catch (e) {
      if (attempt >= times || (req.signal && req.signal.aborted)) throw e;
    }
    await new Promise(r => setTimeout(r, delay * (attempt + 1)));
  }
};

/**
 * Runs `loader` (which returns a promise) and keeps its state in signals. Signals read synchronously inside
 * `loader` are tracked: when they change it runs again, and an answer that arrives late for an older run is ignored.
 */
export function resource(loader) {
  const data = signal(undefined), error = signal(null), loading = signal(true), trigger = signal(0);
  let run = 0;
  const stop = effect(() => {
    trigger();
    const mine = ++run;
    loading.set(true);
    let promise;
    try { promise = Promise.resolve(loader()); } catch (e) { promise = Promise.reject(e); }
    promise.then(
      value => { if (mine === run) { data.set(value); error.set(null); loading.set(false); } },
      e => { if (mine === run) { error.set(e); loading.set(false); } }
    );
  });
  return { data, error, loading, reload: () => trigger.update(n => n + 1), destroy: () => { run++; stop(); } };
}
