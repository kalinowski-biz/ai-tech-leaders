import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, type H3Event } from 'h3'

export interface FakeRequest {
  method?: string
  url?: string
  headers?: Record<string, string>
  /** Sent as a JSON request body. */
  body?: unknown
}

/** An h3 event backed by real Node request/response objects, for unit-testing server utilities. */
export function fakeEvent({
  method = 'GET',
  url = '/api/v1/health',
  headers = {},
  body,
}: FakeRequest = {}): H3Event {
  const req = new IncomingMessage(new Socket())
  req.method = method
  req.url = url
  req.headers = { host: 'app.example', ...headers }
  if (body !== undefined) {
    const json = JSON.stringify(body)
    req.headers['content-type'] = 'application/json'
    req.headers['content-length'] = String(Buffer.byteLength(json))
    req.push(json)
    req.push(null)
  }
  return createEvent(req, new ServerResponse(req))
}
