import { backendConfigured, publicRpc } from './supabase'

type Visitor = { id: string; counted: boolean }

function useVisitor(update: (visitor?: Visitor) => Visitor) {
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
            visitor = update(read.result as Visitor | undefined)
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
  const visitor = await useVisitor(
    (stored) => stored ?? { id: crypto.randomUUID(), counted: false },
  ).catch(() => undefined)
  if (!visitor || visitor.counted) return readVisitCount()

  try {
    const count = await publicRpc<number>('register_visit', { p_id: visitor.id })
    // The saved ID also makes a retry safe if the response or this local write is lost.
    void useVisitor(() => ({ id: visitor.id, counted: true })).catch(() => {})
    return count
  } catch {
    return readVisitCount()
  }
}

export function readVisitCount() {
  return publicRpc<number>('get_visit_count').catch(() => undefined)
}
