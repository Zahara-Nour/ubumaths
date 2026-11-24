/**
 * Mots du dictionnaire affichés ou masqués (R6 du chantier `mots-cliquables`)
 * ===========================================================================
 *
 * Sur une carte de question, le soulignement des mots du dictionnaire est
 * masqué par défaut ; le bouton « Mots du dictionnaire » l'affiche. Le choix
 * vaut pour toutes les cartes et se mémorise sur l'appareil, comme la
 * correction détaillée (`chiphre:correction-detail`).
 *
 * Simple confort d'affichage : le stockage peut manquer ou lever (navigation
 * privée, données bloquées) — chaque accès est protégé ; sans lui, les mots
 * restent masqués et le choix ne vaut que pour la page (B7).
 *
 * @module lexicon/visibility
 */

export const LEXICON_VISIBILITY_STORAGE_KEY = 'chiphre:mots-du-dictionnaire';

const SHOWN = 'shown';
const HIDDEN = 'hidden';

// Relu à chaque changement : toutes les cartes de la page suivent le même choix
let version = $state(0);
// Choix de la page quand le stockage refuse de l'écrire
let pageChoice = $state<boolean | null>(null);

function readStoredChoice(): boolean {
	try {
		return globalThis.localStorage?.getItem(LEXICON_VISIBILITY_STORAGE_KEY) === SHOWN;
	} catch {
		return false;
	}
}

/** Les mots du dictionnaire sont-ils affichés (lecture réactive) ? */
export function lexiconShown(): boolean {
	void version;
	return pageChoice ?? readStoredChoice();
}

/** Afficher ou masquer les mots, sur toutes les cartes, et le mémoriser sur l'appareil. */
export function setLexiconShown(shown: boolean): void {
	try {
		globalThis.localStorage?.setItem(LEXICON_VISIBILITY_STORAGE_KEY, shown ? SHOWN : HIDDEN);
	} catch {
		// Stockage indisponible : relu ci-dessous
	}
	// Choix illisible au retour (stockage absent, bloqué en lecture) : il vaut pour la page seulement
	pageChoice = readStoredChoice() === shown ? null : shown;
	version += 1;
}
