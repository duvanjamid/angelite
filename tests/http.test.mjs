import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('./setup.mjs');
const { createHttp, HttpError, retry, resource } = await import('../src/http.js');
const { signal } = await import('../src/signals.js');

const tick = () => new Promise(r => setTimeout(r, 0));

/** A fake fetch: records requests and answers with the next queued response. */
function fakeFetch(...answers) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, ...init });
    if (init.signal && init.signal.aborted) throw init.signal.reason || new Error('aborted');
    const a = typeof answers[0] === 'function' ? await answers[0](url, init) : answers.length > 1 ? answers.shift() : answers[0];
    if (a instanceof Error) throw a;
    return new Response(a.body === undefined ? null : typeof a.body === 'string' ? a.body : JSON.stringify(a.body), { status: a.status || 200, headers: a.headers });
  };
  f.calls = calls;
  return f;
}

test('get/post/put/patch/delete: base url, query, JSON in and out', async () => {
  const f = fakeFetch({ body: { ok: 1 } });
  const http = createHttp({ baseUrl: 'https://api.test/v1/', headers: { 'X-App': 'a' }, fetch: f });
  assert.deepEqual(await http.get('/users', { params: { page: 2, q: 'a b', skip: undefined, none: null } }), { ok: 1 });
  assert.equal(f.calls[0].url, 'https://api.test/v1/users?page=2&q=a+b');
  assert.equal(f.calls[0].method, 'GET');
  assert.equal(f.calls[0].headers['X-App'], 'a');
  await http.post('users', { name: 'Ada' });
  assert.equal(f.calls[1].url, 'https://api.test/v1/users');
  assert.equal(f.calls[1].body, '{"name":"Ada"}');
  assert.equal(f.calls[1].headers['Content-Type'], 'application/json');
  await http.put('/u/1', { a: 1 }, { headers: { 'content-type': 'application/vnd.x+json' } });
  assert.equal(f.calls[2].headers['content-type'], 'application/vnd.x+json');
  assert.equal(f.calls[2].headers['Content-Type'], undefined, 'an explicit content type is kept');
  await http.patch('/u/1', 'raw text');
  assert.equal(f.calls[3].body, 'raw text');
  await http.delete('/u/1');
  assert.equal(f.calls[4].method, 'DELETE');
  await http.get('https://other.test/x?a=1', { params: { b: 2 } });
  assert.equal(f.calls[5].url, 'https://other.test/x?a=1&b=2', 'absolute urls ignore baseUrl');
  await http.get('//cdn.test/x');
  assert.equal(f.calls[6].url, '//cdn.test/x');
  const form = new FormData();
  await http.post('/f', form);
  assert.equal(f.calls[7].body, form, 'FormData is sent as it is');
});

test('response types and empty / non-JSON bodies', async () => {
  const http = createHttp({ fetch: fakeFetch({ body: 'plain words' }) });
  assert.equal(await http.get('/x'), 'plain words', 'JSON that is not JSON falls back to text');
  assert.equal(await http.get('/x', { responseType: 'text' }), 'plain words');
  assert.equal((await http.get('/x', { responseType: 'blob' })).size, 11);
  const res = await http.get('/x', { responseType: 'response' });
  assert.equal(res.status, 200);
  assert.equal(res.ok, true);
  const empty = createHttp({ fetch: fakeFetch({ status: 204 }) });
  assert.equal(await empty.get('/x'), null);
});

test('non-2xx answers reject with HttpError carrying status and data', async () => {
  const http = createHttp({ fetch: fakeFetch({ status: 422, body: { error: 'bad' } }) });
  await assert.rejects(http.get('/x'), e => {
    assert.ok(e instanceof HttpError);
    assert.equal(e.status, 422);
    assert.deepEqual(e.data, { error: 'bad' });
    assert.equal(e.response.request.url, '/x');
    assert.match(e.message, /HTTP 422/);
    return true;
  });
});

