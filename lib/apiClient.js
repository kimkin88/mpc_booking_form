'use client';

/**
 * Thin API client for browser-side calls.
 */
async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    const error = new Error(json.error || res.statusText || 'Request failed');
    error.status = res.status;
    error.code = json.code;
    error.extra = json;
    throw error;
  }
  return json.data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body }),
  patch: (url, body) => request(url, { method: 'PATCH', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  delete: (url, body) => request(url, { method: 'DELETE', body }),
  upload: (url, formData) => request(url, { method: 'POST', body: formData }),
};

export function portalRequest(url, options = {}) {
  return request(url, options);
}
