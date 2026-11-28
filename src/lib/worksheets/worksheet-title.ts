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
 *
 * En anglais, les notions et la branche s'impriment sous leur nom anglais
 * (`translations.en.name` du nœud, ADR 0043). Il suffit qu'un des noms à
 * imprimer n'ait pas d'anglais pour qu'aucune notion ne s'imprime : la
 * catégorie seule, jamais de mélange français / anglais (David, 2026-11-23).
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
	/** Nom anglais de la notion (ADR 0043) ; absent ou `null` : pas traduite */
	nameEn?: string | null;
	/** Nom anglais de sa branche ; absent ou `null` : pas traduite, ou pas lue */
	branchEn?: string | null;
}

/** Un nœud de l'arbre, juste ce qu'il faut pour remonter à sa branche */
export interface TitleTreeNode {
	name: string;
	kind: string;
	parent_id: string | null;
	/** Traductions du nœud (`{"en": {"name": …}}`, ADR 0043) ; absent : non lues */
	translations?: unknown;
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

/** Noms des catégories, dans la langue du document */
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

/**
 * Titre d'une fiche anglaise sans catégorie dont une notion n'a pas de nom
 * anglais, et dont la branche n'en a pas non plus : jamais le titre français
 * (V111, David le 2026-11-28)
 */
const UNTRANSLATED_TITLE_EN = 'Worksheet';

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
 * Nom anglais d'un nœud, lu dans ses traductions (`{"en": {"name": …}}`,
 * ADR 0043) ; `null` s'il n'en a pas. La base refuse un nom vide ; un nom
 * blanc lu ailleurs compte quand même comme absent.
 */
export function englishName(translations: unknown): string | null {
	if (!isRecord(translations)) return null;
	const en = translations.en;
	if (!isRecord(en)) return null;
	const name = en.name;
	return typeof name === 'string' && name.trim() !== '' ? name : null;
}

/**
 * La branche d'un nœud de l'arbre (notion, sous-notion), en remontant ses
 * parents ; `null` si on ne la trouve pas.
 */
export function branchNodeOf(
	nodeId: string,
	nodes: ReadonlyMap<string, TitleTreeNode>
): TitleTreeNode | null {
	let node = nodes.get(nodeId);
	for (let depth = 0; node && depth < MAX_DEPTH; depth++) {
		if (node.kind === 'branch') return node;
		node = node.parent_id ? nodes.get(node.parent_id) : undefined;
	}
	return null;
}

/** Nom de la branche d'un nœud de l'arbre ; `null` si on ne la trouve pas */
export function branchOf(nodeId: string, nodes: ReadonlyMap<string, TitleTreeNode>): string | null {
	return branchNodeOf(nodeId, nodes)?.name ?? null;
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

/**
 * Les noms (en français) que la version anglaise imprimerait et qui n'ont pas
 * de nom anglais : les notions, et leur branche commune quand elle sert de
 * titre. Vide : la version anglaise imprime ses notions.
 */
export function missingEnglishNames(notions: readonly TitleNotion[]): string[] {
	const missing = notions
		.filter((notion) => !notion.nameEn?.trim())
		.map((notion) => notionLabel(notion.name));
	const branch = sharedBranch(notions);
	if (branch && !notions[0]?.branchEn?.trim()) missing.push(branch);
	return missing;
}

/**
 * Ce qui s'imprime des notions dans la langue du document : leurs noms et
 * leur branche commune. En anglais, un seul nom sans traduction → rien.
 * La branche commune se décide sur les noms français : deux branches
 * traduites pareil ne se confondent pas.
 */
function localizedNotions(
	notions: readonly TitleNotion[],
	locale: PrintedTitleInput['locale']
): { names: string[]; branch: string | null } {
	const branch = sharedBranch(notions);
	if (locale === 'fr') return { names: notions.map((n) => notionLabel(n.name)), branch };
	if (missingEnglishNames(notions).length > 0) return { names: [], branch: null };
	return {
		names: notions.map((notion) => notionLabel(notion.nameEn ?? '')),
		branch: branch ? notionLabel(notions[0]?.branchEn ?? '') : null
	};
}

/**
 * Le nom anglais de la branche de toutes les notions (une seule comprise) ;
 * `null` si elles n'en partagent pas une, ou si elle n'est pas traduite.
 */
function englishBranchOf(notions: readonly TitleNotion[]): string | null {
	const first = notions[0];
	const branchEn = first?.branchEn?.trim();
	if (!first?.branch || !branchEn) return null;
	return notions.every((notion) => notion.branch === first.branch) ? notionLabel(branchEn) : null;
}

/** Ce que le PDF imprime : voir `PrintedTitle` et les cas de l'ADR 0041 */
export function printedTitle(input: PrintedTitleInput): PrintedTitle {
	const { type, category, customTitle, title, locale } = input;
	const { names, branch } = localizedNotions(input.notions, locale);
	const notionsText = names.join(SEPARATOR);

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
		// Anglais, noms manquants : le nom anglais de la branche commune, sinon « Worksheet »
		if (locale === 'en' && input.notions.length > 0) {
			return alone(englishBranchOf(input.notions) ?? UNTRANSLATED_TITLE_EN);
		}
		return alone(title);
	}

	// Titre libre, ou titre écrit à la main des autres types : le titre seul,
	// ni catégorie ni notions dessous (David, 2026-11-20)
	return alone(title);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Un titre imprimé seul, partout */
function alone(text: string): PrintedTitle {
	return { main: text, notions: '', sub: '', footer: text, flat: text };
}
