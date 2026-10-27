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
 * `developper` stands apart : its result is `expand` (`expand.ts`, chantier
 * normalize-usages — no `normalize`), one `expand` step ; the steps shown to
 * the student are written by `expand-steps.ts`.
 *
 * 1. **Phase A — pattern rule loop** : iterate `applyRulesDeepOnceTracked`
 *    until fixpoint or `maxIterations`, mapping every fired rule into a
 *    `PedagogicalSimplifyStep` (with `category` from `categorizeRule`).
 *
 * 2. **Phase B**, by intent :
 *    - `reduire` / `auto` — `tidy`, told in steps, then for `auto` the
 *      polynomial fractions and « expand only if shorter » (`reduce-steps.ts`,
 *      chantier simplify-carte § 33 : normalize developed everything) ;
 *    - `factoriser` — content extraction and the ADR 0024 strategies.
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

import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import { applyRule, applyRulesDeepOnceTracked } from '../pattern/rule';
import { nodesEqual } from '../pattern/match';
import { canonicalForm } from '../normal';
import { segmentLengthOracle } from '../assumptions';
import { findNodes, mapNode } from '../transforms';
import { isFunction } from '../guards';
import type { SchoolLevel } from '../common/step-renderer-base';
import { getPedagogicalSimplifyRuleDescription } from './descriptions-fr';
import { commonContentFactorRules } from '../pattern/rule-sets/common-factor';
import { TRIG_VALUE_RULE_NAMES } from '../pattern/rule-sets/trig';
import { categorizeRule, selectRulesForIntent, TRIG_REDUCTION_RULES } from './intent-rules';
import { expandIfShorter, simplifyPolynomialFractions, tidyAsSteps } from './reduce-steps';
import { withImpliedParentheses } from '../tidy';
import { expand } from './expand';
import {
	flattenGroupedProducts,
	runFactoriserStrategies,
	tidyEachFactor
} from './factor-strategies';
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
 * Les étapes d'un passage, les valeurs remarquables réunies en UNE étape
 * (`sin(π/6) + cos(π/3)` : « On utilise des valeurs remarquables : … et … »,
 * phase 0 de valeurs-remarquables). Les paires sont dans `bindings`
 * (`before0`, `after0`, `before1`…), que lit le titre (`descriptions-fr.ts`).
 */
function withValuesTogether(
	ruleSteps: readonly { ruleName: string; before: MathNode; after: MathNode }[],
	globalBefore: MathNode,
	globalAfter: MathNode,
	makeStep: StepFactory
): PedagogicalSimplifyStep[] {
	const values = ruleSteps.filter((rs) => TRIG_VALUE_RULE_NAMES.has(rs.ruleName));
	const steps: PedagogicalSimplifyStep[] = [];
	for (const rs of ruleSteps) {
		if (values.length < 2 || !TRIG_VALUE_RULE_NAMES.has(rs.ruleName)) {
			steps.push(makeStep(rs.ruleName, rs.before, rs.after, globalBefore, globalAfter));
			continue;
		}
		if (rs !== values[0]) continue;
		const bindings: Record<string, MathNode> = {};
		values.forEach((value, index) => {
			bindings[`before${index}`] = value.before;
			bindings[`after${index}`] = value.after;
		});
		steps.push({
			...makeStep(rs.ruleName, globalBefore, globalAfter, globalBefore, globalAfter),
			bindings
		});
	}
	return steps;
}

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
		steps.push(...withValuesTogether(ruleSteps, before, after, makeStep));

		if (nodesEqual(after, before)) break;
		current = after;
	}

	return { result: current, steps, aborted: false };
}

// =============================================================================
// Valeurs remarquables seules (chantier valeurs-remarquables, 2026-10-27)
// =============================================================================

/**
 * Les valeurs remarquables (`cos(π/3) = 1/2`), avec leur étape, pour les
 * calculs qui ne passent pas par la phase A : `.développer` et `.résoudre`
 * les calculent d'abord (décision de David du 2026-10-27). La parité et la
 * période ne servent qu'à y arriver : sans valeur atteinte, rien ne change
 * (`cos(7π/5)` reste, aucune étape).
 *
 * @param node - Une expression ou une relation
 * @param options - Le niveau (trigonométrie au lycée par défaut), `enableTrig`
 */
export function generateRemarkableValueSteps(
	node: MathNode,
	options: Pick<PedagogicalSimplifyOptions, 'schoolLevel' | 'enableTrig'>
): PedagogicalSimplifyResult {
	const unchanged = { result: node, steps: [] };
	const flags = resolveFlags(options.schoolLevel, { ...options, intent: 'reduire' });
	if (!flags.enableTrig) return unchanged;
	const values = runPatternLoop(
		node,
		TRIG_REDUCTION_RULES,
		DEFAULT_MAX_ITERATIONS,
		undefined,
		createStepFactory()
	);
	const reached = values.steps.some((step) => TRIG_VALUE_RULE_NAMES.has(step.rule));
	return reached ? { result: values.result, steps: values.steps } : unchanged;
}

