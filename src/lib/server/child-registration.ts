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
import type { Database } from '#lib/types/database.ts';
import {
	CHILD_ACCOUNT_DOMAIN,
	childAccountEmail,
	childLoginBase,
	pickChildLoginId
} from '#lib/utils/child-account.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types

type ServiceClient = SupabaseClient<Database>;

export type CreateChildAuthUserResult =
	| { ok: true; userId: string; loginId: string }
	| { ok: false; reason: 'invalid_firstname' | 'weak_password' | 'server_error' };

export type CreateChildAccountResult =
	| { ok: true; userId: string; loginId: string; grade: string | null }
	| { ok: false; reason: 'invalid_firstname' | 'class_closed' | 'weak_password' | 'server_error' };

// Constantes

const logger = createServerLogger('server/child-registration');

// Collisions possibles entre la lecture des identifiants pris et la création (deux
// inscriptions simultanées du même prénom) : quelques essais suffisent.
const MAX_CREATE_ATTEMPTS = 5;

// Functions

/** Identifiants déjà pris pour cette racine (`noelie` → {noelie042, noelie42…}). */
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
 * Crée le compte Auth de l'enfant (identifiant libre, domaine fictif, marque `child_account`).
 * Le profil naît du trigger `handle_new_user` selon `userMetadata` : avec un code de classe
 * ouvert → approuvé dans la classe ; sans code → en attente (l'appelant le complète).
 */
export async function createChildAuthUser(
	service: ServiceClient,
	input: {
		childFirstname: string;
		password: string;
		userMetadata: Record<string, string>;
		/** Marques serveur en plus de `child_account` (ex. l'invitation qui crée le compte). */
		appMetadata?: Record<string, string>;
	}
): Promise<CreateChildAuthUserResult> {
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
			app_metadata: { ...input.appMetadata, child_account: true },
			user_metadata: input.userMetadata
		});

		if (error?.code === 'email_exists') {
			taken.add(loginId);
			continue;
		}
		// GoTrue peut être plus strict que notre politique (mots de passe compromis) : on le
		// dit au parent sur le champ, au lieu d'une erreur serveur.
		if (error?.code === 'weak_password') {
			return { ok: false, reason: 'weak_password' };
		}
		if (error || !data.user) {
			logger.error('Création du compte de l’enfant impossible :', error?.message);
			return { ok: false, reason: 'server_error' };
		}
		return { ok: true, userId: data.user.id, loginId };
	}

	logger.error('Aucun identifiant libre après plusieurs essais');
	return { ok: false, reason: 'server_error' };
}

/**
 * Crée le compte de l'enfant dans la classe du code. Le code est re-résolu par le trigger :
 * une classe fermée entre-temps laisse un profil non approuvé, que l'on supprime.
 */
export async function createChildAccount(
	service: ServiceClient,
	input: { childFirstname: string; password: string; classCode: string; termsVersion: string }
): Promise<CreateChildAccountResult> {
	const created = await createChildAuthUser(service, {
		childFirstname: input.childFirstname,
		password: input.password,
		userMetadata: {
			class_code: input.classCode,
			firstname: input.childFirstname,
			lastname: '',
			terms_version: input.termsVersion
		}
	});
	if (!created.ok) return created;
	const { userId, loginId } = created;

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

	// Lecture seule jusqu'au clic du parent (Q2, David, 2026-10-21) : la règle commune
	// (apply_consent_rule_by_grade) donne 30 jours d'accès complet à tout nouveau compte ;
	// ici, sans adresse vérifiée, aucun. La clé service peut écrire ces champs.
	const { data: closed, error: graceError } = await service
		.from('profiles')
		.update({ consent_grace_period_ends: null })
		.eq('id', userId)
		.select('id');
	if (graceError || closed?.length !== 1) {
		logger.error('Délai de grâce non retiré :', graceError?.message);
		await deleteChildAccount(service, userId);
		return { ok: false, reason: 'server_error' };
	}

	return { ok: true, userId, loginId, grade: profile.grade };
}

/**
 * Annule une inscription inachevée (compte créé, demande au parent impossible). Rend `false`
 * si le compte n'a pas pu être supprimé (journalisé « à retirer »), y compris sur exception.
 */
export async function deleteChildAccount(service: ServiceClient, userId: string): Promise<boolean> {
	try {
		const { error } = await service.auth.admin.deleteUser(userId);
		if (!error) return true;
		// ⚠️ Compte approuvé dans la classe sans demande au parent : le prof le verrait comme
		// un élève fantôme. Le message nomme l'id pour le retrouver dans les journaux.
		logger.error(`Compte de l’enfant ${userId} NON supprimé (à retirer) :`, error.message);
	} catch (err) {
		logger.error(
			`Compte de l’enfant ${userId} NON supprimé (à retirer) :`,
			err instanceof Error ? err.message : 'exception'
		);
	}
	return false;
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
