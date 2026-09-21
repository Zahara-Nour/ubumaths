/**
 * Pedagogical Simplify — Pipeline Orchestrator
 *
 * `generatePedagogicalSimplifySteps(node, options)` is the high-level entry
 * point. Architecture is Option C′ (manual rule-application loop in the
 * spirit of `pedagogical-arithmetic/pipeline.ts`, distinct from the
 * algorithmic `simplify()` orchestrator).
 *
 * Two-phase strategy :
 *
 * 1. **Phase A — pattern rule loop** : iterate `applyRulesDeepOnceTracked`
 *    until fixpoint or `maxIterations`, mapping every fired rule into a
 *    `PedagogicalSimplifyStep` (with `category` from `categorizeRule`).
 *
 * 2. **Phase B — normalize bridge** (only when `useNormalize === true`) :
 *    run `normalize()` on the Phase A result with a `StepRecorder`,
 *    convert each `NormalizationStep` into a `PedagogicalSimplifyStep`,
 *    append.
 *
 * Both phases populate `globalBefore` / `globalAfter` with the full
 * expression context at the moment the step fired so the renderer can
 * highlight the changed sub-tree against the surrounding tree.
 *
 * Throws `PedagogicalSimplifyNotImplemented` for V1-out-of-scope inputs
 * (matrices, inequations).
 *
 * @module mathAST/pedagogical-simplify/pipeline
 */

import { tidy } from '../tidy';
import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import { applyRule, applyRulesDeepOnceTracked } from '../pattern/rule';
import { nodesEqual } from '../pattern/match';
import { normalize, denormalize } from '../normal';
import { StepRecorder } from '../normal/step-recorder';
import type { SchoolLevel } from '../common/step-renderer-base';
import { getPedagogicalSimplifyRuleDescription } from './descriptions-fr';
import { commonContentFactorRules } from '../pattern/rule-sets/common-factor';
import { categorizeRule, selectRulesForIntent } from './intent-rules';
import {
	PedagogicalSimplifyNotImplemented,
	type PedagogicalSimplifyOptions,
	type PedagogicalSimplifyResult,
	type PedagogicalSimplifyStep
} from './types';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_ITERATIONS = 20;

// =============================================================================
// Flag resolution
// =============================================================================

/**
 * Resolve `enableTrig` / `enableLogExp` defaults from `schoolLevel` :
 * trig and log/exp are off below lycée. `enableAbs` defaults to true at
 * every level. `enableHyperbolic` defaults to false (V1 excludes them).
 *
 * Caller-supplied flags always win over the level-based defaults.
 */
function resolveFlags(
	level: SchoolLevel,
	options: PedagogicalSimplifyOptions
): {
	enableTrig: boolean;
	enableLogExp: boolean;
	enableAbs: boolean;
	enableHyperbolic: boolean;
} {
	const trigDefault = level === 'lycee' || level === 'superieur';
	const logExpDefault = level === 'lycee' || level === 'superieur';
	return {
		enableTrig: options.enableTrig ?? trigDefault,
		enableLogExp: options.enableLogExp ?? logExpDefault,
		enableAbs: options.enableAbs ?? true,
		enableHyperbolic: options.enableHyperbolic ?? false
	};
}

// =============================================================================
// V1 scope guard
// =============================================================================

/**
 * Reject V1-out-of-scope nodes early. Throws
 * `PedagogicalSimplifyNotImplemented` ; the caller (`correction-generator`)
 * catches it and falls back to Mode A.
 *
 * Rejected :
 *  - matrices (own module, V2+)
 *  - relations with operator other than `=` (inequations have their own
 *    pedagogical pipeline ; an equation node would be unusual input but
 *    we let it through to surface as a no-op)
 *
 * Walks the whole tree because rejection must trigger even if the
 * unsupported construct is nested.
 */