// =============================================================================
// Longueurs : une longueur est positive (lot Q-F, 2026-10-12)
// =============================================================================

/** Vrai si le nœud contient une racine ou une valeur absolue. */
function hasRadicalOrAbsolute(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(candidate) => isFunction(candidate) && ['sqrt', 'abs'].includes(candidate.name)
		).length > 0
	);
}

/**
 * Les racines carrées qui DISPARAISSENT parce qu'une longueur est positive
 * (`√(AB²) = AB`, `√(9AB²) = 3AB`), une étape chacune, avant les intentions.
 *
 * Même moteur que `simplify` et `areEquivalent` : `normalize` avec l'oracle des
 * longueurs (`segmentLengthOracle`, `numtype` : `AB > 0`, `AA` non supposé). Une racine
 * n'est remplacée que si le résultat n'a plus ni racine ni valeur absolue : `√(8AB²)`
 * et `√(AA²)` restent, et chaque intention en fait ce qu'elle en faisait. Sans longueur,
 * rien n'est touché (l'oracle n'existe pas).
 */
function simplifyLengthRadicals(
	node: MathNode,
	makeStep: StepFactory
): { result: MathNode; steps: PedagogicalSimplifyStep[] } {
	const oracle = segmentLengthOracle(undefined, [node]);
	if (oracle === undefined) return { result: node, steps: [] };
	const replaced: { before: MathNode; after: MathNode }[] = [];
	const result = mapNode(node, (candidate) => {
		if (!isFunction(candidate) || candidate.name !== 'sqrt' || candidate.base !== undefined) {
			return candidate;
		}
		if (candidate.args.length !== 1) return candidate;
		let after: MathNode;
		try {
			after = canonicalForm(candidate, { assumptions: oracle });
		} catch {
			return candidate;
		}
		if (hasRadicalOrAbsolute(after)) return candidate;
		replaced.push({ before: candidate, after });
		return after;
	});
	const steps = replaced.map(({ before, after }) =>
		makeStep('length-radical', before, after, node, result)
	);
	return { result, steps };
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

	// Les racines d'une longueur d'abord (`√(9AB²)` → `3AB`), puis l'intention sur le reste
	const lengths = simplifyLengthRadicals(node, createStepFactory());
	if (lengths.steps.length > 0) {
		const rest = generatePedagogicalSimplifySteps(lengths.result, options);
		const steps = [...lengths.steps, ...rest.steps].map((step, index) => ({
			...step,
			id: index + 1
		}));
		return { ...rest, steps };
	}

	// Développer, et rien d'autre (chantier normalize-usages) : la rédaction
	// montrée est celle de `writeExpandSteps`, cette étape ne sert qu'à dire
	// qu'il s'est passé quelque chose
	if (options.intent === 'developper') {
		const result = expand(node);
		if (nodesEqual(result, node)) return { result: node, steps: [] };
		return { result, steps: [createStepFactory()('expand', node, result, node, result)] };
	}

	const flags = resolveFlags(options.schoolLevel, options);
	const { rules } = selectRulesForIntent(options.intent, flags);
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

		if (options.intent === 'reduire' || options.intent === 'auto') {
			return runReduce(phaseA, options, makeStep);
		}

		// Il ne reste que `factoriser` (`developper` est sorti avant la phase A)
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
		const patternStage = (start: MathNode, first?: typeof phaseA) => {
			const a = first ?? runPatternLoop(start, rules, maxIterations, effectiveSignal, makeStep);
			const withContent = extractCommonContentInMaximalSums(a.result, makeStep);
			const afterContent = withContent.changed
				? runPatternLoop(withContent.result, rules, maxIterations, effectiveSignal, makeStep)
				: null;
			// Sans parenthèses doubles `3((2x−1)(2x+1))`, dans le résultat comme dans les étapes
			const flat = flattenGroupedProducts;
			const steps = [...a.steps, ...withContent.steps, ...(afterContent?.steps ?? [])];
			return {
				result: flat(afterContent?.result ?? withContent.result),
				steps: steps.map((step) => ({
					...step,
					after: flat(step.after),
					...(step.globalBefore && { globalBefore: flat(step.globalBefore) }),
					...(step.globalAfter && { globalAfter: flat(step.globalAfter) })
				}))
			};
		};

		// Puis les stratégies qui racontent (ADR 0024) : facteurs réduits,
		// racines du trinôme, racine évidente, développer en dernier recours.
		const outcome = runFactoriserStrategies(node, {
			level: options.schoolLevel,
			patternStage: (start) => patternStage(start, start === node ? phaseA : undefined),
			develop: (start) =>
				generatePedagogicalSimplifySteps(start, { ...options, intent: 'developper' }),
			makeStep
		});

		// Couper `normalize` ne veut pas dire ne RIEN mettre au propre.
		// `factoriser` le coupe à juste titre — il défferait la factorisation
		// — mais rien ne le remplaçait, et les coefficients restaient bruts :
		// `(2/4)x + x` rendait `(2/4 + 1)x` au lieu de `(3/2)x`. `tidy` met au
		// propre sans jamais DÉVELOPPER : c'est tout son contrat. Le rendu du
		// noyau, lui, est déjà propre (et `tidy` y réordonnerait `x − 1 − √2`).
		const factored = outcome.clean ? outcome.result : tidyEachFactor(outcome.result);
		// La dernière ligne affichée EST le résultat : la mise au propre finale
		// (ordre du noyau, `tidy`) se fait dans la dernière étape, pas en silence
		const last = outcome.steps.length - 1;
		const strategySteps = outcome.steps.map((step, index) =>
			index === last && !nodesEqual(step.globalAfter ?? step.after, factored)
				? { ...step, globalAfter: factored }
				: step
		);
		// S3 (2026-10-23) : `tidy` ne simplifie plus par une base qui peut
		// s'annuler. Une fraction factorisée se simplifie donc en étape, la
		// condition écrite, comme dans `auto` : `(x+1)(x−1)/(x+1) = x−1`, pour
		// x ≠ −1. Ses deux membres sont déjà factorisés, et le reste le reste.
		const keep = (n: MathNode) => n;
		const fractions = simplifyPolynomialFractions(factored, keep, keep, makeStep);
		// Une fraction facteur d'un produit laisse `3·1` : mis au propre dans la
		// dernière étape, comme la factorisation (revue)
		const result = fractions.steps.length > 0 ? tidyEachFactor(fractions.result) : fractions.result;
		const fractionSteps = fractions.steps.map((step, index) =>
			index === fractions.steps.length - 1 ? { ...step, globalAfter: result } : step
		);
		// Ids renumérotés : les étapes jetées (stratégie 6) ont consommé le compteur
		const steps = [...strategySteps, ...fractionSteps].map((step, index) => ({
			...step,
			id: index + 1
		}));
		return { result, steps };
	} finally {
		dispose();
	}
}

