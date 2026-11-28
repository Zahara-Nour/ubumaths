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
import { containsValue, intersect, isEmpty } from '../domain/algebra';
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
 * moteur refuse : une somme dont chaque terme a sa limite (`termLimit`) ;
 * sinon, d'un seul côté d'un point fini, la limite des deux côtés
 * (`twoSidedLimit`). `null` sinon. La condition sur les lettres et les
 * valeurs d'essai restent à `limitParameterCondition`.
 */
export function limitForEveryParameter(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	return (
		sumLimit(expr, variable, approach, direction) ??
		twoSidedLimit(expr, variable, approach, direction)
	);
}

/**
 * L121 : d'un seul côté d'un point fini, la limite FINIE des deux côtés,
 * quand le moteur la trouve — elle vaut aussi d'un côté. `x/(kx + x²)` en
 * 0⁺ : la substitution de 0⁺ bute sur le signe inconnu de k·0⁺, alors que
 * la limite des deux côtés (L'Hôpital) donne 1/k. Une limite trouvée d'un
 * seul côté par le moteur (`definedSide` : ln x en 0) n'en est pas une des
 * deux côtés ; un infini, dont le signe peut dépendre de k, non plus.
 */
function twoSidedLimit(
	expr: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection
): MathNode | null {
	if (direction === 'both' || isInfinity(approach)) return null;
	const result = limitOf(expr, variable, approach, 'both');
	if (result === null || result.definedSide !== undefined) return null;
	const value = concludedValue(result);
	return value === null || isInfinity(value) ? null : value;
}

/**
 * Une somme dont chaque terme a sa limite (`termLimit`). Les infinis de même
 * signe l'emportent ; ∞ − ∞ refuse ; parmi les valeurs finies, au plus une
 * non nulle (les autres valent 0). `null` sinon.
 */