test('interceptors wrap the request in order and can change both directions', async () => {
  const log = [];
  const f = fakeFetch({ body: { n: 1 } });
  const http = createHttp({
    fetch: f,
    interceptors: [
      async (req, next) => { log.push('a-out'); const res = await next({ ...req, headers: { ...req.headers, Authorization: 'Bearer t' } }); log.push('a-in'); return res; },
      async (req, next) => { log.push('b-out'); const res = await next(req); log.push('b-in'); return { ...res, data: { ...res.data, seen: true } }; }
    ]
  });
  assert.deepEqual(await http.get('/x'), { n: 1, seen: true });
  assert.deepEqual(log, ['a-out', 'b-out', 'b-in', 'a-in']);
  assert.equal(f.calls[0].headers.Authorization, 'Bearer t');
  // an interceptor may answer without going to the network
  const cached = createHttp({ fetch: f, interceptors: [async req => ({ status: 200, ok: true, data: 'from cache', request: req })] });
  assert.equal(await cached.get('/x'), 'from cache');
  assert.equal(f.calls.length, 1);
});

test('timeout and abort signals cancel the request', async () => {
  const slow = (url, init) => new Promise((_, reject) => {
    if (init.signal.aborted) return reject(init.signal.reason); // like the real fetch
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  });
  const http = createHttp({ fetch: slow });
  await assert.rejects(http.get('/x', { timeout: 10 }), /Timeout after 10 ms/);
  const ctl = new AbortController();
  const p = http.get('/x', { signal: ctl.signal });
  ctl.abort(new Error('user cancelled'));
  await assert.rejects(p, /user cancelled/);
  const already = new AbortController();
  already.abort(new Error('before'));
  await assert.rejects(http.get('/x', { signal: already.signal }), /before/);
});

test('retry(): retries network errors and 5xx, gives up after the limit, never retries 4xx or an aborted request', async () => {
  let n = 0;
  const flaky = createHttp({ interceptors: [retry(2, 1)], fetch: async () => { n++; if (n < 3) return new Response('x', { status: 503 }); return new Response('"fine"', { status: 200 }); } });
  assert.equal(await flaky.get('/x'), 'fine');
  assert.equal(n, 3);
  n = 0;
  const dead = createHttp({ interceptors: [retry(1, 1)], fetch: async () => { n++; throw new TypeError('network down'); } });
  await assert.rejects(dead.get('/x'), /network down/);
  assert.equal(n, 2);
  n = 0;
  const client = createHttp({ interceptors: [retry(3, 1)], fetch: async () => { n++; return new Response('{}', { status: 404 }); } });
  await assert.rejects(client.get('/x'), HttpError);
  assert.equal(n, 1, '4xx is not retried');
  n = 0;
  const ctl = new AbortController();
  const aborted = createHttp({ interceptors: [retry(3, 1)], fetch: async () => { n++; ctl.abort(); throw new Error('aborted'); } });
  await assert.rejects(aborted.get('/x', { signal: ctl.signal }), /aborted/);
  assert.equal(n, 1);
  const always500 = createHttp({ interceptors: [retry(1, 1)], fetch: async () => new Response('{}', { status: 500 }) });
  await assert.rejects(always500.get('/x'), e => e.status === 500);
});

test('resource(): loading, data, error, reactive reloads, stale answers ignored, reload(), destroy()', async () => {
  const page = signal(1);
  const pending = [];
  const r = resource(() => { const p = page(); return new Promise((res, rej) => pending.push({ p, res, rej })); });
  assert.equal(r.loading(), true);
  assert.equal(r.data(), undefined);
  pending[0].res('one');
  await tick();
  assert.deepEqual([r.data(), r.loading(), r.error()], ['one', false, null]);

  page.set(2);
  await tick();
  assert.equal(r.loading(), true);
  page.set(3);
  await tick();
  pending[1].res('stale two'); // answers for page 2 after page 3 was requested
  pending[2].res('three');
  await tick();
  assert.equal(r.data(), 'three', 'the late answer for an older request is ignored');

  r.reload();
  await tick();
  pending[3].rej(new Error('boom'));
  await tick();
  assert.equal(r.error().message, 'boom');
  assert.equal(r.loading(), false);
  assert.equal(r.data(), 'three', 'the last good data stays');

  r.reload();
  await tick();
  pending[4].res('again');
  await tick();
  assert.equal(r.error(), null, 'a good answer clears the error');

  r.destroy();
  page.set(9);
  await tick();
  assert.equal(pending.length, 5, 'no more loads after destroy');

  const sync = resource(() => { throw new Error('sync failure'); });
  await tick();
  assert.equal(sync.error().message, 'sync failure');
  const value = resource(() => 5);
  await tick();
  assert.equal(value.data(), 5, 'a plain value works too');
});
