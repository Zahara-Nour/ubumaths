/**
 * Pedagogical Solve — Shared helpers
 *
 * Reusable building blocks shared between the linear and quadratic pipelines.
 *
 * Conventions :
 * - Every helper that produces a `MathNode` or `RelationNode` returns the
 *   canonicalized form (`denormalize ∘ normalize`) so consumers can rely on
 *   structural equality of equivalent expressions.
 * - Helpers are pure (no side effect, no I/O).
 *
 * @module mathAST/pedagogical-solve/_helpers
 */

import type { MathNode, RelationNode } from '../types';
import type { Domain, IntervalSet } from '../domain/types';
import type { Verbosity } from '../common/verbosity';
import {
	add,
	divide,
	multiply,
	number,
	opposite,
	relation,
	subtract,
	variable as varNode
} from '../factory';
import { computeDomain } from '../domain/compute';
import { isUniversal } from '../domain/algebra';
import { flattenSumShallow } from '../flatten';
import { containsVariable } from '../common/contains-variable';
import { unwrapGrouping, unwrapGroupingMembers } from '../solve/classify';
import { canonicalForm } from '../normal';
import { constantSign } from '../common/constant-sign';
import { literalNumberValue } from '../common/numeric';
import { tidy } from '../tidy';
import { InequalityNotSolvable } from '../solve/inequality/types';
import { getVariables } from '../eval/substitute';
import { toLatex } from '../latex-generator';
import { exactValueToShow } from '../eval/exact-value';
import { hasDecimalLiteral } from '../tidy/decimal';
import type { EquationOperation, EquationStep } from './types';

// =============================================================================
// Canonicalization
// =============================================================================

/** Canonicalize a RelationNode by canonicalizing both sides. */
export function canonEquation(eq: RelationNode): RelationNode {
	return relation(eq.relation, canonicalForm(eq.left), canonicalForm(eq.right));
}

// =============================================================================
// Premier degré : préconditions sur la forme des membres
// =============================================================================

/**
 * Un terme en x n'est pas de la forme `a·x` : les étapes du premier degré ne
 * savent pas le raconter (il faudrait d'abord développer).
 *
 * Levée plutôt que de conclure faux. Mesuré avant cette garde (2026-10-08) :
 * `2(x-1)=4` concluait `x = 2x/(x-1)`, `-(x-3)=0` concluait `x = 0` — le
 * coefficient de x était lu comme `terme / x` sans vérifier qu'il est constant.
 */
export class UndevelopedLinearForm extends Error {
	constructor(public readonly term: MathNode) {
		super(
			`pedagogical-solve: le terme ${toLatex(term)} n'est pas de la forme a·x (forme non développée).`
		);
		this.name = 'UndevelopedLinearForm';
	}
}

/**
 * Prépare une relation du premier degré pour ses étapes, ou lève
 * `UndevelopedLinearForm`.
 *
 * 1. Un membre ENTIÈREMENT parenthésé se raconte comme son contenu :
 *    `(2x-4)=0` a les étapes de `2x-4=0` — comme le solveur le lit (#860).
 *    Sans cela, `flattenSumShallow`, qui s'arrête aux délimiteurs, voit
 *    `(2x-4)` comme UN terme en x, de « coefficient » `(2x-4)/x`.
 * 2. Chaque terme en x de chaque membre doit alors être `a·x`, `a` constant.
 *    Sinon (`2(x-1)`, `-(x-3)`, `(2x-4)/2`), aucune étape plutôt que des
 *    étapes fausses : l'appelant se replie sur la réponse du moteur.
 */
export function prepareLinearRelation(rel: RelationNode, variable: string): RelationNode {
	const unwrapped = unwrapGroupingMembers(rel);
	const term = undevelopedTerm(unwrapped, variable);
	if (term !== null) throw new UndevelopedLinearForm(term);
	return unwrapped;
}

