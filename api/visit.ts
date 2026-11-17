import {
  checkJsonRequest,
  ingestVisit,
  jsonHeaders,
  readJsonObject,
  visitorId,
} from './_visit-activity.js'

export function POST(request: Request) {
  return recordVisit(request)
}

export async function recordVisit(request: Request, env = process.env): Promise<Response> {
  const rejection = checkJsonRequest(request)
  if (rejection) return rejection
  const body = await readJsonObject(request)
  if (typeof body?.id !== 'string' || !visitorId.test(body.id))
    return new Response(null, { status: 400 })

  const { event = null, screen = null } = body
  if (
    (screen !== null && screen !== 'home' && screen !== 'guide' && screen !== 'admin_login') ||
    (event !== null && (typeof event !== 'string' || !visitorId.test(event))) ||
    (screen === null) !== (event === null)
  ) {
    return new Response(null, { status: 400 })
  }

  try {
    return Response.json(await ingestVisit(request, body.id, event, screen, env), {
      headers: jsonHeaders,
    })
  } catch {
    return new Response(null, { status: 503 })
  }
}