function sumLimit(
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
 * - la valeur, si elle est finie, doit exister : `1/k` → k ≠ 0, `ln k` → k > 0,
 *   `tan k` → k ≠ π/2 + nπ ;
 * - en un point fini, chaque terme pris au point doit exister quand il existe
 *   pour certaines valeurs de k : `x/(x² + k)` en 0 → 0/k, d'où k ≠ 0 ;
 *   `1/x − 1/(x² + k)` en 0⁺ → 1/k (1/0 n'existe pour aucun k : ignoré) ;
 * - toute réponse, infinie comprise, est vérifiée aux valeurs d'essai admises
 *   (k = 0 compris quand rien ne l'exclut) ;
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
	const definedFor = [
		...(isInfinity(value) ? [] : [value]),
		...termsAtPoint(expr, variable, approach)
	];
	const letters = [...new Set(definedFor.flatMap((node) => [...getVariables(node)]))].sort();
	const written = definedCondition(definedFor, letters);
	if (written === null) return null;
	const { domain } = written;
	const accepts = (assignment: Record<string, number>): boolean =>
		domain === null || containsValue(domain, assignment[letters[0]]);
	if (!limitAgreesOnSamples(expr, variable, approach, direction, value, accepts)) return null;
	if (written.condition.kind === 'always') return written.condition;
	if (domain !== null && excludedOnlyWhereUndefined(expr, variable, letters[0], domain)) {
		return { kind: 'always' };
	}
	return written.condition;
}

/**
 * Les termes de `expr` pris au point (fini) qui contiennent une lettre et
 * existent pour au moins une de ses valeurs : `1/(x + k) + 1/(x − k)` en 0 →
 * 1/k, 1/(−k) ; `1/x` en 0 (1/0) n'en est pas. Aucun en un point infini.
 */
function termsAtPoint(expr: MathNode, variable: string, approach: MathNode): MathNode[] {
	if (isInfinity(approach)) return [];
	const body = isDelimiter(expr) ? expr.content : expr;
	return flattenSumShallow(body)
		.map(({ term }) => substitute(term, { [variable]: approach }))
		.filter((term) => {
			const letters = [...getVariables(term)];
			return (
				letters.length > 0 &&
				letters.every((letter) => !isEmpty(computeDomain(term, letter).domain))
			);
		});
}

/**
 * La condition sous laquelle chaque expression de `definedFor` existe, écrite,
 * et l'ensemble des valeurs admises pour la lettre (`null` : aucune
 * restriction). `null` quand on ne sait pas l'écrire.
 */
function definedCondition(
	definedFor: readonly MathNode[],
	letters: readonly string[]
): { readonly condition: LimitParameterCondition; readonly domain: Domain | null } | null {
	if (letters.length === 0) return { condition: { kind: 'always' }, domain: null };
	const condition = parameterCondition([], definedFor);
	if (condition?.kind === 'always') return { condition, domain: null };
	if (letters.length !== 1) return null;
	const [letter] = letters;
	const domain = admittedValues(definedFor, letter);
	if (domain === null) return null;
	if (condition?.kind === 'when') {
		return { condition: writtenCondition(condition.node), domain };
	}
	if (condition === null && domain.kind === 'periodic_exclusion') {
		const used = new Set(definedFor.flatMap((node) => [...getVariables(node)]));
		return { condition: periodicCondition(letter, domain, used), domain };
	}
	return null;
}

/**
 * Les valeurs de la lettre pour lesquelles chaque expression existe ; `null`
 * pour une contrainte non résolue, ou une famille périodique avec une autre
 * restriction (que `intersect` ne sait pas réunir).
 */
function admittedValues(definedFor: readonly MathNode[], letter: string): Domain | null {
	const domains: Domain[] = [];
	for (const node of definedFor) {
		const definition = computeDomain(node, letter);
		if (definition.unresolved !== undefined && definition.unresolved.length > 0) return null;
		const { domain } = definition;
		// La même famille une seule fois (tan k : la valeur et le terme au point)
		if (domain.kind === 'universal' || domains.some((known) => samePeriodicFamily(known, domain))) {
			continue;
		}
		domains.push(domain);
	}
	if (domains.length === 0) return { kind: 'universal' };
	if (domains.length > 1 && domains.some((domain) => domain.kind === 'periodic_exclusion')) {
		return null;
	}
	return domains.reduce((all, domain) => intersect(all, domain));
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
	used: ReadonlySet<string>
): WrittenCondition {
	const integer = INTEGER_LETTERS.find((name) => name !== letter && !used.has(name)) ?? 'n';
	const member = add(domain.basePoint, implicitMultiply(variableNode(integer), domain.period));
	const written = writtenCondition(relation('!=', variableNode(letter), member));
	return {
		kind: 'when',
		latex: `${written.latex},\\ ${integer} \\in \\mathbb{Z}`,
		text: `${written.text}, ${integer} ∈ ℤ`
	};
}

/** Deux exclusions périodiques de même base et même période (valeurs décimales). */
function samePeriodicFamily(a: Domain, b: Domain): boolean {
	if (a.kind !== 'periodic_exclusion' || b.kind !== 'periodic_exclusion') return false;
	const values = [a.basePoint, b.basePoint, a.period, b.period].map(numericValue);
	if (values.some((v) => v === null)) return false;
	const [baseA, baseB, periodA, periodB] = values as number[];
	return Math.abs(baseA - baseB) < 1e-12 && Math.abs(periodA - periodB) < 1e-12;
}

/**
 * La limite trouvée est-elle celle que le moteur calcule, les lettres
 * remplacées par des valeurs d'essai admises (`accepts`) ? Un essai que le
 * moteur refuse (erreur, « je ne sais pas ») ne compte pas ; « pas de
 * limite », une autre valeur, un autre infini ou une valeur finie pour une
 * réponse infinie font refuser.
 */
export function limitAgreesOnSamples(
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
		const result = limitOf(substitute(expr, assignment), variable, approach, direction);
		if (result === null) continue;
		if (result.status === 'does-not-exist') return false;
		const computed = concludedValue(result);
		if (computed === null) continue;
		if (isInfinity(value) || isInfinity(computed)) {
			if (!isInfinity(value) || !isInfinity(computed) || value.sign !== computed.sign) {
				return false;
			}
			continue;
		}
		const expected = numericValue(substitute(value, assignment));
		const actual = numericValue(computed);
		if (expected === null || actual === null) continue;
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
