/**
 * Parental Consent Page - Server Load
 *
 * Loads consent information for a given token.
 * This is a public page - no authentication required.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';
import { requiresParentalConsent } from '$lib/utils/consent';

const logger = createServerLogger('(public)/consent/[token]/+page.server');

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
		logger.error('[consent page] Database error:', dbError);
		throw error(500, 'Erreur serveur. Réessayer plus tard.');
	}

	// Validate response structure
	const validation = consentInfoSchema.safeParse(data);
	if (!validation.success) {
		logger.error('[consent page] Invalid RPC response:', validation.error);
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
		// 1re/Tle (inscription par le parent, Q4) : le lien confirme seulement l'adresse.
		consentRequired: requiresParentalConsent(validatedData.student.grade),
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
	grant: async ({ params, request, getClientAddress }) => {
		// Validate token format
		const tokenValidation = tokenSchema.safeParse(params.token);
		if (!tokenValidation.success) {
			return fail(400, { error: 'Token invalide.' });
		}

		const token = tokenValidation.data;
		const service = createServiceRoleClient();

		// Niveau de l'élève : la case explicite n'est exigée que s'il est soumis au
		// consentement (décision 3) ; en 1re/Tle, le clic confirme seulement l'adresse.
		const { data: info, error: infoError } = await service.rpc('get_consent_info', {
			p_token: token
		});
		const infoValidation = consentInfoSchema.safeParse(info);
		if (infoError || !infoValidation.success) {
			logger.error('[consent grant] Consent info error:', infoError ?? infoValidation.error);
			return fail(500, { error: 'Erreur serveur. Réessayer.' });
		}
		// Lien invalide, expiré ou déjà utilisé : on laisse grant_parental_consent répondre,
		// c'est elle qui passe une demande expirée à « expired » (vu par le prof).
		const formData = await request.formData();
		if (
			infoValidation.data.success &&
			requiresParentalConsent(infoValidation.data.student.grade) &&
			formData.get('consent') !== 'true'
		) {
			return fail(400, {
				error: 'CONSENT_UNCHECKED',
				message: 'Cochez la case pour donner votre consentement.'
			});
		}

		// Get client IP and user agent for audit
		let clientIp: string | null = null;
		try {
			clientIp = getClientAddress();
		} catch {
			// IP not available in some environments
		}

		const userAgent = request.headers.get('user-agent');

		// Consentement accordé par le client service : la fonction n'est plus exécutable
		// par anon / authenticated, sinon n'importe qui détenant le lien pouvait l'appeler
		// directement et inscrire une IP et un navigateur de son choix comme preuve RGPD.
		// Ici, l'IP et le navigateur viennent de la requête reçue par le serveur.
		const { data, error: dbError } = await service.rpc('grant_parental_consent', {
			p_token: token,
			// L'IP peut manquer derrière certains proxys : le paramètre est
			// `DEFAULT NULL` côté SQL, donc optionnel dans les types générés.
			p_ip: clientIp ?? undefined,
			p_user_agent: userAgent ?? undefined
		});

		if (dbError) {
			logger.error('[consent grant] Database error:', dbError);
			return fail(500, { error: 'Erreur serveur. Réessayer.' });
		}

		// Validate response structure
		const validation = grantResponseSchema.safeParse(data);
		if (!validation.success) {
			logger.error('[consent grant] Invalid RPC response:', validation.error);
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

		// Trace sans donnée personnelle (nom de l'élève mineur, IP du parent) : la preuve
		// complète est dans parental_consents.
		logger.info('[consent grant] Success');

		// Redirect to success page
		throw redirect(303, '/consent/success');
	}
};
