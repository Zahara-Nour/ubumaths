/**
 * Tortue de 4e / 3e (`niveau:` d'un bloc ```tortue ; chantier `tortue-variables`) : notation,
 * compte des blocs et message de niveau pour l'auteur, selon le niveau.
 *
 * Sans niveau (`base`), la notation de la tortue (`notation.ts`), inchangée. En 4e / 3e, celle des
 * programmes de calcul étendue aux instructions tortue (`calcul/notation.ts`, option `tortue`) :
 * `mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]`.
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import {
	estInstructionTortue,
	niveauDuBlocTortue,
	niveauTortueAdmet,
	type NiveauTortue
} from './interpreteur';
import { nombreDeBlocs, etatVersTexte, texteVersEtat, type EtatLu, type TexteLu } from './notation';
import { nomsDesVariables, tousLesBlocs } from '../calcul/interpreteur';
import { etatVersTexteCalcul, messageBlocAuDessus, texteVersEtatCalcul } from '../calcul/notation';
import { lirePiles, type BlocLu } from '../lecture';

// =============================================================================
// Constantes
// =============================================================================

const TORTUE = { tortue: true } as const;

/** Aucune pile ignorée : le texte n'en a qu'une. */
const AUCUNE: ReadonlySet<string> = new Set();

// =============================================================================
// Fonctions
// =============================================================================

/** Lit un programme écrit au niveau donné et le rend en état Blockly. */
export function texteVersEtatTortue(texte: string, niveau: NiveauTortue): EtatLu {
	return niveau === 'base' ? texteVersEtat(texte) : texteVersEtatCalcul(texte, TORTUE);
}

/** Écrit en texte le programme d'un espace de travail Blockly, au niveau donné. */
export function etatVersTexteTortue(etat: unknown, niveau: NiveauTortue): TexteLu {
	return niveau === 'base' ? etatVersTexte(etat) : etatVersTexteCalcul(etat, TORTUE);
}

/** Tous les blocs du programme écrit (notation de 4e / 3e) ; null s'il ne se lit pas. */
function blocsDuTexte(texte: string): { blocs: BlocLu[]; noms: Map<string, string> } | null {
	const lu = texteVersEtatCalcul(texte, TORTUE);
	if (!lu.ok) return null;
	try {
		const piles = lirePiles(lu.etat, AUCUNE);
		return {
			blocs: piles.flatMap((pile) => [...tousLesBlocs(pile)]),
			noms: nomsDesVariables(lu.etat)
		};
	} catch {
		return null;
	}
}

/**
 * Nombre de blocs d'un programme écrit (`blocs:`) : les instructions (mettre, ajouter, avancer,
 * tourner, répéter, si…), pas les calculs ni les conditions dans les entrées. Illisible : null.
 */
export function nombreDeBlocsTortue(texte: string, niveau: NiveauTortue): number | null {
	if (niveau === 'base') return nombreDeBlocs(texte);
	const lus = blocsDuTexte(texte);
	if (lus === null) return null;
	return lus.blocs.filter((bloc) => estInstructionTortue(bloc.type)).length;
}

/**
 * Pour l'auteur : le bloc du programme écrit qui dépasse le niveau (celui du niveau le plus haut,
 * le premier à égalité), avec le niveau à demander ; null si le programme tient dans le niveau ou
 * ne se lit pas (son erreur est signalée ailleurs). Lu dans la notation de 4e / 3e : sans niveau,
 * `mettre n à 6` dit « ajouter niveau: 4e » plutôt qu'« instruction inconnue ».
 */
export function messageNiveauTortue(texte: string, niveau: NiveauTortue): string | null {
	const lus = blocsDuTexte(texte);
	if (lus === null) return null;
	let pire: { bloc: BlocLu; niveau: NiveauTortue } | null = null;
	for (const bloc of lus.blocs) {
		const requis = niveauDuBlocTortue(bloc.type);
		if (requis === null || niveauTortueAdmet(niveau, requis)) continue;
		if (pire === null || !niveauTortueAdmet(pire.niveau, requis)) pire = { bloc, niveau: requis };
	}
	return pire === null ? null : messageBlocAuDessus(pire.bloc, pire.niveau, lus.noms);
}
