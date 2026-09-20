/**
 * Simplify Pipeline
 *
 * Orchestre la mise au propre (`tidy`), les règles de motif et, en dernier
 * recours, le développement par `normalize` — arbitré par une fonction de
 * coût — pour rendre l'écriture la plus propre d'une expression.
 *
 * Spécification : docs/wip/tidy-phase0.md §B. Par itération du moteur :
 * 1. preProcess — `tidy` : aplatir, regrouper, ordonner, SANS développer
 * 2. règles de motif (abs + trig + hyp + algébriques, une passe ascendante)
 * 3. contrôle de coût intermédiaire (strict `<`)
 * 4. postProcess — `tidy`, puis « développer seulement si moins cher » :
 *    le candidat `tidy(normalizePass(n))` ne remplace la forme mise au propre
 *    que si son coût est STRICTEMENT inférieur. C'est la seule place où
 *    `normalize` intervient encore dans `simplify`.
 * 5. contrôle de coût final (`<=`)
 * 6. point fixe
 *
 * The orchestrator is a thin wrapper around `rewrite()` from
 * `common/rewriting-engine.ts`. It builds the engine config and bridges step
 * events into a `SimplifyStepRecorder` (set Phase + description lookup).
 *
 * @module mathAST/simplify/simplify
 */

import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import type { SimplifyOptions, SimplifyResult } from './types';
import { computeCost } from './cost';
import { SimplifyStepRecorder } from './step-recorder';
import { getSimplifyRuleDescription } from './descriptions-fr';

// Pattern rules
import { absSimplifyRules } from '../pattern/rule-sets/abs';
import { trigSimplifyRules } from '../pattern/rule-sets/trig-identities';
import { hypSimplifyRules } from '../pattern/rule-sets/hyperbolic-identities';
import { algebraicSimplifyRules } from '../pattern/rule-sets/algebraic-identities';

// Normalize
import { preprocess } from '../normal/rules';
import { normalizeExtended, denormalizeExtended } from '../normal';

// Mise au propre
import { tidy } from '../tidy';
import { flattenSumShallow } from '../flatten';

// Rewriting engine
import { rewrite, type RewriteStep } from '../common/rewriting-engine';
import { AbortError } from '../common/abort';
import { nodesEqual } from '../pattern/match';

// =============================================================================
// Rule Set Builder
// =============================================================================

/**
 * Builds the combined rule set based on simplification options.
 * Called once before the iteration loop.
 */
function buildSimplifyRules(options: {
	enableAbs?: boolean;
	enableTrig?: boolean;
	enableHyperbolic?: boolean;
	enableAlgebraic?: boolean;
}): readonly Rule[] {
	const rules: Rule[] = [];
	if (options.enableAbs !== false) rules.push(...absSimplifyRules);
	if (options.enableTrig !== false) rules.push(...trigSimplifyRules);
	if (options.enableHyperbolic !== false) rules.push(...hypSimplifyRules);
	if (options.enableAlgebraic !== false) rules.push(...algebraicSimplifyRules);
	return rules;
}

// =============================================================================
// Normalize Pass
// =============================================================================

/**
 * Single normalize pass: preprocess → normalizeExtended → denormalizeExtended.
 *
 * N'est plus qu'un candidat : le « développer si moins cher » du
 * post-traitement (`makeTidyThenExpandIfCheaper`). `tidy` tient les deux
 * crochets du moteur.
 * `normalizeExtended` propagates infinity / signed-zero through arithmetic
 * (arctan(∞) → π/2, sinh(∞) → ∞, …) and then delegates to regular normalize
 * for polynomial canonical form (arithmetic identities, like-term collection,
 * power simplification, special function values).
 */
function normalizePass(node: MathNode): MathNode {
	const preprocessed = preprocess(node);
	const ext = normalizeExtended(preprocessed);
	return denormalizeExtended(ext);
}

// =============================================================================
// Post-traitement : tidy, puis développer seulement si moins cher
// =============================================================================

/**
 * Le post-traitement d'une itération : la forme mise au propre, ou la forme
 * développée si — et seulement si — elle coûte strictement moins.
 *
 * `normalize` développe tout ; c'est ce qui rend `2x+1` pour `(x+1)²−x²`, ou
 * `x−1` pour `(x²−1)/(x+1)`, mais aussi `x²+2x+1` pour `(x+1)²`. Le coût
 * départage : `(x+1)²` (9) reste, `2x+1` (13 < 18) gagne. Pas de biais en
 * faveur du candidat, contrairement à `cheapest`.
 *
 * À coût égal, le candidat ne gagne que s'il n'a **pas plus de termes** : une
 * identité (`sin(x+π) → −sin(x)`, 15 contre 15) passe, un développement
 * (`2(x+1) → 2x+2`, 13 contre 13) ne passe pas.
 *
 * `normalizePass` peut lever une forme indéterminée : on garde alors la forme
 * mise au propre. Mais une `AbortError` — `normalize` s'interrompt
 * coopérativement — doit remonter au moteur, qui rend alors le nœud d'origine.
 */
