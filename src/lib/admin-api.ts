import { createClient } from '@supabase/supabase-js'
import { apiHeaders, authStorageKey, backendUrl, publishableKey } from './supabase'

export const adminClient =
  backendUrl && publishableKey
    ? createClient(backendUrl, publishableKey, { auth: { storageKey: authStorageKey } })
    : null

export class AdminRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function adminRequest<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  const session = (await adminClient?.auth.getSession())?.data.session
  if (!session) throw new AdminRequestError(401, 'Sua sessão expirou. Entre novamente.')
  const headers = apiHeaders()
  headers.set('Authorization', 'Bearer ' + session.access_token)
  if (payload !== undefined) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${backendUrl}/functions/v1${path}`, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  }).catch(() => {
    throw new AdminRequestError(503, 'Não foi possível acessar o painel. Tente novamente.')
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new AdminRequestError(
      response.status,
      typeof data.message === 'string'
        ? data.message
        : 'Não foi possível concluir. Tente novamente.',
    )
  }
  return data as T
}
