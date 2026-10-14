/**
 * Atelier — la grille de la vue Données : adresses, entrées d'une colonne
 *
 * Une liste est une colonne NOMMÉE : ses cellules sont les entrées de sa
 * définition, une par ligne (`12 ; ; 15` = la ligne 2 est vide). Les colonnes
 * sans nom gardent leurs cellules dans la grille de l'`Atelier`. Chaque
 * cellule a donc un seul propriétaire.
 *
 * Phase 0 : `docs/wip/atelier-tableur-phase0.md` (Q3, T1, P2).
 *
 * @module atelier/grid
 */

import { MAX_LIST_VALUES } from './types';

// =============================================================================
// Types
// =============================================================================

/** Une cellule à écrire : colonne 0 à 25 (A à Z), ligne 1 à 200, texte brut. */
export interface CellEdit {
	readonly column: number;
	readonly row: number;
	readonly text: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** A à Z (Q3) : au-delà, `AB` se lirait A·B dans l'atelier. */
export const GRID_COLUMNS = 26;

/** Alignées sur les listes (Q3) : une colonne doit pouvoir devenir une liste. */
export const GRID_ROWS = MAX_LIST_VALUES;

/** Longueur d'une cellule (phase 0 §3) : une modalité en a 40, un nombre bien moins. */
export const MAX_CELL_LENGTH = 200;

/** Le séparateur des entrées d'une liste, tel que l'atelier l'écrit. */
const ENTRY_SEPARATOR = ' ; ';

const CELL_NAME = /^([A-Z])([1-9]\d{0,2})$/;

// =============================================================================
// Adresses
// =============================================================================

export function columnLetter(column: number): string {
	return String.fromCharCode(65 + column);
}

/** `A` → 0 ; `null` hors de A-Z. */
export function columnOfLetter(letter: string): number | null {
	return /^[A-Z]$/.test(letter) ? letter.charCodeAt(0) - 65 : null;
}

/** `B3` : colonne B, ligne 3. */
export function cellName(column: number, row: number): string {
	return `${columnLetter(column)}${row}`;
}

/** `B3` → { column: 1, row: 3 } ; `null` hors de la grille. */
export function readCellName(name: string): { column: number; row: number } | null {
	const match = CELL_NAME.exec(name);
	if (match === null) return null;
	const row = Number(match[2]);
	return row > GRID_ROWS ? null : { column: match[1].charCodeAt(0) - 65, row };
}

export function isInGrid(column: number, row: number): boolean {
	return (
		Number.isInteger(column) &&
		Number.isInteger(row) &&
		column >= 0 &&
		column < GRID_COLUMNS &&
		row >= 1 &&
		row <= GRID_ROWS
	);
}

// =============================================================================
// Entrées d'une colonne nommée
// =============================================================================

/** Les entrées d'une définition de liste, une par ligne ; les vides finales ne comptent pas. */
export function entriesOf(definition: string): string[] {
	const entries = definition.split(';').map((entry) => entry.trim());
	while (entries.length > 0 && entries[entries.length - 1] === '') entries.pop();
	return entries;
}

/** La définition qui range ces entrées, une par ligne : `12 ;  ; 15`. */
export function definitionFrom(entries: readonly string[]): string {
	const kept = [...entries];
	while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();
	return kept.join(ENTRY_SEPARATOR);
}

/**
 * Une cellule de la grille écrite dans une saisie (`B2+1` → `B2`), ou `null`.
 * Une lettre collée à une autre, à `_` ou à `\` n'en est pas une (`A_2`,
 * `\log2`, `AB12`).
 */
export function cellCitedIn(text: string): string | null {
	const match = /(?<![A-Za-z_\\])[A-Z][1-9]\d{0,2}(?![\d.,])/.exec(text);
	return match === null || readCellName(match[0]) === null ? null : match[0];
}

/** Le refus de Calcul devant une cellule : l'atelier ne lit qu'une colonne nommée (Q1). */
export function cellInCalculMessage(cell: string): string {
	return `${cell} est une cellule de la grille : nomme sa colonne pour t’en servir.`;
}

/**
 * P2 : `12 ; 15 ; 9` tapé ou collé dans une cellule se répartit vers le bas,
 * une valeur par ligne — l'habitude du champ d'avant la grille. Sans « ; »,
 * la cellule reçoit son texte tel quel.
 */
export function spreadText(row: number, text: string): { row: number; text: string }[] {
	if (!text.includes(';')) return [{ row, text: text.trim() }];
	// `12 ; 15 ;` : le « ; » final n'écrit rien en dessous (revue : il vidait la
	// ligne suivante), comme l'ancien champ qui l'ignorait
	const pieces = entriesOf(text);
	return (pieces.length === 0 ? [''] : pieces).map((piece, offset) => ({
		row: row + offset,
		text: piece
	}));
}
