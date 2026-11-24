/**
 * Mots cliquables — contexte des composants markdown
 *
 * Le niveau de lecture des mots cliquables (lot 2 du lexique) est posé une fois
 * par le cadre d'une question (`QuestionCard`, `FlashCard`, correction) ou par
 * la prop `lexiconGrade` de `MarkdownRenderer`, puis lu par les rendus
 * descendants, sans le faire descendre de composant en composant.
 *
 * `null` : aucun mot souligné (évaluation notée, fiche d'un mot déjà ouverte,
 * correction). Sans fournisseur : aucun mot souligné non plus (chat, fiches,
 * aperçus).
 *
 * @module components/markdown/lexicon-context
 */

import { getContext, hasContext, setContext } from 'svelte';
import type { GradeCode } from '#lib/types/grades.ts';
import { questionReadingGrades } from '#lib/dictionary/grade.ts';
import type { LinkOptions } from '#lib/dictionary/linker.ts';
import { readReaderGrade } from '#lib/dictionary/reader-grade.ts';
import { createCardTerms, type LexiconCardTerms } from '#lib/dictionary/card-terms.svelte.ts';

const LEXICON_KEY = Symbol('markdown-lexicon');

/** Lecture des mots cliquables : quels mots souligner, quelles définitions montrer. */
export interface LexiconReading {
	/** Niveau des définitions de la fiche */
	grade: GradeCode;
	/** Niveau qui choisit les mots soulignés */
	linkGrade: GradeCode;
	/** Règles du repérage (R1 mots récents, R4 question de cours) */
	link: LinkOptions;
}

type LexiconGetter = () => LexiconReading | null;

/** Un niveau seul : fiche et soulignement à ce niveau, tous les mots visibles. */
function toReading(value: GradeCode | LexiconReading): LexiconReading {
	return typeof value === 'string' ? { grade: value, linkGrade: value, link: {} } : value;
}

/**
 * Poser la lecture pour les rendus descendants.
 *
 * Getter : la lecture peut changer. `undefined` garde celle du parent, `null`
 * coupe les mots cliquables. À appeler pendant l'initialisation du composant.
 */
export function provideLexicon(get: () => GradeCode | LexiconReading | null | undefined): void {
	const parent = readLexicon();
	setContext<LexiconGetter>(LEXICON_KEY, () => {
		const own = get();
		if (own === undefined) return parent();
		return own === null ? null : toReading(own);
	});
}

/** La lecture des mots cliquables, ou `null` : pas de mot souligné. */
export function readLexicon(): LexiconGetter {
	return hasContext(LEXICON_KEY) ? getContext<LexiconGetter>(LEXICON_KEY) : () => null;
}

/**
 * Cadre d'une question : mots cliquables dans l'énoncé (pas dans la correction,
 * R2 : `LexiconOff`). Élève : à son niveau, mots de son année et de celle
 * d'avant seulement (R1). Professeur ou visiteur : soulignement au plus haut
 * niveau de la question (R3), fiche au plus petit (Q1). Question de cours :
 * seuls les mots marqués `{.def}` (R4). `enabled` faux : évaluation notée,
 * aucun mot.
 *
 * Pose aussi le compteur des mots de la carte : leur soulignement y est masqué
 * tant que le bouton « Mots du dictionnaire » ne l'affiche pas (R6).
 */
export function provideQuestionLexicon(
	questionGrades: () => readonly string[] | undefined,
	enabled: () => boolean = () => true,
	courseQuestion: () => boolean = () => false
): void {
	const reader = readReaderGrade();
	provideLexicon(() => {
		if (!enabled()) return null;
		const grades = questionReadingGrades(reader(), questionGrades() ?? []);
		return grades && { ...grades, link: { recentOnly: true, auto: !courseQuestion() } };
	});
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
