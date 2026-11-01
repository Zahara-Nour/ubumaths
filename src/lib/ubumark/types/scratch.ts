/**
 * Bloc ```scratch — types
 * =======================
 *
 * Programme en blocs Scratch, écrit en texte dans la syntaxe des
 * `scratchblocks`, en français (chantier `bloc-scratch`) :
 *
 * ```scratch
 * quand le drapeau vert pressé
 * mettre [a v] à (5)
 * dire (a)
 * ```
 *
 * Le nœud ne porte que le programme : la vérification des instructions et le
 * dessin sont faits à la demande (`utils/scratch-check.ts`,
 * `utils/scratch-render.ts`), pour garder `scratchblocks` hors du parseur.
 *
 * @module ubumark/types/scratch
 */

import type { BaseNode } from './ast';

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const SCRATCH_UNAVAILABLE = 'Programme indisponible';

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface ScratchIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```scratch */
	line?: number;
}

export interface ScratchNode extends BaseNode {
	type: 'scratch';
	/** Le programme, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** Erreurs vues par le parseur (bloc vide, non fermé) ; les instructions sont vérifiées au rendu */
	errors: ScratchIssue[];
}

export interface ScratchBlockRange {
	startIndex: number;
	endIndex: number;
}