/** Un terme en x d'un membre qui n'est pas de la forme `a·x`, ou `null`. */
export function undevelopedTerm(rel: RelationNode, variable: string): MathNode | null {
	for (const side of [rel.left, rel.right]) {
		for (const { term } of flattenSumShallow(side)) {
			if (!isLinearTerm(term, variable)) return term;
		}
	}
	return null;
}

/** Sans x, ou de la forme `a·x` avec `a` constant. */
export function isLinearTerm(term: MathNode, variable: string): boolean {
	if (!containsVariable(term, variable)) return true;
	return !containsVariable(canonicalForm(divide(term, varNode(variable), 'fraction')), variable);
}

// =============================================================================
// Coefficient écrit en fraction : on multiplie par l'inverse (Q51)
// =============================================================================

/**
 * Un coefficient constant écrit en fraction d'entiers : `\frac{2}{3}`,
 * `-\frac{1}{2}`. Un décimal (`0,5`), un entier ou une fraction qui porte une
 * racine (`\frac{\sqrt{2}}{2}`) ne l'est pas.
 */
export function isFractionWritten(node: MathNode): boolean {
	if (node.type === 'opposite') return isFractionWritten(node.operand);
	// `(\\frac{1}{2})(x+1)` : la fraction entre parenthèses
	if (unwrapGrouping(node) !== node) return isFractionWritten(unwrapGrouping(node));
	const isInteger = (n: MathNode): boolean =>
		n.type === 'opposite' ? isInteger(n.operand) : n.type === 'number' && /^\d+$/.test(n.value);
	return node.type === 'division' && isInteger(node.numerator) && isInteger(node.denominator);
}

/**
 * Un terme en x écrit avec une fraction : l'inconnue divisée (`x/4`,
 * `\frac{2x}{3}`) ou un coefficient fraction (`\frac{2}{3}x`).
 */
function isFractionWrittenXTerm(term: MathNode, variable: string): boolean {
	if (term.type === 'opposite') return isFractionWrittenXTerm(term.operand, variable);
	if (term.type === 'division') {
		return (
			containsVariable(term.numerator, variable) &&
			!containsVariable(term.denominator, variable) &&
			!hasDecimalLiteral(term)
		);
	}
	if (term.type === 'multiplication') {
		return isFractionWritten(term.left) && containsVariable(term.right, variable);
	}
	return false;
}

/**
 * Le facteur par lequel multiplier les deux membres pour défaire le
 * coefficient `a` de `a·x = b`, ou `null` s'il faut diviser par `a`.
 *
 * Q51 (David, 2026-10-25 : « x/4 = 0,5 doit être résolu en multipliant par
 * 4 ») : on multiplie par l'inverse quand `a` est une fraction non entière et
 * que les termes en x de la relation tapée sont écrits en fraction (`x/4`,
 * `\frac{2}{3}x`) — aucun avec un décimal : `0,5x = 1` se divise par 0,5.
 * `canon` récrit `0,25x` en `\frac{1}{4}x` : l'écriture se lit sur `written`.
 */
export function inverseFactor(
	coefficient: MathNode,
	written: RelationNode,
	variable: string
): MathNode | null {
	if (!isFractionWritten(coefficient)) return null;
	const xTerms = [written.left, written.right].flatMap((side) =>
		flattenSumShallow(side)
			.map(({ term }) => term)
			.filter((term) => containsVariable(term, variable))
	);
	if (xTerms.some(hasDecimalLiteral)) return null;
	if (!xTerms.some((term) => isFractionWrittenXTerm(term, variable))) return null;
	return canonicalForm(divide(number(1), coefficient, 'fraction'));
}

