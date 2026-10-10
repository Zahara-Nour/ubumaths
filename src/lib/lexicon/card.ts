/**
 * Fiche d'un mot cliquable (lot 2 du lexique)
 * ===========================================
 *
 * Ce que l'élève lit en cliquant sur un mot repéré : chaque sens visible, ses
 * définitions à son niveau, et pour un renvoi la définition du mot cité.
 *
 * @module lexicon/card
 */

import { resolveGradedField, type MathTerm } from '$lib/dictionary/model';
import type { GradeCode } from '$lib/types/grades';

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
export function findPrincipal(entries: readonly MathTerm[], name: string): MathTerm | undefined {
	return (
		entries.find((t) => t.term === name && !t.derivedFrom) ?? entries.find((t) => t.term === name)
	);
}

/** Contenu de la fiche des entrées `ids`, lue au niveau `grade`, dans `entries`. */
export function lexiconCard(
	entries: readonly MathTerm[],
	getTermById: (id: string) => MathTerm | undefined,
	ids: string[],
	grade: GradeCode
): LexiconCardEntry[] {
	return ids.flatMap((id) => {
		const term = getTermById(id);
		if (!term) return [];
		const own = term.definitions ? resolveGradedField(term.definitions, grade) : [];
		const target = term.derivedFrom ? findPrincipal(entries, term.derivedFrom) : undefined;
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
