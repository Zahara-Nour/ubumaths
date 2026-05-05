/**
 * Pedagogical Arithmetic — Pipeline Orchestrator (Phase 8)
 *
 * `generatePedagogicalArithmeticSteps(node, options)` is the high-level
 * entry point used by Svelte components and the demo CLI. It :
 *
 *   1. Loads the appropriate `PedagogicalArithmeticRule[]` via
 *      `loadPedagogicalRules()` (filtered by `schoolLevel` + `targetForm`).
 *   2. Runs the deterministic rewrite engine, collecting each transformation
 *      as a `PedagogicalArithmeticStep` with binding-aware descriptions.
 *   3. Falls back to `evaluate(exact)` when the rules can't fully reduce the
 *      expression (e.g. an `add(2, 3)` that no rule rewrote because it
 *      slipped past the priority ordering).
 *   4. Optionally appends a final fragment-extraction step when
 *      `target.answerFormat` is set.
 *
 * Cooperative interruption via `signal` / `timeoutMs` (propagated to the
 * engine, which propagates to `evaluate`).
 *
 * @module mathAST/pedagogical-arithmetic/pipeline
 */

import type { MathNode } from '../types';
import { rewrite } from '../common/rewriting-engine';
import { evaluate } from '../eval/evaluate';
import { isEvalValue } from '../eval/types';
import { nodesEqual } from '../pattern/match';
import { applyRule } from '../pattern/rule';
import { mapNodeTopDown } from '../transforms';
import { extractAnswerFragment } from './answer-format-parser';
import { loadPedagogicalRules } from './pedagogical-rules';
import { groupMultiplicationsInAddition } from './pedagogical-rules/basic-operations';
import { reduceFraction } from './pedagogical-rules/fractions';
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

// =============================================================================
// Pipeline
// =============================================================================

const DEFAULT_MAX_ITERATIONS = 50;

/**
 * Orchestrate the pedagogical arithmetic pipeline.
 */
export function generatePedagogicalArithmeticSteps(
	node: MathNode,
	options: PedagogicalArithmeticOptions
): PedagogicalArithmeticResult {
	const { schoolLevel, target, signal, timeoutMs } = options;

	// ------------------------------------------------------------------ 1. rules
	const pedagogicalRules = loadPedagogicalRules({
		schoolLevel,
		targetForm: target?.structure,
		needsReducedFractions: target?.strictCosmetics?.reducedFractions === 'strict',
		needsScientificFinal: target?.structure === 'scientific'
	});

	// Index rules by name so we can recover their metadata when the engine
	// emits a RewriteStep (which carries only `label = ruleName`).
	const ruleIndex = new Map<string, PedagogicalArithmeticRule>();
	for (const rule of pedagogicalRules) ruleIndex.set(rule.name, rule);
	// The grouping rule is also indexed (for the pre-pass step description).
	ruleIndex.set(groupMultiplicationsInAddition.name, groupMultiplicationsInAddition);

	// ----------------------------------------------------------- 2. rewrite loop
	const collected: PedagogicalArithmeticStep[] = [];
	let stepId = 0;

	// 2a. Top-down pre-pass for `group-multiplications-in-addition` (the
	// engine's bottom-up traversal would otherwise let `evaluate-binary-mul`
	// collapse the multiplications BEFORE the grouping rule sees the sum).
	// The pass fires only at school levels where the rule is in `applicableLevels`.
	let workingNode = node;
	if (groupMultiplicationsInAddition.applicableLevels.includes(schoolLevel)) {
		const grouped = mapNodeTopDown(workingNode, (n) => {
			const result = applyRule(groupMultiplicationsInAddition.rule, n);
			return result ?? n;
		});
		if (!nodesEqual(grouped, workingNode)) {
			collected.push({
				id: stepId++,
				rule: groupMultiplicationsInAddition.name,
				description: describeStep(groupMultiplicationsInAddition, schoolLevel, {}),
				before: workingNode,
				after: grouped,
				verbosityLevel: 'summarized'
			});
			workingNode = grouped;
		}
	}

	// Exclude the grouping rule from the engine pass — it was already applied
	// top-down above. Leaving it in would cause `evaluate-binary-mul` and the
	// grouping rule to compete during the same iteration, with confusing
	// outcomes when the bottom-up traversal hits multiplication leaves first.
	const enginePedagogicalRules = pedagogicalRules.filter(
		(r) => r.name !== groupMultiplicationsInAddition.name
	);

	const result = rewrite(workingNode, {
		rules: enginePedagogicalRules.map((r) => r.rule),
		strategy: { kind: 'deterministic' },
		maxIterations: DEFAULT_MAX_ITERATIONS,
		signal,
		timeoutMs,
		onStep: (rs) => {
			if (rs.kind !== 'rule') return;
			const rule = ruleIndex.get(rs.label);
			if (!rule) return;
			// `applyRulesDeepOnceTracked` doesn't surface bindings ; the renderer
			// gracefully falls back to `?` when bindings are missing.
			collected.push({
				id: stepId++,
				rule: rule.name,
				description: describeStep(rule, schoolLevel, {}),
				before: rs.before,
				after: rs.after,
				verbosityLevel: 'summarized'
			});
		}
	});

	let finalNode: MathNode = result.result;

	// ----------------------------------------------------- 3. evaluate fallback
	// When the rules left a residual numeric expression (e.g. an isolated
	// `2 + 3` that didn't trigger atomic-add for some pattern reason), let
	// `evaluate(exact)` resolve it and emit a final "calcul" step.
	const evaluated = evaluate(finalNode, { mode: 'exact' });
	if (isEvalValue(evaluated) && !nodesEqual(evaluated.node, finalNode)) {
		collected.push({
			id: stepId++,
			rule: 'evaluate-final',
			description: 'On calcule',
			before: finalNode,
			after: evaluated.node,
			verbosityLevel: 'summarized'
		});
		finalNode = evaluated.node;
	}

	// ------------------------------------ 4. post-processing for strict cosmetic
	// When `reducedFractions: 'strict'` is set but the rule wasn't reachable
	// (e.g. ran in primaire), apply the reducer once at the end.
	if (target?.strictCosmetics?.reducedFractions === 'strict') {
		const reduced = applyRule(reduceFraction.rule, finalNode);
		if (reduced && !nodesEqual(reduced, finalNode)) {
			collected.push({
				id: stepId++,
				rule: reduceFraction.name,
				description: describeStep(reduceFraction, schoolLevel, {}),
				before: finalNode,
				after: reduced,
				verbosityLevel: 'summarized'
			});
			finalNode = reduced;
		}
	}

	// ------------------------------------------- 5. answerFormat fragment step
	let answerFragment: PedagogicalArithmeticResult['answerFragment'] = undefined;
	if (target?.answerFormat) {
		const extracted = extractAnswerFragment(finalNode, target.answerFormat);
		if (extracted) {
			answerFragment = {
				latex: extracted.latex,
				placeholderPath: extracted.placeholderPath
			};
			// Emit a virtual step so the renderer can show "Ce qu'il faut saisir".
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
