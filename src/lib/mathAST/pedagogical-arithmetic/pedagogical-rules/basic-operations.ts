/**
 * Pedagogical Rules — Basic Operations (Phase 3)
 *
 * Atomic binary operations + grouping + trivial simplifications, all with
 * per-`SchoolLevel` descriptions and priority hints for the deterministic
 * rewrite engine.
 *
 * Rule families :
 * - **Atomic binary** (`evaluateBinary{Add,Sub,Mul,Div}`) — exact evaluation
 *   of `number ⊕ number` for the four basic operations.
 * - **Grouping** (`groupMultiplicationsInAddition`) — fires only at college+
 *   levels. Replaces ALL `n×m` factors in a sum by their evaluated values
 *   in ONE step. Skipped at primaire to keep each multiplication explicit.
 * - **Trivial** (`simplifyAddZero`, `simplifyMulOne`, `simplifyMulZero`) —
 *   `x+0 → x`, `x×1 → x`, `x×0 → 0`. Always applicable, low priority so
 *   they run after atomic operations.
 *
 * Each rule's `descriptions` use bindings to produce binding-aware labels
 * (e.g. "On additionne 2 et 3" rather than the generic "Addition").
 *
 * @module mathAST/pedagogical-arithmetic/pedagogical-rules/basic-operations
 */

import type { MathNode } from '../../types';
import type { Rule, MatchBindings } from '../../pattern/types';
import { P } from '../../pattern/builder';
import { createRule } from '../../pattern/rule';
import { evaluate } from '../../eval/evaluate';
import { isEvalValue } from '../../eval/types';
import {
	isAddition,
	isDivision,
	isMultiplication,
	isNumber,
	isOpposite,
	isSubtraction
} from '../../guards';
import { add, divide, multiply, number, subtract } from '../../factory';
import { flattenSumShallow, unflattenSum } from '../../flatten';
import { toLatex } from '../../latex-generator';
import { mapNode } from '../../transforms';
import type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Evaluate a node to its exact form. Returns `null` when the node cannot be
 * reduced (free variables, indeterminate forms, …).
 *
 * Mirrors the helper used by `arithmetic-steps.ts` so the pedagogical and
 * legacy paths agree on what counts as "fully evaluable".
 */
function evaluateExact(node: MathNode): MathNode | null {
	const result = evaluate(node, { mode: 'exact' });
	if (!isEvalValue(result)) return null;
	return result.node;
}

/** True when the node is a numeric atom (plain number or `-number`). */
function isNumericAtom(node: MathNode): boolean {
	if (isNumber(node)) return true;
	if (isOpposite(node) && isNumber(node.operand)) return true;
	return false;
}

/**
 * True when the node is a multiplication or division **chain** of numeric
 * atoms — e.g. `3×4`, `12÷3`, but also `24÷8×3` or `2×3÷6×4`. Operations
 * of equal priority (× and ÷) that combine numeric atoms — these are the
 * sub-expressions the grouping rule collapses in one sum step at college+.
 *
 * Used recursively : a chain is a `*` or `/` whose operands are
 * themselves either numeric atoms or chains. A bare atom is NOT a chain
 * (it has no operation to perform), so the rule only fires when there is
 * actual work to do.
 */
function isNumericMulDivChain(node: MathNode): boolean {
	if (isMultiplication(node)) {
		return isMulDivOperand(node.left) && isMulDivOperand(node.right);
	}
	if (isDivision(node)) {
		return isMulDivOperand(node.numerator) && isMulDivOperand(node.denominator);
	}
	return false;
}

/** Operand acceptable inside a mul/div chain : a numeric atom or another chain. */
function isMulDivOperand(node: MathNode): boolean {
	return isNumericAtom(node) || isNumericMulDivChain(node);
}

/** Lookup a wildcard binding by name; returns `undefined` if not present. */
function bindingNode(bindings: MatchBindings, name: string): MathNode | undefined {
	const found = bindings.get(name);
	if (!found) return undefined;
	if ('terms' in found || 'factors' in found) return undefined;
	return found as MathNode;
}

/** Render a binding to LaTeX, falling back to `'?'` when the binding is missing. */
function bindingLatex(bindings: Record<string, MathNode>, name: string): string {
	const node = bindings[name];
	return node ? toLatex(node) : '?';
}

// =============================================================================
// Atomic binary operations (priority 100)
// =============================================================================

