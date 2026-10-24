const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, options)
  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed (${response.status}).`)
  }
  return payload
}

export const api = {
  health: () => request('/health'),
  brands: () => request('/brands'),
  createBrand: (body) => request('/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  rules: (brandId) => request(`/rules?brand_id=${brandId}`),
  createRule: (body) => request('/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  updateRule: (id, body) => request(`/rules/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  deleteRule: (id) => request(`/rules/${id}`, { method: 'DELETE' }),
  analyze: (formData) => request('/analyze', { method: 'POST', body: formData }),
  documents: () => request('/documents'),
  document: (id) => request(`/documents/${id}`),
  review: (id, body) => request(`/documents/${id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  dashboard: () => request('/dashboard/stats'),
  reports: () => request('/reports'),
}