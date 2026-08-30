/**
 * Student self-registration — Server Actions
 * ==========================================
 *
 * Controlled self-registration by class join code (no Google, no public roster).
 * The teacher distributes a class code; only code holders can register, and they are
 * auto-enrolled into that class (handle_new_user trigger, migration 20260825170000).
 *
 * FLOW:
 * 1. Student submits the form (firstname, lastname, email, password, class code, CGU).
 * 2. Server validates input (Zod) + rate-limits signups by IP.
 * 3. Server resolves the class code to a class id via resolve_open_class_by_code()
 *    (SECURITY DEFINER RPC) — ONLY if the class is active AND registration_open.
 *    Invalid/closed code → rejected here, BEFORE any account is created.
 * 4. Server calls signUp() with class_id / firstname / lastname / terms_version in the
 *    user metadata → Supabase sends a confirmation email (lands on /auth/confirm).
 * 5. The handle_new_user() trigger creates the approved student profile, enrolls them in
 *    the class, and records the CGU acceptance.
 *
 * ⚠️ DEPLOYMENT PREREQUISITE: email confirmations MUST be enabled in Supabase Auth (with a
 * working SMTP sender). The anti-enumeration + proof-of-email-possession model depends on it.
 * With confirmations OFF, signUp logs the user in immediately (no possession check) and anyone
 * holding a class code could register a third party's email. The `data.session` guard below
 * degrades gracefully, but prod MUST run with confirmations ON.
 *
 * SECURITY / RGPD:
 * - Rate limited by IP (class-sized burst) AND by email (survives IP rotation).
 * - Class code resolved with the service-role client (RPC not exposed to anon → no direct
 *   PostgREST enumeration of class codes).
 * - Anti-enumeration: signUp errors are masked; the client always gets the neutral
 *   "check your email" outcome (never reveals whether an email already exists).
 * - CGU + privacy acceptance is mandatory (schema) and recorded (terms_acceptances).
 */
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createLogger } from '$lib/utils/logger';
import { checkSignupRateLimitByIP, checkSignupRateLimitByEmail } from '$lib/server/rateLimiter';
import { validateFormData, registerFormSchema } from '$lib/server/validation';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

const logger = createLogger('auth/register/+page.server.ts');

// CGU / privacy policy version recorded on acceptance. Bump when the terms change.
const CURRENT_TERMS_VERSION = 'cgu-2026-08';

/**
 * Redirect already-authenticated users away from the registration page.
 */
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (user) {
		throw redirect(303, '/dashboard');
	}
};

export const actions = {
	register: async ({ request, locals: { supabase }, url, getClientAddress }) => {
		const formData = await request.formData();

		// Preserve non-sensitive fields to re-fill the form on error (never the password).
		const echo = {
			firstname: (formData.get('firstname') as string) ?? '',
			lastname: (formData.get('lastname') as string) ?? '',
			email: (formData.get('email') as string) ?? '',
			classCode: (formData.get('classCode') as string) ?? ''
		};

		// 1. Validate input
		const validation = validateFormData(registerFormSchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors, ...echo });
		}

		const { firstname, lastname, email, password, classCode } = validation.data;

		// 2. Rate limit signups by IP (a whole class shares one school IP) AND by email
		//    (per-email cap survives IP rotation).
		const ip = getClientAddress();
		const ipLimit = await checkSignupRateLimitByIP(ip);
		if (!ipLimit.allowed) {
			return fail(429, { error: ipLimit.message, ...echo });
		}
		const emailLimit = await checkSignupRateLimitByEmail(email);
		if (!emailLimit.allowed) {
			return fail(429, { error: emailLimit.message, ...echo });
		}

		// 3. Resolve + validate the class code (active AND registration_open) with the
		//    SERVICE-ROLE client. The RPC is granted to service_role only, so it is never
		//    reachable directly by anonymous visitors via PostgREST — this keeps class-code
		//    resolution behind the app (and its rate limits), preventing code enumeration.
		const service = createServiceRoleClient();
		const { data: classId, error: rpcError } = await service.rpc('resolve_open_class_by_code', {
			p_code: classCode
		});

		if (rpcError) {
			logger.error('resolve_open_class_by_code failed:', rpcError.message);
			return fail(500, { error: 'Une erreur est survenue. Réessaie plus tard.', ...echo });
		}

		if (!classId) {
			// Same `errors` shape as validateFormData (Record<string, string[]>) so ActionData
			// stays a single indexable type on the client.
			const errors: Record<string, string[]> = {
				classCode: ['Code de classe invalide ou inscriptions fermées.']
			};
			return fail(400, { errors, ...echo });
		}

		// 4. Create the account. SECURITY (finding H9): pass the join CODE, not the
		//    resolved class_id — handle_new_user() re-resolves it via
		//    resolve_open_class_by_code() so enrollment requires possession of the code
		//    at the DB boundary (a direct GoTrue signup can't enroll with a bare class
		//    UUID). `classId` is still resolved above for early UX validation only.
		void classId;
		const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${url.origin}/auth/confirm`,
				data: {
					class_code: classCode,
					firstname,
					lastname,
					terms_version: CURRENT_TERMS_VERSION
				}
			}
		});

		if (signUpError) {
			// Anti-enumeration: never reveal whether the email already exists. Log server-side
			// and fall through to the neutral success outcome (mirrors the reset-password flow).
			logger.warn('signUp error (masked to client):', signUpError.message);
		}

		// Defensive: this flow REQUIRES email confirmations = ON (see header). If they are OFF,
		// signUp returns an active session (the student is already logged in) — redirect to the
		// dashboard rather than showing the misleading "check your email" message.
		if (signUpData?.session) {
			throw redirect(303, '/dashboard');
		}

		logger.info('Registration submitted (confirmation email sent or masked)');

		// 5. Always return the neutral "check your email" state (anti-enumeration).
		return { success: true, email };
	}
} satisfies Actions;
