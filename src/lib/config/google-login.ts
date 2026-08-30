/**
 * Google OAuth login flag (finding H5).
 *
 * Google sign-in was used when the school ran on the voltairedoha.com Google
 * Workspace domain. It is disabled now, but the plumbing (the `googleSignIn`
 * form action and the `/auth/callback` handler) is kept intact so flipping this
 * back to `true` re-enables it without further change.
 *
 * ⚠️ This flag MUST be enforced server-side (in the `googleSignIn` action and in
 * `/auth/callback`), not only in the login page's UI: the server routes are
 * reachable directly regardless of what the page renders. Mirrors
 * [[google-classroom.ts]]'s GOOGLE_CLASSROOM_ENABLED.
 */
export const GOOGLE_LOGIN_ENABLED = false;
