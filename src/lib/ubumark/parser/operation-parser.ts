/**
 * Bloc ```operation — analyse du texte
 * ====================================
 *
 * ```operation
 * calcul: 245 + 437
 * cases: résultat | aucune
 * retenues: oui | non
 * méthode: compensation | cassage
 * ```
 *
 * - `calcul:` (obligatoire) : 2 ou 3 termes pour une addition, 2 pour une
 *   soustraction (`−`, `-` ou `–`) ou une multiplication (`×`, `x` ou `*`) ;
 *   virgule ou point ; espaces de milliers acceptés. `÷` : lot 3.
 * - Multiplication : le facteur qui a le plus de chiffres est posé en haut
 *   (égalité : ordre écrit), `spec.terms` est dans l'ordre de pose.
 * - Le reste est facultatif ; une clé inconnue ou une valeur hors liste est
 *   une erreur située, jamais un réglage ignoré.
 *
 * Dans un modèle de question, `{{a}}` est résolu AVANT : le bloc ne lit que
 * des nombres. Une erreur ne fait pas disparaître le bloc (le nœud porte ses
 * messages). Repérage et blocs non fermés : ceux de ```horloge.
 *
 * Phase 0 : `docs/wip/operations-posees-progress.md`.
 *
 * @module ubumark/parser/operation-parser
 */

import { specialBlockEnd } from './unclosed-block';
import {
	OPERATION_CELLS,
	OPERATION_MAX_DIGITS,
	OPERATION_MAX_FACTOR_DIGITS,
	OPERATION_MAX_TERMS,
	OPERATION_METHODS,
	type OperationBlockRange,
	type OperationCells,
	type OperationIssue,
	type OperationMethod,
	type OperationNode,
	type OperationOperator,
	type OperationTerm
} from '../types/operation';

// ============================================================================
// CONSTANTES
// ============================================================================

const OPERATION_BLOCK_START_REGEX = /^```operation\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** Un terme sans ses espaces : `1234`, `56,75`, `12.5` */
const TERM_REGEX = /^(\d+)(?:[.,](\d+))?$/;

/** Signes reconnus, rangés par opérateur ; `÷` est lu pour être refusé */
const SIGNS: Record<string, OperationOperator | 'later'> = {
	'+': '+',
	'-': '-',
	'−': '-',
	'–': '-',
	'×': '×',
	x: '×',
	'*': '×',
	'÷': 'later',
	':': 'later',
	'/': 'later'
};

const SIGN_SPLIT_REGEX = /([+\-−–×x*÷:/])/;

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS = ['calcul', 'cases', 'retenues', 'méthode', 'methode', 'case'] as const;

type Key = 'calcul' | 'cases' | 'retenues' | 'méthode' | 'case';

/** Clés de l'auteur ; `case:` est posée par le générateur de questions, jamais écrite */
const KEY_NAMES: Key[] = ['calcul', 'cases', 'retenues', 'méthode'];

/** `case: N` : numéro de la case de la question (0, 1, 2…) */
const CASE_INDEX_REGEX = /^\d{1,3}$/;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isOperationBlockStart(line: string): boolean {
	return OPERATION_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```operation d'une liste de lignes (indices inclusifs, clôtures comprises).
 * Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon
 * jusqu'à la première ligne vide (Q63).
 */
