/**
 * Ce que dit la page d'erreur, selon le code HTTP.
 *
 * L'ancienne page annonçait « Page introuvable » même quand le serveur
 * plantait : chaque famille de codes a désormais son titre, son explication et
 * ses actions (se connecter, réessayer).
 *
 * Le message précis d'une erreur 4xx (`error(404, 'Exercice introuvable')`)
 * remplace le titre ; celui d'une 5xx, qui peut venir brut de la base, est
 * replié sous « Détails techniques ». Sauf quand il ne fait que répéter le code (« Not Found »,
 * « Unauthorized »…) : ces formules génériques, souvent en anglais, n'apprennent
 * rien de plus que le titre.
 *
 * @module lib/error-page/error-copy
 */

export interface ErrorCopy {
	title: string;
	/**
	 * Début de la phrase sur π, préposition comprise : « Le nombre 429 {a attendu
	 * jusqu’à la} 1 229ᵉ décimale de π ».
	 */
	piVerb: string;
	/**
	 * Chute de la phrase sur π, ponctuation d'attache comprise (« , mais… »,
	 * « ; … ») : « …décimale de π ; ta demande, elle, n'a pas abouti. »
	 */
	piTwist: string;
	/**
	 * Message d'une erreur serveur (5xx), à replier sous « Détails techniques » :
	 * il peut citer une erreur brute de la base (noms de tables, de colonnes).
	 */
	technicalDetail: string | null;
	/** Proposer de se connecter (401). */
	offerLogin: boolean;
	/** Proposer de recharger la page (erreurs passagères). */
	offerRetry: boolean;
}

type Copy = Pick<ErrorCopy, 'title' | 'piTwist'> & Partial<Pick<ErrorCopy, 'piVerb'>>;

// Pas d'explication sous le titre : le titre, la phrase sur π et les actions suffisent
const COPY_BY_STATUS: Readonly<Record<number, Copy>> = {
	400: {
		title: 'Demande impossible',
		piVerb: 'est bien formé à la',
		piTwist: '\u00a0; ta demande, elle, ne l’est pas'
	},
	401: {
		title: 'Connexion requise',
		piVerb: 'se présente à la',
		piTwist: '\u00a0; ta page, elle, voudrait que tu en fasses autant'
	},
	403: {
		title: 'Accès refusé',
		piVerb: 'a été autorisé à s’installer à la',
		piTwist: '\u00a0; toi, sur cette page, tu ne l’es pas'
	},
	404: {
		title: 'Page introuvable',
		piTwist: ', mais la page, elle, reste introuvable'
	},
	408: {
		title: 'Délai dépassé',
		piVerb: 'arrive dès la',
		piTwist: '\u00a0; ta demande, elle, a mis trop de temps'
	},
	410: {
		title: 'Page disparue',
		piVerb: 'a un bail éternel à la',
		piTwist: '\u00a0; cette page, elle, a rendu les clés'
	},
	429: {
		title: 'Trop de demandes',
		piVerb: 'a attendu jusqu’à la',
		piTwist: '\u00a0; toi, quelques secondes suffiront'
	},
	500: {
		title: 'Le serveur a trébuché',
		piVerb: 'tient bon jusqu’à la',
		piTwist: '\u00a0; le serveur, lui, a trébuché bien avant'
	},
	503: {
		title: 'Service indisponible',
		piVerb: 'est de service à la',
		piTwist: '\u00a0; cette page, elle, est hors service pour quelques minutes'
	}
};

/** Repli des codes 4xx sans texte propre (405, 413, 415, 422…). */
const CLIENT_ERROR: Copy = {
	title: 'Demande impossible',
	piTwist: '\u00a0; ta demande, elle, n’a pas abouti'
};

/** Repli des codes 5xx sans texte propre (501, 502, 504…). */
const SERVER_ERROR: Copy = {
	title: 'Le serveur a trébuché',
	piTwist: '\u00a0; le serveur, lui, a perdu le fil'
};

/**
 * Messages qui ne font que répéter le code : ceux de SvelteKit (« Not Found »,
 * « Internal Error ») et les formules génériques des `error()` du projet.
 * Comparés sans casse ni accents.
 */
const GENERIC_MESSAGES = new Set(
	[
		'Not Found',
		'Internal Error',
		'Internal server error',
		'Unauthorized',
		'Forbidden',
		'Access denied',
		'Non autorisé',
		'Non autorisé - Authentification requise',
		'Accès refusé',
		'Erreur serveur'
	].map(simplify)
);

/** Les textes de la page pour `status` ; `message` est celui de l'erreur. */
export function describeError(status: number, message: string | undefined): ErrorCopy {
	const copy = COPY_BY_STATUS[status] ?? (status >= 500 ? SERVER_ERROR : CLIENT_ERROR);
	const trimmed = message?.trim() ?? '';
	const repeatsTitle =
		trimmed === '' ||
		GENERIC_MESSAGES.has(simplify(trimmed)) ||
		simplify(trimmed) === simplify(copy.title);

	const specific = repeatsTitle ? null : trimmed;

	return {
		...copy,
		piVerb: copy.piVerb ?? 'apparaît à la',
		// Erreur 4xx : le message précis (« Exercice introuvable ») remplace le titre générique
		title: status < 500 && specific !== null ? specific : copy.title,
		technicalDetail: status >= 500 ? specific : null,
		offerLogin: status === 401,
		offerRetry: status >= 500 || status === 408 || status === 429
	};
}

/** Minuscules, sans accents ni ponctuation finale. */
function simplify(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[\s.!]+$/, '');
}
