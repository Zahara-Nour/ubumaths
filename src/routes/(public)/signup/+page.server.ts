/**
 * Server-side Signup Actions
 *
 * WHY SERVER-SIDE SIGNUP?
 * ----------------------
 * Similar to login, the Supabase client in the browser uses localStorage,
 * while the server uses cookies. If we signup on the client:
 * - Browser: Session saved to localStorage ✅
 * - Server: Cookies NOT updated ❌
 * - Result: Server still sees user as logged out
 * - UI doesn't update until page refresh
 *
 * By handling signup on the SERVER:
 * - Server: Sets auth cookies (if auto-confirm enabled) ✅
 * - Browser: Detects auth change via onAuthStateChange ✅
 * - Browser: Calls invalidate() to refresh data ✅
 * - Result: UI updates instantly
 *
 * FLOW:
 * 1. User submits form (POST to /signup?/signup)
 * 2. Server action receives email/password
 * 3. Server calls signUp() → may set cookies if auto-confirm enabled
 * 4. Server redirects to appropriate page
 * 5. If auto-confirm: Browser's onAuthStateChange fires (SIGNED_IN event)
 * 6. If email confirmation required: User checks email
 * 7. User clicks confirmation link → /auth/confirm handles it
 */
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createLogger } from '$lib/utils/logger';
import { validatePasswordPolicy } from '$lib/server/passwordPolicy';
import { checkSignupRateLimitByIP } from '$lib/server/rateLimiter';
import { validateFormData, signupFormSchema } from '$lib/server/validation';

const logger = createLogger('signup/+page.server.ts');

export const actions = {
	/**
	 * Signup action
	 *
	 * Creates a new user account and sets server-side cookies (if auto-confirm enabled)
	 *
	 * SECURITY: Rate limited by IP to prevent signup abuse and spam accounts
	 */
	signup: async ({ request, locals: { supabase }, getClientAddress }) => {
		// SECURITY: Check rate limit BEFORE processing signup
		const clientIP = getClientAddress();
		const rateLimitResult = await checkSignupRateLimitByIP(clientIP, supabase);

		if (!rateLimitResult.allowed) {
			logger.warn('Signup rate limit exceeded', { ip: clientIP });
			return fail(429, {
				error:
					rateLimitResult.message ||
					'Trop de tentatives de création de compte. Veuillez réessayer plus tard.'
			});
		}

		// Extract and validate form data
		const formData = await request.formData();

		const validation = validateFormData(signupFormSchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		const { email, password, confirmPassword } = validation.data;

		// Check password match
		if (password !== confirmPassword) {
			return fail(400, {
				errors: { confirmPassword: ['Les mots de passe ne correspondent pas'] }
			});
		}

		// Validate password against security policy
		const passwordValidation = validatePasswordPolicy(password);
		if (!passwordValidation.valid) {
			// Return all validation errors
			return fail(400, {
				error: passwordValidation.errors.join('. '),
				email
			});
		}

		// Sign up on the server - this is the key!
		// The server Supabase client will set cookies via the cookie handlers
		// defined in src/lib/server/supabase.ts
		const { data, error } = await supabase.auth.signUp({
			email,
			password
		});

		if (error) {
			logger.error('Signup error:', error.message);
			// Return error to display in form
			return fail(400, {
				error: error.message,
				email // Preserve email for convenience
			});
		}

		logger.info('Signup successful for:', email);
		logger.info(
			'Session:',
			data.session ? 'Created (auto-confirm)' : 'Email confirmation required'
		);

		// Check if email confirmation is required
		// If session exists, user is auto-confirmed and logged in
		// If no session, user needs to check email for confirmation link
		if (data.session) {
			// Auto-confirm is enabled - user is logged in immediately
			// Cookies are already set by the server client
			throw redirect(303, '/');
		} else {
			// Email confirmation required
			// Return success message but don't redirect yet
			return {
				success: true,
				message: 'Account created! Please check your email to confirm your account.'
			};
		}
	}
} satisfies Actions;
