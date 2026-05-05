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
import { isMultiplication, isNumber, isOpposite } from '../guards';
import { match, nodesEqual } from '../pattern/match';
import { applyRule, instantiate } from '../pattern/rule';
import type { MatchBindings, Rule } from '../pattern/types';
import { mapNode, mapNodeTopDown } from '../transforms';
import { extractAnswerFragment } from './answer-format-parser';
import { loadPedagogicalRules } from './pedagogical-rules';
import { groupMultiplicationsInAddition } from './pedagogical-rules/basic-operations';
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
 * Collect every sub-tree of `node` that is a numeric multiplication (e.g.
 * `3*4`, `(-3)*5`). Used by the grouping rule's pre-pass to tell the
 * renderer which fragments to highlight when the step rewrites several
 * multiplications at once.
 */
function collectNumericMultiplications(node: MathNode): readonly MathNode[] {
	const found: MathNode[] = [];
	const walk = (n: MathNode): void => {
		if (isMultiplication(n)) {
			const isNumericAtom = (x: MathNode): boolean =>
				isNumber(x) || (isOpposite(x) && isNumber(x.operand));
			if (isNumericAtom(n.left) && isNumericAtom(n.right)) {
				found.push(n);
				return; // don't recurse into nested numeric muls
			}
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
 * Find the first sub-tree of `node` where `rule` applies, and return the
 * components needed to record a clean step :
 *   - `subBefore` — the matched sub-tree (the part that will change)
 *   - `subAfter` — the rewritten sub-tree
 *   - `bindings` — the pattern bindings captured at the matched node
 *   - `replacedTree` — `node` with `subBefore` replaced by `subAfter` (the
 *     full expression after this single rewrite)
 *
 * Bottom-up traversal : children first, then parent. Stops at the first
 * application — does NOT keep applying the rule to other sub-trees in the
 * same call (the outer loop in the pipeline handles iteration).
 */
function findFirstApplication(
	rule: Rule,
	node: MathNode
): {
	subBefore: MathNode;
	subAfter: MathNode;
	bindings: MatchBindings;
	replacedTree: MathNode;
} | null {
	let captured: { subBefore: MathNode; subAfter: MathNode; bindings: MatchBindings } | null = null;

	const replacedTree = mapNode(node, (n) => {
		if (captured) return n;
		const m = match(rule.pattern, n);
		if (!m.success) return n;
		if (rule.condition && !rule.condition(m.bindings)) return n;
		const transformed =
			typeof rule.replacement === 'function'
				? rule.replacement(m.bindings)
				: instantiate(rule.replacement, m.bindings);
		if (nodesEqual(transformed, n)) return n;
		captured = { subBefore: n, subAfter: transformed, bindings: m.bindings };
		return transformed;
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

	// 2a. ---------- Top-down pre-pass for groupMultiplicationsInAddition -----
	let workingNode = node;
	if (groupMultiplicationsInAddition.applicableLevels.includes(schoolLevel)) {
		const grouped = mapNodeTopDown(workingNode, (n) => {
			const result = applyRule(groupMultiplicationsInAddition.rule, n);
			return result ?? n;
		});
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
			(r) => r.name !== groupMultiplicationsInAddition.name && r.name !== toScientificNotation.name
		)
		.slice()
		.sort((a, b) => b.priority - a.priority);

	const deadline = timeoutMs !== undefined && timeoutMs > 0 ? Date.now() + timeoutMs : Infinity;
	const checkAbort = () => signal?.aborted === true || Date.now() >= deadline;

	let current = workingNode;
	for (let iter = 0; iter < DEFAULT_MAX_ITERATIONS; iter++) {
		if (checkAbort()) break;
		let applied = false;
		for (const rule of enginePedagogicalRules) {
			const found = findFirstApplication(rule.rule, current);
			if (!found) continue;
			const recordBindings = bindingsToRecord(found.bindings);
			collected.push({
				id: stepId++,
				rule: rule.name,
				description: describeStep(rule, schoolLevel, recordBindings),
				before: found.subBefore,
				after: found.subAfter,
				bindings: recordBindings,
				globalBefore: current,
				globalAfter: found.replacedTree,
				verbosityLevel: 'summarized'
			});
			current = found.replacedTree;
			applied = true;
			break;
		}
		if (!applied) break;
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