/**
 * Inéquation dont l'écriture a des valeurs interdites : `InequalityNotSolvable`.
 *
 * Le pipeline du premier degré lit la forme canonique, où `\frac{3x^2}{2x}`
 * devient `\frac{3}{2}x` : la valeur interdite 0 disparaît, et
 * `\frac{3x^2}{2x}\geq 0` concluait x ≥ 0 (écart V47, 2026-10-13). Sa
 * conclusion est une forme résolue (`x ≥ 0`), qui ne peut pas exclure un
 * point : il refuse, l'appelant se replie sur `solveInequality`, qui lit le
 * domaine sur l'inéquation écrite. Le second degré refuse aussi (V48) :
 * sa conclusion lue sur `solveInequality` était juste, mais ses étapes
 * rédigeaient `\frac{2x^3}{x}<2` comme 2x² − 2 < 0 sans exclure 0.
 */
export function rejectForbiddenValues(inequality: RelationNode, variable: string): void {
	const { domain, unresolved } = computeDomain(
		subtract(inequality.left, inequality.right),
		variable
	);
	if (!isUniversal(domain) || (unresolved !== undefined && unresolved.length > 0)) {
		throw new InequalityNotSolvable(
			"L'inéquation a des valeurs interdites : ses étapes du premier ou du second degré les perdraient",
			'Repli sur solveInequality, qui lit le domaine de définition.'
		);
	}
}

// =============================================================================
// Bilateral operations on equations
// =============================================================================

/** Add `operand` to both sides and canonicalize the result. */
export function addToBothSides(eq: RelationNode, operand: MathNode): RelationNode {
	return canonEquation(relation(eq.relation, add(eq.left, operand), add(eq.right, operand)));
}

/** Divide both sides by `divisor` and canonicalize. */
export function divideBothSides(eq: RelationNode, divisor: MathNode): RelationNode {
	return canonEquation(
		relation(
			eq.relation,
			divide(eq.left, divisor, 'fraction'),
			divide(eq.right, divisor, 'fraction')
		)
	);
}

/**
 * Divide both sides by `divisor` and, for inequalities, flip the operator if
 * the divisor is negative. Returns the resulting relation along with a
 * `flipped` flag indicating whether the operator was inverted (`<` → `>`,
 * etc.). For `=` and `!=` the flag is always `false`.
 *
 * Le signe se lit sur la VALEUR du diviseur (`constantSign`), pas sur la forme
 * de son nœud : `-\frac23`, `\frac{-3}{4}`, `-\sqrt2` sont négatifs (écart V36,
 * où seuls `number` / `opposite(number)` étaient vus). Signe indécidable
 * (diviseur symbolique) sur `<`, `>`, `<=`, `>=` → `InequalityNotSolvable` :
 * mieux vaut aucune correction pédagogique qu'un sens deviné.
 */
export function divideBothSidesWithFlip(
	ineq: RelationNode,
	divisor: MathNode
): { result: RelationNode; flipped: boolean } {
	const ordering =
		ineq.relation === '<' ||
		ineq.relation === '>' ||
		ineq.relation === '<=' ||
		ineq.relation === '>=';
	const sign = ordering ? constantSign(divisor) : null;
	if (ordering && sign === null) {
		throw new InequalityNotSolvable(
			`Signe du diviseur indécidable : ${toLatex(divisor)}`,
			'Le sens de l’inégalité dépend du signe du diviseur.'
		);
	}
	const shouldFlip = sign === -1;

	const newRelation = shouldFlip ? flipRelation(ineq.relation) : ineq.relation;
	const result = canonEquation(
		relation(
			newRelation,
			divide(ineq.left, divisor, 'fraction'),
			divide(ineq.right, divisor, 'fraction')
		)
	);
	return { result, flipped: shouldFlip };
}

/**
 * Multiplier ou diviser les deux membres par `factor` retourne-t-il le sens ?
 * Oui pour une inégalité (`<`, `>`, `≤`, `≥`) et un facteur négatif ; signe
 * indécidable → `InequalityNotSolvable`, mieux vaut aucune étape qu'un sens
 * deviné. Jamais pour `=` ni `≠`.
 */
