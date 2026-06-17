(function () {
  'use strict';

  const DEFAULT_BASE = (typeof window !== 'undefined' && window.__DEVSECURE_API_BASE__) || 'http://127.0.0.1:8000';

  function getApiBase() {
    const meta = document.querySelector('meta[name="devsecurecoach-api-url"]');
    const metaValue = meta && meta.getAttribute('content') ? meta.getAttribute('content').trim() : '';
    const configured = (metaValue || (typeof window !== 'undefined' && window.__DEVSECURE_API_BASE__) || '').replace(/\/scan$/, '').replace(/\/$/, '');
    return configured || DEFAULT_BASE;
  }

  async function request(path, options = {}) {
    const base = getApiBase();
    const normalizedBase = String(base || '').replace(/\/scan$/, '').replace(/\/$/, '');
    const res = await fetch(`${normalizedBase}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.detail || 'Request failed');
      err.code = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  window.DevSecureAPI = {
    async postScan(payload, timeoutMs = 120000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await request('/scan', { method: 'POST', body: payload, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    },
    async postExplain(payload) {
      return request('/explain', { method: 'POST', body: payload });
    },
  };
})();
