/* ═══════════════════════════════════════════
   Pocket Pilot — API Service
   Backend-ready HTTP client with mock mode,
   request/response interceptors, retry logic,
   and clean error handling.
   Swap useMock to false to connect your API.
   ═══════════════════════════════════════════ */

import { API, STORAGE } from './config.js';
import { StorageService } from './services.js';

/* ───────── Logger ───────── */

const Logger = {
  info(...args) { if (API.useMock) return; console.info('[Pocket Pilot API]', ...args); },
  warn(...args) { console.warn('[Pocket Pilot API]', ...args); },
  error(...args) { console.error('[Pocket Pilot API]', ...args); }
};

/* ───────── Error types ───────── */

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error. Please check your connection.') {
    super(message, 0);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ApiError {
  constructor(message, fields = {}) {
    super(message, 422);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/* ───────── Interceptors ───────── */

const _requestInterceptors = [];
const _responseInterceptors = [];

export function addRequestInterceptor(fn) {
  _requestInterceptors.push(fn);
  return () => { const i = _requestInterceptors.indexOf(fn); if (i >= 0) _requestInterceptors.splice(i, 1); };
}

export function addResponseInterceptor(fn) {
  _responseInterceptors.push(fn);
  return () => { const i = _responseInterceptors.indexOf(fn); if (i >= 0) _responseInterceptors.splice(i, 1); };
}

/* ───────── Core request ───────── */

async function request(method, path, body = null, options = {}) {
  const url = `${API.baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || API.timeout);

  const req = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    body: body ? JSON.stringify(body) : null,
    signal: controller.signal
  };

  for (const interceptor of _requestInterceptors) {
    interceptor(req);
  }

  Logger.info(`${method} ${path}`);

  try {
    const res = await fetch(url, req);
    clearTimeout(timeoutId);

    for (const interceptor of _responseInterceptors) {
      interceptor(res);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      if (res.status === 422) throw new ValidationError(data?.message || 'Validation failed', data?.fields || {});
      throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new NetworkError('Request timed out');
    throw new NetworkError(err.message);
  }
}

async function requestWithRetry(method, path, body, options = {}) {
  const maxRetries = options.retries ?? API.retries;
  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request(method, path, body, options);
    } catch (err) {
      lastErr = err;
      if (err instanceof ValidationError || err.status >= 400 && err.status < 500) throw err;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 200;
        Logger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastErr;
}

/* ───────── Mock store ───────── */

let _mockToken = null;

function mockRequest(method, path, body) {
  const data = StorageService.get(STORAGE.keys.expenses) || [];

  if (method === 'GET' && path === '/expenses') return { ok: true, data };
  if (method === 'GET' && path.startsWith('/expenses/')) {
    const id = path.replace('/expenses/', '');
    return { ok: true, data: data.find(e => e.id === id) || null };
  }
  if (method === 'POST' && path === '/expenses') return { ok: true, data: body };
  if (method === 'PUT' && path.startsWith('/expenses/')) return { ok: true, data: body };
  if (method === 'DELETE' && path.startsWith('/expenses/')) return { ok: true, data: null };
  if (method === 'DELETE' && path === '/expenses') return { ok: true, data: null };
  if (method === 'POST' && path === '/auth/login') {
    _mockToken = 'mock-token-' + Date.now();
    return { ok: true, data: { token: _mockToken, user: { name: 'Demo User', email: 'demo@pocketpilot.app' } } };
  }
  if (method === 'POST' && path === '/auth/logout') {
    _mockToken = null;
    return { ok: true, data: null };
  }
  if (method === 'GET' && path === '/auth/me') {
    if (!_mockToken) return { ok: false, status: 401, data: { message: 'Unauthorized' } };
    return { ok: true, data: { user: { name: 'Demo User', email: 'demo@pocketpilot.app' } } };
  }

  return { ok: false, status: 404, data: { message: `Unknown mock endpoint: ${method} ${path}` } };
}

/* ───────── Public API ───────── */

export async function api(method, path, body = null, options = {}) {
  if (API.useMock) {
    Logger.info(`[Mock] ${method} ${path}`);
    const res = mockRequest(method, path, body);
    if (!res.ok) throw new ApiError(res.data?.message || 'Request failed', res.status || 500, res.data);
    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120));
    return res.data;
  }

  return requestWithRetry(method, path, body, options);
}

export function apiGet(path, options) { return api('GET', path, null, options); }
export function apiPost(path, body, options) { return api('POST', path, body, options); }
export function apiPut(path, body, options) { return api('PUT', path, body, options); }
export function apiDelete(path, options) { return api('DELETE', path, null, options); }

export function isMockMode() { return API.useMock; }