/**
 * Build the four atomic binary rules. They share the same structure:
 *   - Pattern : `a:number ⊕ b:number` (numeric pair)
 *   - Replacement : exact evaluation of the operation
 *   - Description : per-level vocabulary
 *
 * `evaluateExact` returning `null` is treated as "rule does not fire" by
 * returning the original node — the rewriting engine then sees no change
 * and the rule is skipped.
 */

/**
 * Generic atomic-binary replacement factory.
 *
 * Reconstructs `a ⊕ b` from the bindings via `nodeBuilder`, runs
 * `evaluate(exact)`, and returns the simplified node. When evaluation fails
 * (e.g. division by zero or domain error), the original two-operand
 * expression is returned so the engine sees no change and the rule fizzles.
 */
function makeBinaryReplacement(
	nodeBuilder: (a: MathNode, b: MathNode) => MathNode
): (bindings: MatchBindings) => MathNode {
	return (bindings) => {
		const a = bindingNode(bindings, 'a');
		const b = bindingNode(bindings, 'b');
		if (!a || !b) return number('0'); // unreachable under typed pattern
		const original = nodeBuilder(a, b);
		const evaluated = evaluateExact(original);
		return evaluated ?? original;
	};
}

/**
 * Pedagogical rule : `a:number + b:number → a+b` (exact).
 */
export const evaluateBinaryAdd: PedagogicalArithmeticRule = {
	name: 'evaluate-binary-add',
	rule: createRule(
		P.parse('a:number + b:number'),
		makeBinaryReplacement((a, b) => add(a, b)),
		{ name: 'evaluate-binary-add' }
	),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 100,
	descriptions: {
		primaire: (b) => `On additionne ${bindingLatex(b, 'a')} et ${bindingLatex(b, 'b')}`,
		college: () => 'Addition',
		lycee: () => 'Somme',
		superieur: () => '+'
	}
};

/**
 * Pedagogical rule : `a:number - b:number → a-b` (exact).
 */
export const evaluateBinarySub: PedagogicalArithmeticRule = {
	name: 'evaluate-binary-sub',
	rule: createRule(
		P.parse('a:number - b:number'),
		makeBinaryReplacement((a, b) => subtract(a, b)),
		{ name: 'evaluate-binary-sub' }
	),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 100,
	descriptions: {
		primaire: (b) => `On soustrait ${bindingLatex(b, 'b')} de ${bindingLatex(b, 'a')}`,
		college: () => 'Soustraction',
		lycee: () => 'Différence',
		superieur: () => '−'
	}
};

/**
 * Pedagogical rule : `a:number × b:number → a×b` (exact).
 */
export const evaluateBinaryMul: PedagogicalArithmeticRule = {
	name: 'evaluate-binary-mul',
	rule: createRule(
		P.parse('a:number * b:number'),
		makeBinaryReplacement((a, b) => multiply(a, b, 'cross')),
		{ name: 'evaluate-binary-mul' }
	),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 100,
	descriptions: {
		primaire: (b) => `On multiplie ${bindingLatex(b, 'a')} par ${bindingLatex(b, 'b')}`,
		college: () => 'Multiplication',
		lycee: () => 'Produit',
		superieur: () => '×'
	}
};

/**
 * Pedagogical rule : `a:number / b:number → a/b` (exact).
 *
 * Restricted to **exact integer divisions** (e.g. `6/3 → 2`). When the
 * division produces a non-integer fraction (`3/6 → 1/2`), the rule fizzles
 * — `reduceFraction` (Phase 4) handles the case with the appropriate
 * "On simplifie la fraction" label. This split keeps the pedagogical
 * vocabulary accurate : "Division" is not the same act as "Réduction".
 *
 * Division by zero is also handled implicitly : `evaluate(exact)` returns
 * `unevaluable` for `1/0`, so the rule fizzles via the integer-result
 * condition.
 */
export const evaluateBinaryDiv: PedagogicalArithmeticRule = {
	name: 'evaluate-binary-div',
	rule: createRule(
		P.parse('a:number / b:number'),
		makeBinaryReplacement((a, b) => divide(a, b, 'fraction')),
		{
			name: 'evaluate-binary-div',
			condition: (bindings) => {
				const a = bindingNode(bindings, 'a');
				const b = bindingNode(bindings, 'b');
				if (!a || !b) return false;
				const evaluated = evaluateExact(divide(a, b, 'fraction'));
				if (!evaluated) return false;
				// Fire ONLY when the result is an integer (or `-integer` via opposite).
				// Anything else (proper fraction) is left for `reduceFraction`.
				if (isNumber(evaluated) && /^-?\d+$/.test(evaluated.value)) return true;
				if (
					isOpposite(evaluated) &&
					isNumber(evaluated.operand) &&
					/^\d+$/.test(evaluated.operand.value)
				) {
					return true;
				}
				return false;
			}
		}
	),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 100,
	descriptions: {
		primaire: (b) => `On divise ${bindingLatex(b, 'a')} par ${bindingLatex(b, 'b')}`,
		college: () => 'Division',
		lycee: () => 'Quotient',
		superieur: () => '÷'
	}
};