function makeTidyThenExpandIfCheaper(cost: (node: MathNode) => number) {
	return (node: MathNode): MathNode => {
		const tidied = tidy(node);
		let expanded: MathNode;
		try {
			expanded = tidy(normalizePass(node));
		} catch (error) {
			if (error instanceof AbortError) throw error;
			return tidied;
		}
		const expandedCost = cost(expanded);
		const tidiedCost = cost(tidied);
		if (expandedCost < tidiedCost) return expanded;
		if (expandedCost === tidiedCost && termCount(expanded) <= termCount(tidied)) return expanded;
		return tidied;
	};
}

/** Nombre de termes de la somme de tête (1 pour tout ce qui n'est pas une somme). */
function termCount(node: MathNode): number {
	return flattenSumShallow(node).length;
}

// =============================================================================
// Step Bridge
// =============================================================================

/**
 * Bridge `RewriteStep` events from the engine into a `SimplifyStepRecorder`.
 * Maps engine step kinds to simplify pipeline phases and looks up French
 * descriptions for each rule.
 *
 * Note: phase is set only when an event fires (i.e. the engine produced a
 * non-trivial transformation). The recorder's phase tag has no observable
 * effect when no `recordStep` follows, so this lazy approach is equivalent
 * to the original eager `setPhase` calls that surrounded each pipeline phase.
 */
function makeStepBridge(recorder: SimplifyStepRecorder): (step: RewriteStep) => void {
	return (step) => {
		if (step.kind === 'preProcess') {
			recorder.setPhase('tidy');
			recorder.recordStep(
				'tidy',
				getSimplifyRuleDescription('tidy'),
				step.before,
				step.after,
				'detailed'
			);
		} else if (step.kind === 'postProcess') {
			recorder.setPhase('post-tidy');
			recorder.recordStep(
				'post-tidy',
				getSimplifyRuleDescription('post-tidy'),
				step.before,
				step.after,
				'detailed'
			);
		} else {
			recorder.setPhase('rules');
			recorder.recordStep(
				step.label,
				getSimplifyRuleDescription(step.label),
				step.before,
				step.after,
				'detailed'
			);
		}
	};
}

// =============================================================================
// Main Simplify Function
// =============================================================================

/**
 * Simplifies a mathematical expression using all available engines.
 *
 * @param node - The expression to simplify
 * @param options - Simplification options
 * @returns The simplified result with cost and steps
 */
export function simplify(node: MathNode, options?: SimplifyOptions): SimplifyResult {
	const {
		ctx,
		verbosity = 'result',
		maxIterations = 10,
		enableTrig = true,
		enableHyperbolic = true,
		enableAlgebraic = true,
		enableAbs = true,
		costFunction = computeCost,
		signal,
		timeoutMs
	} = options ?? {};

	const recorder = new SimplifyStepRecorder();
	const isRecording = verbosity !== 'result';

	const rules = buildSimplifyRules({
		enableAbs,
		enableTrig,
		enableHyperbolic,
		enableAlgebraic
	});

	// Le moteur part de la forme mise au propre : la barrière de coût compare
	// au meilleur candidat connu, et « regrouper toujours » signifie que `2x`
	// n'a pas à battre `x+x` (5 contre 9) pour être retenu. Sans cela, tout ce
	// que `tidy` fait de plus cher au sens du barème — regroupement, extraction
	// d'un radical — serait rejeté (relevé du 2026-09-20, §3).
	const start = tidy(node);
	if (isRecording && !nodesEqual(start, node)) {
		recorder.setPhase('tidy');
		recorder.recordStep('tidy', getSimplifyRuleDescription('tidy'), node, start, 'detailed');
	}

	const engineResult = rewrite(start, {
		rules,
		preProcess: tidy,
		postProcess: makeTidyThenExpandIfCheaper(costFunction),
		strategy: { kind: 'cost-fixpoint', cost: costFunction },
		maxIterations,
		typeCtx: ctx,
		signal,
		timeoutMs,
		onStep: isRecording ? makeStepBridge(recorder) : undefined
	});

	// Le repli des coefficients (`2 × 3 → 6`) est fait par `tidy` à chaque
	// itération : plus rien à faire ici. En cas d'interruption, on rend le
	// meilleur-jusqu'ici ; s'il n'y en a pas (le moteur en est resté à la forme
	// de départ), le nœud d'ORIGINE, à l'identique.
	const result = engineResult.aborted && engineResult.result === start ? node : engineResult.result;

	return {
		result,
		steps: recorder.getStepsFiltered(verbosity),
		cost: costFunction(result),
		...(engineResult.aborted && { aborted: true })
	};
}
