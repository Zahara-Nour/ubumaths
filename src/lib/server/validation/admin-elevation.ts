/**
 * Admin elevation validation schemas
 * ==================================
 *
 * Server-side step-up elevation (Pattern 2): an authenticated teacher/admin
 * POSTs the **admin account's** credentials to /api/admin/elevate. These are
 * verified by an ephemeral Supabase client; on success a short-lived httpOnly
 * cookie is set granting an admin-scoped Supabase client for the request.
 */

import { z } from 'zod';

/**
 * Body schema for POST /api/admin/elevate.
 *
 * Mono-admin model: the caller submits ONLY the password — the server resolves
 * the single admin account's email itself. `password` is non-empty and
 * length-capped (oversized-payload guard); we deliberately do NOT enforce a
 * minimum-length policy — the credential is checked against Supabase auth, not
 * created — so `.min(1)` is the correct guard.
 */
export const adminElevateSchema = z.object({
	password: z.string().min(1, 'Mot de passe requis').max(200, 'Mot de passe trop long')
});

export type AdminElevateInput = z.infer<typeof adminElevateSchema>;
