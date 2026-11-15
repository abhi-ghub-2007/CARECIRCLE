export function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function err(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function validationErr(errors: string[]): Response {
  return new Response(JSON.stringify({ error: 'Validation failed', errors }), {
    status: 422,
    headers: { 'Content-Type': 'application/json' },
  })
}