export function flipsOrdering(rel: RelationNode['relation'], factor: MathNode): boolean {
	const ordering = rel === '<' || rel === '>' || rel === '<=' || rel === '>=';
	if (!ordering) return false;
	const sign = constantSign(factor);
	if (sign === null) {
		throw new InequalityNotSolvable(
			`Signe du facteur indécidable : ${toLatex(factor)}`,
			'Le sens de l’inégalité dépend du signe du facteur.'
		);
	}
	return sign === -1;
}

/**
 * Flip a strict/non-strict inequality operator. `=` and `!=` are returned
 * unchanged. Throws on unknown relation strings.
 */
export function flipRelation(rel: string): RelationNode['relation'] {
	switch (rel) {
		case '<':
			return '>';
		case '>':
			return '<';
		case '<=':
			return '>=';
		case '>=':
			return '<=';
		case '=':
		case '!=':
			return rel;
		default:
			throw new Error(`flipRelation: unsupported relation '${rel}'`);
	}
}

// =============================================================================
// Number literal predicates
// =============================================================================

/** True when a MathNode is a number literal equal to 1. */
export function isOne(node: MathNode): boolean {
	return node.type === 'number' && node.value === '1';
}

/** True when a MathNode is a number literal equal to 0. */
export function isZero(node: MathNode): boolean {
	return node.type === 'number' && node.value === '0';
}

/**
 * True when a coefficient carries no symbolic variable. Used by the quadratic
 * pipelines (equation + inequality) to reject parametric coefficients in V1.
 */
export function isConstantCoefficient(coeff: MathNode): boolean {
	return getVariables(coeff).size === 0;
}

// =============================================================================
// Terme déplacé d'un membre à l'autre : son signe
// =============================================================================

/**
 * Valeur absolue d'un terme qui s'écrit avec un signe moins en tête, ou `null`
 * s'il s'écrit sans signe : `-5` → `5`, `-2x` (produit `(-2)·x`) → `2x`,
 * `-\dfrac{1}{2}x` → `\dfrac{1}{2}x`, `\left(-1-\sqrt{2}\right)x` →
 * `\left(1+\sqrt{2}\right)x`. Sert à écrire « − 2x » plutôt que « + −2x ».
 *
 * ⚠️ Lire le signe du seul nombre ou du seul `opposite(…)` laissait passer
 * `-2x` pour positif : « On ajoute -2x », `\textcolor{blue}{+ -2x}` (V50).
 * Un facteur de tête qui est une SOMME (coefficient irrationnel) se lit sur sa
 * valeur (`constantSign`), pas sur sa forme. Le produit se reconstruit
 * facteur par facteur : `canon` du terme entier redévelopperait
 * `(\pi - 4)x` en `\pi x - 4x`. Une somme seule (`1 - \sqrt{2}`) n'est pas
 * lue : sa valeur absolue s'écrirait sans parenthèses après le « − ».
 */
export function negativeTermMagnitude(term: MathNode): MathNode | null {
	switch (term.type) {
		case 'opposite':
			return term.operand;
		case 'multiplication': {
			const leading = term.left;
			const leadingMagnitude =
				leading.type === 'addition' || leading.type === 'subtraction'
					? constantSign(leading) === -1
						? tidy(canonicalForm(opposite(leading)))
						: null
					: negativeTermMagnitude(leading);
			if (leadingMagnitude === null) return null;
			if (isOne(leadingMagnitude)) return term.right;
			return multiply(leadingMagnitude, term.right, term.displayStyle);
		}
		case 'division':
			return negativeTermMagnitude(term.numerator) !== null ? canonicalForm(opposite(term)) : null;
		default: {
			const numeric = literalNumberValue(term);
			return numeric !== null && numeric < 0 ? canonicalForm(opposite(term)) : null;
		}
	}
}

