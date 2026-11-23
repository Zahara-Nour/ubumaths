/**
 * Regroupement des éléments d'une section du cours, vue élève
 * ===========================================================
 *
 * Dans une section, les éléments qui s'affichent en LIGNE (documents, fiches à
 * ouvrir, exercices) se suivent dans un même cadre ; les autres (objectifs à
 * cocher, séries, fiches de l'élève connecté) restent des blocs à part. L'ordre
 * du professeur est gardé : deux lignes séparées par un bloc font deux cadres.
 *
 * @module components/cours/plan-groups
 */

// Types
/** La pastille d'une ligne de ressource (`ResourceRow`). */
export type ResourceKind = 'pdf' | 'image' | 'video' | 'file' | 'drive' | 'worksheet' | 'exercise';

export type PlanGroup<T> = { kind: 'rows'; items: T[] } | { kind: 'block'; item: T };

// Functions

/**
 * Coupe la liste en suites : chaque suite de lignes consécutives devient un
 * groupe `rows`, chaque autre élément un groupe `block`.
 */
export function groupPlanItems<T>(
	items: readonly T[],
	isRow: (item: T) => boolean
): PlanGroup<T>[] {
	const groups: PlanGroup<T>[] = [];
	for (const item of items) {
		if (!isRow(item)) {
			groups.push({ kind: 'block', item });
			continue;
		}
		const last = groups.at(-1);
		if (last?.kind === 'rows') last.items.push(item);
		else groups.push({ kind: 'rows', items: [item] });
	}
	return groups;
}

/** La pastille d'un document, d'après sa source et son type de fichier. */
export function documentKind(sourceType: string, mimeType: string | null): ResourceKind {
	if (sourceType === 'google_drive') return 'drive';
	if (mimeType === 'application/pdf') return 'pdf';
	if (mimeType?.startsWith('image/')) return 'image';
	if (mimeType?.startsWith('video/')) return 'video';
	return 'file';
}
