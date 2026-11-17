export const visitorId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const jsonHeaders = { 'Cache-Control': 'no-store' }

export function checkJsonRequest(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 })
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    return new Response(null, { status: 415 })
}

export async function readJsonObject(source: Request | Response) {
  const data = await source.json().catch(() => null)
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : null
}

function decodeCity(value: string | null) {
  if (!value) return null
  try {
    return decodeURIComponent(value).slice(0, 120)
  } catch {
    return null
  }
}

type VisitKind = 'home' | 'guide' | 'admin_login' | 'admin_login_failed'

export async function ingestVisit(
  request: Request,
  id: string,
  event: string | null,
  kind: VisitKind | null,
  env = process.env,
): Promise<number> {
  const {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_PUBLISHABLE_KEY: key,
    VISIT_INGEST_TOKEN: token,
  } = env
  if (!url || !key || !token) throw new Error('Registro indisponível.')
  const headers = new Headers({ apikey: key, 'Content-Type': 'application/json' })
  if (key.startsWith('ey')) headers.set('Authorization', 'Bearer ' + key)
  const response = await fetch(new URL('/rest/v1/rpc/register_site_activity', url), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_id: id,
      p_event: event,
      p_kind: kind,
      p_token: token,
      p_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
      p_city: decodeCity(request.headers.get('x-vercel-ip-city')),
      p_region: request.headers.get('x-vercel-ip-country-region')?.slice(0, 12) ?? null,
    }),
    signal: AbortSignal.timeout(4500),
  })
  if (!response.ok) throw new Error('Registro indisponível.')
  const count = await response.json()
  if (typeof count !== 'number') throw new Error('Contador indisponível.')
  return count
}