/**
 * Le terme à ajouter aux deux membres pour faire passer `part` de l'autre
 * côté : son opposé, ou `null` s'il est nul (« On ajoute 0 » n'est pas une
 * étape : `5x - 0 = x + 1`). Une somme de termes en x (`-\pi x + 4x`, ce que
 * `canon` fait de `-(\pi - 4)x`) s'écrit factorisée, `\left(4 - \pi\right)x`, et un
 * coefficient somme rangé par `tidy` (`\left(\sqrt{2} - 1\right)x`).
 */
export function movedTerm(part: MathNode | null, variable: string): MathNode | null {
	if (part === null) return null;
	const moved = canonicalForm(opposite(part));
	if (isZero(moved)) return null;
	const isSum = (node: MathNode) => node.type === 'addition' || node.type === 'subtraction';
	const sumCoefficient = isSum(moved) || (moved.type === 'multiplication' && isSum(moved.left));
	if (sumCoefficient && containsVariable(moved, variable)) {
		const coefficient = canonicalForm(divide(moved, varNode(variable), 'fraction'));
		if (!containsVariable(coefficient, variable)) {
			// `tidy` range la somme : `\sqrt{2} - 1`, pas `-1 + \sqrt{2}` (ordre de `canon`).
			return multiply(tidy(coefficient), varNode(variable), 'implicit');
		}
	}
	return moved;
}

/**
 * Déplacer un terme vers l'autre membre : on ajoute son opposé, écrit comme
 * une soustraction quand cet opposé est négatif (« on soustrait 2x »), pour
 * que l'opérande affiché ne porte jamais de signe moins.
 */
export function chooseAddOrSubtract(operand: MathNode): {
	kind: 'add-both-sides' | 'subtract-both-sides';
	displayOperand: MathNode;
} {
	const magnitude = negativeTermMagnitude(operand);
	if (magnitude !== null) return { kind: 'subtract-both-sides', displayOperand: magnitude };
	return { kind: 'add-both-sides', displayOperand: operand };
}

// =============================================================================
// Step builder + renumbering
// =============================================================================

/**
 * Construct an `EquationStep` with the optional fields normalized — `operation`
 * and `subSteps` are spread only when present (and `subSteps` only when
 * non-empty), matching the JSON shape the renderer expects.
 */
export function makeStep(args: {
	id: number;
	rule: string;
	description: string;
	before: RelationNode;
	after: RelationNode;
	operation?: EquationOperation;
	verbosityLevel?: Verbosity;
	subSteps?: readonly EquationStep[];
}): EquationStep {
	return {
		id: args.id,
		rule: args.rule,
		description: args.description,
		before: args.before,
		after: args.after,
		verbosityLevel: args.verbosityLevel ?? 'detailed',
		...(args.operation !== undefined && { operation: args.operation }),
		...(args.subSteps !== undefined && args.subSteps.length > 0 && { subSteps: args.subSteps })
	};
}

/**
 * Renumber a step tree so top-level steps get IDs 1, 2, 3, … and each parent's
 * substeps restart at 1. Applied as a final pass after assembly because the
 * generation order does not always match the desired top-level order
 * (substeps may be created before their wrapping group step).
 */
export function renumberSteps(steps: readonly EquationStep[]): readonly EquationStep[] {
	return steps.map((step, i) => renumberStep(step, i + 1));
}

function renumberStep(step: EquationStep, id: number): EquationStep {
	const renumberedSubs = step.subSteps?.map((sub, j) => renumberStep(sub, j + 1));
	return {
		...step,
		id,
		...(renumberedSubs !== undefined && { subSteps: renumberedSubs })
	};
}

// =============================================================================
// Domain → French description (shared by quadratic + rational pipelines)
// =============================================================================

