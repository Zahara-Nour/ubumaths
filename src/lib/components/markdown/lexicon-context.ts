/**
 * Mots cliquables — contexte des composants markdown
 *
 * Le niveau de lecture des mots cliquables (lot 2 du lexique) est posé une fois
 * par le cadre d'une question (`QuestionCard`, `FlashCard`, correction) ou par
 * la prop `lexiconGrade` de `MarkdownRenderer`, puis lu par les rendus
 * descendants, sans le faire descendre de composant en composant.
 *
 * `null` : aucun mot souligné (évaluation notée, fiche d'un mot déjà ouverte).
 * Sans fournisseur : aucun mot souligné non plus (chat, fiches, aperçus).
 *
 * @module components/markdown/lexicon-context
 */

import { getContext, hasContext, setContext } from 'svelte';
import type { GradeCode } from '$lib/types/grades';

const LEXICON_KEY = Symbol('markdown-lexicon');

type LexiconGetter = () => GradeCode | null;

/**
 * Poser le niveau de lecture pour les rendus descendants.
 *
 * Getter : le niveau peut changer. `undefined` garde celui du parent, `null`
 * coupe les mots cliquables. À appeler pendant l'initialisation du composant.
 */
export function provideLexicon(get: () => GradeCode | null | undefined): void {
	const parent = readLexicon();
	setContext<LexiconGetter>(LEXICON_KEY, () => {
		const own = get();
		return own === undefined ? parent() : own;
	});
}

/** Le niveau de lecture des mots cliquables, ou `null` : pas de mot souligné. */
export function readLexicon(): LexiconGetter {
	return hasContext(LEXICON_KEY) ? getContext<LexiconGetter>(LEXICON_KEY) : () => null;
}
