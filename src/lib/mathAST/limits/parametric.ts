/**
 * Limites à paramètre (V103, décision de David du 2026-11-24)
 *
 * `evaluateLimit` calcule avec les lettres (k, a) comme avec des nombres
 * « comme il faut » : `1/(x² + k)` en 0 → 1/k, faux pour k = 0 (+∞). Ce module
 * dit, pour une limite trouvée, la CONDITION sur les lettres qui la rend
 * vraie (« 1/k, pour k ≠ 0 ») — ou refuse quand on ne sait pas l'écrire.
 *
 * Il rattrape aussi les limites que le moteur refuse alors qu'elles valent la
 * même chose pour tout k (`x² + kx` en 0⁺ → 0, `(k² + 1)/x` en 0⁺ → +∞) : une
 * somme de termes dont chacun a sa limite, un facteur fait de lettres devant
 * un facteur qui tend vers 0 (k·x → 0) ou vers l'infini (signe du facteur
 * connu). Le calcul reste celui du moteur, terme à terme ; rien ne s'ajoute à
 * ses stratégies internes (un « 0 de côté inconnu » rendu 0 exact au cœur du
 * moteur donnait des valeurs fausses, chantier limites-parametres).
 *
 * @module mathAST/limits/parametric
 */

import type { MathNode } from '../types';
import type { LimitDirection, LimitResult } from './types';
import type { Domain, PeriodicExclusion } from '../domain/types';
import { LimitError } from './types';
import { evaluateLimit } from './evaluate';
import { computeDomain } from '../domain/compute';
import { containsValue, isEmpty } from '../domain/algebra';
import { parameterCondition } from '../solve/literal-parameter';
import { getVariables, substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import {
	flattenProductShallow,
	flattenRelationChain,
	flattenSumShallow,
	unflattenProduct
} from '../flatten';
import {
	add,
	fraction,
	greaterThan,
	implicitMultiply,
	infinity,
	lessThan,
	number,
	opposite,
	relation,
	variable as variableNode
} from '../factory';
import {
	isDelimiter,
	isDivision,
	isInfinity,
	isLogical,
	isNumber,
	isOpposite,
	isRelation
} from '../guards';
import { transformAST } from '../visitor';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';

// =============================================================================
// Types
// =============================================================================

/** La condition d'une limite à paramètre : aucune, ou écrite (ligne et texte). */
export type LimitParameterCondition =
	| { readonly kind: 'always' }
	| { readonly kind: 'when'; readonly latex: string; readonly text: string };

// =============================================================================
// Constantes
// =============================================================================

/**
 * Valeurs d'essai des lettres : la limite trouvée doit être celle que le
 * moteur calcule, la lettre remplacée par chacune d'elles (quand la condition
 * l'admet). Un garde-fou qui ne peut que faire REFUSER : `(kx + 1)/(kx + 2)`
 * en +∞ vaut 1 pour k ≠ 0, mais 1/2 pour k = 0.
 */
const SAMPLE_VALUES = [-2, -1, -0.5, 0, 0.5, 1, 2, 3] as const;

/** Lettres possibles pour l'entier d'une famille périodique (k ≠ π/2 + nπ). */
const INTEGER_LETTERS = ['n', 'm', 'p', 'q'] as const;

// =============================================================================
// Fonctions
// =============================================================================

/** Les lettres d'une expression autres que la variable, dans l'ordre alphabétique. */
export function limitParameters(expr: MathNode, variable: string): string[] {
	return [...getVariables(expr)].filter((name) => name !== variable).sort();
}

/** `evaluateLimit` sans exception : `null` quand le moteur renonce. */
function limitOf(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection
): LimitResult | null {
	try {
		return evaluateLimit(expr, variable, approach, direction);
	} catch (error) {
		if (error instanceof LimitError) return null;
		throw error;
	}
}

/** La valeur d'une limite conclue (exacte ou infinie), sinon `null`. */
function concludedValue(result: LimitResult | null): MathNode | null {
	if (result === null || result.value === null) return null;
	return result.status === 'exact' || result.status === 'infinite' ? result.value : null;
}

/** 0 écrit en nombre. */
function isZeroValue(node: MathNode): boolean {
	return isNumber(node) && Number(node.value) === 0;
}

/**
 * Le signe d'une expression faite de lettres, s'il est le même pour toutes
 * leurs valeurs : `k² + 1` → positif ; `k` → inconnu (`null`).
 */
function constantSign(node: MathNode): 'positive' | 'negative' | null {
	const zero = number('0');
	if (parameterCondition([greaterThan(node, zero)])?.kind === 'always') return 'positive';
	if (parameterCondition([lessThan(node, zero)])?.kind === 'always') return 'negative';
	return null;
}

/**
 * Un terme écrit « facteur fait de lettres × reste » : `kx` → (k, x),
 * `(k² + 1)/x` → (k² + 1, 1/x), `−k x²` → (−k, x²). `null` sans un tel facteur.
 */
function parameterFactor(
	term: MathNode,
	variable: string
): { readonly constant: MathNode; readonly rest: MathNode } | null {
	if (isOpposite(term)) {
		const inner = parameterFactor(term.operand, variable);
		return inner && { constant: opposite(inner.constant), rest: inner.rest };
	}
	const hasVariable = (node: MathNode) => getVariables(node).has(variable);
	const top = isDivision(term) ? term.numerator : term;
	const factors = flattenProductShallow(top);
	const constant = unflattenProduct(factors.filter(({ factor }) => !hasVariable(factor)));
	// Un facteur numérique seul (2x) n'est pas un facteur de lettres
	if (constant === null || getVariables(constant).size === 0) return null;
	const others = factors.filter(({ factor }) => hasVariable(factor));
	const restTop = others.length === 0 ? number('1') : unflattenProduct(others);
	if (restTop === null) return null;
	const rest = isDivision(term) ? fraction(restTop, term.denominator) : restTop;
	return { constant, rest };
}

/**
 * La limite d'un terme : celle du moteur ; sinon, pour c·g (c fait de lettres),
 * 0 quand g → 0 (quel que soit c), ±∞ quand g → ±∞ et que le signe de c ne
 * dépend pas des lettres. Une limite finie non nulle de g reste au moteur.
 */
function termLimit(
	term: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const direct = concludedValue(limitOf(term, variable, approach, direction));
	if (direct !== null) return direct;
	const split = parameterFactor(term, variable);
	if (split === null) return null;
	const inner = concludedValue(limitOf(split.rest, variable, approach, direction));
	if (inner === null) return null;
	if (isZeroValue(inner)) return number('0');
	if (!isInfinity(inner)) return null;
	const sign = constantSign(split.constant);
	if (sign === null) return null;
	return infinity(sign === inner.sign ? 'positive' : 'negative');
}

/**
 * La limite, valable pour toute valeur des lettres, d'une expression que le
 * moteur refuse : une somme dont chaque terme a sa limite (`termLimit`). Les
 * infinis de même signe l'emportent ; ∞ − ∞ refuse ; parmi les valeurs finies,
 * au plus une non nulle (les autres valent 0). `null` sinon.
 */
export function limitForEveryParameter(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	const body = isDelimiter(expr) ? expr.content : expr;
	const terms = flattenSumShallow(body).map(({ sign, term }) =>
		sign === '-' ? opposite(term) : term
	);
	const limits: MathNode[] = [];
	for (const term of terms) {
		const limit = termLimit(term, variable, approach, direction);
		if (limit === null) return null;
		limits.push(limit);
	}
	const infinite = limits.filter(isInfinity);
	if (infinite.length > 0) {
		const signs = new Set(infinite.map((limit) => limit.sign));
		return signs.size === 1 ? infinite[0] : null;
	}
	const nonZero = limits.filter((limit) => !isZeroValue(limit));
	if (nonZero.length > 1) return null;
	return nonZero[0] ?? number('0');
}

/**
 * La condition sur les lettres sous laquelle `value` est la limite de `expr`.
 * `null` : on ne sait pas l'écrire (plusieurs lettres, condition introuvable),
 * ou la vérification aux valeurs d'essai la contredit — l'appelant refuse.
 *
 * - une limite infinie : aucune condition (le moteur refuse déjà ce qui
 *   dépend du signe d'une lettre) ;
 * - sinon, la valeur doit exister : `1/k` → k ≠ 0, `ln k` → k > 0,
 *   `tan k` → k ≠ π/2 + nπ ;
 * - une valeur exclue où l'expression tapée n'existe déjà pas ne se redit pas
 *   (`x/k` en 1 → 1/k, sans « k ≠ 0 »).
 */
export function limitParameterCondition(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection,
	value: MathNode
): LimitParameterCondition | null {
	if (isInfinity(value)) return { kind: 'always' };
	const letters = limitParameters(value, variable);
	const written = valueCondition(value, letters);
	if (written === null) return null;
	const accepts = (assignment: Record<string, number>): boolean =>
		written.domain === null || containsValue(written.domain, assignment[letters[0]]);
	if (!agreesOnSamples(expr, variable, approach, direction, value, accepts)) return null;
	if (written.condition.kind === 'always') return written.condition;
	if (
		written.domain !== null &&
		excludedOnlyWhereUndefined(expr, variable, letters[0], written.domain)
	) {
		return { kind: 'always' };
	}
	return written.condition;
}

/**
 * La condition d'existence de la valeur, écrite, et l'ensemble des valeurs
 * admises pour sa lettre (`null` : aucune lettre restreinte).
 */
function valueCondition(
	value: MathNode,
	letters: readonly string[]
): { readonly condition: LimitParameterCondition; readonly domain: Domain | null } | null {
	if (letters.length === 0) return { condition: { kind: 'always' }, domain: null };
	const condition = parameterCondition([], [value]);
	if (condition?.kind === 'always') return { condition, domain: null };
	if (letters.length !== 1) return null;
	const [letter] = letters;
	const definition = computeDomain(value, letter);
	if (definition.unresolved !== undefined && definition.unresolved.length > 0) return null;
	const { domain } = definition;
	if (condition?.kind === 'when') {
		return { condition: writtenCondition(condition.node), domain };
	}
	if (condition === null && domain.kind === 'periodic_exclusion') {
		return { condition: periodicCondition(letter, domain, value), domain };
	}
	return null;
}

/** Une condition écrite. */
type WrittenCondition = Extract<LimitParameterCondition, { kind: 'when' }>;

/** Les relations d'une condition, écrites pour le texte de la ligne. */
const RELATION_TEXT: Readonly<Record<string, string>> = {
	'!=': '≠',
	'>=': '⩾',
	'<=': '⩽',
	'>': '>',
	'<': '<',
	'=': '='
};

/** `k ≠ 0` en LaTeX (fractions en `\dfrac`) et en texte (`k ≠ 0`, `k > 0 et k ≠ 1`). */
function writtenCondition(node: MathNode): WrittenCondition {
	const shown = transformAST(node, {
		leaveDivision: (division) => ({ ...division, displayStyle: 'fraction' as const })
	});
	return { kind: 'when', latex: toLatex(shown), text: conditionText(node) };
}

function conditionText(node: MathNode): string {
	if (isLogical(node)) {
		const joiner = node.operator === 'and' ? ' et ' : ' ou ';
		return `${conditionText(node.left)}${joiner}${conditionText(node.right)}`;
	}
	if (!isRelation(node)) return plainText(node);
	const { operands, relations } = flattenRelationChain(node);
	return operands
		.map((operand, i) =>
			i === 0
				? plainText(operand)
				: `${RELATION_TEXT[relations[i - 1]] ?? relations[i - 1]} ${plainText(operand)}`
		)
		.join(' ');
}

/** Un membre de condition en syntaxe maison, π écrit π. */
function plainText(node: MathNode): string {
	return toCustom(node).replace(/\\pi(?![A-Za-z])/g, 'π');
}

/** `k ≠ π/2 + nπ, n ∈ ℤ` : une lettre hors d'une famille de points. */
function periodicCondition(
	letter: string,
	domain: PeriodicExclusion,
	value: MathNode
): WrittenCondition {
	const used = getVariables(value);
	const integer = INTEGER_LETTERS.find((name) => name !== letter && !used.has(name)) ?? 'n';
	const member = add(domain.basePoint, implicitMultiply(variableNode(integer), domain.period));
	const written = writtenCondition(relation('!=', variableNode(letter), member));
	return {
		kind: 'when',
		latex: `${written.latex},\\ ${integer} \\in \\mathbb{Z}`,
		text: `${written.text}, ${integer} ∈ ℤ`
	};
}

/**
 * La limite trouvée est-elle celle que le moteur calcule, les lettres
 * remplacées par des valeurs d'essai admises ? Un essai que le moteur ne
 * conclut pas ne compte pas ; une valeur différente fait refuser.
 */
function agreesOnSamples(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection,
	value: MathNode,
	accepts: (assignment: Record<string, number>) => boolean
): boolean {
	const letters = limitParameters(expr, variable);
	if (letters.length === 0) return true;
	for (let i = 0; i < SAMPLE_VALUES.length; i++) {
		const assignment: Record<string, number> = {};
		letters.forEach((letter, j) => {
			assignment[letter] = SAMPLE_VALUES[(i + 3 * j) % SAMPLE_VALUES.length];
		});
		if (!accepts(assignment)) continue;
		const expected = numericValue(substitute(value, assignment));
		const computed = concludedValue(
			limitOf(substitute(expr, assignment), variable, approach, direction)
		);
		if (computed === null || expected === null) continue;
		if (isInfinity(computed)) return false;
		const actual = numericValue(computed);
		if (actual === null) continue;
		if (Math.abs(actual - expected) > 1e-9 * Math.max(1, Math.abs(expected))) return false;
	}
	return true;
}

/** La valeur décimale d'une expression sans lettre, `null` si elle n'en a pas. */
function numericValue(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Les valeurs exclues de la lettre sont-elles toutes des points où
 * l'expression tapée n'existe pour aucun x ? (`x/k` : k = 0 donne x/0.)
 * Seulement pour ℝ privé de points.
 */
function excludedOnlyWhereUndefined(
	expr: MathNode,
	variable: string,
	letter: string,
	domain: Domain
): boolean {
	const points = excludedPointsOfRealLine(domain);
	if (points === null || points.length === 0) return false;
	return points.every((point) => {
		const definition = computeDomain(substitute(expr, { [letter]: point }), variable);
		const unresolved = definition.unresolved !== undefined && definition.unresolved.length > 0;
		return !unresolved && isEmpty(definition.domain);
	});
}

/** Les points ôtés de ℝ (ℝ \ {0 ; 1}), `null` pour tout autre ensemble. */
function excludedPointsOfRealLine(domain: Domain): number[] | null {
	if (domain.kind !== 'interval_set' || domain.intervals.length === 0) return null;
	const { intervals } = domain;
	const first = intervals[0];
	const last = intervals[intervals.length - 1];
	if (!isInfinity(first.lower.value) || !isInfinity(last.upper.value)) return null;
	const points: number[] = [];
	for (let i = 1; i < intervals.length; i++) {
		const before = numericValue(intervals[i - 1].upper.value);
		const after = numericValue(intervals[i].lower.value);
		if (before === null || after === null || before !== after) return null;
		points.push(before);
	}
	for (const excluded of domain.excludedPoints) {
		const point = numericValue(excluded.value);
		if (point === null) return null;
		points.push(point);
	}
	return points;
}