// =============================================================================
// Grouping rule (priority 200, college+)
// =============================================================================

/**
 * Test whether a node is a sum (`+` or `-` chain) containing AT LEAST TWO
 * numeric multiplications. The threshold "two" is what unlocks the
 * pedagogical regroupement: with only one multiplication, the atomic rule
 * already produces the natural single step.
 */
function shouldGroupMultiplications(node: MathNode): boolean {
	if (!isAddition(node) && !isSubtraction(node)) return false;
	const terms = flattenSumShallow(node);
	let count = 0;
	for (const { term } of terms) {
		if (isNumericMulDivChain(term)) {
			count += 1;
			if (count >= 2) return true;
		}
	}
	return false;
}

/**
 * Replacement function : flatten the sum, evaluate every numeric mul/div
 * chain in one go, leave the rest untouched, and re-build the sum. The
 * result is a sum with the SAME structure but each `n×m`, `n÷m`, or
 * longer chain like `24÷8×3` collapsed to its single value.
 */
function applyGroupMultiplications(node: MathNode): MathNode | null {
	const terms = flattenSumShallow(node);
	const replaced: typeof terms = terms.map(({ sign, term }) => {
		if (!isNumericMulDivChain(term)) return { sign, term };
		const evaluated = evaluateExact(term);
		return evaluated ? { sign, term: evaluated } : { sign, term };
	});
	return unflattenSum(replaced);
}

/**
 * Pedagogical rule : evaluate every "calculable" parenthesised sub-expression
 * in ONE step. Skipped at primaire (each parenthesised computation keeps
 * its own atomic step there).
 *
 * "Calculable" means : the content of the parentheses is reducible to a
 * numeric atom by `evaluate(exact)` and DIFFERS from its current shape
 * (so `(5)` — already an atom — is not eligible ; `cleanupTrivialParens`
 * handles those silently).
 *
 * The rule's pattern is the universal wildcard plus a structural
 * condition. The pipeline applies it as a top-level pre-pass (top-down
 * traversal) — see `pipeline.ts` — for the same reason as the
 * multiplication-grouping rule : a bottom-up engine pass would let
 * inner-content rules fire before this rule could see the outer
 * parentheses.
 */
function isAtomLikeNode(node: MathNode): boolean {
	if (isNumber(node)) return true;
	if (isOpposite(node) && isNumber(node.operand)) return true;
	return false;
}

/**
 * True when `node` is a parenthesised sub-expression whose content can be
 * evaluated to an atomic numeric value DIFFERENT from the content itself.
 */
function isCalculableParens(node: MathNode): boolean {
	if (node.type !== 'delimiter') return false;
	if (node.delimiters !== 'parentheses') return false;
	if (isAtomLikeNode(node.content)) return false;
	const evaluated = evaluateExact(node.content);
	if (!evaluated || !isAtomLikeNode(evaluated)) return false;
	return true;
}

/**
 * Test whether `node` contains at least one calculable parens. Bottom-up
 * traversal that stops at the first hit.
 */
function hasCalculableParens(node: MathNode): boolean {
	let found = false;
	const walk = (n: MathNode): void => {
		if (found) return;
		if (isCalculableParens(n)) {
			found = true;
			return;
		}
		switch (n.type) {
			case 'addition':
			case 'subtraction':
			case 'multiplication':
				walk(n.left);
				walk(n.right);
				break;
			case 'division':
				walk(n.numerator);
				walk(n.denominator);
				break;
			case 'opposite':
			case 'positive':
				walk(n.operand);
				break;
			case 'delimiter':
				walk(n.content);
				break;
			default:
				break;
		}
	};
	walk(node);
	return found;
}

/**
 * Replace every calculable parens in the tree by its evaluated atom.
 * Non-calculable parens are kept ; outer structure is preserved.
 */
function applyGroupParentheses(node: MathNode): MathNode | null {
	let changed = false;
	const mapped = mapNode(node, (n) => {
		if (!isCalculableParens(n)) return n;
		const delim = n as Extract<MathNode, { type: 'delimiter' }>;
		const evaluated = evaluateExact(delim.content);
		if (!evaluated) return n;
		changed = true;
		return evaluated;
	});
	return changed ? mapped : null;
}

