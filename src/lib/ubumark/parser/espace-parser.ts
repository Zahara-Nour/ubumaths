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
 * - `dessiner: face` (`dessus`, `droite`, `gauche`) : geste de l'élève, qui colorie
 *   la vue dans un quadrillage vide, à côté de la perspective.
 * - `retrouver: face, droite` : geste de l'élève, qui retrouve l'assemblage d'après
 *   ses vues (la vue de dessus, toujours donnée, sert de grille de saisie).
 *   Les deux gestes s'excluent, et excluent `vue:`. `case: N` y est posée par le
 *   générateur de questions (chantier `solides`, § 7).
 * - Une clé inconnue ou répétée est une erreur située. Dans un modèle de
 *   question, `{{a}}` est résolu AVANT : le bloc ne lit que des nombres.
 *
 * Une erreur ne fait pas disparaître le bloc (le nœud porte ses phrases).
 * Repérage et blocs non fermés : ceux de ```partage (Q63, Q66).
 *
 * La clôture ```solide (lot 3) est lue par `solide-parser.ts` ; ```patron viendra
 * ensuite.
 *
 * @module ubumark/parser/espace-parser
 */

import { specialBlockEnd } from './unclosed-block';
import { parseSolideContent } from './solide-parser';
import {
	CUBES_DRAWN_VIEWS,
	CUBES_KEYS,
	CUBES_LIMITS,
	CUBES_SIDE_VIEWS,
	CUBES_VIEWS,
	SOLIDE_KEYS,
	type CubesDrawnView,
	type CubesSideView,
	type CubesTask,
	type CubesView,
	type EspaceBlockRange,
	type EspaceKind,
	type EspaceNode
} from '../types/espace';

// ============================================================================
// CONSTANTES
// ============================================================================

const ESPACE_BLOCK_START_REGEX = /^```(cubes|solide)\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

const KEY_LIST = CUBES_KEYS.join(', ');
const HEIGHT_REGEX = /^\d+$/;
const HEIGHT_HINT = `une hauteur est un nombre entier de 0 à ${CUBES_LIMITS.height}`;

/** Une ligne de geste (`dessiner:` ou `retrouver:`), qui fait du bloc une case */
const TASK_LINE_REGEX = /^(dessiner|retrouver)\s*:/i;

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

/** Les clés d'un genre (fermeture d'un bloc non fermé) */
const keysOf = (line: string) => (espaceKindOf(line) === 'solide' ? SOLIDE_KEYS : CUBES_KEYS);

/**
 * Blocs d'espace (```cubes, ```solide) d'une liste de lignes (indices inclusifs,
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
				keysOf(lines[i])
			);
			blocks.push({ startIndex: i, endIndex });
			i = endIndex;
		}
		i++;
	}
	return blocks;
}

/** Ligne vue sans retrait ni marque de citation */
const unquoted = (line: string) => line.replace(/^[\s>]*/, '');

/**
 * Les assemblages à geste (`dessiner:`, `retrouver:`) d'un énoncé, délimités comme
 * le parseur : corps sans clôtures, fermeture, et `nested` pour un bloc en retrait
 * ou cité (l'élève ne pourrait pas y répondre : sa case n'est pas créée)
 */
