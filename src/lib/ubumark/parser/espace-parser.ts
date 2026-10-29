/**
 * Bloc ```cubes (nœud `espace`) — analyse du texte
 * ================================================
 *
 * ```cubes
 * hauteurs: 2 1 1 / 1 0 1      (rangées séparées par /)
 * vue: perspective | dessus | face | droite | gauche
 * ```
 *
 * ou les rangées en retrait sous la clé :
 *
 * ```cubes
 * hauteurs:
 *   2 1 1
 *   1 0 1
 * ```
 *
 * - `hauteurs:` (obligatoire) : la première rangée est AU FOND, la dernière
 *   DEVANT ; colonnes de gauche à droite ; chaque nombre est une hauteur
 *   entière de 0 à 6, au plus 6 rangées et 6 colonnes, toutes rangées de même
 *   longueur. Les rangées et colonnes entièrement vides AU BORD sont retirées
 *   (une variable à 0 ne décale pas le dessin) ; un trou intérieur reste.
 * - `vue:` (facultatif) : la perspective cavalière par défaut.
 * - Une clé inconnue ou répétée est une erreur située. Dans un modèle de
 *   question, `{{a}}` est résolu AVANT : le bloc ne lit que des nombres.
 *
 * Une erreur ne fait pas disparaître le bloc (le nœud porte ses phrases).
 * Repérage et blocs non fermés : ceux de ```partage (Q63, Q66).
 *
 * Plus tard, le même analyseur reconnaîtra les clôtures `solide` et `patron`.
 *
 * @module ubumark/parser/espace-parser
 */

import { specialBlockEnd } from './unclosed-block';
import {
	CUBES_KEYS,
	CUBES_LIMITS,
	CUBES_VIEWS,
	type CubesView,
	type EspaceBlockRange,
	type EspaceKind,
	type EspaceNode
} from '../types/espace';

// ============================================================================
// CONSTANTES
// ============================================================================

const ESPACE_BLOCK_START_REGEX = /^```(cubes)\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

const KEY_LIST = CUBES_KEYS.join(', ');
const HEIGHT_REGEX = /^\d+$/;
const HEIGHT_HINT = `une hauteur est un nombre entier de 0 à ${CUBES_LIMITS.height}`;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isEspaceBlockStart(line: string): boolean {
	return ESPACE_BLOCK_START_REGEX.test(line);
}

/** Le genre d'un bloc d'espace, d'après sa ligne d'ouverture */
export function espaceKindOf(line: string): EspaceKind | null {
	const match = ESPACE_BLOCK_START_REGEX.exec(line);
	return match ? (match[1] as EspaceKind) : null;
}

/**
 * Blocs d'espace (```cubes) d'une liste de lignes (indices inclusifs,
 * clôtures comprises). Fermé par un ``` qui ne fait pas lire du texte comme
 * contenu (Q66), sinon jusqu'à la première ligne vide (Q63).
 */
export function findEspaceBlocks(lines: string[]): EspaceBlockRange[] {
	const blocks: EspaceBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isEspaceBlockStart(lines[i])) {
			const { endIndex } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				CUBES_KEYS
			);
			blocks.push({ startIndex: i, endIndex });
			i = endIndex;
		}
		i++;
	}
	return blocks;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Retire les accents et les majuscules */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Une rangée écrite, avec la ligne du texte d'où elle vient */
interface WrittenRow {
	text: string;
	line: number;
}

/** Retire les rangées et colonnes entièrement vides AU BORD */
export function trimHeights(heights: number[][]): number[][] {
	const rows = heights;
	const nonEmptyRows = rows
		.map((row, r) => (row.some((h) => h > 0) ? r : -1))
		.filter((r) => r >= 0);
	if (nonEmptyRows.length === 0) return [];
	const rowStart = nonEmptyRows[0];
	const rowEnd = nonEmptyRows[nonEmptyRows.length - 1];
	const kept = rows.slice(rowStart, rowEnd + 1);
	const nonEmptyCols = kept[0]
		.map((_, c) => (kept.some((row) => row[c] > 0) ? c : -1))
		.filter((c) => c >= 0);
	const colStart = nonEmptyCols[0];
	const colEnd = nonEmptyCols[nonEmptyCols.length - 1];
	return kept.map((row) => row.slice(colStart, colEnd + 1));
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```cubes.
 */
