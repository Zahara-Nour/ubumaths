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
 * - `email`: the admin account's email (validated, length-capped).
 * - `password`: the admin account's password (non-empty, length-capped to
 *   prevent oversized-payload abuse). We deliberately do NOT enforce a
 *   minimum-length policy here — the credential is checked against Supabase
 *   auth, not created — so a `.min(1)` is the correct guard.
 */
export const adminElevateSchema = z.object({
	email: z.string().trim().email('Email invalide').max(254, 'Email trop long'),
	password: z.string().min(1, 'Mot de passe requis').max(200, 'Mot de passe trop long')
});

export type AdminElevateInput = z.infer<typeof adminElevateSchema>;
