/**
 * Ce que dit la page d'erreur, selon le code HTTP.
 *
 * L'ancienne page annonçait « Page introuvable » même quand le serveur
 * plantait : chaque famille de codes a désormais son titre, son explication et
 * ses actions (se connecter, réessayer).
 *
 * Le message précis de l'erreur (`error(404, 'Exercice introuvable')`) est
 * affiché en plus — replié sous « Détails techniques » pour une 5xx, dont le
 * message peut venir brut de la base —, sauf quand il ne fait que répéter le code (« Not Found »,
 * « Unauthorized »…) : ces formules génériques, souvent en anglais, n'apprennent
 * rien de plus que le titre.
 *
 * @module lib/error-page/error-copy
 */

export interface ErrorCopy {
	title: string;
	explanation: string;
	/** Message précis de l'erreur, ou `null` s'il ne dit rien de plus que le titre. */
	detail: string | null;
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

type Copy = Pick<ErrorCopy, 'title' | 'explanation'>;

const COPY_BY_STATUS: Readonly<Record<number, Copy>> = {
	401: {
		title: 'Connexion requise',
		explanation: 'Cette page est réservée aux membres : connecte-toi pour y accéder.'
	},
	403: {
		title: 'Accès refusé',
		explanation: 'Cette page existe bien, mais elle ne t’est pas ouverte.'
	},
	404: {
		title: 'Page introuvable',
		explanation:
			'L’adresse ne mène nulle part : elle a peut-être été mal tapée, ou la page a déménagé.'
	},
	410: {
		title: 'Page disparue',
		explanation: 'Cette page existait, mais elle a été retirée pour de bon.'
	},
	429: {
		title: 'Trop de demandes',
		explanation: 'Le serveur reçoit trop de demandes d’un coup. Patiente un instant, puis réessaie.'
	},
	503: {
		title: 'Service indisponible',
		explanation:
			'Chiphre est momentanément indisponible (maintenance ou surcharge). Réessaie dans quelques minutes.'
	}
};

const CLIENT_ERROR: Copy = {
	title: 'Demande impossible',
	explanation: 'La demande n’a pas pu être traitée. Vérifie l’adresse ou reviens en arrière.'
};

const SERVER_ERROR: Copy = {
	title: 'Le serveur a trébuché',
	explanation: 'Une erreur inattendue s’est produite de notre côté. Réessaie dans un instant.'
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
		detail: status >= 500 ? null : specific,
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
