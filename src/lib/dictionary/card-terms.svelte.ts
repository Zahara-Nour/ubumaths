/**
 * Mots du dictionnaire repérés sur une carte de question (R6)
 *
 * Chaque mot repéré s'annonce à sa carte : le bouton « Mots du dictionnaire »
 * n'apparaît que s'il y en a au moins un (B6).
 *
 * @module lexicon/card-terms
 */

/** Les mots du dictionnaire repérés sur une carte de question. */
export interface LexiconCardTerms {
	/** Nombre de mots repérés (lecture réactive) */
	readonly count: number;
	/** Un mot repéré s'annonce ; la fonction rendue le retire. */
	register(): () => void;
}

export function createCardTerms(): LexiconCardTerms {
	let count = $state(0);
	return {
		get count() {
			return count;
		},
		register() {
			count += 1;
			return () => {
				count -= 1;
			};
		}
	};
}
