/**
 * Google Classroom access flag.
 *
 * Google Classroom (coursework + materials sharing, whiteboard export) was used
 * when the school ran on the voltairedoha.com Google Workspace domain. That is
 * no longer the case, so student access and teacher entry points are switched
 * off. All the plumbing is kept intact — tables, migrations, the /api/google/**
 * endpoints and the components/google/* dialogs — so flipping this back to
 * `true` re-enables everything without any further change.
 *
 * Mirrors the GOOGLE_LOGIN_ENABLED pattern in auth/login/+page.svelte.
 */
export const GOOGLE_CLASSROOM_ENABLED = false;
