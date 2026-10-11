/**
 * Student Domain Parser
 *
 * Parses student input into a Domain structure.
 * Supports multiple input formats:
 * - Interval notation: ]0, +∞[, [0, 1], ]-∞, 2[ ∪ ]3, +∞[
 * - Condition notation: x > 0, x >= 0 et x != 1, 0 < x <= 5
 * - Set notation: ℝ \ {0}, ℝ*, ℝ₊, ℝ*₊
 *
 * @module mathAST/domain/validation/parse-student-domain
 */

import type { MathNode } from '../../types';
import { number, euler, superscript } from '$lib/mathAST/factory';
import { mapNode } from '../../transforms';
import { parseLatexSafe } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { evaluate } from '../../eval';
import type { Domain, Interval } from '../types';
import type {
	ParseStudentDomainResult,
	ParseStudentDomainPiecesResult,
	StudentDomainPiece
} from './types';
import {
	intervalDomain,
	emptyDomain,
	universalDomain,
	bound,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThanInterval,
	lessThanOrEqualInterval,
	greaterThanInterval,
	greaterThanOrEqualInterval
} from '../factory';
import { union, excludePoints } from '../algebra';
import { expandExcludedPoints } from './compare-domains';

// =============================================================================
// Main API
// =============================================================================

/**
 * Parse a student's domain input into a Domain structure.
 *
 * Supports multiple formats:
 * - Interval: ]0, +∞[, [0, 1], ]-∞, 2[ ∪ ]3, +∞[
 * - Condition: x > 0, x >= 0 et x != 1, 0 < x <= 5
 * - Set notation: ℝ \ {0}, ℝ*, ℝ₊
 *
 * @param input - The student's answer string
 * @param variable - Expected variable name (default: 'x')
 * @returns ParseStudentDomainResult with success/failure and domain/error
 *
 * @example
 * ```typescript
 * parseStudentDomain(']0 ; +∞[');
 * // { success: true, domain: { kind: 'interval_set', ... }, format: 'interval' }
 *
 * parseStudentDomain('x > 0 et x ≠ 1', 'x');
 * // { success: true, domain: { kind: 'interval_set', ... }, format: 'condition' }
 *
 * parseStudentDomain('ℝ \\ {0}');
 * // { success: true, domain: { kind: 'interval_set', ... }, format: 'set_notation' }
 * ```
 */
export function parseStudentDomain(
	input: string,
	variable: string = 'x'
): ParseStudentDomainResult {
	const result = parseStudentDomainPieces(input, variable);
	if (!result.success) return result;
	return { success: true, domain: result.domain, format: result.format };
}

/**
 * Comme `parseStudentDomain`, mais rend aussi les MORCEAUX tels qu'écrits par
 * l'élève, avant toute fusion : chaque intervalle d'une réunion (bornes non
 * réordonnées, crochets d'origine), chaque ensemble de points. Le jugement
 * d'une réponse en a besoin pour dire « réunis ces intervalles », « écris
 * {3} plutôt que [3 ; 3] » ou « l'infini est toujours exclu ».
 */
export function parseStudentDomainPieces(
	input: string,
	variable: string = 'x'
): ParseStudentDomainPiecesResult {
	// Normalize input: trim and normalize Unicode
	const normalizedInput = normalizeInput(input);

	if (normalizedInput.length === 0) {
		return { success: false, error: 'Réponse vide' };
	}

	// Try each parser in order of specificity
	const parsers: Array<() => ParseStudentDomainPiecesResult> = [
		() => asSinglePiece(normalizedInput, parseSetNotation(normalizedInput)),
		() => parseIntervalNotation(normalizedInput),
		() => asSinglePiece(normalizedInput, parseConditionNotation(normalizedInput, variable))
	];

	for (const parser of parsers) {
		const result = parser();
		if (result.success) {
			return result;
		}
	}

	return {
		success: false,
		error:
			'Format non reconnu. Utilisez la notation intervalle (ex: ]0 ; +∞[), condition (ex: x > 0) ou ensemble (ex: ℝ \\ {0})'
	};
}

