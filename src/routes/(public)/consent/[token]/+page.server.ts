/**
 * Parental Consent Page - Server Load
 *
 * Loads consent information for a given token.
 * This is a public page - no authentication required.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

const tokenSchema = z.string().uuid();

// Schema for validating successful RPC response
const consentInfoSuccessSchema = z.object({
	success: z.literal(true),
	student: z.object({
		firstname: z.string().nullable(),
		lastname: z.string().nullable(),
		grade: z.string().nullable()
	}),
	teacher_name: z.string().nullable(),
	school_name: z.string().nullable(),
	parent_email: z.string(),
	expires_at: z.string()
});

// Schema for error response
const consentInfoErrorSchema = z.object({
	success: z.literal(false),
	error: z.string(),
	message: z.string()
});

const consentInfoSchema = z.discriminatedUnion('success', [
	consentInfoSuccessSchema,
	consentInfoErrorSchema
]);

export const load: PageServerLoad = async ({ params, locals }) => {
	// Validate token format
	const tokenValidation = tokenSchema.safeParse(params.token);
	if (!tokenValidation.success) {
		throw error(404, 'Lien de consentement invalide.');
	}

	const token = tokenValidation.data;

	// Get consent info from database function
	const { data, error: dbError } = await locals.supabase.rpc('get_consent_info', {
		p_token: token
	});

	if (dbError) {
		console.error('[consent page] Database error:', dbError);
		throw error(500, 'Erreur serveur. Veuillez réessayer plus tard.');
	}

	// Validate response structure
	const validation = consentInfoSchema.safeParse(data);
	if (!validation.success) {
		console.error('[consent page] Invalid RPC response:', validation.error);
		throw error(500, 'Données de consentement invalides.');
	}

	const validatedData = validation.data;

	// Handle error responses from the function
	if (!validatedData.success) {
		return {
			error: validatedData.error,
			message: validatedData.message
		};
	}

	// Return consent info for display
	return {
		student: validatedData.student,
		teacherName: validatedData.teacher_name,
		schoolName: validatedData.school_name,
		parentEmail: validatedData.parent_email,
		expiresAt: validatedData.expires_at,
		token
	};
};

// Schema for grant response validation
const grantResponseSchema = z.discriminatedUnion('success', [
	z.object({
		success: z.literal(true),
		message: z.string(),
		student_name: z.string().optional()
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
		message: z.string()
	})
]);

export const actions: Actions = {
	grant: async ({ params, locals, request, getClientAddress }) => {
		// Validate token format
		const tokenValidation = tokenSchema.safeParse(params.token);
		if (!tokenValidation.success) {
			return fail(400, { error: 'Token invalide.' });
		}

		const token = tokenValidation.data;

		// Get client IP and user agent for audit
		let clientIp: string | null = null;
		try {
			clientIp = getClientAddress();
		} catch {
			// IP not available in some environments
		}

		const userAgent = request.headers.get('user-agent');

		// Grant consent via database function
		const { data, error: dbError } = await locals.supabase.rpc('grant_parental_consent', {
			p_token: token,
			p_ip: clientIp,
			p_user_agent: userAgent
		});

		if (dbError) {
			console.error('[consent grant] Database error:', dbError);
			return fail(500, { error: 'Erreur serveur. Veuillez réessayer.' });
		}

		// Validate response structure
		const validation = grantResponseSchema.safeParse(data);
		if (!validation.success) {
			console.error('[consent grant] Invalid RPC response:', validation.error);
			return fail(500, { error: 'Réponse serveur invalide.' });
		}

		const validatedData = validation.data;

		// Handle error responses from the function
		if (!validatedData.success) {
			return fail(400, {
				error: validatedData.error,
				message: validatedData.message
			});
		}

		// Log successful consent grant for audit
		console.log(
			`[consent grant] Success - Student: ${validatedData.student_name || 'unknown'}, IP: ${clientIp}, Token: ${token.slice(0, 8)}...`
		);

		// Redirect to success page
		throw redirect(303, '/consent/success');
	}
};
