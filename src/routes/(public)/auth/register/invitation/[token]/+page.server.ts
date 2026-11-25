/**
 * Invitation de cours particulier — page du parent
 * ================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 3. Le parent ouvre le lien reçu par courriel (`/auth/register/invitation/<jeton>`) : le
 * prénom de l'enfant est déjà écrit ; il choisit le mot de passe, accepte les CGU, donne son
 * consentement → le serveur crée le compte, la classe, l'adhésion et le consentement
 * (`#lib/server/private-lessons/redeem.ts`).
 *
 * SÉCURITÉ / RGPD :
 * - La page ne voit que l'invitation de SON lien (prénom, niveau, école, échéance), jamais
 *   l'adresse du parent (décision 7). Lien plus valable : même réponse, rien de révélé.
 * - Le jeton est dans le chemin (N3 de l'audit de la PR 2) : `<meta name="referrer"
 *   content="no-referrer">` dans la page (l'en-tête est posé pour tout le site par
 *   hooks.server.ts), aucune ressource tierce, chemin masqué dans l'analytique et le
 *   journal des erreurs (`#lib/utils/analytics-redact.ts`), ni indexation ni cache partagé.
 *   Le jeton ne redescend pas dans les données de la page.
 * - Limite de débit par IP (celle des inscriptions) sur la validation.
 * - Pas de redirection d'un visiteur connecté : rien ne touche à sa session.
 */
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { createServerLogger } from '#lib/utils/logger.ts';
import { checkSignupRateLimitByIP } from '#lib/server/rateLimiter.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { sendPrivateLessonWelcomeEmail } from '#lib/server/email/brevo.ts';
import { redeemInvitation } from '#lib/server/private-lessons/redeem.ts';
import { validateFormData } from '#lib/server/validation/index.ts';
import {
	privateLessonRedeemFormSchema,
	privateLessonTokenSchema
} from '#lib/server/validation/private-lessons.ts';
import { gradeCodeSchema } from '#lib/server/validation/grades.ts';
import { formatGradeForDisplay } from '#lib/utils/grades.ts';

// Constantes

const logger = createServerLogger('auth/register/invitation/[token]/+page.server.ts');

// Même version que les autres inscriptions (/auth/register, /auth/register/parent).
const CURRENT_TERMS_VERSION = 'cgu-2026-08';

const SERVER_ERROR = 'Une erreur est survenue. Réessayez dans un instant.';
const IN_USE_ERROR =
	"L'espace est déjà en cours de création. Patientez un instant, puis rechargez la page.";
const WEAK_PASSWORD = 'Mot de passe trop faible ou trop courant : en choisir un autre.';

/** Réponse de `get_private_lesson_invitation` : null si le lien n'est plus valable. */
const invitationSchema = z
	.object({
		firstname: z.string().min(1).max(50),
		grade: gradeCodeSchema,
		school_name: z.string().max(200),
		expires_at: z.string()
	})
	.nullable();

// Functions

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	// Lien personnel : ni moteur de recherche, ni cache partagé.
	setHeaders({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' });

	const token = privateLessonTokenSchema.safeParse(params.token);
	if (!token.success) return { invitation: null };

	const service = createServiceRoleClient();
	const { data, error } = await service.rpc('get_private_lesson_invitation', {
		p_token: token.data
	});
	if (error) {
		logger.error('get_private_lesson_invitation :', error.code ?? 'sans code');
		return { invitation: null, loadError: true as const };
	}
	const parsed = invitationSchema.safeParse(data);
	if (!parsed.success) {
		logger.error('Invitation lue : forme inattendue');
		return { invitation: null, loadError: true as const };
	}
	if (!parsed.data) return { invitation: null };

	return {
		invitation: {
			firstname: parsed.data.firstname,
			gradeLabel: formatGradeForDisplay(parsed.data.grade),
			schoolName: parsed.data.school_name,
			expiresAt: parsed.data.expires_at
		}
	};
};

export const actions = {
	create: async ({ params, request, getClientAddress }) => {
		const token = privateLessonTokenSchema.safeParse(params.token);
		if (!token.success) return fail(410, { invalid: true as const });

		const ip = getClientAddress();
		const ipLimit = await checkSignupRateLimitByIP(ip);
		if (!ipLimit.allowed) return fail(429, { error: ipLimit.message });

		const validation = validateFormData(privateLessonRedeemFormSchema, await request.formData());
		if (!validation.success) return fail(400, { errors: validation.errors });

		const outcome = await redeemInvitation(
			createServiceRoleClient(),
			sendPrivateLessonWelcomeEmail,
			{
				token: token.data,
				password: validation.data.password,
				termsVersion: CURRENT_TERMS_VERSION,
				ip,
				userAgent: request.headers.get('user-agent')
			}
		).catch((err: unknown) => {
			logger.error('Création par invitation : exception', err instanceof Error ? err.message : '');
			return { ok: false as const, reason: 'server_error' as const };
		});

		if (outcome.ok) {
			logger.info('Espace créé par invitation de cours particulier');
			return {
				success: true as const,
				loginId: outcome.loginId,
				childFirstname: outcome.childFirstname,
				emailSent: outcome.emailSent
			};
		}

		switch (outcome.reason) {
			case 'invalid':
				return fail(410, { invalid: true as const });
			case 'in_use':
				return fail(409, { error: IN_USE_ERROR });
			case 'weak_password': {
				const errors: Record<string, string[]> = { password: [WEAK_PASSWORD] };
				return fail(400, { errors });
			}
			default:
				return fail(500, { error: SERVER_ERROR });
		}
	}
} satisfies Actions;
