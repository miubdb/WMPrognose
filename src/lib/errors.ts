export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}
export const badRequest = (m: string, fields?: Record<string, string>) => new ApiError(400, 'bad_request', m, fields);
export const unauthorized = (m = 'Bitte melde dich an.') => new ApiError(401, 'unauthorized', m);
export const forbidden = (m = 'Dafür fehlt die Berechtigung.') => new ApiError(403, 'forbidden', m);
export const notFound = (m = 'Eintrag nicht gefunden.') => new ApiError(404, 'not_found', m);
export const conflict = (m: string) => new ApiError(409, 'conflict', m);
export const unprocessable = (m: string, fields?: Record<string, string>) => new ApiError(422, 'validation', m, fields);
export const tooMany = (m: string) => new ApiError(429, 'rate_limited', m);
export const unavailable = (m: string) => new ApiError(503, 'unavailable', m);
