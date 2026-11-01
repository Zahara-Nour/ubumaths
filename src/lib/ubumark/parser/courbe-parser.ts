/**
 * Bloc ```courbe — analyse du texte
 * =================================
 *
 * Lit un bloc ```courbe en `CourbeNode`. Toutes les expressions sont en syntaxe
 * maison mathAST (`parseCustom`) : `2*x+1`, `1/(x-2)`, `sqrt(2)`, `\pi`.
 *
 * ```courbe
 * x: -4 ; 6
 * y: -8 ; 12
 * grille: 1 ; 2
 * f(x) = -(x+2)*(x-4)   bleu   nom=C_f
 * g(x) = 2*x+1 sur [-1 ; 4]   rouge pointillé
 * u(n) = 2*n+1 pour n de 0 à 8   bleu   nom=u
 * v(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 9   rouge
 * points: A(-2;0), B(4;0), M(2 ; f(2))
 * asymptotes: x=2 ; y=1
 * aire: f ; -2 ; 4
 * taille: moyenne
 * description: Parabole tournée vers le bas.
 * ```
 *
 * Repère à points à placer (une question) : `placer: A=(2 ; 3) ; B=(-1 ; 2)`
 * (1 à 6 points nommés d'une majuscule, ou un point seul sans nom), chaque
 * point sur un nœud de la grille et dans la fenêtre ; `case: N` est posée par
 * le générateur. Titres des axes : `axes: x = Durée (min) ; y = Température (°C)`.
 *
 * Les variables de template (`{{a}}`) sont remplacées AVANT l'analyse : une
 * valeur négative produit donc `x--2` ou `+-3`, normalisés ici.
 *
 * Une erreur ne fait pas disparaître le bloc : le nœud est rendu avec ses
 * messages situés (n° de ligne) et sans figure (décision Q48).
 *
 * @module ubumark/parser/courbe-parser
 */

import { bodyOpensParagraph } from './block-closure';
import { unnestedLine } from './nested-line';
import type {
	CourbeArea,
	CourbeAsymptote,
	CourbeAxisTitles,
	CourbeBlockRange,
	CourbeColor,
	CourbeDomain,
	CourbeFunction,
	CourbeGrid,
	CourbeSequence,
	CourbeSequenceTerm,
	CourbeIssue,
	CourbeLabel,
	CourbeNode,
	CourbePoint,
	CourbeSize,
	CourbeSpec,
	CourbeTangent,
	CourbeTarget,
	CourbeWindow
} from '../types/courbe';
import { COURBE_LIMITS, COURBE_SIZES, courbeRangeProblem } from '../types/courbe';
import { resolveNamedColor } from '$lib/theme/named-colors';
import type { MathNode } from '$lib/mathAST/types';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { compile } from '$lib/mathAST/eval/compile';
import { transformAST } from '$lib/mathAST/visitor';
import { variable } from '$lib/mathAST/factory';
import { differentiate } from '$lib/mathAST/differentiation';
import { computeSequenceTerms, PREV_TERM_VARIABLE } from '$lib/grapheur/sequence';
import { isGridNode, isInWindow, courbeGridSteps } from '../utils/courbe-placer';

// ============================================================================
// CONSTANTES
// ============================================================================

const COURBE_BLOCK_START_REGEX = /^```courbe\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `f(x) = …` — nom de fonction, variable, reste de la ligne */
const FUNCTION_LINE_REGEX =
	/^([A-Za-z][A-Za-z0-9]*)\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*\)\s*=\s*(.*)$/;

/**
 * `v(0) = …` ou `v(n+1) = …` : terme d'une suite, argument qui n'est pas un
 * simple nom (sinon c'est `FUNCTION_LINE_REGEX`).
 */
const SEQUENCE_TERM_LINE_REGEX = /^([A-Za-z][A-Za-z0-9]*)\s*\(\s*([^()]+?)\s*\)\s*=\s*(.*)$/;

/** Relation de récurrence, après le « ; » : `v(n+1) = …` */
const RECURRENCE_REGEX = /^([A-Za-z][A-Za-z0-9]*)\s*\(\s*n\s*\+\s*1\s*\)\s*=\s*(.*)$/;

/** Rangs dessinés, en fin de ligne : `pour n de 0 à 8` (`a` accepté pour `à`) */
const RANKS_REGEX = /\s+pour\s+n\s+de\s+(.+?)\s+(?:à|a)\s+(.+)$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** Nom de courbe accepté : `C_f`, `C_{f}`, `\mathcal{C}_f`, `\mathcal{C}_{g}`, `C` */
const LABEL_REGEX =
	/^(?:\\mathcal\{([A-Za-z])\}|([A-Za-z]))(?:_(?:\{([A-Za-z0-9']{1,3})\}|([A-Za-z0-9])))?$/;

/** Nom de point : une lettre, éventuellement suivie de chiffres ou de primes */
const POINT_NAME_REGEX = /^[A-Za-z][A-Za-z0-9']*$/;

const KNOWN_KEYS = [
	'x',
	'y',
	'grille',
	'points',
	'asymptotes',
	'aire',
	'tangente',
	'taille',
	'description',
	'placer',
	'axes',
	'case'
] as const;

/** `A=(2 ; 3)`, ou `(2 ; 3)` pour un point seul : nom éventuel, coordonnées */
const TARGET_REGEX = /^(?:([^=\s()]+)\s*=\s*)?\((.*)\)$/;

/** `x = Durée (min)` : axe, titre */
const AXIS_TITLE_REGEX = /^([^=\s]+)\s*=\s*(.*)$/;

const DASHED_WORDS = new Set(['pointillé', 'pointille', 'pointillés', 'pointilles']);

/** Option d'une suite récurrente : escalier dans le repère (u_n ; u_{n+1}) */
const STAIRCASE_WORD = 'escalier';

/** Option de l'escalier : rappels et étiquettes u_0, u_1… sur l'axe des abscisses */
const TERMS_WORD = 'termes';

// ============================================================================
// DÉTECTION
// ============================================================================

export function isCourbeBlockStart(line: string): boolean {
	return COURBE_BLOCK_START_REGEX.test(line);
}

/** Blocs ```courbe d'une liste de lignes (indices inclusifs, clôtures comprises). */
/** Ligne qui a la forme d'une ligne de bloc courbe (clé connue ou `f(x) = …`) */
function looksLikeCourbeLine(line: string): boolean {
	const trimmed = line.trim();
	if (FUNCTION_LINE_REGEX.test(trimmed) || SEQUENCE_TERM_LINE_REGEX.test(trimmed)) return true;
	const kv = KEY_LINE_REGEX.exec(trimmed);
	return kv !== null && (KNOWN_KEYS as readonly string[]).includes(kv[1].toLowerCase());
}