export const groupParentheses: PedagogicalArithmeticRule = {
	name: 'group-parentheses',
	rule: createRule(
		P._('s', P.custom(hasCalculableParens, 'has-calculable-parens')),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyGroupParentheses(s) ?? s;
		},
		{ name: 'group-parentheses' }
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 250,
	descriptions: {
		college: () => 'On effectue les calculs entre parenthèses',
		lycee: () => 'Calculs entre parenthèses',
		superieur: () => '(.)'
	},
	explanations: {
		college: () =>
			"En présence de parenthèses, on commence par calculer ce qu'il y a à l'intérieur."
	}
};

/**
 * Pedagogical rule : in a sum with ≥2 numeric multiplications, evaluate
 * them all in one step. Skipped at primaire (each multiplication keeps its
 * own atomic step there).
 */
export const groupMultiplicationsInAddition: PedagogicalArithmeticRule = {
	name: 'group-multiplications-in-addition',
	rule: createRule(
		P._('s', P.custom(shouldGroupMultiplications, 'sum-with-2-mul')),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyGroupMultiplications(s) ?? s;
		},
		{ name: 'group-multiplications-in-addition' }
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 200,
	descriptions: {
		college: () => "On effectue d'abord les multiplications et divisions",
		lycee: () => 'Multiplications et divisions prioritaires',
		superieur: () => 'Priorité × ÷'
	},
	explanations: {
		college: () =>
			"En l'absence de parenthèses, les multiplications et divisions sont effectuées avant les additions et soustractions."
	}
};

// =============================================================================
// Trivial simplifications (priority 50)
// =============================================================================

/**
 * Pedagogical rule : `x + 0 → x` (commutative — also matches `0 + x`).
 */
export const simplifyAddZero: PedagogicalArithmeticRule = {
	name: 'simplify-add-zero',
	rule: createRule(P.parse('x + 0'), (bindings) => bindings.get('x') as MathNode, {
		name: 'simplify-add-zero'
	}),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 50,
	descriptions: {
		primaire: () => 'On enlève le zéro inutile',
		college: () => 'On supprime le zéro',
		lycee: () => 'Simplification',
		superieur: () => '−0'
	}
};

/**
 * Pedagogical rule : `x − 0 → x`.
 */
export const simplifySubZero: PedagogicalArithmeticRule = {
	name: 'simplify-sub-zero',
	rule: createRule(P.parse('x - 0'), (bindings) => bindings.get('x') as MathNode, {
		name: 'simplify-sub-zero'
	}),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 50,
	descriptions: {
		primaire: () => 'On enlève le zéro inutile',
		college: () => 'On supprime le zéro',
		lycee: () => 'Simplification',
		superieur: () => '−0'
	}
};

/**
 * Pedagogical rule : `x × 1 → x` (commutative — also matches `1 × x`).
 */
export const simplifyMulOne: PedagogicalArithmeticRule = {
	name: 'simplify-mul-one',
	rule: createRule(P.parse('x * 1'), (bindings) => bindings.get('x') as MathNode, {
		name: 'simplify-mul-one'
	}),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 50,
	descriptions: {
		primaire: () => 'Multiplier par 1 ne change rien',
		college: () => 'On supprime le facteur 1',
		lycee: () => 'Simplification',
		superieur: () => '×1'
	}
};

/**
 * Pedagogical rule : `x × 0 → 0` (commutative).
 *
 * Limitation (acceptable for arithmetic context) : the rule does not check
 * whether `x` is well-defined. For pathological symbolic inputs like
 * `(1/0) × 0` the result `0` is not mathematically correct (the expression
 * is indeterminate), but for the arithmetic pedagogical pipeline — whose
 * inputs come from numeric expressions only — this case never arises. A
 * domain-aware variant can be added later if symbolic inputs are admitted.
 */
export const simplifyMulZero: PedagogicalArithmeticRule = {
	name: 'simplify-mul-zero',
	rule: createRule(P.parse('x * 0'), () => number('0'), { name: 'simplify-mul-zero' }),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 50,
	descriptions: {
		primaire: () => 'Multiplier par 0 donne 0',
		college: () => 'Le produit par 0 est nul',
		lycee: () => 'Annulation',
		superieur: () => '×0=0'
	}
};

/**
 * Pedagogical rule : `x / 1 → x`.
 */
