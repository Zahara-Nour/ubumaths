/**
 * Positions des points d'un bloc ```figure-a-completer : registre LÉGER
 * ===============================================================
 *
 * Le juge doit savoir où sont les points nommés (A, B…), donc interpréter le
 * langage des figures (geometry-core). Le générateur et le juge sont chargés
 * par beaucoup de pages (cartes, SRS, aperçus) : un import direct y ajoutait
 * ~430 Ko minifiés (mesuré le 2026-10-25). Comme `figure-typst-registry.ts`,
 * le calcul réel est inscrit par `positions-setup.ts`, importé là où l'on
 * juge une figure : l'écran de l'élève (qui affiche déjà la figure), la
 * correction serveur, les tests du modèle. Décision de David du 2026-10-25.
 *
 * Sans inscription : erreur explicite, jamais un verdict « faux ».
 *
 * @module questions/construction/positions
 */

import type { Position } from './judge';

/** Positions des points nommés d'un bloc (texte entre les clôtures) */
export type ConstructionPositionsResolver = (source: string) => Map<string, Position>;

let resolver: ConstructionPositionsResolver | null = null;

/** Inscrire le calcul réel (appelé par `positions-setup.ts`). */
export function registerConstructionPositions(fn: ConstructionPositionsResolver): void {
	resolver = fn;
}

/** Le calcul est-il inscrit ? (l'écran l'attend avant de juger) */
export function hasConstructionPositions(): boolean {
	return resolver !== null;
}

export function constructionPositions(source: string): Map<string, Position> {
	if (!resolver) {
		throw new Error(
			'Case « figure » : positions des figures non inscrites (importer questions/construction/positions-setup)'
		);
	}
	return resolver(source);
}