/**
 * Blocs ```courbe d'une liste de lignes (indices inclusifs, clôtures comprises).
 *
 * Bloc NON FERMÉ (fin du document, ou autre clôture d'ouverture ```python
 * avant toute clôture nue) : il s'arrête à sa dernière ligne qui a la forme
 * d'une ligne de courbe, pour ne pas avaler la suite du document.
 */
export function findCourbeBlocks(lines: string[]): CourbeBlockRange[] {
	const blocks: CourbeBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isCourbeBlockStart(lines[i])) {
			const startIndex = i;
			let j = i + 1;
			while (j < lines.length && !BLOCK_END_REGEX.test(lines[j]) && !lines[j].startsWith('```'))
				j++;
			// ⚠️ Un ``` plus loin ne ferme le bloc que si TOUT ce qui les sépare a
			// la forme d'une ligne de courbe : sinon il avalait le texte, et ouvrait
			// un bloc de code jamais refermé (Q25, revue du lot 2).
			const body = lines.slice(startIndex + 1, j);
			const closes = !bodyOpensParagraph(body, looksLikeCourbeLine);
			if (j < lines.length && BLOCK_END_REGEX.test(lines[j]) && closes) {
				blocks.push({ startIndex, endIndex: j, closed: true });
				i = j + 1;
				continue;
			}
			let end = startIndex;
			for (let k = startIndex + 1; k < j; k++) {
				if (lines[k].trim() === '') continue;
				if (!looksLikeCourbeLine(lines[k])) break;
				end = k;
			}
			blocks.push({ startIndex, endIndex: end, closed: false });
			i = end + 1;
			continue;
		}
		i++;
	}
	return blocks;
}

/** Ligne `placer:` d'un bloc */
const PLACER_LINE_REGEX = /^\s*placer\s*:/i;

/**
 * Les repères à points à placer (`placer:`) d'un énoncé, délimités comme le
 * parseur : corps sans clôtures, fermeture, et `nested` pour un bloc en
 * retrait, cité ou ouvert sur la ligne d'un item (l'élève ne pourrait pas y
 * répondre : sa case n'est pas créée)
 */
export function findCourbesToPlace(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	return findCourbeBlocks(plain)
		.map((block) => {
			const closed = block.closed !== false;
			const body = plain.slice(block.startIndex + 1, closed ? block.endIndex : block.endIndex + 1);
			return {
				startIndex: block.startIndex,
				body,
				closed,
				nested: lines[block.startIndex] !== plain[block.startIndex]
			};
		})
		.filter((block) => block.body.some((line) => PLACER_LINE_REGEX.test(line)));
}

/** L'énoncé a-t-il un repère à points à placer ? */
export function hasCourbeToPlace(markdown: string): boolean {
	return findCourbesToPlace(markdown).length > 0;
}

// ============================================================================
// EXPRESSIONS
// ============================================================================

/** Erreur située, levée pendant l'analyse d'une ligne puis convertie en `CourbeIssue`. */
class LineError extends Error {}

/**
 * Normaliser ce que la substitution des variables de template laisse derrière
 * elle : `x--2` → `x+2`, `+-3` → `-3`, décimal `0{,}5` → `0.5`, `π` → `\pi`.
 */