export function findCubesToBuild(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plainLines = lines.map(unquoted);
	const found: { startIndex: number; body: string[]; closed: boolean; nested: boolean }[] = [];
	let i = 0;
	while (i < plainLines.length) {
		if (espaceKindOf(plainLines[i]) === 'cubes') {
			const { endIndex, closed } = specialBlockEnd(
				plainLines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				CUBES_KEYS
			);
			const body = plainLines.slice(i + 1, closed ? endIndex : endIndex + 1);
			if (body.some((line) => TASK_LINE_REGEX.test(line.trim()))) {
				found.push({ startIndex: i, body, closed, nested: lines[i] !== plainLines[i] });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il un assemblage à geste ? */
export function hasCubesToBuild(markdown: string): boolean {
	return findCubesToBuild(markdown).length > 0;
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
 * Ligne 1 = première ligne après ```cubes (ou ```solide).
 */
export function parseEspaceContent(source: string, genre: EspaceKind = 'cubes'): EspaceNode {
	if (genre === 'solide') {
		const { spec, errors } = parseSolideContent(source);
		return { type: 'espace', genre, source, spec, errors };
	}
	const lines = source.split('\n');
	const errors: string[] = [];
	const fail = (line: number, message: string) => errors.push(`Ligne ${line} : ${message}`);

	const written: WrittenRow[] = [];
	let view: CubesView = 'perspective';
	let task: CubesTask | undefined;
	let caseIndex: number | undefined;
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
		} else if (key === 'dessiner') {
			const wanted = plain(value);
			if ((CUBES_DRAWN_VIEWS as readonly string[]).includes(wanted)) {
				task = { kind: 'dessiner', view: wanted as CubesDrawnView };
			} else {
				fail(
					lineNo,
					`dessiner « ${value} » : vue à dessiner inconnue (vues possibles : ${CUBES_DRAWN_VIEWS.join(', ')})`
				);
			}
		} else if (key === 'retrouver') {
			const views = readSideViews(value);
			if (typeof views === 'string') fail(lineNo, views);
			else task = { kind: 'retrouver', views };
		} else if (key === 'case') {
			if (/^\d+$/.test(value)) caseIndex = Number(value);
			else fail(lineNo, `case « ${value} » : numéro de case entier`);
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
		fail(1, 'il manque les hauteurs (ex. hauteurs: 2 1 1 / 1 0 1)');
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

	// Les gestes s'excluent, et excluent `vue:`
	const dessinerLine = seen.get('dessiner');
	const retrouverLine = seen.get('retrouver');
	const vueLine = seen.get('vue');
	if (dessinerLine !== undefined && retrouverLine !== undefined) {
		fail(
			retrouverLine,
			'dessiner: et retrouver: ne vont pas ensemble (un seul geste par assemblage)'
		);
	}
	const taskKey = dessinerLine !== undefined ? 'dessiner' : 'retrouver';
	const taskLine = dessinerLine ?? retrouverLine;
	if (vueLine !== undefined && taskLine !== undefined) {
		fail(
			vueLine,
			`vue: ne va pas avec ${taskKey}: (${taskKey === 'dessiner' ? 'la perspective est dessinée à côté du quadrillage' : 'les vues dessinées sont celles de retrouver:'})`
		);
	}
	const caseLine = seen.get('case');
	if (caseLine !== undefined && taskLine === undefined) {
		fail(caseLine, 'case: sans objet sans dessiner: ni retrouver:');
	}

	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (errors.length > 0 || heights.length === 0) {
		return { type: 'espace', genre, source, spec: null, errors, ...withCase };
	}
	return {
		type: 'espace',
		genre,
		source,
		spec: { kind: 'cubes', heights, view, ...(task && { task }) },
		errors,
		...withCase
	};
}

/** Les vues de `retrouver:` ; une phrase d'erreur si la liste est fausse */
function readSideViews(value: string): CubesSideView[] | string {
	const hint = `vues possibles : ${CUBES_SIDE_VIEWS.join(', ')}, séparées par des virgules`;
	const items = value
		.split(',')
		.map((item) => plain(item.trim()))
		.filter((item) => item !== '');
	if (items.length === 0) return `retrouver: quelles vues donner ? (${hint})`;
	const views: CubesSideView[] = [];
	for (const item of items) {
		if (item === 'dessus') {
			return 'retrouver: la vue de dessus est toujours donnée (c’est la grille où l’élève écrit les hauteurs) : liste les autres vues';
		}
		if (!(CUBES_SIDE_VIEWS as readonly string[]).includes(item)) {
			return `retrouver: vue « ${item} » inconnue (${hint})`;
		}
		if (views.includes(item as CubesSideView)) return `retrouver: vue « ${item} » donnée deux fois`;
		views.push(item as CubesSideView);
	}
	return views;
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
