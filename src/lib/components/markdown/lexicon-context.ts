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
import { lexiconGrade } from '$lib/lexicon/grade';
import { readReaderGrade } from '$lib/lexicon/reader-grade';
import { createCardTerms, type LexiconCardTerms } from '$lib/lexicon/card-terms.svelte';

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

/**
 * Cadre d'une question : mots cliquables dans l'énoncé, les réponses et la
 * correction, au niveau de l'élève connecté, sinon au plus petit niveau de la
 * question (visiteur, professeur). `enabled` faux : évaluation notée, aucun mot.
 *
 * Pose aussi le compteur des mots de la carte : leur soulignement y est masqué
 * tant que le bouton « Mots du dictionnaire » ne l'affiche pas (R6).
 */
export function provideQuestionLexicon(
	questionGrades: () => readonly string[] | undefined,
	enabled: () => boolean = () => true
): void {
	const reader = readReaderGrade();
	provideLexicon(() => (enabled() ? lexiconGrade(reader(), questionGrades() ?? []) : null));
	setContext<LexiconCardTerms>(CARD_TERMS_KEY, createCardTerms());
}

// Mots d'une carte (R6 : soulignement masqué, bouton « Mots du dictionnaire »)
const CARD_TERMS_KEY = Symbol('lexicon-card-terms');

/**
 * Les mots de la carte de question englobante, ou `null` hors d'une carte
 * (démo du lexique, structure, programmes) : là, les mots restent soulignés.
 */
export function readLexiconCardTerms(): LexiconCardTerms | null {
	return hasContext(CARD_TERMS_KEY) ? getContext<LexiconCardTerms>(CARD_TERMS_KEY) : null;
}