/** Un résultat d'un seul tenant (ensemble, condition) vu comme un morceau unique */
function asSinglePiece(
	source: string,
	result: ParseStudentDomainResult
): ParseStudentDomainPiecesResult {
	if (!result.success) return result;
	return {
		success: true,
		domain: result.domain,
		format: result.format,
		pieces: [{ source, domain: result.domain }]
	};
}

// =============================================================================
// Input Normalization
// =============================================================================

/** Commande LaTeX `\nom` entière (pas le début d'une plus longue : `\le` ≠ `\left`) */
function latexCommand(name: string): RegExp {
	return new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g');
}

/**
 * Écritures LaTeX (MathLive, auteur) ramenées à la notation que lisent les
 * analyseurs ci-dessous. Les bornes gardent leur LaTeX (`\frac`, `\sqrt`,
 * `\pi`) : `parseEndpointValue` les lit avec le parseur de mathAST.
 *
 * Écritures mesurées au vrai clavier de MathLive (docs/archive/wip/reponse-intervalles-progress.md) :
 * `\left\lbrack…\right\rbrack`, `\lbrace3\rbrace`, `\{3\}`, `]\,2\,;\,3\,[`,
 * `\frac{]3}{2}` (« / » tapé juste après « ] » emporte le crochet au numérateur).
 */