function rejectUnsupported(node: MathNode): void {
	const walk = (n: MathNode): void => {
		if (n.type === 'matrix') {
			throw new PedagogicalSimplifyNotImplemented(
				'pedagogical-simplify V1 does not support matrices',
				n
			);
		}
		if (n.type === 'relation' && n.relation !== '=') {
			throw new PedagogicalSimplifyNotImplemented(
				`pedagogical-simplify V1 does not support inequations (relation '${n.relation}')`,
				n
			);
		}
		// Piecewise / logical / logical-not are V1-out-of-scope on their own
		// AND can host nested unsupported constructs in their children — we
		// reject them outright rather than walking deeper.
		if (n.type === 'piecewise') {
			throw new PedagogicalSimplifyNotImplemented(
				'pedagogical-simplify V1 does not support piecewise expressions',
				n
			);
		}
		if (n.type === 'logical' || n.type === 'logical-not') {
			throw new PedagogicalSimplifyNotImplemented(
				`pedagogical-simplify V1 does not support boolean logic nodes (type '${n.type}')`,
				n
			);
		}
		// Recurse on whatever children the node has. We only descend into
		// node types that can plausibly contain a `matrix` or non-`=`
		// `relation` ; primitive nodes (number/variable/etc.) terminate.
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
			case 'superscript':
				walk(n.base);
				walk(n.superscript);
				break;
			case 'subscript':
				walk(n.base);
				walk(n.subscript);
				break;
			case 'function':
				for (const arg of n.args) walk(arg);
				if (n.power) walk(n.power);
				if (n.base) walk(n.base);
				break;
			case 'relation':
				walk(n.left);
				walk(n.right);
				break;
			case 'composition':
				walk(n.outer);
				walk(n.inner);
				break;
			case 'unit':
				walk(n.expression);
				break;
			case 'limit':
				walk(n.expression);
				walk(n.approach);
				break;
			default:
				break;
		}
	};
	walk(node);
}

// =============================================================================
// Step factory
// =============================================================================

/**
 * Build a step factory bound to a per-call ID counter. Each invocation of
 * `generatePedagogicalSimplifySteps` gets its own factory ; module-level
 * state is avoided so concurrent calls (e.g. parallel server requests) do
 * not corrupt each other's IDs.
 */
function createStepFactory(): (
	rule: string,
	before: MathNode,
	after: MathNode,
	globalBefore: MathNode,
	globalAfter: MathNode
) => PedagogicalSimplifyStep {
	let nextId = 1;
	return (rule, before, after, globalBefore, globalAfter) => ({
		id: nextId++,
		rule,
		description: getPedagogicalSimplifyRuleDescription(rule),
		before,
		after,
		verbosityLevel: 'detailed',
		category: categorizeRule(rule),
		globalBefore,
		globalAfter
	});
}

type StepFactory = ReturnType<typeof createStepFactory>;

// =============================================================================
// Phase A — pattern rule loop
// =============================================================================

/**
 * Apply pattern rules to fixpoint, recording one `PedagogicalSimplifyStep`
 * per rule firing. Each iteration calls `applyRulesDeepOnceTracked`, which
 * is a single bottom-up pass that fires the highest-priority matching rule
 * at every node it visits.
 *
 * Stops on : structural fixpoint (no rule fired), `maxIterations` exceeded,
 * or abort signal.
 */
function runPatternLoop(
	node: MathNode,
	rules: readonly Rule[],
	maxIterations: number,
	signal: AbortSignal | undefined,
	makeStep: StepFactory
): { result: MathNode; steps: PedagogicalSimplifyStep[]; aborted: boolean } {
	const steps: PedagogicalSimplifyStep[] = [];
	let current = node;

	if (rules.length === 0) {
		return { result: current, steps, aborted: false };
	}

	for (let iter = 0; iter < maxIterations; iter++) {
		if (signal?.aborted) {
			return { result: current, steps, aborted: true };
		}
		const before = current;
		const { result: after, steps: ruleSteps } = applyRulesDeepOnceTracked(rules, current);

		// Each rule firing in this iteration produces one step. We snapshot
		// `before` (current at iter start) and `after` (whole tree after
		// applying ALL rules in the deep pass) for the global context;
		// the per-rule before/after are the local sub-tree changes.
		// V1 limitation: when several rules fire in the same deep pass on
		// disjoint sub-trees, all emitted steps share the same iteration
		// `globalBefore`/`globalAfter` snapshot — the renderer cannot show
		// "the tree as it stood after the first rule but before the second"
		// because the engine collapses them into one iteration. Acceptable
		// for V1 ; revisit when the renderer needs intermediate snapshots.
		for (const rs of ruleSteps) {
			steps.push(makeStep(rs.ruleName, rs.before, rs.after, before, after));
		}

		if (nodesEqual(after, before)) break;
		current = after;
	}

	return { result: current, steps, aborted: false };
}

