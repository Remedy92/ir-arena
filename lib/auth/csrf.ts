/**
 * Defense-in-depth CSRF protection for cookie-authenticated POST routes.
 *
 * Neon Auth (Better Auth) defaults to SameSite=Lax cookies, which blocks
 * cross-site POST subrequests. This Origin check adds explicit verification
 * per OWASP guidance — a request whose Origin header doesn't match the Host
 * is rejected with 403 before any state-changing logic runs.
 */
export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
