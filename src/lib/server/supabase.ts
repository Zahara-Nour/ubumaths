import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	console.log('[Supabase] Creating server client for URL:', PUBLIC_SUPABASE_URL);

	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		console.log('[Supabase] Checking session...');
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			console.log('[Supabase] No session found');
			return { session: null, user: null };
		}

		console.log('[Supabase] Session found, verifying user...');
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			console.error('[Supabase] Error getting user:', error.message);
			return { session: null, user: null };
		}

		console.log('[Supabase] User verified:', user?.email);
		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