/**
 * Convert a `Domain` into a human-readable French description :
 *   - empty           → "∅"
 *   - universal       → "ℝ"
 *   - interval set    → "]a ; b[", "]a ; b[ ∪ ]c ; d[", "{a}", "ℝ \\ {a, b}"
 *
 * Used by `inequality-conclude-quadratic.solutionDescription` (palier 2b),
 * `inequality-conclude-from-isolated-square` (palier 2c), and
 * `inequality-conclude-rational` (palier 3) for the step description and the
 * renderer's title.
 *
 * Les bornes s'écrivent comme les solutions d'une équation (Q50,
 * `exactValueToShow`) : `]−√2/2 ; √2/2[`, une vraie fraction au lieu de
 * `1 / 2`, et en décimal quand l'inéquation tape un décimal (`decimal`).
 */
export function describeDomain(domain: Domain, options: { decimal?: boolean } = {}): string {
	const latexBound = (node: MathNode): string => boundLatex(node, options.decimal ?? false);
	if (domain.kind === 'empty') return '∅';
	if (domain.kind === 'universal') return 'ℝ';
	if (domain.kind !== 'interval_set') return 'ℝ';

	const set = domain as IntervalSet;
	const intervals = set.intervals;
	const excluded = set.excludedPoints;

	// === All-real shapes ===
	// (a) `[(]-∞, +∞[)]` with no excluded points → "ℝ"
	if (
		intervals.length === 1 &&
		excluded.length === 0 &&
		isInfinite(intervals[0].lower.value, 'lower') &&
		isInfinite(intervals[0].upper.value, 'upper')
	) {
		return 'ℝ';
	}
	// (b) `[(]-∞, +∞[)]` with excluded points → "ℝ \ {a, b}"
	if (
		intervals.length === 1 &&
		isInfinite(intervals[0].lower.value, 'lower') &&
		isInfinite(intervals[0].upper.value, 'upper') &&
		excluded.length > 0
	) {
		const points = excluded.map((ep) => latexBound(ep.value)).join(' ; ');
		return `ℝ \\ {${points}}`;
	}
	// (c) Multi-interval covering all of ℝ minus a few points :
	//     `]-∞, a[ ∪ ]a, +∞[`     → "ℝ \ {a}"
	//     `]-∞, a[ ∪ ]a, b[ ∪ ]b, +∞[` → "ℝ \ {a, b}"
	if (excluded.length === 0 && intervals.length >= 2) {
		const allOpen = intervals.every(
			(int) => int.lower.type === 'open' && int.upper.type === 'open'
		);
		const firstStartsAtMinusInf = isInfinite(intervals[0].lower.value, 'lower');
		const lastEndsAtPlusInf = isInfinite(intervals[intervals.length - 1].upper.value, 'upper');
		// Detect contiguity : upper[i] == lower[i+1] (open both sides → single
		// excluded point between consecutive intervals).
		let contiguous = true;
		const missingPoints: MathNode[] = [];
		for (let i = 0; i < intervals.length - 1; i++) {
			const upper = intervals[i].upper.value;
			const nextLower = intervals[i + 1].lower.value;
			if (latexBound(upper) !== latexBound(nextLower)) {
				contiguous = false;
				break;
			}
			missingPoints.push(upper);
		}
		if (allOpen && firstStartsAtMinusInf && lastEndsAtPlusInf && contiguous) {
			const pts = missingPoints.map(latexBound).join(' ; ');
			return `ℝ \\ {${pts}}`;
		}
	}

	// === Single closed-degenerate interval `[a, a]` — display as `{a}` ===
	if (intervals.length === 1 && excluded.length === 0) {
		const int = intervals[0];
		if (
			int.lower.type === 'closed' &&
			int.upper.type === 'closed' &&
			!isInfinite(int.lower.value, 'lower') &&
			!isInfinite(int.upper.value, 'upper')
		) {
			const lo = latexBound(int.lower.value);
			const hi = latexBound(int.upper.value);
			if (lo === hi) return `{${lo}}`;
		}
	}

	// === Generic union of intervals ===
	const parts = intervals.map((int) => formatInterval(int, latexBound));
	return parts.join(' ∪ ');
}

