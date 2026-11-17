import { isIP } from 'node:net'
import {
  checkJsonRequest,
  ingestVisit,
  jsonHeaders,
  readJsonObject,
  visitorId,
} from './_visit-activity.js'

function failure(status: number, message: string) {
  return Response.json({ message }, { status, headers: jsonHeaders })
}

export function POST(request: Request) {
  return adminLogin(request)
}

export async function adminLogin(
  request: Request,
  env = process.env,
  local = false,
): Promise<Response> {
  const rejection = checkJsonRequest(request)
  if (rejection) return rejection
  const body = await readJsonObject(request)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (
    !email ||
    email.length > 254 ||
    typeof body?.password !== 'string' ||
    !body.password ||
    body.password.length > 4096
  ) {
    return failure(400, 'Informe e-mail e senha.')
  }

  const url = env.VITE_SUPABASE_URL
  const key = env.SUPABASE_AUTH_PROXY_SECRET_KEY || (local && env.VITE_SUPABASE_PUBLISHABLE_KEY)
  const ip = request.headers.get('x-vercel-forwarded-for')?.trim()
  if (!url || !key || (!local && (!key.startsWith('sb_secret_') || !ip || !isIP(ip)))) {
    return failure(503, 'Autenticação indisponível. Tente novamente.')
  }

  try {
    const headers = new Headers({ apikey: key, 'Content-Type': 'application/json' })
    if (ip && key.startsWith('sb_secret_')) headers.set('Sb-Forwarded-For', ip)
    if (key.startsWith('ey')) headers.set('Authorization', 'Bearer ' + key)
    const response = await fetch(new URL('/auth/v1/token?grant_type=password', url), {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password: body.password }),
      signal: AbortSignal.timeout(6500),
    })
    const data = await readJsonObject(response)
    if (!response.ok) {
      if (data?.error_code === 'invalid_credentials' || data?.code === 'invalid_credentials') {
        if (
          typeof body.id === 'string' &&
          visitorId.test(body.id) &&
          typeof body.event === 'string' &&
          visitorId.test(body.event)
        ) {
          await ingestVisit(request, body.id, body.event, 'admin_login_failed', env).catch(() => {})
        }
        return failure(401, 'E-mail ou senha inválidos.')
      }
      if (response.status === 429)
        return failure(429, 'Muitas tentativas. Tente novamente mais tarde.')
      return failure(503, 'Não foi possível entrar. Tente novamente.')
    }
    if (typeof data?.access_token !== 'string' || typeof data?.refresh_token !== 'string') {
      return failure(503, 'Não foi possível entrar. Tente novamente.')
    }
    return Response.json(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      },
      { headers: jsonHeaders },
    )
  } catch {
    return failure(503, 'Autenticação indisponível. Tente novamente.')
  }
}
