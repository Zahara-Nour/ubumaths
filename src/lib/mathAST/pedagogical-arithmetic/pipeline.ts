/**
 * Pedagogical Arithmetic — Pipeline Orchestrator (Phase 8)
 *
 * `generatePedagogicalArithmeticSteps(node, options)` is the high-level
 * entry point used by Svelte components and the demo CLI.
 *
 * Strategy : a manual rule-application loop (instead of `rewrite()`) so we
 * can capture per-step :
 *   - the FULL expression before / after the rule fires (`globalBefore` /
 *     `globalAfter` on the step) — used by the renderer to display
 *     `<colored fragment> = <new global expression>`,
 *   - the sub-tree that changed (`before` / `after` on the step) — used to
 *     highlight the part of the expression that was rewritten,
 *   - the pattern bindings (`step.bindings`) — used by per-level
 *     descriptions like `"On additionne 2 et 3"`.
 *
 * The loop terminates when no rule fires in an iteration, or when
 * `DEFAULT_MAX_ITERATIONS` is reached. Cooperative interruption via
 * `signal` / `timeoutMs` is honoured at the top of each iteration.
 *
 * @module mathAST/pedagogical-arithmetic/pipeline
 */

import type { MathNode } from '../types';
import { evaluate } from '../eval/evaluate';
import { isEvalValue } from '../eval/types';
import { isDivision, isMultiplication, isNumber, isOpposite } from '../guards';
import { match, nodesEqual } from '../pattern/match';
import { applyRule, instantiate } from '../pattern/rule';
import type { MatchBindings } from '../pattern/types';
import { mapNode, mapNodeTopDown } from '../transforms';
import { extractAnswerFragment } from './answer-format-parser';
import { loadPedagogicalRules } from './pedagogical-rules';
import {
	groupMultiplicationsInAddition,
	groupParentheses
} from './pedagogical-rules/basic-operations';
import { reduceFraction } from './pedagogical-rules/fractions';
import { toScientificNotation } from './pedagogical-rules/scientific-notation';
import type {
	PedagogicalArithmeticOptions,
	PedagogicalArithmeticResult,
	PedagogicalArithmeticRule,
	PedagogicalArithmeticStep
} from './types';

// =============================================================================
// Helpers
// =============================================================================

/** Resolve a rule's title at the given school level, with fallback to lycee. */
function describeStep(
	rule: PedagogicalArithmeticRule,
	schoolLevel: PedagogicalArithmeticOptions['schoolLevel'],
	bindings: Record<string, MathNode>
): string {
	const fn = rule.descriptions[schoolLevel] ?? rule.descriptions.lycee ?? (() => rule.name);
	return fn(bindings);
}

/** Convert `MatchBindings` (Map) to a plain `Record<string, MathNode>`. */
function bindingsToRecord(bindings: MatchBindings): Record<string, MathNode> {
	const out: Record<string, MathNode> = {};
	for (const [k, v] of bindings.entries()) {
		// Sequence bindings are not directly displayable as MathNode — skip them.
		if (v && !('terms' in v) && !('factors' in v)) {
			out[k] = v as MathNode;
		}
	}
	return out;
}

/**
 * Strip parentheses whose content is a simple atom (number or `-number`).
 * Applied silently after each rule application so the displayed `globalAfter`
 * never contains visually noisy `(5)*4` kind of constructs : the parens
 * have already served their priority-grouping purpose, and removing them
 * matches what students actually write down.
 *
 * Non-trivial parens (around `2+3`, etc.) are kept intact.
 */
function cleanupTrivialParens(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (n.type !== 'delimiter') return n;
		if (n.delimiters !== 'parentheses') return n;
		const c = n.content;
		if (isNumber(c)) return c;
		if (isOpposite(c) && isNumber(c.operand)) return c;
		return n;
	});
}

/**
 * Collect every sub-tree of `node` that is a parenthesised sub-expression
 * whose content evaluates to a numeric atom different from the content
 * itself. Used by the parens-grouping pre-pass to highlight every parens
 * the rule just collapsed.
 */
