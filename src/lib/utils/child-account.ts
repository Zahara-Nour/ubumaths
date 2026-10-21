/**
 * Compte d'un enfant inscrit par son parent
 * =========================================
 *
 * Un enfant sans adresse se connecte par un identifiant (`noelie42`). Supabase Auth exige une
 * adresse : l'identifiant devient `noelie42@eleves.chiph.re`, sur un domaine qui ne reçoit
 * rien (enregistrement « null MX »). Aucun courriel ne doit partir vers ce domaine : les
 * envois le vérifient avec `isChildAccountEmail`.
 */

// Constantes

export const CHILD_ACCOUNT_DOMAIN = 'eleves.chiph.re';

const LIGATURES: Record<string, string> = { œ: 'oe', æ: 'ae', ß: 'ss' };

// Fonctions

/** Ramène un texte à `[a-z0-9]` : sans accent, sans majuscule, sans séparateur. */
function foldToLoginId(raw: string): string {
	return raw
		.toLowerCase()
		.replace(/[œæß]/g, (c) => LIGATURES[c])
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

/**
 * Ce que l'utilisateur tape dans « Adresse ou identifiant » → l'adresse à donner à l'auth.
 * Une saisie avec `@` est une adresse (mise en minuscules) ; sinon c'est un identifiant,
 * insensible aux majuscules et aux accents. `null` s'il ne reste rien.
 */
export function normalizeLoginIdentifier(raw: string): string | null {
	const trimmed = raw.trim();
	if (trimmed.includes('@')) return trimmed.toLowerCase();
	const loginId = foldToLoginId(trimmed);
	return loginId === '' ? null : `${loginId}@${CHILD_ACCOUNT_DOMAIN}`;
}

/** Vrai pour une adresse du domaine fictif : on ne lui envoie jamais rien. */
export function isChildAccountEmail(email: string): boolean {
	return email.trim().toLowerCase().endsWith(`@${CHILD_ACCOUNT_DOMAIN}`);
}
