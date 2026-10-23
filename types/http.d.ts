import type { Signal } from './angelite.js';

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: BodyInit | null;
  responseType: 'json' | 'text' | 'blob' | 'response';
  signal?: AbortSignal;
  /** Milliseconds before the request is aborted. */
  timeout?: number;
  credentials?: RequestCredentials;
}
export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  url: string;
  data: T;
  request: HttpRequest;
}
export type Interceptor = (request: HttpRequest, next: (request: HttpRequest) => Promise<HttpResponse>) => Promise<HttpResponse>;

export class HttpError extends Error {
  status: number;
  data: any;
  response: HttpResponse;
}

export interface RequestOptions {
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  responseType?: HttpRequest['responseType'];
  signal?: AbortSignal;
  timeout?: number;
  credentials?: RequestCredentials;
}

export interface HttpClient {
  request<T = any>(method: string, url: string, options?: RequestOptions & { body?: unknown }): Promise<T>;
  get<T = any>(url: string, options?: RequestOptions): Promise<T>;
  delete<T = any>(url: string, options?: RequestOptions): Promise<T>;
  post<T = any>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T = any>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T = any>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;
}

export function createHttp(options?: { baseUrl?: string; headers?: Record<string, string>; interceptors?: Interceptor[]; fetch?: typeof fetch }): HttpClient;
/** Interceptor that retries network errors and 5xx answers. */
export function retry(times?: number, delay?: number): Interceptor;

export interface Resource<T> {
  readonly data: Signal<T | undefined>;
  readonly error: Signal<unknown>;
  readonly loading: Signal<boolean>;
  reload(): void;
  destroy(): void;
}
/** Runs `loader` and keeps its state in signals; signals read synchronously inside it are tracked. */
export function resource<T>(loader: () => Promise<T> | T): Resource<T>;