function isInfinite(value: MathNode, side: 'lower' | 'upper'): boolean {
	if (value.type !== 'infinity') return false;
	const sign = (value as { sign?: string }).sign;
	if (side === 'lower') return sign === 'negative';
	return sign === 'positive' || sign === undefined;
}

function boundLatex(node: MathNode, decimal: boolean): string {
	if (node.type === 'infinity') {
		const sign = (node as { sign?: string }).sign;
		return sign === 'negative' ? '-∞' : '+∞';
	}
	return toLatex(exactValueToShow(node, { decimal })).replace(/\\infty/g, '∞');
}

function formatInterval(
	int: {
		lower: { value: MathNode; type: 'open' | 'closed' };
		upper: { value: MathNode; type: 'open' | 'closed' };
	},
	latexBound: (node: MathNode) => string
): string {
	const lo = isInfinite(int.lower.value, 'lower') ? '-∞' : latexBound(int.lower.value);
	const hi = isInfinite(int.upper.value, 'upper') ? '+∞' : latexBound(int.upper.value);
	const lb = int.lower.type === 'closed' ? '[' : ']';
	const rb = int.upper.type === 'closed' ? ']' : '[';
	return `${lb}${lo} ; ${hi}${rb}`;
}

/**
 * Échappe les accolades d'ENSEMBLE (`{2}`, `ℝ \ {0}`), jamais celles d'un
 * groupe LaTeX : une borne `\sqrt{2}` vient de `toLatex`. Les échapper toutes
 * affichait `]-∞ ; -\sqrt\{2\}[`, soit « √{2} » à l'écran, sur `x² > 2`
 * (revue, 2026-10-08). Une accolade ouvre un groupe LaTeX quand elle suit
 * une commande (`\sqrt`), une autre accolade (`\dfrac{a}{b}`), `^` ou `_`.
 */
function escapeSetBraces(s: string): string {
	const opened: boolean[] = [];
	let out = '';
	for (let i = 0; i < s.length; i++) {
		const char = s[i];
		if (char === '{') {
			const before = s.slice(0, i);
			const isGroup = /\\[A-Za-z]+$/.test(before) || /[}^_]$/.test(before);
			opened.push(!isGroup);
			out += isGroup ? '{' : '\\{';
		} else if (char === '}') {
			out += opened.pop() === true ? '\\}' : '}';
		} else {
			out += char;
		}
	}
	return out;
}

/**
 * La description d'un ensemble de solutions (`describeDomain`, Unicode : `∅`,
 * `ℝ \ {0}`, `∪`, `∞`) en LaTeX. Sert au bloc de conclusion et, entre `$…$`,
 * aux titres et descriptions (V25 : la prose est rendue par `InlineMarkdown`).
 */
export function domainDescriptionLatex(s: string): string {
	// Accolades d'ensemble d'abord (`{2}`, `ℝ \ {0}`) ; celles des bornes
	// (`\sqrt{2}`) et des macros introduites ensuite restent des groupes.
	return (
		escapeSetBraces(s)
			// ℝ privé de points : `\left\{ a \,;\, b \right\}`, comme le LaTeX
			// du moteur (`solve-latex.ts`)
			.replace(
				/ℝ\s*\\\s*\\\{(.*?)\\\}/g,
				(_, points: string) =>
					`\\mathbb{R} \\setminus \\left\\{ ${points.split(' ; ').join(' \\,;\\, ')} \\right\\}`
			)
			.replace(/∪/g, '\\cup')
			.replace(/∅/g, '\\emptyset')
			.replace(/ℝ\s*\\\s*/g, '\\mathbb{R} \\setminus ')
			.replace(/ℝ/g, '\\mathbb{R}')
			.replace(/∞/g, '\\infty')
	);
}
