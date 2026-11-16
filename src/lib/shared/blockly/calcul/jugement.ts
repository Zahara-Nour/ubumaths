/**
 * Jugement d'une réponse « programme de calcul » (bloc ```calcul d'un modèle de question) : le
 * programme de l'élève et le programme attendu, écrits en notation texte, sont rejoués par
 * l'interpréteur (ADR 0039) sur chaque nombre d'essai ; la réponse est juste s'ils affichent les
 * mêmes nombres, dans le même ordre, pour chaque essai. Un seul essai ne suffit pas : `× 2` et
 * `+ 2` donnent tous deux 4 en partant de 2.
 *
 * Quand l'attendu dépend du nombre choisi, le programme de l'élève doit en dépendre aussi : avec
 * un seul essai (« pour 3, affiche 10 »), `afficher 10` coïnciderait sinon. La dépendance est
 * mesurée sur des nombres témoins, pas en cherchant le bloc « nombre » (`nombre × 0 + 10` ne
 * dépend pas du nombre).
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import {
	egauxCalcul,
	executerCalcul,
	messageErreurCalcul,
	type NiveauCalcul
} from './interpreteur';
import { ecrireNombreCalcul, texteVersEtatCalcul } from './notation';

// =============================================================================
// Types
// =============================================================================

export type ProgrammeCalculLu =
	{ ok: true; sorties: number[][] } | { ok: false; message: string; essai?: number };

export interface VerdictCalcul {
	juste: boolean;
	/** Pourquoi le programme n'a pas pu être jugé (illisible, rien d'affiché, division par zéro…). */
	message?: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** Nombres d'essai sans `essais:` : négatif, zéro, un, petits et grands entiers, décimal. */
export const ESSAIS_PAR_DEFAUT: readonly number[] = [-3, 0, 1, 2, 5, 10, 0.5];

/** Essais au plus dans un bloc (chaque essai rejoue deux programmes). */
export const ESSAIS_MAX = 20;

export const RIEN_AFFICHE = 'Ton programme n’affiche rien.';

export const PROGRAMME_CONSTANT =
	'Ton programme affiche toujours la même chose, quel que soit le nombre choisi.';

// =============================================================================
// Fonctions
// =============================================================================

/** Mêmes nombres affichés, dans le même ordre, à la marge près (`egauxCalcul`). */
export function memesAffichages(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((x, i) => egauxCalcul(x, b[i]));
}

/**
 * Lit un programme écrit et l'exécute sur chaque essai, avec les blocs du niveau (5e par
 * défaut) ; rend ses affichages, ou l'erreur.
 */
export function lireProgrammeCalcul(
	texte: string,
	essais: readonly number[],
	niveau: NiveauCalcul = '5e'
): ProgrammeCalculLu {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) return lu;
	const sorties: number[][] = [];
	for (const essai of essais) {
		const resultat = executerCalcul(lu.etat, essai, niveau);
		if (!resultat.ok) {
			return {
				ok: false,
				essai,
				message: `Avec le nombre ${ecrireNombreCalcul(essai)} : ${messageErreurCalcul(resultat.erreur)}`
			};
		}
		sorties.push(resultat.affichages);
	}
	return { ok: true, sorties };
}

/**
 * Le programme affiche-t-il des choses différentes selon le nombre choisi ? Mesuré sur les
 * nombres témoins (`ESSAIS_PAR_DEFAUT`) ; un témoin où le programme s'arrête sur une erreur est
 * ignoré. null : programme illisible, ou moins de deux témoins utilisables (on ne sait pas).
 * Témoins fixes et connus : un polynôme construit pour s'annuler sur chacun tromperait la mesure
 * (cas d'école, pas d'élève).
 */
export function dependDuNombre(texte: string, niveau: NiveauCalcul = '5e'): boolean | null {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) return null;
	const sorties: number[][] = [];
	for (const temoin of ESSAIS_PAR_DEFAUT) {
		const resultat = executerCalcul(lu.etat, temoin, niveau);
		if (resultat.ok) sorties.push(resultat.affichages);
	}
	if (sorties.length < 2) return null;
	return sorties.some((s) => !memesAffichages(s, sorties[0]));
}

/**
 * Juge le programme de l'élève contre le programme attendu, avec les blocs du niveau de la
 * question (5e par défaut : un bloc au-dessus est refusé). Ne lève jamais.
 */
export function jugerProgrammeCalcul(
	reponse: string,
	attendu: string,
	essais: readonly number[],
	niveau: NiveauCalcul = '5e'
): VerdictCalcul {
	if (reponse.trim() === '' || essais.length === 0) return { juste: false };
	// Un attendu qui ne marche pas, ou n'affiche rien, est refusé à la publication ; ici,
	// jamais juste
	const reference = lireProgrammeCalcul(attendu, essais, niveau);
	if (!reference.ok || reference.sorties.some((s) => s.length === 0)) return { juste: false };
	const eleve = lireProgrammeCalcul(reponse, essais, niveau);
	if (!eleve.ok) return { juste: false, message: eleve.message };
	if (eleve.sorties.every((s) => s.length === 0)) return { juste: false, message: RIEN_AFFICHE };
	if (!eleve.sorties.every((s, i) => memesAffichages(s, reference.sorties[i]))) {
		return { juste: false };
	}
	// Mêmes affichages sur les essais : encore faut-il dépendre du nombre si l'attendu en dépend
	if (dependDuNombre(attendu, niveau) === true && dependDuNombre(reponse, niveau) === false) {
		return { juste: false, message: PROGRAMME_CONSTANT };
	}
	return { juste: true };
}

/** Nombre d'essai écrit : signe (− ou -), entier ou décimal (virgule ou point). */
const NOMBRE_ESSAI = /^[-−]?\d+(?:[.,]\d+)?$/;

/**
 * Lit une liste de nombres d'essai (`-3 ; 0 ; 2,5`) : de 1 à `ESSAIS_MAX` nombres distincts.
 * Rend les nombres, ou le message pour l'auteur.
 */
export function lireEssais(
	texte: string
): { ok: true; essais: number[] } | { ok: false; message: string } {
	const morceaux = texte.split(';').map((m) => m.trim());
	if (morceaux.length === 1 && morceaux[0] === '') {
		return { ok: false, message: 'aucun nombre (ex. -3 ; 0 ; 2,5)' };
	}
	if (morceaux.length > ESSAIS_MAX) return { ok: false, message: `${ESSAIS_MAX} nombres au plus` };
	const essais: number[] = [];
	for (const morceau of morceaux) {
		if (!NOMBRE_ESSAI.test(morceau)) {
			return { ok: false, message: `« ${morceau} » n’est pas un nombre (ex. -3 ; 0 ; 2,5)` };
		}
		const n = Number(morceau.replace('−', '-').replace(',', '.'));
		if (essais.some((e) => e === n)) return { ok: false, message: `${morceau} donné deux fois` };
		essais.push(n);
	}
	return { ok: true, essais };
}

/** Écrit une liste de nombres d'essai, relisible par `lireEssais`. */
export function ecrireEssais(essais: readonly number[]): string {
	return essais.map(ecrireNombreCalcul).join(' ; ');
}