function normalizeLatex(input: string): string {
	return (
		input
			// Crochet emporté au numérateur d'une fraction : \frac{]3}{2} → ]\frac{3}{2}
			.replace(/\\frac\{([[\]])/g, '$1\\frac{')
			// Délimiteurs extensibles : \left\lbrack → \lbrack, \right. → rien
			.replace(/\\(?:left|right)\./g, '')
			.replace(latexCommand('left'), '')
			.replace(latexCommand('right'), '')
			.replace(latexCommand('lbrack'), '[')
			.replace(latexCommand('rbrack'), ']')
			// Accolades d'ensemble
			.replace(latexCommand('lbrace'), '{')
			.replace(latexCommand('rbrace'), '}')
			.replace(/\\\{/g, '{')
			.replace(/\\\}/g, '}')
			// Décimal à virgule de MathLive
			.replace(/\{,\}/g, ',')
			// Espaces LaTeX
			.replace(/\\[,:;!]|\\ (?!\s*\{)/g, '') // « \ {0} » (privé de) reste
			.replace(latexCommand('q?quad'), '')
			.replace(/~/g, '')
			// Symboles d'ensemble
			.replace(latexCommand('infty'), '∞')
			.replace(latexCommand('cup'), '∪')
			.replace(latexCommand('cap'), '∩')
			.replace(latexCommand('setminus'), '∖')
			.replace(latexCommand('backslash'), '∖')
			.replace(/\\mathbb\s*\{\s*R\s*\}/g, 'ℝ')
			.replace(/\\mathbb\s*R/g, 'ℝ')
			.replace(latexCommand('R(?:eals)?'), 'ℝ')
			.replace(latexCommand('emptyset'), '∅')
			.replace(latexCommand('varnothing'), '∅')
			// Comparaisons
			.replace(latexCommand('leq?'), '<=')
			.replace(latexCommand('leqslant'), '<=')
			.replace(latexCommand('geq?'), '>=')
			.replace(latexCommand('geqslant'), '>=')
			.replace(latexCommand('neq?'), '!=')
			.replace(latexCommand('lt'), '<')
			.replace(latexCommand('gt'), '>')
	);
}

/**
 * Normalize input string for parsing.
 */
function normalizeInput(input: string): string {
	return (
		normalizeLatex(input.trim())
			.trim()
			// Normalize unicode
			.replace(/−/g, '-') // minus sign
			.replace(/×/g, '*') // multiplication
			.replace(/÷/g, '/') // division
			.replace(/∞/g, 'inf') // infinity
			.replace(/\+inf/gi, '+inf') // positive infinity
			.replace(/-inf/gi, '-inf') // negative infinity
			// Normalize comparison operators
			.replace(/≤/g, '<=')
			.replace(/≥/g, '>=')
			.replace(/≠/g, '!=')
			// Normalize spaces
			.replace(/\s+/g, ' ')
			// Normalize French connectors
			.replace(/\bet\b/gi, 'et')
			.replace(/\bou\b/gi, 'ou')
			.replace(/\band\b/gi, 'et')
			.replace(/\bor\b/gi, 'ou')
	);
}

// =============================================================================
// Set Notation Parser
// =============================================================================

/**
 * Parse set notation: ℝ, ℝ*, ℝ₊, ℝ*₊, ℝ \ {0}, etc.
 */
function parseSetNotation(input: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// ℝ (universal)
	if (/^[ℝR]$/.test(trimmed)) {
		return { success: true, domain: universalDomain(), format: 'set_notation' };
	}

	// ℝ* (non-zero reals)
	if (/^[ℝR]\*$/.test(trimmed)) {
		return {
			success: true,
			domain: excludePoints(universalDomain(), [number(0)]),
			format: 'set_notation'
		};
	}

	// ℝ₊ or ℝ+ (non-negative reals)
	if (/^[ℝR][₊+]$/.test(trimmed)) {
		return {
			success: true,
			domain: intervalDomain([greaterThanOrEqualInterval(number(0))]),
			format: 'set_notation'
		};
	}

	// ℝ*₊ or ℝ+* (positive reals)
	if (
		/^[ℝR][*₊+]{2}$/.test(trimmed) ||
		/^[ℝR]\*[₊+]$/.test(trimmed) ||
		/^[ℝR][₊+]\*$/.test(trimmed)
	) {
		return {
			success: true,
			domain: intervalDomain([greaterThanInterval(number(0))]),
			format: 'set_notation'
		};
	}

	// ℝ₋ or ℝ- (non-positive reals)
	if (/^[ℝR][₋-]$/.test(trimmed)) {
		return {
			success: true,
			domain: intervalDomain([lessThanOrEqualInterval(number(0))]),
			format: 'set_notation'
		};
	}

	// ℝ*₋ or ℝ-* (negative reals)
	if (
		/^[ℝR][*₋-]{2}$/.test(trimmed) ||
		/^[ℝR]\*[₋-]$/.test(trimmed) ||
		/^[ℝR][₋-]\*$/.test(trimmed)
	) {
		return {
			success: true,
			domain: intervalDomain([lessThanInterval(number(0))]),
			format: 'set_notation'
		};
	}

	// ℝ \ {a, b, c} (reals minus points)
	const setMinusMatch = trimmed.match(/^[ℝR]\s*(?:∖|\\(?![a-zA-Z]))\s*\{(.+)\}$/);
	if (setMinusMatch) {
		const pointsStr = setMinusMatch[1];
		const pointsResult = parseExcludedPoints(pointsStr);
		if (pointsResult.success) {
			return {
				success: true,
				domain: excludePoints(universalDomain(), pointsResult.points),
				format: 'set_notation'
			};
		}
	}

	// ∅ or {} (empty set)
	if (/^[∅Ø]$/.test(trimmed) || /^\{\s*\}$/.test(trimmed)) {
		return { success: true, domain: emptyDomain(), format: 'set_notation' };
	}

	// {a} ou {a ; b} : ensemble fini de points (chacun = intervalle [a ; a])
	const pointsMatch = trimmed.match(/^\{(.+)\}$/);
	if (pointsMatch) {
		const pointsResult = parseExcludedPoints(pointsMatch[1]);
		if (pointsResult.success) {
			const domain = pointsResult.points.reduce<Domain>(
				(result, point) => union(result, intervalDomain([closedInterval(point, point)])),
				emptyDomain()
			);
			return { success: true, domain, format: 'set_notation' };
		}
	}

	return { success: false, error: 'Not a set notation' };
}

/**
 * Parse a list of excluded points.
 *
 * Same separator strategy as intervals: prefer `;` if present (so `{0,5 ; 1,5}`
 * is parsed as two French-decimal points), fall back to `,` otherwise.
 */
function parseExcludedPoints(
	input: string
): { success: true; points: MathNode[] } | { success: false } {
	// Virgule ENTRE DEUX CHIFFRES = virgule décimale (MathLive : `{0,5}`) ; toute autre
	// virgule sépare (écriture historique `{0, 1}`) ; le point-virgule l'emporte.
	const separator = input.includes(';') ? ';' : /(?<!\d),|,(?!\d)/;
	const parts = input
		.split(separator)
		.map((s) => s.trim())
		.filter(Boolean);
	const points: MathNode[] = [];

	for (const part of parts) {
		const value = parseEndpointValue(part);
		if (value === null) {
			return { success: false };
		}
		points.push(value);
	}

	return { success: true, points };
}

// =============================================================================
// Interval Notation Parser
// =============================================================================

/**
 * Parse interval notation: ]0 ; +∞[, [0 ; 1], ]-∞ ; 2[ ∪ ]3 ; +∞[
 *
 * Accepts both ';' (preferred French school convention) and ',' (legacy/English)
 * as bound separators, for backwards compatibility with student input habits.
 * Rend chaque morceau de la réunion tel qu'écrit, et leur réunion.
 */
function parseIntervalNotation(input: string): ParseStudentDomainPiecesResult {
	const parts = input
		.trim()
		.split(/[∪U]/)
		.map((s) => s.trim());
	if (parts.some((part) => part.length === 0)) {
		return { success: false, error: 'Réunion incomplète' };
	}

	const pieces: StudentDomainPiece[] = [];
	let result: Domain = emptyDomain();
	for (const part of parts) {
		const piece = parsePiece(part);
		if (!piece.success) return piece;
		pieces.push(piece.piece);
		// `union` ignore les points exclus : les développer d'abord (]0;5[ \ {2} → ]0;2[ ∪ ]2;5[)
		result = union(result, expandExcludedPoints(piece.piece.domain));
	}

	return { success: true, domain: result, format: 'interval', pieces };
}

/** Un morceau d'une réunion : intervalle, intervalle privé de points, ensemble */
function parsePiece(
	part: string
): { success: true; piece: StudentDomainPiece } | { success: false; error: string } {
	const set = parseSetNotation(part);
	if (set.success) return { success: true, piece: { source: part, domain: set.domain } };

	// Domain with excluded points: ]0, +∞[ \ {1}
	const withExcludedMatch = part.match(/^(.+?)\s*(?:∖|\\(?![a-zA-Z]))\s*\{(.+)\}$/);
	if (withExcludedMatch) {
		const intervalResult = parseSingleInterval(withExcludedMatch[1].trim());
		if (!intervalResult.success) return intervalResult;

		const pointsResult = parseExcludedPoints(withExcludedMatch[2]);
		if (!pointsResult.success) {
			return { success: false, error: 'Points exclus non reconnus' };
		}

		return {
			success: true,
			piece: {
				source: part,
				domain: excludePoints(intervalResult.piece.domain, pointsResult.points)
			}
		};
	}

	return parseSingleInterval(part);
}

/**
 * Parse a single interval.
 *
 * Separator strategy: if `;` appears anywhere inside the brackets, treat it as
 * the bound separator and allow `,` inside bounds (so `]0,5 ; 1[` parses as
 * `(0.5, 1)` with French decimal notation). Otherwise fall back to `,` as the
 * separator (legacy / English style).
 */
function parseSingleInterval(
	input: string
): { success: true; piece: StudentDomainPiece } | { success: false; error: string } {
	const trimmed = input.trim();

	// Detect separator: prefer ';' if present (handles French decimal commas).
	const inner = trimmed.slice(1, -1); // content between outer brackets
	const sep = inner.includes(';') ? ';' : ',';
	const notSep = sep === ';' ? '[^;]' : '[^,;]';

	// French notation: ]a ; b[, [a ; b], ]a ; b], [a ; b[ (semicolon = preferred)
	// Also accepts comma as legacy separator: ]a, b[, [a, b]
	// English notation: (a, b), [a, b], (a, b], [a, b)
	const frenchPattern = new RegExp(`^([[\\]])(${notSep}+)\\s*${sep}\\s*(${notSep}+)([[\\]])$`);
	const englishPattern = new RegExp(`^([([])(${notSep}+)\\s*${sep}\\s*(${notSep}+)([)\\]])$`);
	const frenchMatch = trimmed.match(frenchPattern);
	const englishMatch = trimmed.match(englishPattern);

	const match = frenchMatch ?? englishMatch;
	if (!match) {
		return { success: false, error: 'Format intervalle non reconnu' };
	}

	const [, leftBracket, leftValueStr, rightValueStr, rightBracket] = match;

	// Parse endpoint values
	const leftValue = parseEndpointValue(leftValueStr.trim());
	const rightValue = parseEndpointValue(rightValueStr.trim());

	if (leftValue === null) {
		return { success: false, error: `Borne gauche non reconnue: ${leftValueStr}` };
	}
	if (rightValue === null) {
		return { success: false, error: `Borne droite non reconnue: ${rightValueStr}` };
	}

	// Determine if bounds are open/closed
	// French: ] means open, [ means closed on left
	// English: ( means open, [ means closed
	const leftOpen = leftBracket === ']' || leftBracket === '(';
	const rightOpen = rightBracket === '[' || rightBracket === ')';

	// Create the interval
	let interval: Interval;
	if (!leftOpen && !rightOpen) {
		interval = closedInterval(leftValue, rightValue);
	} else if (leftOpen && rightOpen) {
		interval = openInterval(leftValue, rightValue);
	} else if (!leftOpen && rightOpen) {
		interval = leftClosedInterval(leftValue, rightValue);
	} else {
		interval = rightClosedInterval(leftValue, rightValue);
	}

	return {
		success: true,
		piece: {
			source: trimmed,
			domain: intervalDomain([interval]),
			interval,
			bounds: [leftValueStr.trim(), rightValueStr.trim()]
		}
	};
}

// =============================================================================
// Condition Notation Parser
// =============================================================================

/**
 * Parse condition notation: x > 0, x >= 0 et x != 1, 0 < x <= 5
 */
function parseConditionNotation(input: string, variable: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// Check for compound conditions (et/ou)
	if (/\bet\b/i.test(trimmed)) {
		const parts = trimmed
			.split(/\bet\b/i)
			.map((s) => s.trim())
			.filter(Boolean);
		let result: Domain = universalDomain();

		for (const part of parts) {
			const partResult = parseSingleCondition(part, variable);
			if (!partResult.success) {
				return partResult;
			}
			// "et" means intersection
			result = intersectDomains(result, partResult.domain);
		}

		return { success: true, domain: result, format: 'condition' };
	}

	if (/\bou\b/i.test(trimmed)) {
		const parts = trimmed
			.split(/\bou\b/i)
			.map((s) => s.trim())
			.filter(Boolean);
		let result: Domain = emptyDomain();

		for (const part of parts) {
			const partResult = parseSingleCondition(part, variable);
			if (!partResult.success) {
				return partResult;
			}
			// "ou" means union
			result = union(result, partResult.domain);
		}

		return { success: true, domain: result, format: 'condition' };
	}

	return parseSingleCondition(trimmed, variable);
}

/**
 * Parse a single condition.
 */
function parseSingleCondition(input: string, variable: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// Pattern: a < x <= b (double inequality)
	const doubleMatch = trimmed.match(/^([^<>=!]+)\s*(<|<=)\s*([a-zA-Z])\s*(<|<=)\s*([^<>=!]+)$/);
	if (doubleMatch) {
		const [, leftStr, op1, varName, op2, rightStr] = doubleMatch;
		if (varName !== variable) {
			return { success: false, error: `Variable attendue: ${variable}, trouvée: ${varName}` };
		}

		const leftValue = parseEndpointValue(leftStr.trim());
		const rightValue = parseEndpointValue(rightStr.trim());

		if (leftValue === null || rightValue === null) {
			return { success: false, error: 'Bornes non reconnues' };
		}

		const leftOpen = op1 === '<';
		const rightOpen = op2 === '<';

		let interval: Interval;
		if (!leftOpen && !rightOpen) {
			interval = closedInterval(leftValue, rightValue);
		} else if (leftOpen && rightOpen) {
			interval = openInterval(leftValue, rightValue);
		} else if (leftOpen && !rightOpen) {
			interval = rightClosedInterval(leftValue, rightValue);
		} else {
			interval = leftClosedInterval(leftValue, rightValue);
		}

		return {
			success: true,
			domain: intervalDomain([interval]),
			format: 'condition'
		};
	}

	// Pattern: x != a (exclusion)
	const neqMatch = trimmed.match(new RegExp(`^${variable}\\s*!=\\s*(.+)$`));
	if (neqMatch) {
		const valueStr = neqMatch[1].trim();
		const value = parseEndpointValue(valueStr);
		if (value === null) {
			return { success: false, error: `Valeur non reconnue: ${valueStr}` };
		}
		return {
			success: true,
			domain: excludePoints(universalDomain(), [value]),
			format: 'condition'
		};
	}

	// Pattern: x > a, x >= a, x < a, x <= a
	// Note: Match >= and <= before > and < to avoid partial matches
	const simpleMatch = trimmed.match(new RegExp(`^${variable}\\s*(>=|<=|>|<)\\s*(.+)$`));
	if (simpleMatch) {
		const [, op, valueStr] = simpleMatch;
		const value = parseEndpointValue(valueStr.trim());
		if (value === null) {
			return { success: false, error: `Valeur non reconnue: ${valueStr}` };
		}

		let interval: Interval;
		switch (op) {
			case '>':
				interval = greaterThanInterval(value);
				break;
			case '>=':
				interval = greaterThanOrEqualInterval(value);
				break;
			case '<':
				interval = lessThanInterval(value);
				break;
			case '<=':
				interval = lessThanOrEqualInterval(value);
				break;
			default:
				return { success: false, error: `Opérateur non reconnu: ${op}` };
		}

		return {
			success: true,
			domain: intervalDomain([interval]),
			format: 'condition'
		};
	}

	// Pattern: a > x (reversed)
	// Note: Match >= and <= before > and < to avoid partial matches
	const reversedMatch = trimmed.match(/^(.+?)\s*(>=|<=|>|<)\s*([a-zA-Z])$/);
	if (reversedMatch) {
		const [, valueStr, op, varName] = reversedMatch;
		if (varName !== variable) {
			return { success: false, error: `Variable attendue: ${variable}, trouvée: ${varName}` };
		}

		const value = parseEndpointValue(valueStr.trim());
		if (value === null) {
			return { success: false, error: `Valeur non reconnue: ${valueStr}` };
		}

		// Reverse the operator: a > x means x < a
		let interval: Interval;
		switch (op) {
			case '>':
				interval = lessThanInterval(value);
				break;
			case '>=':
				interval = lessThanOrEqualInterval(value);
				break;
			case '<':
				interval = greaterThanInterval(value);
				break;
			case '<=':
				interval = greaterThanOrEqualInterval(value);
				break;
			default:
				return { success: false, error: `Opérateur non reconnu: ${op}` };
		}

		return {
			success: true,
			domain: intervalDomain([interval]),
			format: 'condition'
		};
	}

	return { success: false, error: 'Format condition non reconnu' };
}

// =============================================================================
// Endpoint Value Parser
// =============================================================================

/**
 * Borne écrite par l'élève ou l'auteur → MathNode EXACT (fraction, radical, π
 * gardés tels quels : la comparaison passe par `compareNumericNodes`).
 *
 * - infinis ;
 * - LaTeX (`\\frac{3}{2}`, `1-\\sqrt2`, `\\frac{\\pi}{2}`) → parseur LaTeX de mathAST ;
 * - sinon syntaxe maison (`3/2`, `1-sqrt(2)`, `-1.5`) → parseur maison ;
 * - écritures Unicode historiques (`√2`, `π`) ramenées au LaTeX.
 *
 * Une borne qui n'est pas un nombre réel (variable, texte) → null.
 */
function parseEndpointValue(input: string): MathNode | null {
	const trimmed = input.trim();

	// Infinity
	if (/^[+]?inf$/i.test(trimmed) || trimmed === '+∞') {
		return bound('+inf');
	}
	if (/^-inf$/i.test(trimmed) || trimmed === '-∞') {
		return bound('-inf');
	}

	// Borne hostile (radicaux imbriqués : coût ×9 par niveau à l'évaluation) : refusée
	// AVANT toute lecture
	if (isBoundTooComplex(trimmed)) return null;

	const latex = trimmed
		// Écritures historiques : π, pi, √2, √(…), sqrt2
		.replace(/π|(?<!\\)\bpi\b/g, '\\pi ')
		.replace(/√\s*\(([^()]*)\)/g, '\\sqrt{$1}')
		.replace(/√\s*(\d+(?:[.,]\d+)?|[a-zA-Z])/g, '\\sqrt{$1}')
		.replace(/(?<!\\)\bsqrt(\d+)/g, 'sqrt($1)')
		// Virgule décimale (le séparateur de bornes est déjà retiré)
		.replace(/(\d),(\d)/g, '$1.$2')
		.trim();
	if (latex.length === 0) return null;

	const parsed = latex.includes('\\') ? parseLatexBound(latex) : parseCustomBound(latex);
	const node = parsed && withEulerConstant(parsed);
	return node && isRealConstant(node) ? node : null;
}

/**
 * Une borne est un nombre : `\\exp(u)` s'écrit `e^{u}` (la lettre `e` est déjà
 * la constante d'Euler pour les deux parseurs). `exp(2) - e^2` n'est nul qu'au
 * flottant près : sans cette unification, la comparaison exacte ne reconnaît
 * pas `\\exp(2)` = `e^{2}` (sonde du 2026-10-04).
 */
function withEulerConstant(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'function' && n.name === 'exp' && n.args.length === 1
			? superscript(euler(), n.args[0])
			: n
	);
}

/** Longueur maximale d'une borne (la plus longue utile : `\\dfrac{-3-\\sqrt{13}}{4}`, 22) */
export const MAX_BOUND_LENGTH = 60;

/** Profondeur maximale d'imbrication d'une borne (accolades, parenthèses, radicaux, puissances) */
export const MAX_BOUND_DEPTH = 4;

/**
 * Borne trop longue ou trop imbriquée pour être évaluée sans risque : le coût
 * d'évaluation de radicaux imbriqués croît d'environ ×9 par niveau (12 niveaux :
 * 2 s, 50 : plusieurs minutes, serveur des évaluations bloqué).
 */
export function isBoundTooComplex(text: string): boolean {
	if (text.length > MAX_BOUND_LENGTH) return true;
	let depth = 0;
	let maxDepth = 0;
	for (const char of text) {
		if (char === '{' || char === '(') maxDepth = Math.max(maxDepth, ++depth);
		else if (char === '}' || char === ')') depth--;
	}
	// Radicaux, fractions, puissances, factorielles : imbriqués même sans accolades (`\\sqrt\\sqrt2`)
	const operators = text.match(/sqrt|√|frac|\^|!/g)?.length ?? 0;
	return maxDepth > MAX_BOUND_DEPTH || operators > MAX_BOUND_DEPTH;
}

function parseLatexBound(latex: string): MathNode | null {
	const result = parseLatexSafe(latex);
	return result.errors.length === 0 ? result.ast : null;
}

function parseCustomBound(text: string): MathNode | null {
	try {
		return parseCustom(text);
	} catch {
		return null;
	}
}

/** Nombre réel calculable (aucune variable libre) */
function isRealConstant(node: MathNode): boolean {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		return result.status === 'value' && typeof result.value === 'number' && isFinite(result.value);
	} catch {
		return false;
	}
}

// =============================================================================
// Helper: Intersection
// =============================================================================

import { intersect } from '../algebra';

function intersectDomains(a: Domain, b: Domain): Domain {
	return intersect(a, b);
}
