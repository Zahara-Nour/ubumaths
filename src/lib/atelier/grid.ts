/**
 * Atelier — la grille de la vue Données : adresses, entrées d'une colonne
 *
 * Une liste est une colonne NOMMÉE : ses cellules sont les entrées de sa
 * définition, une par ligne (`12 ; ; 15` = la ligne 2 est vide). Les colonnes
 * sans nom gardent leurs cellules dans la grille de l'`Atelier`. Chaque
 * cellule a donc un seul propriétaire.
 *
 * Phase 0 : `docs/wip/atelier-tableur-phase0.md` (Q3, T1, T4, P2, §4).
 *
 * @module atelier/grid
 */

import { MAX_LIST_VALUES } from './types';
import { readListValue } from '$lib/statistics/read-value';

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

/** Le titre d'une colonne (T4) : un libellé, pas une phrase. */
export const MAX_TITLE_LENGTH = 40;

/** Un fichier CSV ouvert : 1 Mo au plus (la grille pleine en tient bien moins), refusé avant lecture. */
export const MAX_CSV_BYTES = 1_000_000;
export const CSV_TOO_BIG = 'Ce fichier est trop gros pour la grille (1 Mo au plus).';

/**
 * Le « ; » d'une FORMULE (`=max(1 ; A1)`) tel qu'il est rangé dans la
 * définition d'une liste, dont « ; » sépare les entrées : sans lui, la formule
 * était coupée en deux cases (trouvé en écrivant la PR 3 du lot 2).
 */
export const FORMULA_SEMICOLON = '⁏';

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
	const entries = definition
		.split(';')
		.map((entry) => entry.trim().replaceAll(FORMULA_SEMICOLON, ';'));
	while (entries.length > 0 && entries[entries.length - 1] === '') entries.pop();
	return entries;
}

/** La définition qui range ces entrées, une par ligne : `12 ;  ; 15`. */
export function definitionFrom(entries: readonly string[]): string {
	const kept = [...entries];
	while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();
	return kept
		.map((entry) =>
			entry.trimStart().startsWith('=') ? entry.replaceAll(';', FORMULA_SEMICOLON) : entry
		)
		.join(ENTRY_SEPARATOR);
}

/**
 * Le texte RANGÉ d'une cellule sans nom : le « ; » d'une formule y devient
 * `FORMULA_SEMICOLON`, comme dans une liste — une cellule rangée n'a jamais de
 * « ; » (P2), et `=max(1;2)` était écarté au stockage et dans le lien (revue).
 */
export function storedCellText(text: string): string {
	return text.trimStart().startsWith('=') ? text.replaceAll(';', FORMULA_SEMICOLON) : text;
}

/** L'inverse de `storedCellText`. */
export function cellTextFromStored(stored: string): string {
	return stored.trimStart().startsWith('=') ? stored.replaceAll(FORMULA_SEMICOLON, ';') : stored;
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
	// Une FORMULE n'est jamais répartie : son « ; » sépare des arguments
	// (`=max(1 ; A2)`, tableur lot 2)
	if (!text.includes(';') || text.trimStart().startsWith('=')) return [{ row, text: text.trim() }];
	// `12 ; 15 ;` : le « ; » final n'écrit rien en dessous (revue : il vidait la
	// ligne suivante), comme l'ancien champ qui l'ignorait
	const pieces = entriesOf(text);
	return (pieces.length === 0 ? [''] : pieces).map((piece, offset) => ({
		row: row + offset,
		text: piece
	}));
}

// =============================================================================
// Coller, copier, télécharger (§4)
// =============================================================================

/**
 * Lire un tableau collé : lignes, puis tabulations (LibreOffice, Excel, Google
 * Sheets, page web). Sans tabulation, des « ; » sur CHAQUE ligne d'un texte de
 * plusieurs lignes séparent des colonnes (CSV à la française) ; sinon, une
 * seule colonne. Une case entre guillemets garde ses tabulations, ses retours
 * à la ligne et ses `""` (Excel les écrit ainsi). Les lignes vides en tête et
 * en fin ne comptent pas.
 */
export function readTable(text: string): string[][] {
	const lines = text.replace(/\r\n?/g, '\n');
	const nonEmpty = lines.split('\n').filter((line) => line.trim() !== '');
	const separator = lines.includes('\t')
		? '\t'
		: nonEmpty.length > 1 && nonEmpty.every((line) => line.includes(';'))
			? ';'
			: null;
	// Un guillemet ouvrant jamais fermé (`"Le Cid` en tête de case) n'en est pas
	// un : relu sans guillemets, il n'avale pas le reste du collage (revue)
	const rows = splitTable(lines, separator, true) ?? splitTable(lines, separator, false)!;
	// Les lignes vides en tête et en fin ne comptent pas (tableau copié d'une page)
	const blank = (row: string[]) => row.every((cell) => cell.trim() === '');
	while (rows.length > 0 && blank(rows[0])) rows.shift();
	while (rows.length > 0 && blank(rows[rows.length - 1])) rows.pop();
	return rows.map((cells) => cells.map((cell) => (separator === null ? cell : cell.trim())));
}

/**
 * Un fichier CSV ouvert dans la grille (repris de V4, phase 0 §3) : décodé
 * (UTF-8, sinon Windows-1252, celui d'Excel sous Windows), coupé en lignes et en
 * cases. Le fichier reste dans le navigateur. Le tableau se pose ensuite comme
 * un collage (`pasteTable`, Q-RE-4).
 */
