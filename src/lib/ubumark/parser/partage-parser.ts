/**
 * Bloc ```partage — analyse du texte
 * ==================================
 *
 * ```partage
 * forme: bande 8 | grille 3×4 | disque 6 | carre-diagonales
 * gris: 3            (les 3 premières parts)   ou   gris: 1, 4, 6
 * ```
 *
 * - `forme:` (obligatoire) : `bande N` et `disque N` de 2 à 12 parts ; `grille L×C`
 *   (`x` ou `×`) de 1 à 10 lignes et colonnes, au moins 2 parts ;
 *   `carre-diagonales` (4 triangles).
 * - `gris:` (facultatif) : un nombre (les N premières parts, de 0 au total) ou
 *   une liste de rangs distincts à partir de 1. Absent : aucune part coloriée.
 * - `colorier: 3/8` (facultatif, exclusif avec `gris:`) : figure À COLORIER par l'élève
 *   (une question) ; la fraction doit tomber juste sur le partage et valoir au plus 1.
 *   `case: N` y est posée par le générateur de questions.
 * - Une clé inconnue ou répétée est une erreur située.
 *
 * Numérotation des parts : voir `utils/partage-scene.ts`. Dans un modèle de
 * question, `{{d}}` est résolu AVANT : le bloc ne lit que des nombres. Une
 * erreur ne fait pas disparaître le bloc (le nœud porte ses phrases). Repérage
 * et blocs non fermés : ceux de ```horloge (Q63, Q66).
 *
 * @module ubumark/parser/partage-parser
 */

import { specialBlockEnd } from './unclosed-block';
import {
	PARTAGE_GRID,
	PARTAGE_KEYS,
	PARTAGE_PARTS,
	partageTotal,
	type PartageBlockRange,
	type PartageColorier,
	type PartageNode,
	type PartageShape
} from '../types/partage';

// ============================================================================
// CONSTANTES
// ============================================================================

const PARTAGE_BLOCK_START_REGEX = /^```partage\s*$/;
const COLORIER_LINE_REGEX = /^colorier\s*:/i;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

const NUMBER_REGEX = /^\d+$/;
const GRID_REGEX = /^grille\s+(\d+)\s*[x×]\s*(\d+)$/i;
const COUNT_SHAPE_REGEX = /^(bande|disque)(?:\s+(.*))?$/i;

const KEY_LIST = PARTAGE_KEYS.join(', ');
const FORMES_HINT = 'formes possibles : bande N, grille L×C, disque N, carre-diagonales';
const FRACTION_REGEX = /^(\d+)\s*\/\s*(\d+)$/;
const COLORIER_HINT = 'écris la fraction à colorier, ex. colorier: 3/8';
const GRIS_HINT =
	'écris un nombre de parts (gris: 3), la liste des parts (gris: 1, 4, 6) ou une seule part suivie d’une virgule (gris: 4,)';

// ============================================================================
// DÉTECTION
// ============================================================================

export function isPartageBlockStart(line: string): boolean {
	return PARTAGE_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```partage d'une liste de lignes (indices inclusifs, clôtures comprises).
 * Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon
 * jusqu'à la première ligne vide (Q63).
 */
export function findPartageBlocks(lines: string[]): PartageBlockRange[] {
	const blocks: PartageBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isPartageBlockStart(lines[i])) {
			const { endIndex } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				PARTAGE_KEYS
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
 * Les figures à colorier (`colorier:`) d'un énoncé, délimitées comme le parseur :
 * corps sans clôtures, fermeture, et `nested` pour un bloc en retrait ou cité
 * (l'élève ne pourrait pas y répondre : sa case n'est pas créée)
 */
export function findPartagesToColorier(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unquoted);
	const found: { startIndex: number; body: string[]; closed: boolean; nested: boolean }[] = [];
	let i = 0;
	while (i < plain.length) {
		if (isPartageBlockStart(plain[i])) {
			const { endIndex, closed } = specialBlockEnd(
				plain,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				PARTAGE_KEYS
			);
			const body = plain.slice(i + 1, closed ? endIndex : endIndex + 1);
			if (body.some((line) => COLORIER_LINE_REGEX.test(line))) {
				found.push({ startIndex: i, body, closed, nested: lines[i] !== plain[i] });
			}
			i = endIndex;
		}
		i++;
	}
	return found;
}

