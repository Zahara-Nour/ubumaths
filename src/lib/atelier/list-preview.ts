/**
 * Atelier — l'aperçu d'une liste sur sa carte
 *
 * Lot 4a de `docs/archive/wip/atelier-refonte-interface-phase0.md` (décision de David
 * du 2026-10-18) : une liste ne s'édite pas sur la ligne de sa carte — trente
 * valeurs ne tiennent pas dans un champ d'une ligne — mais elle s'y LIT :
 * ses premières entrées, puis combien elle en a.
 *
 * Module pur : la carte et ses tests l'importent.
 *
 * @module atelier/list-preview
 */

import type { CellValue } from './formula';
import type { ListObject } from './types';

// =============================================================================
// Constantes
// =============================================================================

/** Les entrées montrées avant les points de suspension. */
export const PREVIEW_ENTRIES = 3;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les entrées d'une liste, telles que l'élève les lit dans la grille.
 *
 * ⚠️ Une case calculée (`=A1*2`) se lit par sa VALEUR, jamais par sa formule ;
 * sans la grille (`cellValue` absent), par la valeur analysée.
 */
export function listEntriesOf(
	list: ListObject,
	cellValue?: (column: number, row: number) => CellValue
): string[] {
	const entries = list.definition.split(';');
	if (!entries.some((entry) => entry.trim().startsWith('='))) {
		return entries.map((entry) => entry.trim()).filter((entry) => entry !== '');
	}
	if (cellValue === undefined) return list.values.map((v) => String(v).replace('.', ','));
	return entries
		.map((_, i) => cellValue(list.column, i + 1))
		.map((value) => {
			if (value === undefined) return '';
			if (value.kind === 'number') return value.shown;
			if (value.kind === 'word') return value.text;
			return value.kind === 'error' ? value.label : '';
		})
		.filter((text) => text !== '');
}

/** `{3 ; 5 ; 8 ; …}` : les premières entrées, et des points de suspension s'il en reste. */
export function listPreview(entries: readonly string[], shown = PREVIEW_ENTRIES): string {
	const head = entries.slice(0, shown);
	const more = entries.length > shown ? ' ; …' : '';
	return `{${head.join(' ; ')}${more}}`;
}

/**
 * Ce que compte la carte : `12 valeurs` ; une liste de mots ajoute le nombre
 * de ses modalités (`5 valeurs, 3 modalités`), ce qui la distingue d'un coup
 * d'œil d'une liste de nombres.
 */
export function listCountLabel(entries: readonly string[], categories?: readonly string[]): string {
	const count = `${entries.length} ${entries.length > 1 ? 'valeurs' : 'valeur'}`;
	if (categories === undefined) return count;
	const distinct = new Set(categories).size;
	return `${count}, ${distinct} ${distinct > 1 ? 'modalités' : 'modalité'}`;
}