function collectCalculableParens(node: MathNode): readonly MathNode[] {
	const found: MathNode[] = [];
	const isAtom = (x: MathNode): boolean => isNumber(x) || (isOpposite(x) && isNumber(x.operand));
	const walk = (n: MathNode): void => {
		if (n.type === 'delimiter' && n.delimiters === 'parentheses' && !isAtom(n.content)) {
			const ev = evaluate(n.content, { mode: 'exact' });
			if (isEvalValue(ev) && isAtom(ev.node)) {
				found.push(n);
				return; // Don't recurse — the parens is already a unit.
			}
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
 * Collect every sub-tree of `node` that is a numeric mul/div chain —
 * `n×m`, `n÷m`, or longer like `24÷8×3`. Used by the grouping rule's
 * pre-pass to tell the renderer which fragments to highlight when the
 * step rewrites several such chains at once.
 *
 * The walker stops descending once it finds a chain (the chain is a unit
 * that gets collapsed and highlighted in one piece).
 */
function collectNumericMultiplications(node: MathNode): readonly MathNode[] {
	const found: MathNode[] = [];
	const isNumericAtom = (x: MathNode): boolean =>
		isNumber(x) || (isOpposite(x) && isNumber(x.operand));
	const isOperand = (x: MathNode): boolean => isNumericAtom(x) || isChain(x);
	const isChain = (x: MathNode): boolean => {
		if (isMultiplication(x)) return isOperand(x.left) && isOperand(x.right);
		if (isDivision(x)) return isOperand(x.numerator) && isOperand(x.denominator);
		return false;
	};
	const walk = (n: MathNode): void => {
		if ((isMultiplication(n) || isDivision(n)) && isChain(n)) {
			found.push(n);
			return; // chain captured as a unit
		}
		// Generic structural walk — covers the operators we'll ever see in a
		// pre-grouping arithmetic expression. For exotic shapes we silently
		// stop (caller falls back to a single highlight on `step.before`).
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
 * Find the first sub-tree of `node` where ANY of `rules` applies. Iterates
 * **node-first**, then rule-by-rule at each node — this means the
 * left-most applicable sub-tree wins, which mirrors the natural reading
 * order ("on calcule de gauche à droite quand les priorités sont égales").
 *
 * For each candidate node, rules are tried in priority order ; the first
 * one that matches AND produces a non-trivial transformation is captured.
 *
 * Bottom-up traversal of `mapNode` ensures children are visited before
 * parents — a multiplication `n*m` deep inside a sum is matched before
 * the sum itself is considered.
 */
function findFirstApplication(
	rules: readonly PedagogicalArithmeticRule[],
	node: MathNode
): {
	rule: PedagogicalArithmeticRule;
	subBefore: MathNode;
	subAfter: MathNode;
	bindings: MatchBindings;
	replacedTree: MathNode;
} | null {
	let captured: {
		rule: PedagogicalArithmeticRule;
		subBefore: MathNode;
		subAfter: MathNode;
		bindings: MatchBindings;
	} | null = null;

	const replacedTree = mapNode(node, (n) => {
		if (captured) return n;
		for (const pedaRule of rules) {
			const r = pedaRule.rule;
			const m = match(r.pattern, n);
			if (!m.success) continue;
			if (r.condition && !r.condition(m.bindings)) continue;
			const transformed =
				typeof r.replacement === 'function'
					? r.replacement(m.bindings)
					: instantiate(r.replacement, m.bindings);
			if (nodesEqual(transformed, n)) continue;
			captured = { rule: pedaRule, subBefore: n, subAfter: transformed, bindings: m.bindings };
			return transformed;
		}
		return n;
	});

	if (!captured) return null;
	return { ...captured, replacedTree };
}

// =============================================================================
// Pipeline
// =============================================================================

const DEFAULT_MAX_ITERATIONS = 50;

export function generatePedagogicalArithmeticSteps(
	node: MathNode,
	options: PedagogicalArithmeticOptions
): PedagogicalArithmeticResult {
	const { schoolLevel, target, signal, timeoutMs } = options;

	// 1. ---------------------------------------------------------------- rules
	const pedagogicalRules = loadPedagogicalRules({
		schoolLevel,
		targetForm: target?.structure,
		needsReducedFractions: target?.strictCosmetics?.reducedFractions === 'strict',
		needsScientificFinal: target?.structure === 'scientific'
	});

	const collected: PedagogicalArithmeticStep[] = [];
	let stepId = 0;

	let workingNode = node;

	// 2a-pre. -------------- Top-level pre-pass for groupParentheses ---------
	// Computes every calculable `(…)` in one step, collège+ only. Skipped at
	// primaire so atomic rules walk into each parens individually.
	if (groupParentheses.applicableLevels.includes(schoolLevel)) {
		const fragments = collectCalculableParens(workingNode);
		if (fragments.length > 0) {
			const replaced = cleanupTrivialParens(
				applyRule(groupParentheses.rule, workingNode) ?? workingNode
			);
			if (!nodesEqual(replaced, workingNode)) {
				collected.push({
					id: stepId++,
					rule: groupParentheses.name,
					description: describeStep(groupParentheses, schoolLevel, {}),
					before: workingNode,
					after: replaced,
					globalBefore: workingNode,
					globalAfter: replaced,
					highlightSubTrees: fragments,
					verbosityLevel: 'summarized'
				});
				workingNode = replaced;
			}
		}
	}

	// 2a. ---------- Top-down pre-pass for groupMultiplicationsInAddition -----
	if (groupMultiplicationsInAddition.applicableLevels.includes(schoolLevel)) {
		const grouped = cleanupTrivialParens(
			mapNodeTopDown(workingNode, (n) => {
				const result = applyRule(groupMultiplicationsInAddition.rule, n);
				return result ?? n;
			})
		);
		if (!nodesEqual(grouped, workingNode)) {
			// Collect every sub-tree inside `workingNode` that is a numeric
			// multiplication — those are the fragments the grouping rule just
			// collapsed, so the renderer should highlight ALL of them.
			const highlightSubTrees = collectNumericMultiplications(workingNode);
			collected.push({
				id: stepId++,
				rule: groupMultiplicationsInAddition.name,
				description: describeStep(groupMultiplicationsInAddition, schoolLevel, {}),
				before: workingNode,
				after: grouped,
				globalBefore: workingNode,
				globalAfter: grouped,
				highlightSubTrees,
				verbosityLevel: 'summarized'
			});
			workingNode = grouped;
		}
	}

	// 2b. ------------------------------- Manual rule-application fixed point
	// `toScientificNotation` is excluded from the engine pass for the same
	// reason as the grouping rule : its wildcard pattern matches ANY number
	// node, so a bottom-up traversal would re-fire it on the literal `10`
	// inside the just-produced `a × 10ⁿ` result, looping infinitely. It runs
	// only as a top-level pre-pass below (when the target requests it).
	const enginePedagogicalRules = pedagogicalRules
		.filter(
			(r) =>
				r.name !== groupMultiplicationsInAddition.name &&
				r.name !== groupParentheses.name &&
				r.name !== toScientificNotation.name
		)
		.slice()
		.sort((a, b) => b.priority - a.priority);

	const deadline = timeoutMs !== undefined && timeoutMs > 0 ? Date.now() + timeoutMs : Infinity;
	const checkAbort = () => signal?.aborted === true || Date.now() >= deadline;

	let current = workingNode;
	for (let iter = 0; iter < DEFAULT_MAX_ITERATIONS; iter++) {
		if (checkAbort()) break;
		const found = findFirstApplication(enginePedagogicalRules, current);
		if (!found) break;
		const recordBindings = bindingsToRecord(found.bindings);
		const nextGlobal = cleanupTrivialParens(found.replacedTree);
		collected.push({
			id: stepId++,
			rule: found.rule.name,
			description: describeStep(found.rule, schoolLevel, recordBindings),
			before: found.subBefore,
			after: found.subAfter,
			bindings: recordBindings,
			globalBefore: current,
			globalAfter: nextGlobal,
			verbosityLevel: 'summarized'
		});
		current = nextGlobal;
	}

	let finalNode: MathNode = current;

	// 3. -------------------- evaluate(exact) fallback (residual numeric form)
	const evaluated = evaluate(finalNode, { mode: 'exact' });
	if (isEvalValue(evaluated) && !nodesEqual(evaluated.node, finalNode)) {
		collected.push({
			id: stepId++,
			rule: 'evaluate-final',
			description: 'On calcule',
			before: finalNode,
			after: evaluated.node,
			globalBefore: finalNode,
			globalAfter: evaluated.node,
			verbosityLevel: 'summarized'
		});
		finalNode = evaluated.node;
	}

	// 4. ------------------------------- post-processing for strict cosmetic
	if (target?.strictCosmetics?.reducedFractions === 'strict') {
		const reduced = applyRule(reduceFraction.rule, finalNode);
		if (reduced && !nodesEqual(reduced, finalNode)) {
			collected.push({
				id: stepId++,
				rule: reduceFraction.name,
				description: describeStep(reduceFraction, schoolLevel, {}),
				before: finalNode,
				after: reduced,
				globalBefore: finalNode,
				globalAfter: reduced,
				verbosityLevel: 'summarized'
			});
			finalNode = reduced;
		}
	}

	// 4b. ------------------------- post-processing for scientific notation
	// Apply `toScientificNotation` ONLY at the top level — never deep in the
	// tree (see comment near `enginePedagogicalRules`). Fires when the target
	// demands a scientific final form and the current `finalNode` isn't yet
	// in that shape.
	if (target?.structure === 'scientific') {
		const scientific = applyRule(toScientificNotation.rule, finalNode);
		if (scientific && !nodesEqual(scientific, finalNode)) {
			collected.push({
				id: stepId++,
				rule: toScientificNotation.name,
				description: describeStep(toScientificNotation, schoolLevel, {}),
				before: finalNode,
				after: scientific,
				globalBefore: finalNode,
				globalAfter: scientific,
				verbosityLevel: 'summarized'
			});
			finalNode = scientific;
		}
	}

	// 5. ---------------------------------- answerFormat fragment extraction
	let answerFragment: PedagogicalArithmeticResult['answerFragment'] = undefined;
	if (target?.answerFormat) {
		const extracted = extractAnswerFragment(finalNode, target.answerFormat);
		if (extracted) {
			answerFragment = {
				latex: extracted.latex,
				placeholderPath: extracted.placeholderPath
			};
			collected.push({
				id: stepId++,
				rule: 'extract-answer-fragment',
				description: `Réponse à saisir : ${extracted.latex}`,
				before: finalNode,
				after: finalNode,
				verbosityLevel: 'summarized'
			});
		}
	}

	return {
		finalNode,
		steps: collected,
		target,
		answerFragment
	};
}