// =============================================================================
// Phase B — normalize bridge
// =============================================================================

/**
 * Run normalize() with a step recorder, then convert each
 * `NormalizationStep` to a `PedagogicalSimplifyStep`. The whole-tree
 * before/after of the normalize pass are used as `globalBefore` /
 * `globalAfter` on every emitted step (the normalize recorder doesn't
 * preserve the exact iteration boundary per step, so a single global
 * snapshot is the honest value).
 */
function runNormalizePass(
	node: MathNode,
	signal: AbortSignal | undefined,
	makeStep: StepFactory
): { result: MathNode; steps: PedagogicalSimplifyStep[]; aborted: boolean } {
	const recorder = new StepRecorder();
	let result: MathNode;
	try {
		const normalForm = normalize(node, {
			recorder,
			verbosity: 'detailed'
		});
		result = denormalize(normalForm);
	} catch {
		// Normalize-side errors (rare edge cases) are swallowed silently
		// to match the algorithmic `simplify()`'s defensive behavior.
		// The Phase A result is preserved as the pipeline's `result`.
		return { result: node, steps: [], aborted: false };
	}

	// `normalize()` is synchronous and uninterruptible from here, so this
	// post-facto check only catches abort signals raised during Phase A
	// or by an external observer between phases. A signal aborted during
	// the normalize call itself will not interrupt it ; that limitation
	// is structural, not a bug.
	if (signal?.aborted) {
		return { result, steps: [], aborted: true };
	}

	const recorded = recorder.getSteps();
	const steps: PedagogicalSimplifyStep[] = recorded.map((rs) =>
		makeStep(rs.rule, rs.before, rs.after, node, result)
	);
	return { result, steps, aborted: false };
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Generate a pedagogical step trace for simplifying `node` according to the
 * caller-declared `intent` and `schoolLevel`.
 *
 * Throws `PedagogicalSimplifyNotImplemented` for V1-out-of-scope inputs
 * (matrices, inequations).
 *
 * @example
 * ```ts
 * const { result, steps } = generatePedagogicalSimplifySteps(parseLatex('(x+1)(x-1)'), {
 *   intent: 'developper',
 *   schoolLevel: 'college'
 * });
 * // result = x^2 - 1
 * // steps = [{ rule: 'product-to-diff-squares', ... }]
 * ```
 */
export function generatePedagogicalSimplifySteps(
	node: MathNode,
	options: PedagogicalSimplifyOptions
): PedagogicalSimplifyResult {
	rejectUnsupported(node);

	const flags = resolveFlags(options.schoolLevel, options);
	const { rules, useNormalize } = selectRulesForIntent(options.intent, flags);
	const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;

	const makeStep = createStepFactory();

	// Compose the caller's `signal` with an internal timer driven by
	// `timeoutMs`, if any. Both inputs trigger the same effective signal so
	// the Phase A loop only checks one source.
	const { signal: effectiveSignal, dispose } = composeAbortSignal(
		options.signal,
		options.timeoutMs
	);

	try {
		const phaseA = runPatternLoop(node, rules, maxIterations, effectiveSignal, makeStep);
		if (phaseA.aborted) {
			return {
				result: phaseA.result,
				steps: phaseA.steps,
				aborted: true
			};
		}

		if (!useNormalize) {
			// ⚠️ Couper `normalize` ne veut pas dire ne RIEN mettre au propre.
			// `factoriser` le coupe à juste titre — il défferait la factorisation
			// — mais rien ne le remplaçait, et les coefficients restaient bruts :
			// `(2/4)x + x` rendait `(2/4 + 1)x` au lieu de `(3/2)x`.
			//
			// `tidy` est exactement l'outil qui manque : il met au propre sans
			// jamais DÉVELOPPER, donc sans défaire ce que la phase A vient de
			// factoriser. C'est tout son contrat.
			// ⚠️ La mise en facteur du CONTENU — numérique et monôme — s'applique
			// aux sommes MAXIMALES seulement, et après la phase A.
			//
			// En profondeur, elle factoriserait une sous-somme avant que la somme
			// entière ne soit vue : `x² + 2x + 1` se parse `((x² + 2x) + 1)`, et
			// le parcours remontant visite `x² + 2x` d'abord. Il deviendrait
			// `x(x+2)`, et `perfect-square-trinomial` ne reconnaîtrait plus le
			// trinôme. L'élève perdrait la phrase « On reconnaît un trinôme carré
			// parfait », qui est la raison d'être de ce module.
			//
			// À la racine, l'ordre est le bon : les identités ont déjà eu leur
			// chance sur la somme entière, et ce qui reste est un contenu à
			// sortir. On relance ensuite la phase A pour que les identités voient
			// la somme intérieure — c'est ce qui donne `3x² + 6x + 3 → 3(x+1)²`.
			const withContent = extractCommonContentInMaximalSums(phaseA.result, makeStep);
			const afterContent = withContent.changed
				? runPatternLoop(withContent.result, rules, maxIterations, effectiveSignal, makeStep)
				: null;

			const factored = afterContent?.result ?? withContent.result;
			const steps = [...phaseA.steps, ...withContent.steps, ...(afterContent?.steps ?? [])];

			// Couper `normalize` ne veut pas dire ne RIEN mettre au propre.
			// `factoriser` le coupe à juste titre — il défferait la factorisation
			// — mais rien ne le remplaçait, et les coefficients restaient bruts :
			// `(2/4)x + x` rendait `(2/4 + 1)x` au lieu de `(3/2)x`. `tidy` met au
			// propre sans jamais DÉVELOPPER : c'est tout son contrat.
			return { result: tidyWithoutReordering(factored), steps };
		}

		const phaseB = runNormalizePass(phaseA.result, effectiveSignal, makeStep);
		const allSteps = [...phaseA.steps, ...phaseB.steps];
		if (phaseB.aborted) {
			return {
				result: phaseB.result,
				steps: allSteps,
				aborted: true
			};
		}
		return {
			result: phaseB.result,
			steps: allSteps
		};
	} finally {
		dispose();
	}
}

/**
 * Met au propre **sans réordonner** un produit déjà factorisé.
 *
 * `tidy` range les facteurs dans son ordre canonique : `(x+1)e^x` y devient
 * `e^x(x+1)`. Les deux écritures sont justes, mais c'est la première qu'on
 * écrit au tableau pour une dérivée, et l'ordre vient ici d'une factorisation
 * que l'élève vient de suivre — le moteur n'a pas à la rebattre.
 *
 * On met donc chaque facteur au propre séparément, en gardant l'ordre. Tout ce
 * qui n'est pas un produit passe par `tidy` entier : `√8` devient `2√2`,
 * `2x + 3x` devient `5x`.
 */
function tidyWithoutReordering(node: MathNode): MathNode {
	if (node.type !== 'multiplication') return tidy(node);
	return {
		...node,
		left: tidyWithoutReordering(node.left),
		right: tidyWithoutReordering(node.right)
	};
}

/**
 * Applique la mise en facteur du contenu aux sommes **maximales** — celles qui
 * ne sont pas elles-mêmes un terme d'une somme plus grande.
 *
 * ⚠️ C'est la condition qui rend la règle sûre. Appliquée à n'importe quelle
 * somme, elle factoriserait une sous-somme avant que la somme entière ne soit
 * vue : `x² + 2x + 1` se parse `((x² + 2x) + 1)`, et un parcours remontant
 * visite `x² + 2x` d'abord. Il deviendrait `x(x+2)`, et
 * `perfect-square-trinomial` ne reconnaîtrait plus le trinôme — l'élève
 * perdrait la phrase « On reconnaît un trinôme carré parfait », qui est la
 * raison d'être de ce module.
 *
 * Restreindre à la seule RACINE ne suffit pas : `x²y + xy` passe d'abord par la
 * mise en facteur symbolique, qui rend `y(x² + x)`. La somme `x² + x` n'est
 * plus à la racine, mais elle est maximale — son parent est un produit — et
 * elle a bien un contenu à sortir.
 */
function extractCommonContentInMaximalSums(
	node: MathNode,
	makeStep: StepFactory
): { result: MathNode; steps: PedagogicalSimplifyStep[]; changed: boolean } {
	// Les réécritures sont d'abord collectées localement : le contexte global
	// d'une étape est l'expression avant et après TOUTE la passe, qu'on ne
	// connaît qu'une fois le parcours terminé.
	const rewrites: Array<{ rule: string; before: MathNode; after: MathNode }> = [];

	const visit = (current: MathNode, insideSum: boolean): MathNode => {
		const isSum = current.type === 'addition' || current.type === 'subtraction';

		// Une somme imbriquée dans une somme n'est pas maximale : on la traverse
		// sans jamais l'attaquer.
		if (isSum && insideSum) {
			return mapChildren(current, (child) => visit(child, true));
		}

		const withChildren = mapChildren(current, (child) => visit(child, isSum));
		if (!isSum) return withChildren;

		for (const rule of commonContentFactorRules) {
			const transformed = applyRule(rule, withChildren);
			if (transformed !== null && !nodesEqual(transformed, withChildren)) {
				rewrites.push({ rule: rule.name, before: withChildren, after: transformed });
				return transformed;
			}
		}
		return withChildren;
	};

	const result = visit(node, false);
	const steps = rewrites.map((r) => makeStep(r.rule, r.before, r.after, node, result));
	return { result, steps, changed: rewrites.length > 0 };
}

/** Reconstruit un nœud en transformant ses enfants directs. */
function mapChildren(node: MathNode, transform: (child: MathNode) => MathNode): MathNode {
	const rebuilt = { ...node } as Record<string, unknown>;
	let changed = false;
	for (const key of [
		'left',
		'right',
		'operand',
		'content',
		'base',
		'superscript',
		'numerator',
		'denominator'
	]) {
		const child = rebuilt[key];
		if (child !== undefined && child !== null && typeof child === 'object' && 'type' in child) {
			const next = transform(child as MathNode);
			if (next !== child) {
				rebuilt[key] = next;
				changed = true;
			}
		}
	}
	const args = rebuilt.args;
	if (Array.isArray(args)) {
		const nextArgs = args.map((a) => transform(a as MathNode));
		if (nextArgs.some((a, i) => a !== args[i])) {
			rebuilt.args = nextArgs;
			changed = true;
		}
	}
	return changed ? (rebuilt as unknown as MathNode) : node;
}

/**
 * Build an effective `AbortSignal` that triggers when EITHER the caller's
 * signal aborts OR the `timeoutMs` deadline elapses. Returns the composed
 * signal plus a `dispose()` callback that cleans up the timer and
 * listener, to be invoked from the caller's `finally` block.
 *
 * If neither input is provided, returns `signal: undefined` and a no-op
 * `dispose` so callers don't pay for a never-fired controller.
 */
function composeAbortSignal(
	callerSignal: AbortSignal | undefined,
	timeoutMs: number | undefined
): { signal: AbortSignal | undefined; dispose: () => void } {
	if (callerSignal === undefined && timeoutMs === undefined) {
		return { signal: undefined, dispose: () => {} };
	}
	if (callerSignal !== undefined && timeoutMs === undefined) {
		return { signal: callerSignal, dispose: () => {} };
	}
	const ctrl = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let onCallerAbort: (() => void) | undefined;

	if (timeoutMs !== undefined) {
		// `timeoutMs <= 0` means "abort immediately" : `setTimeout(_, 0)`
		// would only fire on the next event loop tick, which never arrives
		// during the pipeline's synchronous execution. Aborting up-front
		// matches the caller's intent and makes the option testable.
		if (timeoutMs <= 0) {
			ctrl.abort();
		} else {
			timer = setTimeout(() => ctrl.abort(), timeoutMs);
		}
	}
	if (callerSignal !== undefined) {
		if (callerSignal.aborted) {
			ctrl.abort();
		} else {
			onCallerAbort = () => ctrl.abort();
			callerSignal.addEventListener('abort', onCallerAbort);
		}
	}
	return {
		signal: ctrl.signal,
		dispose: () => {
			if (timer !== undefined) clearTimeout(timer);
			if (onCallerAbort !== undefined && callerSignal) {
				callerSignal.removeEventListener('abort', onCallerAbort);
			}
		}
	};
}
