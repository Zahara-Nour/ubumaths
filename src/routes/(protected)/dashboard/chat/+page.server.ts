/**
 * Chat Page Server Load
 * =====================
 *
 * This page is already protected by the parent (protected)/+layout.server.ts
 * which ensures authentication and loads the user profile.
 *
 * All required data (session, user, profile, supabase) is available from
 * the root +layout.ts, so no additional server load is needed here.
 *
 * The +page.svelte component receives:
 * - data.session (from root +layout.server.ts → +layout.ts)
 * - data.profile (from root +layout.server.ts → +layout.ts)
 * - data.supabase (from root +layout.ts)
 */