export function findOperationBlocks(lines: string[]): OperationBlockRange[] {
	const blocks: OperationBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isOperationBlockStart(lines[i])) {
			const { endIndex } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
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

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

function normalizeKey(raw: string): Key | null {
	const lower = raw.toLowerCase();
	if (lower === 'methode') return 'méthode';
	if (lower === 'case') return 'case';
	return KEY_NAMES.find((k) => k === lower) ?? null;
}

/** Retire les accents d'une valeur (`résultat` = `resultat`) */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function oneOf<T extends string>(raw: string, allowed: readonly T[], key: string): T {
	const found = allowed.find((value) => plain(value) === plain(raw));
	if (found === undefined) {
		throw new LineError(`${key} « ${raw} » : valeurs possibles ${allowed.join(', ')}`);
	}
	return found;
}

function parseTerm(raw: string): OperationTerm {
	const compact = raw.replace(/\s+/g, '');
	const match = TERM_REGEX.exec(compact);
	if (!match) throw new LineError(`« ${raw} » n’est pas un nombre (ex. 245 ou 56,75)`);
	const integer = match[1].replace(/^0+(?=\d)/, '');
	const decimal = match[2] ?? '';
	if (integer.length > OPERATION_MAX_DIGITS.integer) {
		throw new LineError(
			`« ${raw} » : ${OPERATION_MAX_DIGITS.integer} chiffres au plus avant la virgule`
		);
	}
	if (decimal.length > OPERATION_MAX_DIGITS.decimal) {
		throw new LineError(
			`« ${raw} » : ${OPERATION_MAX_DIGITS.decimal} chiffres au plus après la virgule`
		);
	}
	return { integer, decimal };
}

/** `a` ≥ `b`, termes comparés chiffre à chiffre (jamais en flottant) */
function isAtLeast(a: OperationTerm, b: OperationTerm): boolean {
	const decimals = Math.max(a.decimal.length, b.decimal.length);
	const scaled = (t: OperationTerm) => BigInt(t.integer + t.decimal.padEnd(decimals, '0'));
	return scaled(a) >= scaled(b);
}

const digitCount = (t: OperationTerm) => t.integer.length + t.decimal.length;

/**
 * Facteurs d'une multiplication dans l'ordre de pose : le plus de chiffres en
 * haut (égalité : ordre écrit) ; bornes de chaque ligne vérifiées ensuite
 */
function factorsInPlace([a, b]: OperationTerm[]): OperationTerm[] {
	const [top, bottom] = digitCount(b) > digitCount(a) ? [b, a] : [a, b];
	if (digitCount(top) > OPERATION_MAX_FACTOR_DIGITS.top) {
		throw new LineError(
			`multiplication : ${OPERATION_MAX_FACTOR_DIGITS.top} chiffres au plus pour le nombre du haut`
		);
	}
	if (digitCount(bottom) > OPERATION_MAX_FACTOR_DIGITS.bottom) {
		throw new LineError(
			`multiplication : ${OPERATION_MAX_FACTOR_DIGITS.bottom} chiffres au plus pour le nombre du bas`
		);
	}
	return [top, bottom];
}

function parseCalcul(value: string): { operator: OperationOperator; terms: OperationTerm[] } {
	const parts = value.split(SIGN_SPLIT_REGEX).map((part) => part.trim());
	const signs = parts.filter((_, i) => i % 2 === 1);
	const rawTerms = parts.filter((_, i) => i % 2 === 0);
	if (signs.length === 0) {
		throw new LineError(`calcul « ${value} » : deux termes au moins, ex. calcul: 45 + 37`);
	}
	if (signs.some((sign) => SIGNS[sign] === 'later')) {
		throw new LineError(
			'division posée : pas encore disponible (addition, soustraction et multiplication seulement)'
		);
	}
	const operators = new Set(signs.map((sign) => SIGNS[sign]));
	if (operators.size > 1) {
		throw new LineError(`calcul « ${value} » : un seul signe par opération (+, − ou ×)`);
	}
	const operator = signs.map((sign) => SIGNS[sign])[0] as OperationOperator;
	const empty = rawTerms.find((term) => term === '');
	if (empty !== undefined) {
		throw new LineError(`calcul « ${value} » : un terme manque autour d’un signe`);
	}
	const terms = rawTerms.map(parseTerm);
	const max = OPERATION_MAX_TERMS[operator];
	if (terms.length > max) {
		throw new LineError(
			operator === '+'
				? `${terms.length} termes : trois termes au plus`
				: operator === '-'
					? `${terms.length} termes : une soustraction a deux termes`
					: `${terms.length} facteurs : une multiplication posée a deux facteurs`
		);
	}
	if (operator === '×') return { operator, terms: factorsInPlace(terms) };
	if (operator === '-' && !isAtLeast(terms[0], terms[1])) {
		throw new LineError(
			`calcul « ${value} » : résultat négatif (le premier nombre doit être le plus grand)`
		);
	}
	return { operator, terms };
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```operation.
 */
export function parseOperationContent(source: string): OperationNode {
	const lines = source.split('\n');
	const errors: OperationIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let calcul: { operator: OperationOperator; terms: OperationTerm[] } | null = null;
	let cells: OperationCells = 'résultat';
	let carries = true;
	let method: OperationMethod = 'compensation';
	let caseIndex: number | undefined;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. calcul: 45 + 37)`);
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : ${KEY_NAMES.join(', ')})`);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			return;
		}
		seen.set(key, lineNo);

		try {
			switch (key) {
				case 'calcul':
					calcul = parseCalcul(value);
					break;
				case 'cases':
					cells = oneOf(value, OPERATION_CELLS, 'cases');
					break;
				case 'retenues':
					carries = oneOf(value, ['oui', 'non'] as const, 'retenues') === 'oui';
					break;
				case 'méthode':
					method = oneOf(value, OPERATION_METHODS, 'méthode');
					break;
				case 'case':
					if (!CASE_INDEX_REGEX.test(value)) {
						throw new LineError('case: attend un numéro de case (0, 1, 2…)');
					}
					caseIndex = Number(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	// Les vérifications qui croisent deux lignes, une fois tout lu
	const read = calcul as { operator: OperationOperator; terms: OperationTerm[] } | null;
	if (read === null) {
		if (!seen.has('calcul')) fail(1, 'il manque la ligne calcul: (ex. calcul: 45 + 37)');
	} else if (read.operator !== '-' && seen.has('méthode')) {
		fail(seen.get('méthode')!, 'méthode: seulement pour une soustraction');
	}
	// `cells` est réaffectée dans le forEach : TS la croit encore à sa valeur initiale
	if (caseIndex !== undefined && (cells as OperationCells) === 'aucune') {
		fail(seen.get('case')!, 'case: sans objet avec cases: aucune');
	}

	if (errors.length > 0 || read === null) {
		return { type: 'operation', source, spec: null, errors };
	}
	return {
		type: 'operation',
		source,
		spec: { operator: read.operator, terms: read.terms, cells, carries, method },
		errors,
		...(caseIndex !== undefined && { caseIndex })
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseOperation(
	lines: string[],
	startIndex: number,
	end: number
): { node: OperationNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseOperationContent(body.join('\n'));
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			errors: [
				...node.errors,
				{
					message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
					line: body.length + 1
				}
			]
		}
	};
}
