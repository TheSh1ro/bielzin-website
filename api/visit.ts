const visitorId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const headers = { 'Cache-Control': 'no-store' }

function decodeCity(value: string | null) {
  if (!value) return null
  try {
    return decodeURIComponent(value).slice(0, 120)
  } catch {
    return null
  }
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 })
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    return new Response(null, { status: 415 })

  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    !('id' in body) ||
    typeof body.id !== 'string' ||
    !visitorId.test(body.id)
  )
    return new Response(null, { status: 400 })

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const token = process.env.VISIT_INGEST_TOKEN
  if (!url || !key || !token) return new Response(null, { status: 503 })

  try {
    const response = await fetch(new URL('/rest/v1/rpc/register_site_visit', url), {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_id: body.id,
        p_token: token,
        p_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
        p_city: decodeCity(request.headers.get('x-vercel-ip-city')),
        p_region: request.headers.get('x-vercel-ip-country-region')?.slice(0, 12) ?? null,
      }),
      signal: AbortSignal.timeout(4500),
    })
    if (!response.ok) return new Response(null, { status: 503 })
    return Response.json(await response.json(), { headers })
  } catch {
    return new Response(null, { status: 503 })
  }
}
