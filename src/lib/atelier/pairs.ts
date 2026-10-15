/**
 * Atelier — deux listes ensemble, appariées par LIGNE de la grille
 *
 * Décision P1 de David (2026-10-15, tableur intégré) : nuage, ajustement,
 * effectifs et tableau croisé prennent les lignes où CHAQUE liste a une
 * valeur, et disent combien ils en écartent (règle §4 L1). Avant la grille,
 * deux listes s'associaient par rang : une case vide au milieu de l'une
 * décalait toutes les paires suivantes, en silence.
 *
 * @module atelier/pairs
 */

import type { ListObject } from './types';

/** Les lignes où chaque liste a une valeur ; `dropped` = celles qui n'en ont que dans certaines. */
export function commonRows(lists: readonly ListObject[]): { rows: number[]; dropped: number } {
	const sets = lists.map((list) => new Set(list.rows));
	const all = new Set(lists.flatMap((list) => list.rows));
	const rows = [...all].filter((row) => sets.every((set) => set.has(row))).sort((a, b) => a - b);
	return { rows, dropped: all.size - rows.length };
}

/** Les nombres d'une liste sur ces lignes, dans leur ordre. */
export function valuesOn(list: ListObject, rows: readonly number[]): number[] {
	const byRow = new Map(list.rows.map((row, i) => [row, list.values[i]]));
	return rows.map((row) => byRow.get(row)!);
}

/** Les modalités d'une liste qualitative sur ces lignes, dans leur ordre. */
export function categoriesOn(list: ListObject, rows: readonly number[]): string[] {
	const byRow = new Map(list.rows.map((row, i) => [row, list.categories?.[i] ?? '']));
	return rows.map((row) => byRow.get(row)!);
}

/** « L et M n’ont aucune ligne remplie en commun. » — le bouton et la commande disent la même chose. */
export function noCommonRowsMessage(a: ListObject, b: ListObject): string {
	return `${a.name} et ${b.name} n’ont aucune ligne remplie en commun.`;
}

/** « 1 ligne incomplète écartée », « 2 lignes incomplètes écartées ». */
export function droppedNote(count: number): string {
	return count === 1 ? '1 ligne incomplète écartée' : `${count} lignes incomplètes écartées`;
}

/** La première ligne où l'une des listes a une valeur et l'autre non, ou `null`. */
export function firstMismatch(a: ListObject, b: ListObject): number | null {
	const inA = new Set(a.rows);
	const inB = new Set(b.rows);
	const rows = [...new Set([...a.rows, ...b.rows])].sort((x, y) => x - y);
	return rows.find((row) => inA.has(row) !== inB.has(row)) ?? null;
}

/**
 * Pourquoi deux listes ne font pas une loi (valeurs, probabilités), ou `null` :
 * une ligne incomplète n'est pas écartée — la loi serait fausse (P1).
 */
export function lawMismatchMessage(values: ListObject, probabilities: ListObject): string | null {
	const row = firstMismatch(values, probabilities);
	if (row === null) return null;
	const [has, lacks] = values.rows.includes(row)
		? [values.name, probabilities.name]
		: [probabilities.name, values.name];
	return `La ligne ${row} a un nombre dans ${has} mais pas dans ${lacks} : une loi demande une probabilité sur la ligne de chaque valeur.`;
}
