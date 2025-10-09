/**
 * Server-side Login Actions
 *
 * WHY SERVER-SIDE LOGIN?
 * ----------------------
 * The Supabase client in the browser uses localStorage for session storage,
 * while the server uses cookies. If we login on the client:
 * - Browser: Session saved to localStorage ✅
 * - Server: Cookies NOT updated ❌
 * - Result: Server still sees user as logged out
 * - UI doesn't update until page refresh
 *
 * By handling login on the SERVER:
 * - Server: Sets auth cookies ✅
 * - Browser: Detects auth change via onAuthStateChange ✅
 * - Browser: Calls invalidate() to refresh data ✅
 * - Result: UI updates instantly
 *
 * FLOW:
 * 1. User submits form (POST to /login?/login)
 * 2. Server action receives email/password
 * 3. Server calls signInWithPassword() → sets cookies
 * 4. Server redirects to home page
 * 5. Browser's onAuthStateChange fires (SIGNED_IN event)
 * 6. Browser calls invalidate('supabase:auth')
 * 7. Layout re-runs → server verifies session → UI updates
 */
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	/**
	 * Login action
	 *
	 * Authenticates user and sets server-side cookies
	 */
	login: async ({ request, locals: { supabase } }) => {
		// Extract form data
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		// Validate inputs
		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		// Sign in on the server - this is the key!
		// The server Supabase client will set cookies via the cookie handlers
		// defined in src/lib/server/supabase.ts
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			console.error('[Login] Error:', error.message);
			// Return error to display in form
			return fail(400, {
				error: error.message,
				email // Preserve email for convenience
			});
		}

		// Success! Cookies are now set.
		// Redirect to home page - the layout will detect the auth change
		throw redirect(303, '/');
	}
} satisfies Actions;
