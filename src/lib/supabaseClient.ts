/**
 * ⚠️ DEPRECATED - Legacy Supabase Client
 *
 * DO NOT USE THIS FILE FOR NEW CODE!
 *
 * This file creates a singleton Supabase client using the old pattern.
 * It is NOT compatible with SvelteKit's SSR architecture and should not be used
 * in production code.
 *
 * WHY YOU SHOULD NOT USE THIS:
 * ----------------------------
 * 1. Not SSR-compatible: Uses localStorage in browser, doesn't work server-side
 * 2. No cookie management: Server-side cookies won't sync with client state
 * 3. Session issues: Can cause auth state to be out of sync between client/server
 * 4. Against Supabase best practices for SvelteKit
 *
 * WHAT TO USE INSTEAD:
 * --------------------
 * - In components: Use `data.supabase` from the layout (created in +layout.ts)
 * - In +page.ts/+layout.ts: Use `createBrowserClient` or `createServerClient` from @supabase/ssr
 * - In +page.server.ts: Use `locals.supabase` from the server hook
 * - In hooks.server.ts: Already configured with `createServerClient`
 *
 * ONLY ACCEPTABLE USE:
 * --------------------
 * - Testing utilities (like supabase-test.ts)
 * - One-off scripts that don't need SSR
 * - Local development debugging (temporarily)
 *
 * See the official guide: https://supabase.com/docs/guides/auth/server-side/sveltekit
 */
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';

// ⚠️ DEPRECATED - See comment above before using
export const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
