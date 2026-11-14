/**
 * Jugement d'une réponse « programme de calcul » (bloc ```calcul d'un modèle de question) : le
 * programme de l'élève et le programme attendu, écrits en notation texte, sont rejoués par
 * l'interpréteur (ADR 0039) sur chaque nombre d'essai ; la réponse est juste s'ils affichent les
 * mêmes nombres, dans le même ordre, pour chaque essai. Un seul essai ne suffit pas : `× 2` et
 * `+ 2` donnent tous deux 4 en partant de 2.
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import { executerCalcul, messageErreurCalcul } from './interpreteur';
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

/** Marge relative de l'égalité : 0,1 + 0,2 = 0,3, mais 0,3001 ≠ 0,3. */
const MARGE = 1e-9;

export const RIEN_AFFICHE = 'Ton programme n’affiche rien.';

// =============================================================================
// Fonctions
// =============================================================================

function egaux(a: number, b: number): boolean {
	return Math.abs(a - b) <= MARGE * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Mêmes nombres affichés, dans le même ordre, à la marge près. */
export function memesAffichages(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((x, i) => egaux(x, b[i]));
}

/** Lit un programme écrit et l'exécute sur chaque essai ; rend ses affichages, ou l'erreur. */
export function lireProgrammeCalcul(texte: string, essais: readonly number[]): ProgrammeCalculLu {
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) return lu;
	const sorties: number[][] = [];
	for (const essai of essais) {
		const resultat = executerCalcul(lu.etat, essai);
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

/** Juge le programme de l'élève contre le programme attendu. Ne lève jamais. */
export function jugerProgrammeCalcul(
	reponse: string,
	attendu: string,
	essais: readonly number[]
): VerdictCalcul {
	if (reponse.trim() === '' || essais.length === 0) return { juste: false };
	// Un attendu qui ne marche pas, ou n'affiche rien, est refusé à la publication ; ici,
	// jamais juste
	const reference = lireProgrammeCalcul(attendu, essais);
	if (!reference.ok || reference.sorties.some((s) => s.length === 0)) return { juste: false };
	const eleve = lireProgrammeCalcul(reponse, essais);
	if (!eleve.ok) return { juste: false, message: eleve.message };
	if (eleve.sorties.every((s) => s.length === 0)) return { juste: false, message: RIEN_AFFICHE };
	return { juste: eleve.sorties.every((s, i) => memesAffichages(s, reference.sorties[i])) };
}
