/**
 * Inscription d'un enfant par son parent — côté serveur
 * =====================================================
 *
 * Le compte de l'enfant n'a pas d'adresse : il est créé par la clé service
 * (`auth.admin.createUser`), jamais par `signUp` (la confirmation n'arriverait jamais).
 *
 * - Adresse = identifiant + domaine fictif, confirmée d'office ; `app_metadata.child_account`
 *   est la marque exigée en base pour ce domaine (migration 20261021220000).
 * - Le profil reste créé par le trigger `handle_new_user` (code de classe → approuvé,
 *   classe, niveau, CGU), comme pour l'inscription de l'élève seul.
 * - L'adresse du parent n'est qu'un CONTACT : une demande `parental_consents` en attente,
 *   dont le lien confirme l'adresse et, selon le niveau, recueille le consentement.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	CHILD_ACCOUNT_DOMAIN,
	childAccountEmail,
	childLoginBase,
	pickChildLoginId
} from '$lib/utils/child-account';
import { createServerLogger } from '$lib/utils/logger';

// Types

type ServiceClient = SupabaseClient<Database>;

export type CreateChildAccountResult =
	| { ok: true; userId: string; loginId: string; grade: string | null }
	| { ok: false; reason: 'invalid_firstname' | 'class_closed' | 'server_error' };

// Constantes

const logger = createServerLogger('server/child-registration');

// Collisions possibles entre la lecture des identifiants pris et la création (deux
// inscriptions simultanées du même prénom) : quelques essais suffisent.
const MAX_CREATE_ATTEMPTS = 5;

// Functions

/** Identifiants déjà pris pour cette racine (`noelie` → {noelie42, noelie07…}). */
async function takenLoginIds(service: ServiceClient, base: string): Promise<Set<string> | null> {
	const { data, error } = await service
		.from('profiles')
		.select('email')
		.like('email', `${base}%@${CHILD_ACCOUNT_DOMAIN}`);
	if (error) {
		logger.error('Identifiants pris illisibles :', error.message);
		return null;
	}
	const suffix = `@${CHILD_ACCOUNT_DOMAIN}`;
	return new Set(
		(data ?? [])
			.map((row) => row.email?.toLowerCase() ?? '')
			.filter((email) => email.endsWith(suffix))
			.map((email) => email.slice(0, -suffix.length))
	);
}

/**
 * Crée le compte de l'enfant dans la classe du code. Le code est re-résolu par le trigger :
 * une classe fermée entre-temps laisse un profil non approuvé, que l'on supprime.
 */
export async function createChildAccount(
	service: ServiceClient,
	input: { childFirstname: string; password: string; classCode: string; termsVersion: string }
): Promise<CreateChildAccountResult> {
	const base = childLoginBase(input.childFirstname);
	if (!base) return { ok: false, reason: 'invalid_firstname' };

	const taken = await takenLoginIds(service, base);
	if (!taken) return { ok: false, reason: 'server_error' };

	for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
		const loginId = pickChildLoginId(base, taken);
		const { data, error } = await service.auth.admin.createUser({
			email: childAccountEmail(loginId),
			password: input.password,
			email_confirm: true,
			app_metadata: { child_account: true },
			user_metadata: {
				class_code: input.classCode,
				firstname: input.childFirstname,
				lastname: '',
				terms_version: input.termsVersion
			}
		});

		if (error?.code === 'email_exists') {
			taken.add(loginId);
			continue;
		}
		if (error || !data.user) {
			logger.error('Création du compte de l’enfant impossible :', error?.message);
			return { ok: false, reason: 'server_error' };
		}

		const userId = data.user.id;
		const { data: profile, error: profileError } = await service
			.from('profiles')
			.select('status, grade')
			.eq('id', userId)
			.maybeSingle();

		if (profileError || profile?.status !== 'approved') {
			// Code fermé entre la vérification et la création, ou profil non créé : on ne
			// laisse pas un compte orphelin qui bloquerait l'identifiant.
			if (profileError) logger.error('Profil de l’enfant illisible :', profileError.message);
			await deleteChildAccount(service, userId);
			return { ok: false, reason: profileError ? 'server_error' : 'class_closed' };
		}

		return { ok: true, userId, loginId, grade: profile.grade };
	}

	logger.error('Aucun identifiant libre après plusieurs essais');
	return { ok: false, reason: 'server_error' };
}

/** Annule une inscription inachevée (compte créé, demande au parent impossible). */
export async function deleteChildAccount(service: ServiceClient, userId: string): Promise<void> {
	const { error } = await service.auth.admin.deleteUser(userId);
	if (error) logger.error('Compte de l’enfant non supprimé :', error.message);
}

/**
 * Crée la demande en attente pour l'adresse du parent. `email_count` reste à 0 : il ne
 * compte que les courriels réellement partis (voir {@link markParentEmailSent}).
 */
export async function createParentRequest(
	service: ServiceClient,
	studentId: string,
	parentEmail: string
): Promise<{ token: string; expiresAt: Date } | null> {
	const { data, error } = await service
		.from('parental_consents')
		.insert({ student_id: studentId, parent_email: parentEmail, status: 'pending' })
		.select('consent_token, expires_at')
		.single();
	if (error || !data) {
		logger.error('Demande au parent non créée :', error?.message);
		return null;
	}
	return { token: data.consent_token, expiresAt: new Date(data.expires_at) };
}

/** Note l'envoi du courriel au parent sur sa demande. */
export async function markParentEmailSent(service: ServiceClient, token: string): Promise<void> {
	const { data, error } = await service
		.from('parental_consents')
		.update({ email_count: 1, last_email_sent_at: new Date().toISOString() })
		.eq('consent_token', token)
		.select('id');
	if (error || !data?.length) logger.error('Envoi au parent non noté :', error?.message);
}
