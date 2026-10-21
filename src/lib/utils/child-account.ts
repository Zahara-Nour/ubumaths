/**
 * Compte d'un enfant inscrit par son parent
 * =========================================
 *
 * Un enfant sans adresse se connecte par un identifiant (`noelie042`). Supabase Auth exige une
 * adresse : l'identifiant devient `noelie042@eleves.chiph.re`, sur un domaine qui ne reçoit
 * rien (aujourd'hui absent du DNS ; « null MX » à poser chez OVH). Aucun courriel ne doit
 * partir vers ce domaine : les envois le vérifient avec `isChildAccountEmail`.
 */

// Constantes

export const CHILD_ACCOUNT_DOMAIN = 'eleves.chiph.re';

// Lettres que NFD ne décompose pas : sans cette table, « Łukasz » deviendrait « ukasz ».
const UNDECOMPOSABLE: Record<string, string> = {
	œ: 'oe',
	æ: 'ae',
	ß: 'ss',
	ø: 'o',
	ł: 'l',
	đ: 'd',
	ð: 'd',
	þ: 'th',
	ı: 'i'
};

// Fonctions

/** Ramène un texte à `[a-z0-9]` : sans accent, sans majuscule, sans séparateur. */
function foldToLoginId(raw: string): string {
	return raw
		.normalize('NFKC') // pleine chasse (claviers mobiles), exposants → forme simple
		.toLowerCase()
		.replace(/[œæßøłđðþı]/g, (c) => UNDECOMPOSABLE[c])
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

/** Identifiant d'une adresse du domaine fictif (`noelie42@…` → `noelie42`), `null` sinon. */
export function childLoginIdOf(email: string | null | undefined): string | null {
	if (!email || !isChildAccountEmail(email)) return null;
	return email.trim().toLowerCase().slice(0, -`@${CHILD_ACCOUNT_DOMAIN}`.length);
}

/**
 * Prénom saisi par le parent → racine de l'identifiant : `Noélie` → `noelie`,
 * `Jean-Marc` → `jeanmarc`. Les chiffres sont retirés (le suffixe en ajoute) et la racine
 * est bornée à 20 caractères pour rester facile à taper. `null` s'il ne reste aucune lettre.
 */
export function childLoginBase(firstname: string): string | null {
	const base = foldToLoginId(firstname).replace(/[0-9]/g, '').slice(0, 20);
	return base === '' ? null : base;
}

/**
 * Choisit un identifiant libre : la racine + 3 chiffres au hasard (`noelie042`) ; si les 1 000
 * sont pris, 4 chiffres, et ainsi de suite (jamais de refus). `taken` = identifiants déjà
 * utilisés (sans le domaine). Les comptes plus anciens à 2 chiffres (`noelie42`) gardent le leur.
 */
export function pickChildLoginId(
	base: string,
	taken: ReadonlySet<string>,
	random: () => number = Math.random
): string {
	for (let digits = 3; ; digits++) {
		const count = 10 ** digits;
		const free: string[] = [];
		for (let n = 0; n < count; n++) {
			const candidate = base + String(n).padStart(digits, '0');
			if (!taken.has(candidate)) free.push(candidate);
		}
		if (free.length > 0) return free[Math.floor(random() * free.length)];
	}
}

/** Identifiant → adresse du compte (`noelie42` → `noelie42@eleves.chiph.re`). */
export function childAccountEmail(loginId: string): string {
	return `${loginId}@${CHILD_ACCOUNT_DOMAIN}`;
}
