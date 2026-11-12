/** Error codes of the video API (ContentResultCodes on the backend). */
export const VIDEO_ERRORS = {
  LOCKED: 'VIDEO_403_LOCKED',
  WAIVER: 'VIDEO_428_WAIVER',
  DEVICES: 'VIDEO_409_DEVICES',
  SESSION: 'VIDEO_409_SESSION',
  NOT_CONFIGURED: 'VIDEO_503_CONFIG',
  PROVIDER: 'VIDEO_502_PROVIDER',
  NOT_FOUND: 'VIDEO_404'
} as const;

/** Reads the `{code}` of an API error (HttpErrorResponse.error), or null. */
export function videoErrorCode(err: unknown): string | null {
  const body = (err as { error?: unknown } | null)?.error;
  if (body && typeof body === 'object' && typeof (body as { code?: unknown }).code === 'string') {
    return (body as { code: string }).code;
  }
  return null;
}

/** Reads the Vietnamese message of an API error, with a fallback. */
export function videoErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { error?: unknown } | null)?.error;
  const message = body && typeof body === 'object' ? (body as { message?: unknown }).message : null;
  return typeof message === 'string' && message ? message : fallback;
}
