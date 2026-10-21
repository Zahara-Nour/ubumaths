/**
 * « J'inscris mon enfant » — Server Actions
 * ==========================================
 *
 * Le parent inscrit un enfant sans adresse : code de classe, prénom de l'enfant, mot de
 * passe de l'enfant, adresse du parent, CGU (journal docs/wip/inscription-parent-progress.md).
 *
 * DÉROULÉ :
 * 1. Validation (Zod), limites de débit par IP et par adresse du parent (5 / 24 h).
 * 2. Code de classe vérifié (RPC service) AVANT toute création.
 * 3. Compte de l'enfant créé par le serveur, identifiant `prenom` + 2 chiffres
 *    (`$lib/server/child-registration`) → profil approuvé dans la classe ; lecture seule
 *    tant que le consentement manque.
 * 4. Demande au parent créée, UN courriel : identifiant + lien unique.
 * 5. L'écran affiche l'identifiant. Courriel en échec → le compte existe, le prof renverra
 *    le lien depuis la page des consentements.
 *
 * Pas d'anti-énumération ici : l'adresse du parent n'est pas un identifiant de connexion
 * (un parent peut inscrire plusieurs enfants), rien n'est révélé sur un compte existant.
 */
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';
import {
	checkChildSignupRateLimitByParentEmail,
	checkSignupRateLimitByIP
} from '$lib/server/rateLimiter';
import { validateFormData, parentRegisterFormSchema } from '$lib/server/validation';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	createChildAccount,
	createParentRequest,
	deleteChildAccount,
	markParentEmailSent
} from '$lib/server/child-registration';
import { sendChildRegistrationEmail } from '$lib/server/email/brevo';
import { requiresParentalConsent } from '$lib/utils/consent';

// Constantes

const logger = createServerLogger('auth/register/parent/+page.server.ts');

// Même version que l'inscription de l'élève seul (/auth/register).
const CURRENT_TERMS_VERSION = 'cgu-2026-08';

const SERVER_ERROR = 'Une erreur est survenue. Réessayer plus tard.';

// Functions

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (user) {
		throw redirect(303, '/dashboard');
	}
};

export const actions = {
	register: async ({ request, getClientAddress }) => {
		const formData = await request.formData();

		// Champs renvoyés pour re-remplir le formulaire (jamais les mots de passe).
		const echo = {
			childFirstname: (formData.get('childFirstname') as string) ?? '',
			parentEmail: (formData.get('parentEmail') as string) ?? '',
			classCode: (formData.get('classCode') as string) ?? ''
		};

		// 1. Validation
		const validation = validateFormData(parentRegisterFormSchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors, ...echo });
		}
		const { childFirstname, parentEmail, password, classCode } = validation.data;

		// 2. Limite par IP (toute une famille / un réseau) : elle borne aussi l'essai des codes.
		const ipLimit = await checkSignupRateLimitByIP(getClientAddress());
		if (!ipLimit.allowed) {
			return fail(429, { error: ipLimit.message, ...echo });
		}

		// 3. Code de classe (classe active ET inscriptions ouvertes), avant toute création.
		const service = createServiceRoleClient();
		const { data: classId, error: rpcError } = await service.rpc('resolve_open_class_by_code', {
			p_code: classCode
		});
		if (rpcError) {
			logger.error('resolve_open_class_by_code failed:', rpcError.message);
			return fail(500, { error: SERVER_ERROR, ...echo });
		}
		const classCodeError: Record<string, string[]> = {
			classCode: ['Code de classe invalide ou inscriptions fermées.']
		};
		if (!classId) {
			return fail(400, { errors: classCodeError, ...echo });
		}

		// Plafond par adresse du parent (Q5), compté APRÈS le code : un code mal tapé ne
		// consomme pas les 5 inscriptions de la journée.
		const parentLimit = await checkChildSignupRateLimitByParentEmail(parentEmail);
		if (!parentLimit.allowed) {
			return fail(429, { error: parentLimit.message, ...echo });
		}

		// 4. Compte de l'enfant
		const account = await createChildAccount(service, {
			childFirstname,
			password,
			classCode,
			termsVersion: CURRENT_TERMS_VERSION
		});
		if (!account.ok) {
			if (account.reason === 'class_closed') {
				return fail(400, { errors: classCodeError, ...echo });
			}
			if (account.reason === 'weak_password') {
				const errors: Record<string, string[]> = {
					password: ['Mot de passe trop faible ou trop courant : en choisir un autre.']
				};
				return fail(400, { errors, ...echo });
			}
			return fail(500, { error: SERVER_ERROR, ...echo });
		}

		// 5. Demande au parent. Sans elle, ni consentement ni mot de passe oublié : on
		//    annule l'inscription (exception comprise) plutôt que de laisser un compte sans
		//    contact.
		const parentRequest = await createParentRequest(service, account.userId, parentEmail).catch(
			(err: unknown) => {
				logger.error('Demande au parent : exception', err);
				return null;
			}
		);
		if (!parentRequest) {
			await deleteChildAccount(service, account.userId);
			return fail(500, { error: SERVER_ERROR, ...echo });
		}

		// 6. Un seul courriel au parent : identifiant + lien unique. Le compte et la demande
		//    existent déjà : un échec ici (même une exception) n'annule rien, le prof renverra
		//    le lien depuis la page des consentements.
		const consentRequired = requiresParentalConsent(account.grade);
		let emailSent = false;
		try {
			const { data: school } = await service
				.from('classes')
				.select('schools(name)')
				.eq('id', classId)
				.maybeSingle();
			const schoolName = (school?.schools as { name?: string } | null)?.name ?? null;

			const sent = await sendChildRegistrationEmail(parentEmail, {
				childFirstname,
				loginId: account.loginId,
				schoolName,
				consentToken: parentRequest.token,
				expiresAt: parentRequest.expiresAt,
				consentRequired
			});
			emailSent = sent.success;
			if (sent.success) {
				await markParentEmailSent(service, parentRequest.token);
			} else {
				logger.error('Courriel au parent non envoyé :', sent.error);
			}
		} catch (err) {
			logger.error('Courriel au parent : exception', err);
		}

		logger.info('Enfant inscrit par son parent');

		return {
			success: true as const,
			loginId: account.loginId,
			childFirstname,
			parentEmail,
			emailSent,
			consentRequired
		};
	}
} satisfies Actions;
