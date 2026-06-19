(function () {
  'use strict';

  const DEFAULT_BASE = (typeof window !== 'undefined' && window.__DEVSECURE_API_BASE__) || 'https://getavyrix-ready.onrender.com';

  function getApiBase() {
    const meta = document.querySelector('meta[name="devsecurecoach-api-url"]');
    const metaValue = meta && meta.getAttribute('content') ? meta.getAttribute('content').trim() : '';
    const configured = (metaValue || (typeof window !== 'undefined' && window.__DEVSECURE_API_BASE__) || '').replace(/\/scan$/, '').replace(/\/$/, '');
    return configured || DEFAULT_BASE;
  }

  async function request(path, options = {}) {
    const base = getApiBase();
    const normalizedBase = String(base || '').replace(/\/scan$/, '').replace(/\/$/, '');
    const startTime = performance.now();
    console.log(`[API] ${options.method || 'GET'} ${path} started`);

    const res = await fetch(`${normalizedBase}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    const fetchTime = performance.now() - startTime;
    console.log(`[API] ${options.method || 'GET'} ${path} fetch completed in ${fetchTime.toFixed(0)}ms`);

    const data = await res.json().catch(() => ({}));
    const totalTime = performance.now() - startTime;
    console.log(`[API] ${options.method || 'GET'} ${path} total time ${totalTime.toFixed(0)}ms (parse: ${(totalTime - fetchTime).toFixed(0)}ms)`);

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
    async postDetect(payload) {
      return request('/detect', { method: 'POST', body: payload });
    },
    async postExplain(payload) {
      return request('/explain', { method: 'POST', body: payload });
    },
  };
})();
