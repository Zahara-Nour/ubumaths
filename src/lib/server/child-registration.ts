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
	| { ok: false; reason: 'invalid_firstname' | 'class_closed' | 'weak_password' | 'server_error' };

// Constantes

const logger = createServerLogger('server/child-registration');

// Collisions possibles entre la lecture des identifiants pris et la création (deux
// inscriptions simultanées du même prénom) : quelques essais suffisent.
const MAX_CREATE_ATTEMPTS = 5;

/**
 * Plafond de classe (M1 bis, David, 2026-10-21) : au plus 5 comptes d'enfant par classe et par
 * 24 h, comptés sur les comptes réellement créés (Q1). Pensé pour les petits groupes
 * d'Akadada ; à relever si une école donne le code à toute une classe le même soir (Q2).
 */
export const CLASS_DAILY_CHILD_LIMIT = 5;
const CLASS_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

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
 * Comptes d'enfant (domaine fictif) entrés dans la classe depuis moins de 24 h, quel que soit
 * leur statut depuis : un compte créé puis retiré a bien été créé. Les inscriptions annulées
 * (compte supprimé) ne comptent plus. `null` si la base ne répond pas (le plafond refuse alors).
 */
export async function countRecentChildAccounts(
	service: ServiceClient,
	classId: string
): Promise<number | null> {
	const since = new Date(Date.now() - CLASS_LIMIT_WINDOW_MS).toISOString();
	const { data: members, error } = await service
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.gte('joined_at', since);
	if (error) {
		logger.error('Entrées récentes dans la classe illisibles :', error.message);
		return null;
	}
	const ids = (members ?? []).map((m) => m.student_id);
	if (ids.length === 0) return 0;

	const { count, error: countError } = await service
		.from('profiles')
		.select('id', { count: 'exact', head: true })
		.in('id', ids)
		.like('email', `%@${CHILD_ACCOUNT_DOMAIN}`);
	if (countError || count === null) {
		logger.error('Comptes d’enfant récents illisibles :', countError?.message);
		return null;
	}
	return count;
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
		// GoTrue peut être plus strict que notre politique (mots de passe compromis) : on le
		// dit au parent sur le champ, au lieu d'une erreur serveur.
		if (error?.code === 'weak_password') {
			return { ok: false, reason: 'weak_password' };
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

	logger.error('Aucun identifiant libre après plusieurs essais');
	return { ok: false, reason: 'server_error' };
}

/** Annule une inscription inachevée (compte créé, demande au parent impossible). */
export async function deleteChildAccount(service: ServiceClient, userId: string): Promise<void> {
	const { error } = await service.auth.admin.deleteUser(userId);
	// ⚠️ Compte approuvé dans la classe sans demande au parent : le prof le verrait comme
	// un élève fantôme. Le message nomme l'id pour le retrouver dans les journaux.
	if (error) logger.error(`Compte de l’enfant ${userId} NON supprimé (à retirer) :`, error.message);
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
