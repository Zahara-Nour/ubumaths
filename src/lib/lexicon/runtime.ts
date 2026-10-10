/**
 * Ce qui a besoin du dictionnaire : chargé à la demande par
 * runtime-store.svelte.ts, au premier énoncé à mots cliquables, avec les
 * entrées lues en base (`/api/dictionnaire`, ADR 0022).
 *
 * @module lexicon/runtime
 */

import type { MathTerm } from '$lib/dictionary/model';
import type { DocumentNode } from '$lib/ubumark';
import type { GradeCode } from '$lib/types/grades';
import { createLinker } from './linker';
import { lexiconCard, type LexiconCardEntry } from './card';

export interface Lexicon {
	linkDocument(doc: DocumentNode, grade: GradeCode): DocumentNode;
	lexiconCard(ids: string[], grade: GradeCode): LexiconCardEntry[];
}

/** Repérage et fiches des mots de `entries`. */
export function createLexicon(entries: readonly MathTerm[]): Lexicon {
	const linker = createLinker(entries);
	return {
		linkDocument: linker.linkDocument,
		lexiconCard: (ids, grade) => lexiconCard(entries, linker.getTermById, ids, grade)
	};
}
