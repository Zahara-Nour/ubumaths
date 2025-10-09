import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	console.log('[Layout] Loading, isBrowser:', isBrowser());

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					fetch
				}
			})
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					fetch
				},
				cookies: {
					getAll() {
						return data.cookies;
					}
				}
			});

	console.log('[Layout] Supabase client created');

	const {
		data: { session }
	} = await supabase.auth.getSession();

	console.log('[Layout] Session:', session ? `User: ${session.user.email}` : 'No session');

	const {
		data: { user }
	} = await supabase.auth.getUser();

	console.log('[Layout] User:', user ? user.email : 'No user');

	return { session, supabase, user };
};