/** L'énoncé a-t-il une figure à colorier ? */
export function hasPartageToColorier(markdown: string): boolean {
	return findPartagesToColorier(markdown).length > 0;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

/** Retire les accents (`carré` = `carre`) */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function parseCount(kind: 'bande' | 'disque', raw: string | undefined): number {
	const text = (raw ?? '').trim();
	if (!NUMBER_REGEX.test(text)) {
		throw new LineError(`${kind} : écris le nombre de parts, ex. forme: ${kind} 8`);
	}
	const parts = Number(text);
	if (parts < PARTAGE_PARTS.min || parts > PARTAGE_PARTS.max) {
		throw new LineError(
			`${kind} de ${parts} part${parts > 1 ? 's' : ''} : de ${PARTAGE_PARTS.min} à ${PARTAGE_PARTS.max} parts`
		);
	}
	return parts;
}

function parseShape(value: string): PartageShape {
	const text = value.trim().replace(/\s+/g, ' ');
	const grid = GRID_REGEX.exec(text);
	if (grid) {
		const rows = Number(grid[1]);
		const cols = Number(grid[2]);
		if (rows < PARTAGE_GRID.min || rows > PARTAGE_GRID.max) {
			throw new LineError(
				`grille de ${rows} lignes : de ${PARTAGE_GRID.min} à ${PARTAGE_GRID.max} lignes`
			);
		}
		if (cols < PARTAGE_GRID.min || cols > PARTAGE_GRID.max) {
			throw new LineError(
				`grille de ${cols} colonnes : de ${PARTAGE_GRID.min} à ${PARTAGE_GRID.max} colonnes`
			);
		}
		if (rows * cols < 2) {
			throw new LineError('grille 1×1 : une grille a au moins 2 parts (ex. forme: grille 2×5)');
		}
		return { kind: 'grille', rows, cols };
	}
	if (/^grille\b/i.test(text)) {
		throw new LineError(`grille « ${text} » : écris grille L×C, ex. forme: grille 3×4`);
	}
	const counted = COUNT_SHAPE_REGEX.exec(text);
	if (counted) {
		const kind = counted[1].toLowerCase() as 'bande' | 'disque';
		return { kind, parts: parseCount(kind, counted[2]) };
	}
	if (plain(text).replace(/ /g, '-') === 'carre-diagonales') return { kind: 'carre-diagonales' };
	throw new LineError(`forme « ${text} » inconnue (${FORMES_HINT})`);
}

/** Ce que dit `gris:`, avant de connaître la figure : un nombre de parts, ou des rangs */
type GrayRequest = { count: number } | { ranks: number[] };

function parseGray(value: string): GrayRequest {
	const text = value.trim();
	const illegible = () => new LineError(`gris « ${text} » illisible : ${GRIS_HINT}`);
	if (text === '') throw illegible();
	// Virgule finale : liste d'une seule part (gris: 4, colorie la part 4 seule)
	const singleRank = /^\d+\s*,$/.test(text);
	const items = (singleRank ? text.slice(0, -1) : text).split(',').map((item) => item.trim());
	if (items.some((item) => !NUMBER_REGEX.test(item))) throw illegible();
	// Un seul nombre : les N premières parts
	if (items.length === 1 && !singleRank) return { count: Number(items[0]) };
	return { ranks: items.map(Number) };
}

/** Fraction écrite de `colorier:`, avant de connaître la figure */
function parseFraction(value: string): { num: number; den: number } {
	const match = FRACTION_REGEX.exec(value.trim());
	if (!match) throw new LineError(`colorier « ${value.trim()} » illisible : ${COLORIER_HINT}`);
	const num = Number(match[1]);
	const den = Number(match[2]);
	if (den === 0) throw new LineError('colorier : le dénominateur ne peut pas être 0');
	return { num, den };
}

/** Parts à colorier sur une figure de `total` parts ; lève si la fraction est impossible */
function resolveColorier(fraction: { num: number; den: number }, total: number): PartageColorier {
	const { num, den } = fraction;
	if (num === 0) throw new LineError('colorier: 0 part : il n’y a rien à colorier');
	if (num > den) {
		throw new LineError(
			`colorier: ${num}/${den} dépasse 1 : il faudrait plusieurs figures (unites:, pas encore disponible)`
		);
	}
	const scaled = num * total;
	if (scaled % den !== 0) {
		throw new LineError(
			`colorier: ${num}/${den} ne tombe pas juste sur une figure de ${total} parts (choisis un partage dont le nombre de parts est un multiple de ${den})`
		);
	}
	return { num, den, parts: scaled / den };
}

/** Rangs coloriés pour une figure de `total` parts ; lève si hors figure ou en double */
function resolveGray(request: GrayRequest, total: number): number[] {
	if ('count' in request) {
		if (request.count > total) {
			throw new LineError(
				`gris: ${request.count} parts coloriées, mais la figure n’a que ${total} parts`
			);
		}
		return Array.from({ length: request.count }, (_, i) => i + 1);
	}
	const seen = new Set<number>();
	for (const rank of request.ranks) {
		if (rank < 1 || rank > total) {
			throw new LineError(
				`gris : la part ${rank} n’existe pas (la figure a ${total} parts, numérotées de 1 à ${total})`
			);
		}
		if (seen.has(rank)) throw new LineError(`gris : la part ${rank} est écrite deux fois`);
		seen.add(rank);
	}
	return [...seen].sort((a, b) => a - b);
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```partage.
 */
export function parsePartageContent(source: string): PartageNode {
	const lines = source.split('\n');
	const errors: string[] = [];
	const fail = (line: number, message: string) => errors.push(`Ligne ${line} : ${message}`);

	let shape: PartageShape | null = null;
	let gray: GrayRequest | null = null;
	let grayLine = 1;
	let fraction: { num: number; den: number } | null = null;
	let colorierLine = 1;
	let caseIndex: number | undefined;
	const seen = new Map<string, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. forme: bande 8)`);
			return;
		}
		const key = match[1].toLowerCase();
		const value = match[2];
		if (!(PARTAGE_KEYS as readonly string[]).includes(key)) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : ${KEY_LIST})`);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			return;
		}
		seen.set(key, lineNo);

		try {
			if (key === 'forme') shape = parseShape(value);
			else if (key === 'colorier') {
				fraction = parseFraction(value);
				colorierLine = lineNo;
			} else if (key === 'case') {
				if (!NUMBER_REGEX.test(value.trim())) {
					throw new LineError(`case « ${value.trim()} » : numéro de case entier`);
				}
				caseIndex = Number(value.trim());
			} else {
				gray = parseGray(value);
				grayLine = lineNo;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	if (!seen.has('forme')) {
		fail(1, 'il manque la ligne forme: (ex. forme: bande 8)');
	}

	// Les rangs ne se vérifient qu'une fois la figure connue
	const readShape = shape as PartageShape | null;
	const readGray = gray as GrayRequest | null;
	const readFraction = fraction as { num: number; den: number } | null;
	let rank: number[] = [];
	let colorier: PartageColorier | undefined;
	if (readFraction !== null && readGray !== null) {
		fail(
			seen.get('gris') ?? 1,
			'gris: et colorier: ne vont pas ensemble (gris: montre des parts coloriées, colorier: demande à l’élève de colorier)'
		);
	} else if (readFraction !== null && readShape !== null) {
		try {
			colorier = resolveColorier(readFraction, partageTotal(readShape));
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(colorierLine, e.message);
		}
	}
	if (seen.has('case') && !seen.has('colorier')) {
		fail(seen.get('case') ?? 1, 'case: sans objet sans colorier:');
	}
	const withCase = caseIndex === undefined ? {} : { caseIndex };
	if (readShape !== null && readGray !== null && readFraction === null) {
		try {
			rank = resolveGray(readGray, partageTotal(readShape));
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(grayLine, e.message);
		}
	}

	if (errors.length > 0 || readShape === null) {
		return { type: 'partage', source, spec: null, errors, ...withCase };
	}
	return {
		type: 'partage',
		source,
		spec: { shape: readShape, gray: rank, ...(colorier && { colorier }) },
		errors,
		...withCase
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parsePartage(
	lines: string[],
	startIndex: number,
	end: number
): { node: PartageNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parsePartageContent(body.join('\n'));
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
