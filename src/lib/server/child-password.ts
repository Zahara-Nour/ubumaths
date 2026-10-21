/**
 * Mots de passe des élèves — côté serveur
 * =======================================
 *
 * Trois recours quand un élève a perdu son mot de passe (décision 4, phase 0 de la PR 3) :
 *
 * - **Le parent** d'un enfant inscrit par identifiant : le lien part à SON adresse, et
 *   seulement si elle est confirmée (R1). GoTrue enverrait le lien à l'adresse du compte,
 *   fictive : on lui demande le jeton sans envoi (`generateLink`), Brevo l'envoie au parent.
 *   La page du lien change le mot de passe SANS ouvrir de session chez le parent (R2,
 *   décision 8 : il ne voit rien du compte de l'enfant).
 * - **Le prof** : mot de passe provisoire généré, affiché une fois ; la marque
 *   `app_metadata.must_change_password` oblige l'élève à en choisir un à la connexion
 *   suivante (R3). `app_metadata` n'est modifiable que par la clé service.
 * - **L'élève** : « Changer mon mot de passe » (`/auth/update-password`).
 */

import { randomInt } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createAnonymousSupabase } from '$lib/server/anonymous-supabase';
import { CHILD_ACCOUNT_DOMAIN, isChildAccountEmail } from '$lib/utils/child-account';
import { createServerLogger } from '$lib/utils/logger';

// Types

type ServiceClient = SupabaseClient<Database>;

export type ChildResetTarget =
	| { ok: true; userId: string; firstname: string; loginId: string; parentEmail: string }
	| { ok: false; reason: 'unknown' | 'no_parent' | 'unconfirmed' | 'server_error' };

export type SetChildPasswordResult =
	| { ok: true; firstname: string; loginId: string }
	| { ok: false; reason: 'invalid_token' | 'not_child' | 'weak_password' | 'server_error' };

export type ProvisionalPasswordResult =
	{ ok: true; password: string } | { ok: false; reason: 'server_error' };

// Constantes

const logger = createServerLogger('server/child-password');

export const MUST_CHANGE_PASSWORD = 'must_change_password';

/** Un lien de courriel ouvert depuis moins d'une heure vaut preuve (cf. `otp_expiry`). */
const EMAIL_LINK_FRESHNESS_SECONDS = 3600;

// Mots simples, sans accent, faciles à dicter à un enfant : 128 mots → 2 mots + 2 chiffres
// ≈ 20 bits. Suffisant pour un mot de passe à usage unique, changé à la connexion suivante
// et protégé par la limite de connexions.
const WORDS = [
	'abeille',
	'ananas',
	'arbre',
	'balle',
	'banane',
	'bateau',
	'biscuit',
	'bougie',
	'bouton',
	'brioche',
	'cactus',
	'camion',
	'canard',
	'carotte',
	'castor',
	'cerise',
	'chameau',
	'chapeau',
	'chaton',
	'citron',
	'colibri',
	'comete',
	'corbeau',
	'crayon',
	'dauphin',
	'domino',
	'dragon',
	'ecureuil',
	'etoile',
	'facteur',
	'falaise',
	'flocon',
	'fourmi',
	'fraise',
	'fusee',
	'galet',
	'gateau',
	'girafe',
	'glacier',
	'gorille',
	'grenouille',
	'guitare',
	'hamster',
	'herisson',
	'hibou',
	'igloo',
	'jardin',
	'jongleur',
	'kangourou',
	'koala',
	'lapin',
	'lavande',
	'lezard',
	'licorne',
	'lion',
	'loutre',
	'lune',
	'manchot',
	'mangue',
	'marmotte',
	'melon',
	'mouette',
	'moulin',
	'nuage',
	'olive',
	'orange',
	'orque',
	'ours',
	'panda',
	'papillon',
	'pastel',
	'pelican',
	'phare',
	'piano',
	'pingouin',
	'pirate',
	'planete',
	'poisson',
	'pomme',
	'poney',
	'potiron',
	'prairie',
	'puzzle',
	'radis',
	'raisin',
	'renard',
	'requin',
	'robot',
	'rocher',
	'sabot',
	'salade',
	'sapin',
	'sardine',
	'serpent',
	'singe',
	'soleil',
	'tambour',
	'tapir',
	'taupe',
	'tigre',
	'tomate',
	'tortue',
	'toucan',
	'tracteur',
	'train',
	'trefle',
	'trompette',
	'tulipe',
	'vague',
	'valise',
	'violon',
	'volcan',
	'wagon',
	'yaourt',
	'zebre',
	'baleine',
	'bison',
	'cigale',
	'coquille',
	'dune',
	'fanfare',
	'grotte',
	'houblon',
	'iris',
	'lanterne',
	'meteore',
	'noisette',
	'orage'
];

// Functions

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

/** `Tigre-Lune-47` : majuscule, minuscule, chiffre et symbole, quelle que soit la politique. */
export function generateProvisionalPassword(): string {
	const first = WORDS[randomInt(WORDS.length)];
	let second = WORDS[randomInt(WORDS.length)];
	while (second === first) second = WORDS[randomInt(WORDS.length)];
	const digits = String(randomInt(100)).padStart(2, '0');
	return `${capitalize(first)}-${capitalize(second)}-${digits}`;
}