export function parseEspaceContent(source: string, genre: EspaceKind = 'cubes'): EspaceNode {
	const lines = source.split('\n');
	const errors: string[] = [];
	const fail = (line: number, message: string) => errors.push(`Ligne ${line} : ${message}`);

	const written: WrittenRow[] = [];
	let view: CubesView = 'perspective';
	const seen = new Map<string, number>();
	/** Les lignes sans clé qui suivent `hauteurs:` sont des rangées */
	let inHeights = false;

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			if (inHeights) {
				for (const row of text.split('/')) written.push({ text: row.trim(), line: lineNo });
				return;
			}
			fail(
				lineNo,
				`ligne « ${text} » non comprise (attendu : clé: valeur, ex. hauteurs: 2 1 / 1 0)`
			);
			return;
		}
		const key = plain(match[1]);
		const value = match[2].trim();
		inHeights = false;
		if (!(CUBES_KEYS as readonly string[]).includes(key)) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : ${KEY_LIST})`);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			return;
		}
		seen.set(key, lineNo);

		if (key === 'hauteurs') {
			inHeights = true;
			if (value !== '') {
				for (const row of value.split('/')) written.push({ text: row.trim(), line: lineNo });
			}
		} else {
			const wanted = plain(value);
			if ((CUBES_VIEWS as readonly string[]).includes(wanted)) {
				view = wanted as CubesView;
			} else {
				fail(lineNo, `vue « ${value} » inconnue (vues possibles : ${CUBES_VIEWS.join(', ')})`);
			}
		}
	});

	// Les hauteurs
	let heights: number[][] = [];
	if (written.length === 0) {
		fail(1, 'il manque la ligne hauteurs: (ex. hauteurs: 2 1 1 / 1 0 1)');
	} else {
		let readable = true;
		const parsed: number[][] = [];
		for (const row of written) {
			const cells = row.text === '' ? [] : row.text.split(/\s+/);
			if (cells.length === 0) {
				fail(row.line, 'rangée vide (écris au moins une hauteur par rangée)');
				readable = false;
				continue;
			}
			const bad = cells.find(
				(cell) => !HEIGHT_REGEX.test(cell) || Number(cell) > CUBES_LIMITS.height
			);
			if (bad !== undefined) {
				fail(row.line, `« ${bad} » : ${HEIGHT_HINT}`);
				readable = false;
				continue;
			}
			parsed.push(cells.map(Number));
		}
		if (readable) {
			if (parsed.some((row) => row.length !== parsed[0].length)) {
				const odd = written[parsed.findIndex((row) => row.length !== parsed[0].length)];
				fail(odd.line, 'chaque rangée doit avoir le même nombre de cases');
			} else if (parsed.length > CUBES_LIMITS.rows) {
				fail(
					written[CUBES_LIMITS.rows].line,
					`${parsed.length} rangées : au plus ${CUBES_LIMITS.rows} rangées`
				);
			} else if (parsed[0].length > CUBES_LIMITS.cols) {
				fail(
					written[0].line,
					`${parsed[0].length} colonnes : au plus ${CUBES_LIMITS.cols} colonnes`
				);
			} else {
				heights = trimHeights(parsed);
				if (heights.length === 0) fail(written[0].line, 'assemblage vide (aucun cube)');
			}
		}
	}

	if (errors.length > 0 || heights.length === 0) {
		return { type: 'espace', genre, source, spec: null, errors };
	}
	return { type: 'espace', genre, source, spec: { kind: 'cubes', heights, view }, errors };
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseEspace(
	lines: string[],
	startIndex: number,
	end: number
): { node: EspaceNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseEspaceContent(body.join('\n'), espaceKindOf(lines[startIndex]) ?? 'cubes');
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			errors: [
				...node.errors,
				`Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`
			]
		}
	};
}