export function normalizeCourbeExpression(raw: string): string {
	let s = raw.trim().replace(/\{,\}/g, '.').replace(/π/g, '\\pi');
	s = s.replace(/(?<![\\A-Za-z])pi(?![A-Za-z])/g, '\\pi');
	let previous = '';
	while (previous !== s) {
		previous = s;
		s = s
			.replace(/-\s*-/g, '+')
			.replace(/\+\s*-/g, '-')
			.replace(/-\s*\+/g, '-')
			.replace(/\+\s*\+/g, '+');
	}
	// Un `+` laissé en tête (`+3` après `--3` en début d'expression) est superflu
	return s.replace(/^\+\s*/, '').replace(/([(=;,]\s*)\+/g, '$1');
}

/** Noms des variables libres d'un AST (parcours générique de l'arbre). */
function collectVariables(node: unknown, found: Set<string>): Set<string> {
	if (Array.isArray(node)) {
		for (const child of node) collectVariables(child, found);
		return found;
	}
	if (node === null || typeof node !== 'object') return found;
	const record = node as Record<string, unknown>;
	if (record.type === 'variable' && typeof record.name === 'string') {
		found.add(record.name);
		return found;
	}
	for (const value of Object.values(record)) collectVariables(value, found);
	return found;
}

function parseExpression(expression: string): MathNode {
	try {
		return parseCustom(expression);
	} catch (error) {
		const detail = error instanceof Error ? ` (${error.message})` : '';
		throw new LineError(`expression illisible « ${expression} »${detail}`);
	}
}

type FunctionTable = Map<string, { evaluate: (x: number) => number; domain: CourbeDomain | null }>;

/** x appartient-il au domaine (bornes ouvertes exclues) ? */
function inDomain(x: number, domain: CourbeDomain | null): boolean {
	if (domain === null) return true;
	const aboveMin = domain.minOpen ? x > domain.min : x >= domain.min;
	const belowMax = domain.maxOpen ? x < domain.max : x <= domain.max;
	return aboveMin && belowMax;
}

function formatDomain(d: CourbeDomain): string {
	return `${d.minOpen ? ']' : '['}${formatPlain(d.min)} ; ${formatPlain(d.max)}${d.maxOpen ? '[' : ']'}`;
}

/**
 * Remplacer chaque appel `f(…)` d'une fonction déclarée par sa valeur
 * numérique : `M(2 ; f(2))` place M sur la courbe (Q54).
 */
function substituteCalls(expression: string, functions: FunctionTable): string {
	let result = '';
	let i = 0;
	while (i < expression.length) {
		const match = /^[A-Za-z][A-Za-z0-9]*/.exec(expression.slice(i));
		const preceded = i > 0 && /[\\A-Za-z0-9]/.test(expression[i - 1]);
		if (match && !preceded && expression[i + match[0].length] === '(') {
			const name = match[0];
			const open = i + name.length;
			const close = matchingParen(expression, open);
			const fn = functions.get(name);
			if (fn && close !== -1) {
				const argument = evaluateConstant(expression.slice(open + 1, close), functions);
				if (!inDomain(argument, fn.domain) && fn.domain !== null) {
					throw new LineError(
						`${name}(${formatPlain(argument)}) : ${formatPlain(argument)} n'est pas dans le domaine ${formatDomain(fn.domain)} de ${name}`
					);
				}
				const value = fn.evaluate(argument);
				if (!Number.isFinite(value)) {
					throw new LineError(`${name}(${formatPlain(argument)}) n'est pas défini`);
				}
				result += `(${value})`;
				i = close + 1;
				continue;
			}
		}
		result += expression[i];
		i++;
	}
	return result;
}

function matchingParen(text: string, open: number): number {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		if (text[i] === '(') depth++;
		else if (text[i] === ')') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/** Valeur numérique d'une expression sans variable (`3/2`, `\pi`, `f(2)+1`). */
function evaluateConstant(raw: string, functions: FunctionTable = new Map()): number {
	const normalized = normalizeCourbeExpression(raw);
	if (normalized === '') throw new LineError('valeur manquante');
	const substituted = substituteCalls(normalized, functions);
	const ast = parseExpression(substituted);
	const free = [...collectVariables(ast, new Set())];
	if (free.length > 0) {
		const call = /^([A-Za-z][A-Za-z0-9]*)\(/.exec(normalized);
		if (call && !functions.has(call[1])) {
			throw new LineError(`fonction inconnue « ${call[1]} »`);
		}
		throw new LineError(`« ${raw.trim()} » n'est pas un nombre (variable ${free.join(', ')})`);
	}
	let value: number;
	try {
		value = compile(ast)({});
	} catch {
		throw new LineError(`« ${raw.trim()} » ne se calcule pas`);
	}
	if (!Number.isFinite(value)) throw new LineError(`« ${raw.trim()} » n'est pas un nombre fini`);
	return value;
}

function formatPlain(value: number): string {
	return String(Number(value.toPrecision(12)));
}

/** Séparer sur un séparateur hors parenthèses et crochets. */
function splitTopLevel(text: string, separator: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of text) {
		if (char === '(' || char === '[' || char === '{') depth++;
		if (char === ')' || char === ']' || char === '}') depth--;
		if (char === separator && depth === 0) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	parts.push(current);
	return parts.map((p) => p.trim());
}

function parsePair(value: string, what: string): [number, number] {
	const parts = splitTopLevel(value, ';');
	if (parts.length !== 2 || parts.some((p) => p === '')) {
		throw new LineError(`${what} attend deux valeurs séparées par « ; » (ex. -4 ; 6)`);
	}
	return [evaluateConstant(parts[0]), evaluateConstant(parts[1])];
}

/** Virgule décimale (`1,5`) lue comme un point (`1.5`) : `grille:` et `placer:` */
function decimalPoint(raw: string): string {
	return raw.replace(/(\d),(\d)/g, '$1.$2');
}

// ============================================================================
// LIGNES
// ============================================================================

function parseLabel(raw: string): CourbeLabel {
	const match = LABEL_REGEX.exec(raw);
	if (!match) {
		throw new LineError(
			`nom de courbe « ${raw} » non pris en charge (écrire par exemple C_f ou \\mathcal{C}_f)`
		);
	}
	return {
		latex: raw,
		base: match[1] ?? match[2],
		sub: match[3] ?? match[4] ?? null,
		calligraphic: match[1] !== undefined
	};
}

function parseDomain(raw: string): CourbeDomain {
	const match = /^([[\]])\s*(.+?)\s*;\s*(.+?)\s*([[\]])$/.exec(raw.trim());
	if (!match) {
		throw new LineError(`intervalle « ${raw.trim()} » mal écrit (ex. [0 ; 6] ou ]0 ; 6])`);
	}
	const min = evaluateConstant(match[2]);
	const max = evaluateConstant(match[3]);
	if (!(min < max))
		throw new LineError(
			`intervalle « ${raw.trim()} » vide : la borne de gauche doit être la plus petite`
		);
	return { min, max, minOpen: match[1] === ']', maxOpen: match[4] === '[' };
}

function isOption(token: string): boolean {
	return (
		resolveNamedColor(token) !== null ||
		DASHED_WORDS.has(token.toLowerCase()) ||
		token.toLowerCase() === STAIRCASE_WORD ||
		token.toLowerCase() === TERMS_WORD ||
		token.startsWith('nom=')
	);
}

interface LineOptions {
	body: string;
	color: CourbeColor;
	dashed: boolean;
	label: CourbeLabel | null;
	staircase: boolean;
	terms: boolean;
}

/** Les options sont les derniers mots de la ligne : on les retire par la droite. */
function splitOptions(rest: string): LineOptions {
	const tokens = rest.trim().split(/\s+/);
	let color: CourbeColor = 'bleu';
	let dashed = false;
	let label: CourbeLabel | null = null;
	let staircase = false;
	let terms = false;
	while (tokens.length > 1 && isOption(tokens[tokens.length - 1])) {
		const token = tokens.pop() as string;
		const lower = token.toLowerCase();
		if (token.startsWith('nom=')) label = parseLabel(token.slice(4));
		else if (DASHED_WORDS.has(lower)) dashed = true;
		else if (lower === STAIRCASE_WORD) staircase = true;
		else if (lower === TERMS_WORD) terms = true;
		else color = resolveNamedColor(lower) ?? color;
	}
	return { body: tokens.join(' '), color, dashed, label, staircase, terms };
}

function parseFunctionLine(
	name: string,
	variable: string,
	rest: string,
	line: number
): CourbeFunction {
	if (variable !== 'x') {
		throw new LineError(`la fonction ${name} doit être écrite en x, pas en ${variable}`);
	}
	if (name === 'x' || name === 'y')
		throw new LineError(`« ${name} » ne peut pas nommer une fonction`);

	const { body: withDomain, color, dashed, label, staircase, terms } = splitOptions(rest);
	if (staircase || terms) {
		throw new LineError(
			`« ${staircase ? STAIRCASE_WORD : TERMS_WORD} » s'emploie avec une suite récurrente, pas avec la fonction ${name}`
		);
	}
	let body = withDomain;
	let domain: CourbeDomain | null = null;
	const sur = /\s+sur\s+([[\]].*)$/.exec(body);
	if (sur) {
		domain = parseDomain(sur[1]);
		body = body.slice(0, sur.index);
	}

	const expression = normalizeCourbeExpression(body);
	if (expression === '') throw new LineError(`expression de ${name} manquante`);
	const ast = parseExpression(expression);
	const others = [...collectVariables(ast, new Set())].filter((v) => v !== 'x');
	if (others.length > 0) {
		throw new LineError(
			`la fonction ${name} doit être écrite en x seulement (« ${others.join(', ')} » inconnu)`
		);
	}
	try {
		compile(ast);
	} catch (error) {
		const detail = error instanceof Error ? ` (${error.message})` : '';
		throw new LineError(`expression de ${name} illisible${detail}`);
	}
	return { name, expression, ast, domain, color, dashed, label, line };
}

function parsePoints(value: string, functions: FunctionTable, line: number): CourbePoint[] {
	const points: CourbePoint[] = [];
	const items = splitTopLevel(value, ',');
	if (items.length > COURBE_LIMITS.points) {
		throw new LineError(`au plus ${COURBE_LIMITS.points} points par figure`);
	}
	for (const item of items) {
		if (item === '') continue;
		const open = item.indexOf('(');
		const name = open === -1 ? item : item.slice(0, open).trim();
		if (open === -1 || !item.endsWith(')') || !POINT_NAME_REGEX.test(name)) {
			throw new LineError(`point « ${item} » mal écrit (ex. A(1 ; 2))`);
		}
		const coords = splitTopLevel(item.slice(open + 1, -1), ';');
		if (coords.length !== 2) {
			throw new LineError(`point ${name} : deux coordonnées séparées par « ; » attendues`);
		}
		points.push({
			name,
			x: evaluateConstant(coords[0], functions),
			y: evaluateConstant(coords[1], functions),
			line
		});
	}
	return points;
}

function parseAsymptotes(value: string, line: number): CourbeAsymptote[] {
	return splitTopLevel(value, ';')
		.filter((p) => p !== '')
		.map((part) => {
			const match = /^([xy])\s*=\s*(.+)$/.exec(part);
			if (!match) throw new LineError(`asymptote « ${part} » mal écrite (ex. x=2 ou y=1)`);
			return {
				kind: match[1] === 'x' ? ('vertical' as const) : ('horizontal' as const),
				value: evaluateConstant(match[2]),
				line
			};
		});
}

function parseArea(value: string, functionNames: Set<string>, line: number): CourbeArea {
	const parts = splitTopLevel(value, ';');
	if (parts.length !== 3) throw new LineError('aire attend « fonction ; a ; b » (ex. f ; 0 ; 2)');
	const [functionName, a, b] = parts;
	if (!functionNames.has(functionName)) {
		throw new LineError(`aire : fonction « ${functionName} » inconnue`);
	}
	const from = evaluateConstant(a);
	const to = evaluateConstant(b);
	if (!(from < to)) throw new LineError(`aire : la borne a (${a}) doit être inférieure à b (${b})`);
	return { functionName, from, to, line };
}

/**
 * `tangente: f ; 1` : point de contact et pente. Dérivée exacte (mathAST), sinon
 * différence centrée ; une valeur non finie (f non définie, non dérivable) est une
 * erreur située, pas une droite fausse.
 */
function parseTangent(
	value: string,
	functions: CourbeFunction[],
	table: FunctionTable,
	line: number
): CourbeTangent {
	const parts = splitTopLevel(value, ';');
	if (parts.length !== 2 || parts.some((p) => p === '')) {
		throw new LineError('tangente attend « fonction ; abscisse » (ex. f ; 1)');
	}
	const [functionName, abscissa] = parts;
	const fn = functions.find((f) => f.name === functionName);
	const entry = table.get(functionName);
	if (!fn || !entry) throw new LineError(`tangente : fonction « ${functionName} » inconnue`);
	const x = evaluateConstant(abscissa, table);
	if (!inDomain(x, entry.domain)) {
		throw new LineError(
			`tangente : ${formatPlain(x)} n'est pas dans le domaine ${formatDomain(entry.domain!)} de ${functionName}`
		);
	}
	const y = entry.evaluate(x);
	if (!Number.isFinite(y)) {
		throw new LineError(`tangente : ${functionName}(${formatPlain(x)}) n'est pas défini`);
	}
	let slope = Number.NaN;
	try {
		slope = compile(differentiate(fn.ast))({ x });
	} catch {
		// Dérivée symbolique indisponible : différence centrée ci-dessous
	}
	if (!Number.isFinite(slope)) {
		const h = 1e-6 * Math.max(1, Math.abs(x));
		const left = entry.evaluate(x - h);
		const right = entry.evaluate(x + h);
		slope = (right - left) / (2 * h);
		const oneSided = [(right - y) / h, (y - left) / h];
		const agree = oneSided.every((s) => Math.abs(s - slope) <= 1e-3 * Math.max(1, Math.abs(slope)));
		if (!Number.isFinite(slope) || !agree) {
			throw new LineError(`tangente : ${functionName} n'est pas dérivable en ${formatPlain(x)}`);
		}
	}
	return { functionName, x, y, slope, line };
}

// ============================================================================
// SUITES
// ============================================================================

/** Rang : entier, représentable exactement (au-delà de 2^53, `n++` n'avance plus). */
function parseRank(raw: string, what: string): number {
	const value = evaluateConstant(raw);
	if (!Number.isSafeInteger(value)) {
		throw new LineError(`${what} « ${raw.trim()} » doit être un entier`);
	}
	return value;
}

/** `pour n de 0 à 8` retiré de la fin du corps ; rangs vérifiés. */
function splitRanks(body: string, name: string): { body: string; from: number; to: number } {
	const match = RANKS_REGEX.exec(body);
	if (!match) {
		throw new LineError(
			`suite ${name} : préciser les rangs à la fin, par exemple « pour n de 0 à 8 »`
		);
	}
	const from = parseRank(match[1], 'le premier rang');
	const to = parseRank(match[2], 'le dernier rang');
	if (from > to) {
		throw new LineError(
			`suite ${name} : le premier rang (${from}) doit être inférieur ou égal au dernier (${to})`
		);
	}
	return { body: body.slice(0, match.index), from, to };
}

/**
 * Lire l'expression d'une suite : en n, et pour une récurrence en `v(n)`,
 * réécrit en variable (`computeSequenceTerms` du grapheur).
 *
 * `parseCustom` ne lit `x(n)` comme un appel que pour f, g, h, u, v, w (`t(n)`
 * y devient `t*n`) : `v(n)` est donc réécrit en `(v_n)` AVANT l'analyse, puis
 * l'indice `v_n` en variable. Les parenthèses gardent `v(n)^v(n)` correct.
 */
function parseSequenceExpression(raw: string, name: string, recurrence: boolean): MathNode {
	const expression = normalizeCourbeExpression(raw);
	if (expression === '') throw new LineError(`expression de ${name} manquante`);
	const call = (args: string) => new RegExp(`(?<![A-Za-z0-9_\\\\])${name}\\s*\\(${args}`, 'g');
	const rewritten = recurrence
		? expression.replace(call('\\s*n\\s*\\)'), `(${name}_n)`)
		: expression;
	if (call('').test(rewritten)) {
		throw new LineError(
			recurrence
				? `dans la relation, seul ${name}(n) est accepté (récurrence d'ordre 1)`
				: `une suite explicite ${name}(n) ne peut pas utiliser ses propres termes : écrire ${name}(0) = … ; ${name}(n+1) = …`
		);
	}
	const parsed = parseExpression(rewritten);
	const ast = transformAST(parsed, {
		enterSubscript: (node) => {
			const isPrevious =
				recurrence &&
				node.base.type === 'variable' &&
				node.base.name === name &&
				node.subscript.type === 'variable' &&
				node.subscript.name === 'n';
			if (isPrevious) return variable(PREV_TERM_VARIABLE);
			throw new LineError(`indice non accepté dans l'expression de ${name}`);
		}
	});
	const unknown = [...collectVariables(ast, new Set())].filter(
		(v) => v !== 'n' && v !== PREV_TERM_VARIABLE
	);
	if (unknown.length > 0) {
		throw new LineError(
			`la suite ${name} doit être écrite en n${recurrence ? ` et ${name}(n)` : ''} seulement (« ${unknown.join(', ')} » inconnu)`
		);
	}
	try {
		compile(ast);
	} catch (error) {
		const detail = error instanceof Error ? ` (${error.message})` : '';
		throw new LineError(`expression de ${name} illisible${detail}`);
	}
	return ast;
}

/** Rangs cités dans un avertissement : les trois premiers, puis « … » */
function formatRanks(ranks: number[]): string {
	const shown = ranks.slice(0, 3).join(', ');
	return ranks.length > 3 ? `${shown}…` : shown;
}

interface ParsedSequence {
	sequence: CourbeSequence;
	/** Termes calculés, imputés au budget de la figure */
	computed: number;
	warnings: string[];
}

/**
 * Ligne de suite : `u(n) = 2*n+1 pour n de 0 à 8` (explicite, `arg` = n) ou
 * `v(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 9` (récurrente).
 *
 * Budget : au plus `sequenceTerms` termes calculés, `budgetLeft` pour la
 * figure ; un terme non fini ou démesuré ARRÊTE la récurrence.
 */
function parseSequenceLine(
	name: string,
	arg: string,
	rest: string,
	line: number,
	budgetLeft: number
): ParsedSequence {
	if (!/^[a-zA-Z]$/.test(name)) {
		throw new LineError(`nom de suite « ${name} » : une seule lettre (u, v, w…)`);
	}
	if (name === 'x' || name === 'y' || name === 'n') {
		throw new LineError(`« ${name} » ne peut pas nommer une suite`);
	}
	const options = splitOptions(rest);
	if (options.dashed) throw new LineError(`suite ${name} : pas de pointillé pour une suite`);
	const head = arg.replace(/\s+/g, '');
	const recurrence = head !== 'n';
	if (options.terms && !options.staircase) {
		throw new LineError(`suite ${name} : « ${TERMS_WORD} » s'emploie avec « ${STAIRCASE_WORD} »`);
	}
	if (options.staircase && !recurrence) {
		throw new LineError(
			`suite ${name} : l'escalier demande une suite récurrente (${name}(0) = … ; ${name}(n+1) = …)`
		);
	}

	let firstTerm: CourbeSequenceTerm | null = null;
	let ranksBody: string;
	if (!recurrence) {
		ranksBody = options.body;
	} else {
		if (head === 'n+1') {
			throw new LineError(
				`récurrence sans premier terme : écrire ${name}(0) = … ; ${name}(n+1) = …`
			);
		}
		const parts = splitTopLevel(options.body, ';');
		if (parts.length < 2) {
			throw new LineError(
				`premier terme ${name}(${arg}) sans relation de récurrence : ajouter « ; ${name}(n+1) = … »`
			);
		}
		if (parts.length > 2) throw new LineError(`suite ${name} : un seul « ; » attendu`);
		const relation = RECURRENCE_REGEX.exec(parts[1]);
		if (!relation) {
			throw new LineError(`relation de récurrence mal écrite : attendu « ${name}(n+1) = … »`);
		}
		if (relation[1] !== name) {
			throw new LineError(
				`le premier terme est celui de ${name}, la relation porte sur ${relation[1]} : même nom attendu`
			);
		}
		firstTerm = {
			n: parseRank(arg, 'le rang du premier terme'),
			value: evaluateConstant(parts[0])
		};
		ranksBody = relation[2];
	}

	const ranks = splitRanks(ranksBody, name);
	const expressionText = ranks.body;
	const start = firstTerm ? firstTerm.n : ranks.from;
	if (firstTerm && firstTerm.n > ranks.from) {
		throw new LineError(
			`le premier terme ${name}(${firstTerm.n}) vient après le premier rang dessiné (${ranks.from})`
		);
	}
	const count = ranks.to - start + 1;
	if (count > COURBE_LIMITS.sequenceTerms) {
		throw new LineError(
			`suite ${name} : au plus ${COURBE_LIMITS.sequenceTerms} termes calculés (ici ${count})`
		);
	}
	if (count > budgetLeft) {
		throw new LineError(`au plus ${COURBE_LIMITS.totalSequenceTerms} termes de suites par figure`);
	}

	const ast = parseSequenceExpression(expressionText, name, recurrence);
	if (options.staircase && collectVariables(ast, new Set()).has('n')) {
		throw new LineError(
			`suite ${name} : l'escalier demande une relation ${name}(n+1) = f(${name}(n)) sans n`
		);
	}
	const computedTerms = computeSequenceTerms(
		{
			mode: recurrence ? 'recurrence' : 'explicit',
			ast,
			firstIndex: start,
			firstTerm: firstTerm?.value ?? null
		},
		ranks.to
	);

	const warnings: string[] = [];
	let terms = computedTerms;
	if (recurrence) {
		const huge = terms.findIndex((t) => Math.abs(t.value) > COURBE_LIMITS.sequenceValue);
		if (huge !== -1) {
			warnings.push(
				`${name}(${terms[huge].n}) dépasse 10^12 en valeur absolue : calcul arrêté au rang ${terms[huge].n - 1}`
			);
			terms = terms.slice(0, huge);
		} else if (terms.length < count) {
			const next = start + terms.length;
			warnings.push(`${name}(${next}) n'est pas défini : calcul arrêté au rang ${next - 1}`);
		}
	} else if (terms.length < count) {
		const present = new Set(terms.map((t) => t.n));
		const missing: number[] = [];
		for (let n = start; n <= ranks.to; n++) if (!present.has(n)) missing.push(n);
		warnings.push(
			`${name} n'est pas définie au${missing.length > 1 ? 'x' : ''} rang${missing.length > 1 ? 's' : ''} ${formatRanks(missing)}`
		);
	}

	return {
		sequence: {
			name,
			kind: recurrence ? 'recurrence' : 'explicite',
			expression: normalizeCourbeExpression(expressionText),
			firstIndex: ranks.from,
			lastIndex: ranks.to,
			firstTerm,
			terms: terms.filter((t) => t.n >= ranks.from),
			staircase: options.staircase ? { showTerms: options.terms, relation: ast } : null,
			color: options.color,
			label: options.label,
			line
		},
		computed: count,
		warnings
	};
}

// ============================================================================
// POINTS À PLACER, TITRES D'AXES
// ============================================================================

/**
 * Les points de `placer:` (`A=(2 ; 3) ; B=(-1 ; 2)`, ou `(2 ; 3)` pour un point
 * seul) : noms, coordonnées. Le nœud et la fenêtre se vérifient une fois la
 * figure lue (`targetProblem`).
 */
function parseTargets(value: string, functions: FunctionTable, line: number): CourbeTarget[] {
	if (value === '') throw new LineError('placer: attend au moins un point (ex. A=(2 ; 3))');
	const parts = splitTopLevel(value, ';');
	if (parts.some((part) => part === '')) {
		throw new LineError(`placer : ${value} — point vide (un « ; » en trop ?)`);
	}
	if (parts.length > COURBE_LIMITS.targets) {
		throw new LineError(`placer : ${COURBE_LIMITS.targets} points au plus dans un repère`);
	}
	const targets: CourbeTarget[] = [];
	for (const part of parts) {
		const match = TARGET_REGEX.exec(part);
		if (!match) throw new LineError(`placer : « ${part} » mal écrit (ex. A=(2 ; 3))`);
		const name = match[1] ?? '';
		if (match[1] !== undefined && !/^[A-Z]$/.test(name)) {
			throw new LineError(`placer : nom « ${name} » — une lettre majuscule (A, B, C…)`);
		}
		if (name === '' && parts.length > 1) {
			throw new LineError(`placer : ${part} — chaque point porte un nom (A=(2 ; 3) ; B=(-1 ; 2))`);
		}
		if (name !== '' && targets.some((t) => t.name === name)) {
			throw new LineError(`placer : le point ${name} est nommé deux fois`);
		}
		const coords = splitTopLevel(decimalPoint(match[2]), ';');
		if (coords.length !== 2 || coords.some((c) => c === '')) {
			throw new LineError(
				`placer : ${name || 'le point'} — deux coordonnées séparées par « ; » attendues`
			);
		}
		const coordinate = (raw: string): number => {
			try {
				return evaluateConstant(raw, functions);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new LineError(`placer : ${name || 'le point'} — ${message}`);
			}
		};
		targets.push({ name, x: coordinate(coords[0]), y: coordinate(coords[1]), line });
	}
	return targets;
}

/** Ce qui empêche l'élève de placer ce point : nom pris, hors de la fenêtre, hors d'un nœud */
function targetProblem(
	target: CourbeTarget,
	points: CourbePoint[],
	spec: Pick<CourbeSpec, 'window' | 'grid' | 'size'>
): string | null {
	const french = (value: number) => formatPlain(value).replace('.', ',');
	const label = target.name === '' ? 'le point' : target.name;
	const shown = `${label} (${french(target.x)} ; ${french(target.y)})`;
	if (target.name !== '' && points.some((p) => p.name === target.name)) {
		return `${target.name} est déjà un point donné (points:) ; choisis un autre nom`;
	}
	const w = spec.window;
	if (!isInWindow(spec, target.x, target.y)) {
		return `${shown} est hors de la fenêtre (x de ${french(w.xMin)} à ${french(w.xMax)}, y de ${french(w.yMin)} à ${french(w.yMax)})`;
	}
	if (!isGridNode(spec, target.x, target.y)) {
		const steps = courbeGridSteps(spec);
		return `${label} n'est pas sur un nœud de la grille : (${french(target.x)} ; ${french(target.y)}) avec un pas de ${french(steps.x)} en x et ${french(steps.y)} en y (régler grille:)`;
	}
	return null;
}

/** `axes: x = Durée (min) ; y = Température (°C)` : un titre par axe, un ou deux axes */
function parseAxisTitles(value: string): CourbeAxisTitles {
	const example = 'ex. axes: x = Durée (min) ; y = Température (°C)';
	const titles: CourbeAxisTitles = { x: null, y: null };
	const parts = splitTopLevel(value, ';');
	if (value === '' || parts.length > 2) throw new LineError(`axes : un titre par axe (${example})`);
	for (const part of parts) {
		const match = AXIS_TITLE_REGEX.exec(part);
		const axis = match?.[1].toLowerCase();
		if (!match || (axis !== 'x' && axis !== 'y')) {
			throw new LineError(`axes : « ${part} » mal écrit (${example})`);
		}
		const title = match[2].trim();
		if (title === '') throw new LineError(`axes : titre de l'axe ${axis} vide`);
		if (title.length > COURBE_LIMITS.axisTitle) {
			throw new LineError(
				`axes : titre de l'axe ${axis} trop long (${COURBE_LIMITS.axisTitle} caractères au plus)`
			);
		}
		if (titles[axis] !== null) throw new LineError(`axes : axe ${axis} nommé deux fois`);
		titles[axis] = title;
	}
	return titles;
}

// ============================================================================
// BLOC
// ============================================================================

/**
 * Analyser le contenu d'un bloc (sans les clôtures).
 *
 * Toujours un nœud : sans erreur, `spec` décrit la figure ; sinon `spec` est
 * null et `errors` dit pourquoi, ligne à l'appui.
 */
export function parseCourbeContent(source: string): CourbeNode {
	const errors: CourbeIssue[] = [];
	const warnings: CourbeIssue[] = [];
	const lines = source.split('\n');

	let window: Partial<CourbeWindow> = {};
	let windowLines: { x?: number; y?: number } = {};
	let grid: CourbeGrid | null = null;
	let size: CourbeSize = 'moyenne';
	let description: string | null = null;
	const functions: CourbeFunction[] = [];
	const functionTable: FunctionTable = new Map();
	const sequences: CourbeSequence[] = [];
	let sequenceTermsLeft: number = COURBE_LIMITS.totalSequenceTerms;
	const deferred: {
		key: 'points' | 'aire' | 'asymptotes' | 'tangente' | 'placer';
		value: string;
		line: number;
		content: string;
	}[] = [];
	const seenKeys = new Set<string>();
	let axisTitles: CourbeAxisTitles | undefined;
	let caseIndex: number | undefined;
	let caseLine = 0;

	const fail = (line: number, content: string, error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		errors.push({ message: `Ligne ${line} : ${message}`, line, content });
	};

	lines.forEach((rawLine, index) => {
		const line = index + 1;
		const content = rawLine.trim();
		if (content === '') return;
		try {
			const fn = FUNCTION_LINE_REGEX.exec(content);
			const term = fn ? null : SEQUENCE_TERM_LINE_REGEX.exec(content);
			if ((fn && fn[2] === 'n') || term) {
				const [, name, arg, rest] = (fn ?? term) as RegExpExecArray;
				const taken = functionTable.has(name) || sequences.some((s) => s.name === name);
				if (taken) throw new LineError(`nom ${name} déjà utilisé`);
				if (sequences.length >= COURBE_LIMITS.sequences) {
					throw new LineError(`au plus ${COURBE_LIMITS.sequences} suites par figure`);
				}
				const parsed = parseSequenceLine(name, arg, rest, line, sequenceTermsLeft);
				sequences.push(parsed.sequence);
				sequenceTermsLeft -= parsed.computed;
				for (const message of parsed.warnings) {
					warnings.push({ message: `Ligne ${line} : ${message}`, line, content });
				}
				return;
			}
			if (fn) {
				const [, name, variable, rest] = fn;
				const taken = functionTable.has(name) || sequences.some((s) => s.name === name);
				if (taken) throw new LineError(`nom ${name} déjà utilisé`);
				if (functions.length >= COURBE_LIMITS.functions) {
					throw new LineError(`au plus ${COURBE_LIMITS.functions} fonctions par figure`);
				}
				const parsed = parseFunctionLine(name, variable, rest, line);
				functions.push(parsed);
				const compiled = compile(parsed.ast);
				functionTable.set(name, {
					evaluate: (x: number) => compiled({ x }),
					domain: parsed.domain
				});
				return;
			}

			const kv = KEY_LINE_REGEX.exec(content);
			if (!kv) throw new LineError(`ligne incomprise « ${content} »`);
			const key = kv[1].toLowerCase();
			const value = kv[2].trim();
			if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
				throw new LineError(
					`clé inconnue « ${kv[1]} » (clés possibles : ${KNOWN_KEYS.join(', ')}, ou f(x) = …)`
				);
			}
			if (key !== 'aire' && key !== 'tangente' && seenKeys.has(key)) {
				throw new LineError(`clé « ${key} » répétée`);
			}
			seenKeys.add(key);

			switch (key) {
				case 'x': {
					const [min, max] = parsePair(value, 'x');
					if (!(min < max))
						throw new LineError(
							`x : la borne de gauche (${formatPlain(min)}) doit être inférieure à celle de droite (${formatPlain(max)})`
						);
					const problem = courbeRangeProblem(min, max);
					if (problem) throw new LineError(`x : ${problem}`);
					window = { ...window, xMin: min, xMax: max };
					windowLines = { ...windowLines, x: line };
					break;
				}
				case 'y': {
					const [min, max] = parsePair(value, 'y');
					if (!(min < max))
						throw new LineError(
							`y : la borne du bas (${formatPlain(min)}) doit être inférieure à celle du haut (${formatPlain(max)})`
						);
					const problem = courbeRangeProblem(min, max);
					if (problem) throw new LineError(`y : ${problem}`);
					window = { ...window, yMin: min, yMax: max };
					windowLines = { ...windowLines, y: line };
					break;
				}
				case 'grille': {
					const parts = splitTopLevel(decimalPoint(value), ';');
					if (parts.length > 2 || parts.some((p) => p === '')) {
						throw new LineError('grille attend un pas, ou deux pas « x ; y » (ex. 1 ; 2)');
					}
					const gx = evaluateConstant(parts[0]);
					const gy = parts.length === 2 ? evaluateConstant(parts[1]) : gx;
					if (!(gx > 0) || !(gy > 0)) throw new LineError('grille : les pas doivent être positifs');
					grid = { x: gx, y: gy };
					break;
				}
				case 'taille': {
					const s = value.toLowerCase();
					if (!(COURBE_SIZES as readonly string[]).includes(s)) {
						throw new LineError(`taille « ${value} » inconnue (${COURBE_SIZES.join(', ')})`);
					}
					size = s as CourbeSize;
					break;
				}
				case 'description':
					description = value === '' ? null : value;
					break;
				case 'axes':
					axisTitles = parseAxisTitles(value);
					break;
				case 'case':
					if (!/^\d+$/.test(value)) {
						throw new LineError(`case « ${value} » : numéro de case entier`);
					}
					caseIndex = Number(value);
					caseLine = line;
					break;
				case 'placer':
				case 'points':
				case 'asymptotes':
				case 'aire':
				case 'tangente':
					// Après toutes les fonctions : `M(2 ; f(2))` peut précéder la ligne de f.
					deferred.push({ key, value, line, content });
					break;
			}
		} catch (error) {
			fail(line, content, error);
		}
	});

	// Escalier (repère u_n ; u_{n+1}) et nuage (repère n ; u_n) : axes incompatibles
	const cloud = sequences.find((s) => s.staircase === null);
	if (cloud && sequences.some((s) => s.staircase !== null)) {
		errors.push({
			message: `Ligne ${cloud.line} : une figure ne peut pas mêler un escalier (repère uₙ ; uₙ₊₁) et le nuage de points de ${cloud.name} (repère n ; uₙ)`,
			line: cloud.line,
			content: lines[cloud.line - 1].trim()
		});
	}

	const points: CourbePoint[] = [];
	const asymptotes: CourbeAsymptote[] = [];
	const areas: CourbeArea[] = [];
	const tangents: CourbeTangent[] = [];
	let placer: CourbeTarget[] | undefined;
	const names = new Set(functions.map((f) => f.name));
	for (const item of deferred) {
		try {
			if (item.key === 'placer') placer = parseTargets(item.value, functionTable, item.line);
			else if (item.key === 'points')
				points.push(...parsePoints(item.value, functionTable, item.line));
			else if (item.key === 'asymptotes')
				asymptotes.push(...parseAsymptotes(item.value, item.line));
			else if (item.key === 'tangente') {
				tangents.push(parseTangent(item.value, functions, functionTable, item.line));
			} else areas.push(parseArea(item.value, names, item.line));
			const over =
				points.length > COURBE_LIMITS.points
					? `au plus ${COURBE_LIMITS.points} points par figure`
					: asymptotes.length > COURBE_LIMITS.asymptotes
						? `au plus ${COURBE_LIMITS.asymptotes} asymptotes par figure`
						: areas.length > COURBE_LIMITS.areas
							? `au plus ${COURBE_LIMITS.areas} aires par figure`
							: tangents.length > COURBE_LIMITS.tangents
								? `au plus ${COURBE_LIMITS.tangents} tangentes par figure`
								: null;
			if (over) throw new LineError(over);
		} catch (error) {
			fail(item.line, item.content, error);
		}
	}
	errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

	if (windowLines.x === undefined && !errors.some((e) => /^Ligne \d+ : x/.test(e.message))) {
		errors.push({ message: 'Fenêtre manquante : ajouter une ligne « x: min ; max »' });
	}
	if (windowLines.y === undefined && !errors.some((e) => /^Ligne \d+ : y/.test(e.message))) {
		errors.push({ message: 'Fenêtre manquante : ajouter une ligne « y: min ; max »' });
	}

	if (errors.length === 0 && grid !== null) {
		const g: CourbeGrid = grid;
		const w = window as CourbeWindow;
		if (
			(w.xMax - w.xMin) / g.x > COURBE_LIMITS.gridLines ||
			(w.yMax - w.yMin) / g.y > COURBE_LIMITS.gridLines
		) {
			const gridLine = lines.findIndex((l) => /^\s*grille\s*:/i.test(l)) + 1;
			errors.push({
				message: `Ligne ${gridLine} : pas de grille trop petit pour la fenêtre (plus de ${COURBE_LIMITS.gridLines} lignes)`,
				line: gridLine
			});
		}
	}

	if (caseIndex !== undefined && !seenKeys.has('placer')) {
		errors.push({
			message: `Ligne ${caseLine} : case: sans objet sans placer:`,
			line: caseLine,
			content: lines[caseLine - 1].trim()
		});
	}
	// Points à placer : noms libres, sur un nœud de la grille, dans la fenêtre
	if (errors.length === 0 && placer !== undefined) {
		const gridSpec = { window: window as CourbeWindow, grid, size };
		for (const target of placer) {
			const problem = targetProblem(target, points, gridSpec);
			if (problem === null) continue;
			errors.push({
				message: `Ligne ${target.line} : placer : ${problem}`,
				line: target.line,
				content: lines[target.line - 1].trim()
			});
			break;
		}
	}

	const spec: CourbeSpec | null =
		errors.length === 0
			? {
					window: window as CourbeWindow,
					grid,
					functions,
					sequences,
					points,
					asymptotes,
					areas,
					tangents,
					size,
					description,
					...(placer !== undefined && { placer }),
					...(axisTitles !== undefined && { axisTitles })
				}
			: null;

	return {
		type: 'courbe',
		source,
		spec,
		errors,
		warnings,
		...(caseIndex !== undefined && { caseIndex })
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document (clôtures comprises).
 */
export function parseCourbe(lines: string[], startIndex: number, endIndex: number): CourbeNode {
	const closed = endIndex > startIndex && BLOCK_END_REGEX.test(lines[endIndex]);
	const body = lines.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
	const node = parseCourbeContent(body.join('\n'));
	if (closed) return node;
	// Non fermé : la figure n'est pas dessinée, l'auteur sait pourquoi (Q48).
	return {
		...node,
		spec: null,
		errors: [
			...node.errors,
			{
				message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
				line: body.length + 1
			}
		]
	};
}