/** Vrai si l'élève doit choisir son mot de passe avant tout (mot de passe provisoire). */
export function mustChangePassword(user: { app_metadata?: Record<string, unknown> }): boolean {
	return user.app_metadata?.[MUST_CHANGE_PASSWORD] === true;
}

/**
 * Vrai pour une session ouverte par un lien de courriel (`amr` = `otp`) il y a moins d'une
 * heure : son titulaire a prouvé qu'il lisait la boîte, l'ancien mot de passe n'est pas exigé.
 * Une session plus ancienne peut être un ordinateur laissé ouvert.
 */
export function isFreshEmailLinkSession(amr: unknown, nowSeconds: number): boolean {
	if (!Array.isArray(amr)) return false;
	return amr.some(
		(entry: unknown) =>
			typeof entry === 'object' &&
			entry !== null &&
			(entry as { method?: unknown }).method === 'otp' &&
			typeof (entry as { timestamp?: unknown }).timestamp === 'number' &&
			nowSeconds - (entry as { timestamp: number }).timestamp < EMAIL_LINK_FRESHNESS_SECONDS
	);
}

function loginIdOf(email: string): string {
	return email.slice(0, -`@${CHILD_ACCOUNT_DOMAIN}`.length);
}

/**
 * À qui envoyer le lien pour l'enfant de cette adresse fictive : l'adresse du parent de la
 * demande la plus récente, si elle est confirmée (`granted`, R1). Sinon, rien.
 */
export async function findChildResetTarget(
	service: ServiceClient,
	childEmail: string
): Promise<ChildResetTarget> {
	const email = childEmail.trim().toLowerCase();
	if (!isChildAccountEmail(email)) return { ok: false, reason: 'unknown' };

	const { data: profile, error: profileError } = await service
		.from('profiles')
		.select('id, firstname')
		.eq('email', email)
		.eq('role', 'student')
		.maybeSingle();
	if (profileError) {
		logger.error('Profil de l’enfant illisible :', profileError.message);
		return { ok: false, reason: 'server_error' };
	}
	if (!profile) return { ok: false, reason: 'unknown' };

	const { data: request, error: requestError } = await service
		.from('parental_consents')
		.select('parent_email, status')
		.eq('student_id', profile.id)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (requestError) {
		logger.error('Demande au parent illisible :', requestError.message);
		return { ok: false, reason: 'server_error' };
	}
	if (!request) return { ok: false, reason: 'no_parent' };
	if (request.status !== 'granted') return { ok: false, reason: 'unconfirmed' };

	return {
		ok: true,
		userId: profile.id,
		firstname: profile.firstname ?? '',
		loginId: loginIdOf(email),
		parentEmail: request.parent_email
	};
}

/** Jeton de réinitialisation, SANS courriel de GoTrue (c'est Brevo qui écrit au parent). */
export async function createChildRecoveryToken(
	service: ServiceClient,
	childEmail: string
): Promise<string | null> {
	const { data, error } = await service.auth.admin.generateLink({
		type: 'recovery',
		email: childEmail
	});
	if (error || !data.properties?.hashed_token) {
		logger.error('Jeton de réinitialisation non créé :', error?.message);
		return null;
	}
	return data.properties.hashed_token;
}

/**
 * Page du lien du parent : vérifie le jeton sur un client jetable (aucun cookie), change le
 * mot de passe par la clé service, puis ferme aussitôt la session que GoTrue a ouverte (R2).
 * Lève aussi la marque « à changer » : le mot de passe vient d'être choisi.
 */
export async function setChildPasswordFromToken(
	service: ServiceClient,
	tokenHash: string,
	password: string
): Promise<SetChildPasswordResult> {
	const ephemeral = createAnonymousSupabase();
	const { data, error } = await ephemeral.auth.verifyOtp({
		type: 'recovery',
		token_hash: tokenHash
	});
	if (error || !data.user) return { ok: false, reason: 'invalid_token' };

	const user = data.user;
	try {
		if (!user.email || !isChildAccountEmail(user.email) || !user.app_metadata?.child_account) {
			return { ok: false, reason: 'not_child' };
		}

		const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
			password,
			app_metadata: { [MUST_CHANGE_PASSWORD]: false }
		});
		if (updateError?.code === 'weak_password') return { ok: false, reason: 'weak_password' };
		if (updateError) {
			logger.error('Mot de passe de l’enfant non changé :', updateError.message);
			return { ok: false, reason: 'server_error' };
		}

		const firstname = (user.user_metadata?.firstname as string | undefined) ?? '';
		return { ok: true, firstname, loginId: loginIdOf(user.email.toLowerCase()) };
	} finally {
		// `local` : seule la session du lien, pas celles de l'enfant.
		const { error: signOutError } = await ephemeral.auth.signOut({ scope: 'local' });
		if (signOutError) logger.error('Session du lien non fermée :', signOutError.message);
	}
}

/** Mot de passe provisoire (prof, R3) : appliqué avec la marque « à changer », rendu une fois. */
export async function setProvisionalPassword(
	service: ServiceClient,
	studentId: string
): Promise<ProvisionalPasswordResult> {
	const password = generateProvisionalPassword();
	const { error } = await service.auth.admin.updateUserById(studentId, {
		password,
		app_metadata: { [MUST_CHANGE_PASSWORD]: true }
	});
	if (error) {
		logger.error('Mot de passe provisoire non appliqué :', error.message);
		return { ok: false, reason: 'server_error' };
	}
	return { ok: true, password };
}
