/**
 * Titre imprimé d'une fiche : catégorie, notions et titre libre (ADR 0041)
 * ========================================================================
 *
 * Une fiche d'exercices dit QUEL GENRE de fiche elle est (catégorie) et DE QUOI
 * ELLE PARLE (notions de l'arbre). Sans titre libre, son titre se compose des
 * deux ; un titre libre remplace tout.
 *
 * - `composedTitle` : le texte que l'éditeur écrit dans `worksheets.title`
 *   quand la fiche n'a pas de titre libre (l'appli affiche `title` partout) ;
 * - `printedTitle` : ce que le PDF imprime (en grand, en petit dessous, au bas
 *   de page). Le PDF recompose le titre plutôt que de relire `title` : la
 *   catégorie s'y imprime à part, en petit.
 */
import type { ContentLocale } from '#lib/types/locale.ts';
import type { WorksheetType } from '#lib/types/worksheets.ts';

// ============================================================================
// Types
// ============================================================================

/** Les quatre catégories de fiche d'exercices (contrainte `worksheets_category_check`) */
export const WORKSHEET_CATEGORIES = [
	'technical_practice',
	'applications',
	'automatisms',
	'review'
] as const;
export type WorksheetCategory = (typeof WORKSHEET_CATEGORIES)[number];

/** Ce que le PDF imprime de la fiche */
export interface PrintedTitle {
	/** En grand, en tête de la page 1 */
	main: string;
	/** En petit dessous (catégorie, ou notions sous un titre libre) ; vide : rien */
	sub: string;
	/** Au bas de chaque page, après le badge du niveau */
	footer: string;
}

export interface PrintedTitleInput {
	type: WorksheetType;
	category: WorksheetCategory | null;
	/** Vrai : `title` est un titre libre, imprimé tel quel */
	customTitle: boolean;
	/** Titre en base, dans la langue du document */
	title: string;
	/** Noms des notions, dans l'ordre d'impression */
	notions: readonly string[];
	locale: ContentLocale;
}

// ============================================================================
// Constantes
// ============================================================================

/** Noms des catégories ; en anglais, faute de noms anglais des notions, la catégorie seule s'imprime */
export const CATEGORY_LABELS: Record<ContentLocale, Record<WorksheetCategory, string>> = {
	fr: {
		technical_practice: 'Entraînement technique',
		applications: 'Applications',
		automatisms: 'Automatismes',
		review: 'Révisions'
	},
	en: {
		technical_practice: 'Technical practice',
		applications: 'Applications',
		automatisms: 'Fluency',
		review: 'Review'
	}
};

/** Séparateur des notions, et de la catégorie au bas de page */
const SEPARATOR = ' · ';

// ============================================================================
// Fonctions
// ============================================================================

export function isWorksheetCategory(value: unknown): value is WorksheetCategory {
	return WORKSHEET_CATEGORIES.some((category) => category === value);
}

/**
 * Nom d'une notion tel qu'il s'imprime : majuscule en tête. Les sous-notions
 * de l'arbre s'écrivent en minuscule (« loi géométrique »), mais en titre
 * elles commencent par une majuscule (« Loi géométrique »).
 */
export function notionLabel(name: string): string {
	return name.charAt(0).toLocaleUpperCase('fr') + name.slice(1);
}

/**
 * Le titre composé écrit en base (en français) : « Suites · Entraînement
 * technique ». Une fiche peut avoir plusieurs notions, quels que soient son
 * type et sa catégorie (ADR 0041, amendé le 2026-11-19).
 */
export function composedTitle(
	category: WorksheetCategory | null,
	notions: readonly string[]
): string {
	return [...notions.map(notionLabel), category ? CATEGORY_LABELS.fr[category] : '']
		.filter((part) => part !== '')
		.join(SEPARATOR);
}

/** Ce que le PDF imprime : voir `PrintedTitle` et les cas de l'ADR 0041 */
export function printedTitle(input: PrintedTitleInput): PrintedTitle {
	const { type, category, customTitle, title, locale } = input;
	// Les notions n'ont pas encore de nom anglais : rien d'imprimé en anglais
	const notions = locale === 'fr' ? input.notions.map(notionLabel) : [];
	const notionsText = notions.join(SEPARATOR);

	// Titre composé : fiche d'exercices sans titre libre
	if (type === 'worksheet' && !customTitle) {
		const categoryLabel = category ? CATEGORY_LABELS[locale][category] : '';
		if (notionsText !== '') {
			return {
				main: notionsText,
				sub: categoryLabel.toLocaleLowerCase(locale),
				footer: [notionsText, categoryLabel].filter((part) => part !== '').join(SEPARATOR)
			};
		}
		if (categoryLabel !== '') return { main: categoryLabel, sub: '', footer: categoryLabel };
		return { main: title, sub: '', footer: title };
	}

	// Titre libre, ou titre écrit à la main des autres types : jamais la
	// catégorie ; les notions en petit dessous
	return { main: title, sub: notionsText, footer: title };
}
