export const backendUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
export const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const backendConfigured = !!(backendUrl && publishableKey)
export const authStorageKey =
  backendUrl && URL.canParse(backendUrl)
    ? `sb-${new URL(backendUrl).hostname.split('.')[0]}-auth-token`
    : undefined

export function apiHeaders() {
  const headers = new Headers({ apikey: publishableKey ?? '' })
  if (publishableKey?.startsWith('ey')) headers.set('Authorization', 'Bearer ' + publishableKey)
  return headers
}

export async function publicRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!backendConfigured) throw new Error('Backend indisponível.')
  const headers = apiHeaders()
  if (args) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${backendUrl}/rest/v1/rpc/${name}`, {
    method: args ? 'POST' : 'GET',
    body: args ? JSON.stringify(args) : undefined,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error('Não foi possível carregar os dados.')
  return (await response.json()) as T
}
