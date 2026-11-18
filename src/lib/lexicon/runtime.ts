/**
 * Ce qui a besoin du dictionnaire : chargé à la demande par
 * runtime-store.svelte.ts, au premier énoncé à mots cliquables, avec les
 * entrées lues en base (`/api/dictionnaire`, ADR 0022).
 *
 * @module lexicon/runtime
 */

import type { MathTerm } from '#lib/dictionary/model.ts';
import type { DocumentNode } from '#lib/ubumark/index.ts';
import type { GradeCode } from '#lib/types/grades.ts';
import { createLinker, type LinkOptions } from './linker';
import { lexiconCard, type LexiconCardEntry } from './card';

export interface Lexicon {
	linkDocument(doc: DocumentNode, grade: GradeCode, options?: LinkOptions): DocumentNode;
	/** `fallbackGrade` : niveau de lecture d'un mot que `grade` ne voit pas (voir `lexiconCard`) */
	lexiconCard(ids: string[], grade: GradeCode, fallbackGrade?: GradeCode): LexiconCardEntry[];
}

/** Repérage et fiches des mots de `entries`. */
export function createLexicon(entries: readonly MathTerm[]): Lexicon {
	const linker = createLinker(entries);
	return {
		linkDocument: linker.linkDocument,
		lexiconCard: (ids, grade, fallbackGrade) =>
			lexiconCard(entries, linker.getTermById, ids, grade, fallbackGrade)
	};
}
