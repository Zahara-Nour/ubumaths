/**
 * Fiche d'un mot cliquable (lot 2 du lexique)
 * ===========================================
 *
 * Ce que l'élève lit en cliquant sur un mot repéré : chaque sens visible, ses
 * définitions à son niveau, et pour un renvoi la définition du mot cité.
 *
 * @module lexicon/card
 */

import MATH_DICTIONARY, { resolveGradedField, type MathTerm } from '$lib/data/math-dictionary-fr';
import type { GradeCode } from '$lib/types/grades';
import { getTermById } from './linker';

export interface LexiconCardEntry {
	id: string;
	term: string;
	sense?: string;
	/** Définitions lisibles au niveau du lecteur ; celles du mot cité pour un renvoi sans définition propre */
	definitions: string[];
	/** Renvoi : le mot vers lequel il pointe (« Voir : X ») */
	seeTerm?: string;
}

/** Terme principal d'un nom : un renvoi peut porter le même nom que sa cible (« solution »). */
function findPrincipal(name: string): MathTerm | undefined {
	return (
		MATH_DICTIONARY.find((t) => t.term === name && !t.derivedFrom) ??
		MATH_DICTIONARY.find((t) => t.term === name)
	);
}

/** Contenu de la fiche des entrées `ids`, lue au niveau `grade`. */
export function lexiconCard(ids: string[], grade: GradeCode): LexiconCardEntry[] {
	return ids.flatMap((id) => {
		const term = getTermById(id);
		if (!term) return [];
		const own = term.definitions ? resolveGradedField(term.definitions, grade) : [];
		const target = term.derivedFrom ? findPrincipal(term.derivedFrom) : undefined;
		const definitions =
			own.length === 0 && target?.definitions ? resolveGradedField(target.definitions, grade) : own;
		return [
			{
				id,
				term: term.term,
				...(term.sense && { sense: term.sense }),
				definitions,
				...(term.derivedFrom && { seeTerm: term.derivedFrom })
			}
		];
	});
}
