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

/**
 * Une notion telle que le titre la lit : son nom, et le nom de sa branche
 * quand on le connaît (lu dans l'arbre, `branchOf`)
 */
export interface TitleNotion {
	name: string;
	branch?: string | null;
}

/** Un nœud de l'arbre, juste ce qu'il faut pour remonter à sa branche */
export interface TitleTreeNode {
	name: string;
	kind: string;
	parent_id: string | null;
}

/** Ce que le PDF imprime de la fiche */
export interface PrintedTitle {
	/** En grand, en tête de la page 1 */
	main: string;
	/** Dessous, en moyen : les notions quand le titre est leur branche commune ; vide : rien */
	notions: string;
	/** En petit dessous : la catégorie d'un titre composé ; vide : rien */
	sub: string;
	/** Au bas de chaque page, après le badge du niveau */
	footer: string;
	/**
	 * Le titre complet sur une ligne, notions comprises (« Notion A · Notion B ·
	 * Entraînement technique ») : pour un gabarit de prof écrit avant la ligne
	 * des notions, qui ne doit pas les perdre
	 */
	flat: string;
}

export interface PrintedTitleInput {
	type: WorksheetType;
	category: WorksheetCategory | null;
	/** Vrai : `title` est un titre libre, imprimé tel quel */
	customTitle: boolean;
	/** Titre en base, dans la langue du document */
	title: string;
	/** Notions, dans l'ordre d'impression */
	notions: readonly TitleNotion[];
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

/** Garde contre un arbre bouclé : une notion est à deux niveaux au plus sous sa branche */
const MAX_DEPTH = 5;

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
 * Nom de la branche d'un nœud de l'arbre (notion, sous-notion), en remontant
 * ses parents ; `null` si on ne la trouve pas.
 */
export function branchOf(nodeId: string, nodes: ReadonlyMap<string, TitleTreeNode>): string | null {
	let node = nodes.get(nodeId);
	for (let depth = 0; node && depth < MAX_DEPTH; depth++) {
		if (node.kind === 'branch') return node.name;
		node = node.parent_id ? nodes.get(node.parent_id) : undefined;
	}
	return null;
}

/**
 * La branche commune qui sert de titre : au moins deux notions, toutes de la
 * même branche (« Suites » pour les suites arithmétiques et géométriques).
 * Une seule notion garde son nom (David, 2026-11-20).
 */
export function sharedBranch(notions: readonly TitleNotion[]): string | null {
	const first = notions[0]?.branch;
	if (notions.length < 2 || !first) return null;
	return notions.every((notion) => notion.branch === first) ? notionLabel(first) : null;
}

/**
 * Le titre composé écrit en base (en français) : « Suites · Entraînement
 * technique ». Une fiche peut avoir plusieurs notions, quels que soient son
 * type et sa catégorie (ADR 0041, amendé le 2026-11-19) ; deux notions ou plus
 * d'une même branche → la branche seule (amendé le 2026-11-20).
 */
export function composedTitle(
	category: WorksheetCategory | null,
	notions: readonly TitleNotion[]
): string {
	const branch = sharedBranch(notions);
	const head = branch ? [branch] : notions.map((notion) => notionLabel(notion.name));
	return [...head, category ? CATEGORY_LABELS.fr[category] : '']
		.filter((part) => part !== '')
		.join(SEPARATOR);
}

/** Ce que le PDF imprime : voir `PrintedTitle` et les cas de l'ADR 0041 */
export function printedTitle(input: PrintedTitleInput): PrintedTitle {
	const { type, category, customTitle, title, locale } = input;
	// Les notions n'ont pas encore de nom anglais : rien d'imprimé en anglais
	const notions = locale === 'fr' ? input.notions : [];
	const notionsText = notions.map((notion) => notionLabel(notion.name)).join(SEPARATOR);
	const branch = sharedBranch(notions);

	// Titre composé : fiche d'exercices sans titre libre
	if (type === 'worksheet' && !customTitle) {
		const categoryLabel = category ? CATEGORY_LABELS[locale][category] : '';
		const sub = categoryLabel.toLocaleLowerCase(locale);
		// Notions d'une même branche : la branche en grand, les notions dessous
		const flat = [notionsText, categoryLabel].filter((part) => part !== '').join(SEPARATOR);
		if (branch) {
			return {
				main: branch,
				notions: notionsText,
				sub,
				footer: [branch, categoryLabel].filter((part) => part !== '').join(SEPARATOR),
				flat
			};
		}
		if (notionsText !== '') return { main: notionsText, notions: '', sub, footer: flat, flat };
		if (categoryLabel !== '') return alone(categoryLabel);
		return alone(title);
	}

	// Titre libre, ou titre écrit à la main des autres types : le titre seul,
	// ni catégorie ni notions dessous (David, 2026-11-20)
	return alone(title);
}

/** Un titre imprimé seul, partout */
function alone(text: string): PrintedTitle {
	return { main: text, notions: '', sub: '', footer: text, flat: text };
}
