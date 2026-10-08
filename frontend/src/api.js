// All calls to the Catalyst function live here.
// VITE_API_BASE is empty on Catalyst hosting (same domain) and in local dev (Vite proxy).
const BASE = (import.meta.env.VITE_API_BASE || '') + '/server/learning_records'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })

  let body = {}
  try {
    body = await res.json()
  } catch {
    // response was not JSON
  }

  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return body.data
}

export function getRecords() {
  return request('/')
}

export function addRecord(record) {
  return request('/', { method: 'POST', body: JSON.stringify(record) })
}

export function updateRecord(id, record) {
  return request('/' + id, { method: 'PUT', body: JSON.stringify(record) })
}

export function deleteRecord(id) {
  return request('/' + id, { method: 'DELETE' })
}