/**
 * `reduire` et `auto` après la phase A (chantier simplify-carte § 33).
 *
 * - `reduire` : `tidy`, qui raconte ses gestes — ni développement ni
 *   factorisation, `2(x+3)` reste ;
 * - `auto` : puis les fractions de polynômes simplifiées en montrant la
 *   factorisation et la condition (Q4), puis le développement s'il est plus
 *   court, rédigé comme `.développer`. Le résultat n'est jamais factorisé
 *   (ADR 0007) : `x²+2x+1` reste.
 */
function runReduce(
	phaseA: { result: MathNode; steps: PedagogicalSimplifyStep[] },
	options: PedagogicalSimplifyOptions,
	makeStep: StepFactory
): PedagogicalSimplifyResult {
	// `ln(xy) − ln(xy)` : `ln-product` laisse `ln x + ln y − (ln x + ln y)` sans
	// nœud de parenthèse, et rien ne développait ce `−(…)` (tidy-conditions,
	// PR D). Les parenthèses écrites, le développement s'en charge.
	const tidied = tidyAsSteps(withImpliedParentheses(phaseA.result), makeStep);
	const steps = [...phaseA.steps, ...tidied.steps];
	let result = tidied.result;
	let summary: PedagogicalSimplifyStep[] | undefined;

	if (options.intent === 'auto') {
		const develop = (node: MathNode) =>
			generatePedagogicalSimplifySteps(node, { ...options, intent: 'developper' }).result;
		const fractions = simplifyPolynomialFractions(
			result,
			(node) => generatePedagogicalSimplifySteps(node, { ...options, intent: 'factoriser' }).result,
			develop,
			makeStep
		);
		steps.push(...fractions.steps);
		result = fractions.result;
		// Une fraction simplifiée dans une somme laisse des termes à regrouper :
		// `(x²−1)/(x+1) + 1` → `x − 1 + 1` → `x`
		if (fractions.steps.length > 0) {
			const tidiedAgain = tidyAsSteps(result, makeStep);
			steps.push(...tidiedAgain.steps);
			result = tidiedAgain.result;
		}

		const expanded = expandIfShorter(result, develop);
		if (expanded !== null) {
			summary = [...steps, ...expanded.summary];
			steps.push(...expanded.steps);
			result = expanded.result;
		}
	}

	// Ids renumérotés : les étapes de `.développer` ont leur propre compteur
	const renumber = (list: readonly PedagogicalSimplifyStep[]) =>
		list.map((step, index) => ({ ...step, id: index + 1 }));
	return {
		result,
		steps: renumber(steps),
		...(summary !== undefined && { summary: renumber(summary) })
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