export const simplifyDivOne: PedagogicalArithmeticRule = {
	name: 'simplify-div-one',
	rule: createRule(P.parse('x / 1'), (bindings) => bindings.get('x') as MathNode, {
		name: 'simplify-div-one'
	}),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 50,
	descriptions: {
		primaire: () => 'Diviser par 1 ne change rien',
		college: () => 'On supprime la division par 1',
		lycee: () => 'Simplification',
		superieur: () => '÷1'
	}
};

// =============================================================================
// Aggregated export
// =============================================================================

// =============================================================================
// simplifyAddOpposite (Track E, opt-in via needsSignsStrict, priority 25)
// =============================================================================

/**
 * `add(x, opposite(y)) → subtract(x, y)` — strips the cosmetic `+(-` motif.
 * Right-opposite ONLY (decision E-1): `(-3) + 5` is left untouched (would
 * require commutativity reordering, out of scope V1).
 *
 * Fizzles when `y` is itself an `opposite` (decision Q2) to avoid producing
 * `5 - (-3)` which is worse than the input. The single-level guard is
 * transitive for any depth ≥ 2 of nested opposites: a chain
 * `opposite(opposite(...))` always exposes another `opposite` as its top
 * operand, so the guard catches every case where firing would reintroduce
 * a `-(-` motif. Cosmetic transforms upstream are responsible for
 * collapsing double-opposites first.
 *
 * Priority 25 — strictly lower than `reduceFraction` (30) and trivials (50)
 * because signs cosmetics are the LAST cosmetic step (after all structural
 * simplifications and fraction reductions). Numeric inputs like `5 + (-3)`
 * never reach this rule: `evaluateBinaryAdd` (priority 100) accepts
 * `opposite(number)` as a numeric atom and resolves the addition directly.
 * The rule is pedagogically useful only when evaluation is impossible
 * (variables, e.g. `2x + (-3x) → 2x - 3x`).
 *
 * **Why not `P.parse('x + -y')`** — the `+` matcher is commutative, so
 * the parsed pattern would also match `(-3) + 5` (binding `x=5, y=3`),
 * violating E-1. We use a wildcard + manual structural check on
 * `node.right` to bind specifically to the **right-positioned** opposite.
 *
 * Driven by `target.strictCosmetics.signs === 'strict'` — added as a
 * terminal rule by `loadPedagogicalRules` only when `needsSignsStrict: true`.
 * Not in `BASIC_OPERATION_RULES` (the default-loaded family).
 */
function applyAddOpposite(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;
	const right = node.right;
	if (!isOpposite(right)) return null;
	// Q2: avoid producing `x - (-y)` when y is already opposite.
	if (isOpposite(right.operand)) return null;
	return subtract(node.left, right.operand);
}

export const simplifyAddOpposite: PedagogicalArithmeticRule = {
	name: 'simplify-add-opposite',
	rule: createRule(
		P._('s'),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyAddOpposite(s) ?? s;
		},
		{
			name: 'simplify-add-opposite',
			condition: (bindings) => {
				const s = bindingNode(bindings, 's');
				if (!s) return false;
				return applyAddOpposite(s) !== null;
			}
		}
	),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 25,
	descriptions: {
		primaire: () => 'On remplace + (-y) par - y',
		college: () => "On simplifie l'addition d'un opposé (+ (-y) → - y)",
		lycee: () => '+ (-y) → - y',
		superieur: () => '+(-)→-'
	},
	explanations: {
		college: () =>
			"Pour éviter d'écrire `+(-y)`, on remplace l'addition d'un opposé par une soustraction directe."
	}
};

/**
 * Ordered collection of basic-operation rules — exported for `loadPedagogicalRules`
 * (Phase 8). Order does NOT determine application priority — that is taken from
 * each rule's `priority` field at engine setup time.
 *
 * Note: `simplifyAddOpposite` is intentionally **excluded** here (opt-in via
 * `needsSignsStrict` — Track E decision E-1).
 */
export const BASIC_OPERATION_RULES: readonly PedagogicalArithmeticRule[] = [
	groupParentheses,
	groupMultiplicationsInAddition,
	evaluateBinaryAdd,
	evaluateBinarySub,
	evaluateBinaryMul,
	evaluateBinaryDiv,
	simplifyAddZero,
	simplifySubZero,
	simplifyMulOne,
	simplifyMulZero,
	simplifyDivOne
];

// Re-exported for convenience by `pedagogical-rules/index.ts`.
export type { PedagogicalArithmeticRule } from '../types';
// Re-export `Rule` from pattern types (callers might need it for typing).
export type { Rule };
