import { backendConfigured, publicRpc } from './supabase'

type Visitor = { id: string }

function getVisitor() {
  return new Promise<Visitor>((resolve, reject) => {
    const request = indexedDB.open('bielzin', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('profile')
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Armazenamento bloqueado.'))
    request.onsuccess = () => {
      const db = request.result
      try {
        const transaction = db.transaction('profile', 'readwrite')
        const store = transaction.objectStore('profile')
        let visitor: Visitor
        transaction.onabort = () => {
          db.close()
          reject(transaction.error)
        }
        transaction.oncomplete = () => {
          db.close()
          resolve(visitor)
        }
        const read = store.get('visitor')
        read.onsuccess = () => {
          try {
            if (read.result) {
              visitor = read.result as Visitor
              return
            }
            visitor = { id: crypto.randomUUID() }
            store.put(visitor, 'visitor')
          } catch {
            transaction.abort()
          }
        }
      } catch (error) {
        db.close()
        reject(error)
      }
    }
  })
}

export async function recordEntrance(): Promise<number | undefined> {
  if (!backendConfigured) return
  const visitor = await getVisitor().catch(() => undefined)
  if (!visitor) return readVisitCount()

  try {
    const response = await fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: visitor.id }),
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) return readVisitCount()
    const count: unknown = await response.json()
    if (typeof count !== 'number') return readVisitCount()
    return count
  } catch {
    return readVisitCount()
  }
}

export function readVisitCount() {
  return publicRpc<number>('get_visit_count').catch(() => undefined)
}
