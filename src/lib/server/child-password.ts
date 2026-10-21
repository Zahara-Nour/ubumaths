/**
 * Mots de passe des élèves — côté serveur
 * =======================================
 *
 * Trois recours quand un élève a perdu son mot de passe (décision 4, phase 0 de la PR 3) :
 *
 * - **Le parent** d'un enfant inscrit par identifiant : le lien part à SON adresse, et
 *   seulement si elle est confirmée (R1), par Brevo. Le jeton du lien est À NOUS : aléatoire,
 *   seule son empreinte est gardée dans `app_metadata.password_reset` de l'enfant (écrit par la
 *   clé service seulement). Jamais un jeton de GoTrue : présenté à `/auth/v1/verify`, celui-ci
 *   ouvrirait une session sur le compte de l'enfant (audit de la PR 3, B1). La page du lien
 *   change le mot de passe par la clé service, sans aucune session (R2, décision 8 : le
 *   parent ne voit rien du compte de l'enfant).
 * - **Le prof** : mot de passe provisoire généré, affiché une fois ; la marque
 *   `app_metadata.must_change_password` oblige l'élève à en choisir un à la connexion
 *   suivante (R3). `app_metadata` n'est modifiable que par la clé service.
 * - **L'élève** : « Changer mon mot de passe » (`/auth/update-password`).
 */

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createAnonymousSupabase } from '$lib/server/anonymous-supabase';
import { childLoginIdOf, isChildAccountEmail } from '$lib/utils/child-account';
import { createServerLogger } from '$lib/utils/logger';

// Types

type ServiceClient = SupabaseClient<Database>;

export type ChildResetTarget =
	| { ok: true; userId: string; firstname: string; loginId: string; parentEmail: string }
	| { ok: false; reason: 'unknown' | 'no_parent' | 'unconfirmed' | 'server_error' };

export type SetChildPasswordResult =
	| { ok: true; firstname: string; loginId: string }
	| { ok: false; reason: 'invalid_token' | 'weak_password' | 'server_error' };

export type ProvisionalPasswordResult =
	{ ok: true; password: string } | { ok: false; reason: 'server_error' };

// Constantes

const logger = createServerLogger('server/child-password');

export const MUST_CHANGE_PASSWORD = 'must_change_password';
export const PASSWORD_RESET = 'password_reset';

/** Durée du lien envoyé au parent. */
const RESET_TOKEN_TTL_SECONDS = 3600;

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
 * Vrai si le compte se connecte par mot de passe (fournisseur `email`). Un compte ouvert par
 * Google seul n'en a pas : « Changer mon mot de passe » exigerait un ancien mot de passe
 * qui n'existe pas.
 */
export function hasPasswordLogin(user: { app_metadata?: Record<string, unknown> }): boolean {
	const providers = user.app_metadata?.providers;
	return Array.isArray(providers) && providers.includes('email');
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

type ServiceUser = { id: string; email?: string; app_metadata?: Record<string, unknown> };

/** Compte d'un enfant : adresse du domaine fictif ET marque posée par la clé service. */
function isChildUser(user: ServiceUser): user is ServiceUser & { email: string } {
	return (
		!!user.email && isChildAccountEmail(user.email) && user.app_metadata?.child_account === true
	);
}

function sha256(value: string): Buffer {
	return createHash('sha256').update(value).digest();
}

/**
 * À qui envoyer le lien pour l'enfant de cette adresse fictive : l'adresse du parent de la
 * demande la plus récente, si elle est confirmée (`granted`, R1). Sinon, rien. Le compte est
 * relu dans GoTrue (adresse et marque) : `profiles.email` est modifiable par son propriétaire.
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

	const { data: auth, error: authError } = await service.auth.admin.getUserById(profile.id);
	if (authError || !auth.user) {
		logger.error('Compte de l’enfant illisible :', authError?.message);
		return { ok: false, reason: 'server_error' };
	}
	if (!isChildUser(auth.user) || auth.user.email.toLowerCase() !== email) {
		return { ok: false, reason: 'unknown' };
	}

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
		loginId: childLoginIdOf(email) ?? '',
		parentEmail: request.parent_email
	};
}

/**
 * Jeton du lien du parent : 32 octets aléatoires ; seule l'empreinte SHA-256 et l'échéance
 * sont gardées dans `app_metadata` (une mise à jour qui ne ferme aucune session). Une nouvelle
 * demande remplace la précédente.
 */
export async function createChildResetToken(
	service: ServiceClient,
	userId: string,
	nowMs: number = Date.now()
): Promise<string | null> {
	const token = randomBytes(32).toString('base64url');
	const { error } = await service.auth.admin.updateUserById(userId, {
		app_metadata: {
			[PASSWORD_RESET]: {
				hash: sha256(token).toString('hex'),
				expires_at: nowMs + RESET_TOKEN_TTL_SECONDS * 1000
			}
		}
	});
	if (error) {
		logger.error('Jeton du parent non enregistré :', error.message);
		return null;
	}
	return token;
}

/** Le jeton présenté correspond-il à l'empreinte gardée, avant l'échéance ? */
function matchesStoredToken(stored: unknown, token: string, nowMs: number): boolean {
	if (typeof stored !== 'object' || stored === null) return false;
	const { hash, expires_at } = stored as { hash?: unknown; expires_at?: unknown };
	if (typeof hash !== 'string' || typeof expires_at !== 'number' || nowMs >= expires_at) {
		return false;
	}
	const expected = Buffer.from(hash, 'hex');
	const actual = sha256(token);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Page du lien du parent : vérifie le jeton contre l'empreinte de l'enfant, puis change le
 * mot de passe par la clé service — aucune session n'est ouverte (R2). Le jeton n'est effacé
 * qu'au succès : un mot de passe refusé par GoTrue laisse le parent réessayer. Lève aussi la
 * marque « à changer » : le mot de passe vient d'être choisi.
 */
export async function setChildPasswordFromToken(
	service: ServiceClient,
	userId: string,
	token: string,
	password: string,
	nowMs: number = Date.now()
): Promise<SetChildPasswordResult> {
	const { data, error } = await service.auth.admin.getUserById(userId);
	if (error || !data.user) return { ok: false, reason: 'invalid_token' };
	const user = data.user;
	if (
		!isChildUser(user) ||
		!matchesStoredToken(user.app_metadata?.[PASSWORD_RESET], token, nowMs)
	) {
		return { ok: false, reason: 'invalid_token' };
	}

	const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
		password,
		app_metadata: { [PASSWORD_RESET]: null, [MUST_CHANGE_PASSWORD]: false }
	});
	if (updateError?.code === 'weak_password') return { ok: false, reason: 'weak_password' };
	if (updateError) {
		logger.error('Mot de passe de l’enfant non changé :', updateError.message);
		return { ok: false, reason: 'server_error' };
	}

	const firstname = (user.user_metadata?.firstname as string | undefined) ?? '';
	return { ok: true, firstname, loginId: childLoginIdOf(user.email) ?? '' };
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

/**
 * « Changer mon mot de passe » : l'ancien mot de passe est-il le bon ? Vérifié sur un client
 * jetable, dont la session est aussitôt fermée (celle de l'élève n'est pas touchée).
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
	const ephemeral = createAnonymousSupabase();
	const { error } = await ephemeral.auth.signInWithPassword({ email, password });
	if (error) return false;
	await ephemeral.auth.signOut({ scope: 'local' });
	return true;
}
