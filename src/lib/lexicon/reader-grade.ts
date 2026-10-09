/**
 * Niveau de l'élève connecté, pour tout le site
 *
 * Posé une fois par le layout racine (`profiles.grade`), lu par les cadres de
 * question pour choisir le niveau de lecture des mots cliquables. Sans
 * fournisseur (visiteur, tests) : `null`.
 *
 * @module lexicon/reader-grade
 */

import { getContext, hasContext, setContext } from 'svelte';

const READER_GRADE_KEY = Symbol('reader-grade');

type ReaderGradeGetter = () => string | null;

/** Poser le niveau de l'élève connecté (tel que stocké : validé à la lecture). */
export function provideReaderGrade(get: () => string | null | undefined): void {
	setContext<ReaderGradeGetter>(READER_GRADE_KEY, () => get() ?? null);
}

/** Le niveau de l'élève connecté, ou `null`. */
export function readReaderGrade(): ReaderGradeGetter {
	return hasContext(READER_GRADE_KEY)
		? getContext<ReaderGradeGetter>(READER_GRADE_KEY)
		: () => null;
}