export function readCsvFile(
	bytes: Uint8Array
): { ok: true; table: string[][] } | { ok: false; message: string } {
	if (bytes.length > MAX_CSV_BYTES) {
		return { ok: false, message: CSV_TOO_BIG };
	}
	const text = decodedText(bytes);
	// Un octet nul : une image, un classeur .xlsx, pas un texte
	if (text.includes('\0')) {
		return {
			ok: false,
			message: 'Ce fichier n’est pas un tableau CSV : enregistre ton tableau au format CSV.'
		};
	}
	const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
	if (lines.trim() === '') return { ok: false, message: 'Ce fichier est vide.' };
	const separator = csvSeparator(lines);
	const rows = splitTable(lines, separator, true) ?? splitTable(lines, separator, false)!;
	const blank = (row: string[]) => row.every((cell) => cell.trim() === '');
	while (rows.length > 0 && blank(rows[0])) rows.shift();
	while (rows.length > 0 && blank(rows[rows.length - 1])) rows.pop();
	return { ok: true, table: rows.map((cells) => cells.map(importedText)) };
}

/** UTF-8 s'il en est, sinon Windows-1252 (Excel sous Windows) : `é` reste `é`. */
function decodedText(bytes: Uint8Array): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder('windows-1252').decode(bytes);
	}
}

/**
 * Le séparateur d'un fichier : la tabulation, sinon `;` (Excel et LibreOffice
 * en français, et le téléchargement de l'atelier). La virgule seulement quand
 * elle ne peut pas être décimale (Q-RE-5) : une ligne à virgule qui n'est pas
 * un nombre à la française (`1.52,45.5`, `Alice,12`) ; `1,5` reste 1,5.
 */
function csvSeparator(lines: string): string | null {
	if (lines.includes('\t')) return '\t';
	if (lines.includes(';')) return ';';
	const withComma = lines.split('\n').filter((line) => line.includes(','));
	return withComma.some((line) => readListValue(line.trim()) === null) ? ',' : null;
}

/**
 * Une case lue d'un fichier : sans espaces autour ; l'apostrophe que pose notre
 * téléchargement devant `-`, `+` ou `@` (`exportText`) est retirée. Devant `=`,
 * elle reste : la case serait lue comme une formule.
 */
function importedText(cell: string): string {
	const text = cell.trim();
	return /^'[+\-@]/.test(text) ? text.slice(1) : text;
}

/** Découper en lignes et en cases ; `null` si un guillemet ouvert n'est jamais fermé. */
function splitTable(
	lines: string,
	separator: string | null,
	withQuotes: boolean
): string[][] | null {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < lines.length; i++) {
		const char = lines[i];
		if (quoted) {
			if (char === '"' && lines[i + 1] === '"') {
				field += '"';
				i++;
			} else if (char === '"') quoted = false;
			else field += char;
		} else if (withQuotes && char === '"' && field === '') quoted = true;
		else if (char === separator) {
			row.push(field);
			field = '';
		} else if (char === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += char;
	}
	if (quoted) return null;
	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

/**
 * Une première ligne de MOTS au-dessus de NOMBRES (`Taille ⇥ Masse` puis des
 * mesures) : ce sont les titres des colonnes, pas des cellules (T4). Une
 * colonne de mots seuls (`fille`, `garçon`) n'a pas de titre deviné.
 */
export function hasTitleRow(table: readonly (readonly string[])[]): boolean {
	if (table.length < 2) return false;
	const first = table[0].filter((cell) => cell.trim() !== '');
	if (first.length === 0 || first.some((cell) => readListValue(cell) !== null)) return false;
	return table.slice(1).some((row) => row.some((cell) => readListValue(cell) !== null));
}

/**
 * Une cellule telle qu'elle sort vers un tableur : un nombre en décimal à
 * virgule (`1/4` → `0,25` — un tableur lirait `1/4` comme une date), un mot
 * tel quel. ⚠️ Un mot qui commence par `=`, `+`, `-` ou `@` est précédé d'une
 * apostrophe : sinon le tableur l'exécuterait comme une formule en ouvrant le
 * fichier (injection de formule), et une grille peut venir d'un lien reçu.
 */
export function exportText(text: string): string {
	const value = readListValue(text);
	if (value !== null) return String(value).replace('.', ',');
	return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/** Une case entre guillemets quand elle contient le séparateur, un guillemet ou un retour. */
function quotedField(text: string, separator: string): string {
	return text.includes(separator) || /["\n\r]/.test(text)
		? `"${text.replaceAll('"', '""')}"`
		: text;
}

/** Le texte copié d'une zone : tabulations et lignes, comme le collent les tableurs. */
export function tableText(rows: readonly (readonly string[])[]): string {
	return rows
		.map((row) => row.map((cell) => quotedField(exportText(cell), '\t')).join('\t'))
		.join('\n');
}

/**
 * Le fichier CSV de la grille : « ; » entre les cases et virgule décimale,
 * comme l'attendent Excel et LibreOffice en français ; les titres en première
 * ligne quand il y en a ; fins de ligne CRLF.
 */
export function csvText(
	titles: readonly string[] | null,
	rows: readonly (readonly string[])[]
): string {
	const lines = [...(titles === null ? [] : [titles]), ...rows].map((row) =>
		row.map((cell) => quotedField(exportText(cell), ';')).join(';')
	);
	return lines.map((line) => `${line}\r\n`).join('');
}
