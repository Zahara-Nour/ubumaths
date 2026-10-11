/**
 * Pedagogical Integration — Renderer
 *
 * Converts raw `PedagogicalIntegrationStep` objects (recorded by `pipeline.ts`)
 * into `RenderedStep` objects with French titles and explanations adapted to a
 * `SchoolLevel`.
 *
 * Behaviour summary :
 *
 * - Bumps `primaire` and `college` to `lycee` (integration is not on the
 *   syllabus before Terminale).
 * - Title lookup : `TITLES[effective][rule] ?? TITLES.lycee[rule] ?? () => step.description`
 * - Explanation lookup (verbosity `detailed` only) : same fallback chain in
 *   `EXPLANATIONS`.
 * - LaTeX : 2-line aligned block with the integral on top and the
 *   antiderivative on the bottom. The integral is highlighted in blue. For
 *   definite integrals, the bounds appear in `\int_{a}^{b}`. For the
 *   `substitute-bounds` step specifically, the rendering is
 *   `[F]_a^b → F(b) - F(a)` rather than the integral.
 * - Recurses into `subSteps` so the consumer sees the full tree.
 *
 * @module mathAST/pedagogical-integration/renderer
 */

import type { MathNode } from '../types';
import { toLatex } from '../latex-generator';
import { withExplicitNumberProducts } from '../pedagogical-differentiation/tidy-step';
import type {
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel,
	StepRenderer
} from '../common/step-renderer-base';
import { EXPLANATIONS, TITLES } from './descriptions-fr';
import type {
	IntegrationBindings,
	PedagogicalIntegrationRule,
	PedagogicalIntegrationStep
} from './types';

// =============================================================================
// Public option type
// =============================================================================

/**
 * Options accepted by `PedagogicalIntegrationRenderer.render`.
 * Mirrors the shared `PedagogicalRenderOptions` ; integration has no
 * notation-switch knob (unlike differentiation's Lagrange/Leibniz).
 */
export type IntegrationRenderOptions = PedagogicalRenderOptions;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Bump primaire/college up to lycee. Integration is not on the syllabus
 * before Terminale, so we use lycee vocabulary as a sensible default. The
 * pipeline's `IntegrationSchoolLevel` type already excludes those levels at
 * the type level, but the renderer accepts the broader `SchoolLevel` to
 * stay polymorphic with `PedagogicalRenderOptions`.
 */
function effectiveSchoolLevel(level: SchoolLevel): SchoolLevel {
	if (level === 'primaire' || level === 'college') return 'lycee';
	return level;
}

function lookupTitle(
	rule: PedagogicalIntegrationRule,
	effective: SchoolLevel,
	bindings: IntegrationBindings | undefined,
	fallbackDescription: string
): string {
	const fn = TITLES[effective][rule] ?? TITLES.lycee[rule] ?? ((): string => fallbackDescription);
	return fn(bindings ?? {});
}

function lookupExplanation(
	rule: PedagogicalIntegrationRule,
	effective: SchoolLevel,
	bindings: IntegrationBindings | undefined
): string | undefined {
	const fn = EXPLANATIONS[effective][rule] ?? EXPLANATIONS.lycee[rule];
	return fn?.(bindings ?? {});
}

/**
 * LaTeX rendering. The format depends on the rule kind :
 *
 * - Standard integration steps (power-rule, known-primitive, composite, …) :
 *   ```
 *   \begin{aligned}
 *     & \textcolor{blue}{\int (before)\,dx} \\
 *     & = (after)
 *   \end{aligned}
 *   ```
 *   For definite integrals, the integral is `\int_{a}^{b}`.
 *
 * - `substitute-bounds` :
 *   ```
 *   \begin{aligned}
 *     & \textcolor{blue}{\left[F\right]_{a}^{b}} \\
 *     & = F(b) - F(a)
 *   \end{aligned}
 *   ```
 *
 * - `simplify-bounds-result` : same as standard but with no `\int` (we're
 *   simplifying a numeric expression at this point).
 *
 * - `identify-parts` / `choose-u-dv` : the integral alone (nothing is
 *   computed yet — no `= <integrand>` line). `apply-parts-formula` : the
 *   standard format. The pedagogical narrative around `u`, `dv`, `du`, `v`
 *   lives in the title and explanation.
 *
 * - `simplify-result` (« On simplifie ») : one line, `raw = tidied`.
 *
 * - `add-constant` and `identify-integrand` : single-line render (no
 *   transformation, just narration).
 */
function formatExpressionLatex(step: PedagogicalIntegrationStep): string {
	const beforeLatex = toLatex(step.before);
	const afterLatex = toLatex(step.after);
	const dx = `\\,d${step.variable}`;

	switch (step.rule) {
		case 'identify-integrand':
		case 'identify-definite-integral':
		case 'identify-parts':
		case 'choose-u-dv': {
			// Pure narration — show only the integral form. Pour l'IPP, pas de
			// « = <intégrande> » : rien n'est encore calculé (décision du 2026-10-11)
			const integralLhs = step.definite
				? `\\int_{${toLatex(step.definite.lower)}}^{${toLatex(step.definite.upper)}} ${beforeLatex}${dx}`
				: `\\int ${beforeLatex}${dx}`;
			return `\\textcolor{blue}{${integralLhs}}`;
		}

		case 'substitute-bounds': {
			const F = step.bindings?.primitive ? toLatex(step.bindings.primitive) : '?';
			const a = step.definite ? toLatex(step.definite.lower) : '?';
			const b = step.definite ? toLatex(step.definite.upper) : '?';
			return (
				`\\begin{aligned}\n` +
				`  & \\textcolor{blue}{\\left[${F}\\right]_{${a}}^{${b}}} \\\\\n` +
				`  & = ${afterLatex}\n` +
				`\\end{aligned}`
			);
		}

		case 'simplify-bounds-result': {
			// 2-line render without `\int` — we're simplifying F(b) - F(a).
			return (
				`\\begin{aligned}\n` +
				`  & \\textcolor{blue}{${beforeLatex}} \\\\\n` +
				`  & = ${afterLatex}\n` +
				`\\end{aligned}`
			);
		}

		case 'apply-parts-formula': {
			// uv − ∫ v du, l'intégrale restante ÉCRITE ; puis, quand elle est
			// calculée (`result`), la primitive. Sans cela, l'IPP cyclique
			// affichait u₀v₀ − f₁, une égalité fausse (revue du 2026-10-11).
			const uv = step.bindings?.uv;
			const vdu = step.bindings?.vdu;
			if (!uv || !vdu) return formatStandard(step, beforeLatex, afterLatex, dx);
			const result = step.bindings?.result;
			const lines = [
				`  & \\textcolor{blue}{\\int ${beforeLatex}${dx}}`,
				`  & = ${toLatex(uv)} - \\int ${integrandLatex(vdu)}${dx}`,
				...(result ? [`  & = ${toLatex(result)}`] : [])
			];
			return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`;
		}

		case 'simplify-result': {
			// Une ligne, comme « On simplifie » des dérivées : brute = rangée
			const raw = toLatex(withExplicitNumberProducts(step.before));
			return `${raw} = ${afterLatex}`;
		}

		case 'add-constant': {
			// Single-line narrative : antiderivative + C.
			return `\\textcolor{blue}{${afterLatex} + C}`;
		}

		case 'apply-fundamental-theorem': {
			// Show the integral on top, the bracketed primitive below.
			const F = step.bindings?.primitive ? toLatex(step.bindings.primitive) : afterLatex;
			const a = step.definite ? toLatex(step.definite.lower) : '?';
			const b = step.definite ? toLatex(step.definite.upper) : '?';
			return (
				`\\begin{aligned}\n` +
				`  & \\textcolor{blue}{\\int_{${a}}^{${b}} ${beforeLatex}${dx}} \\\\\n` +
				`  & = \\left[${F}\\right]_{${a}}^{${b}}\n` +
				`\\end{aligned}`
			);
		}

		default:
			return formatStandard(step, beforeLatex, afterLatex, dx);
	}
}

/** Un intégrande somme ou opposé, entre parenthèses : `\\int \\left( -\\cos x \\right)\\,dx`. */
function integrandLatex(node: MathNode): string {
	const latex = toLatex(node);
	return node.type === 'addition' || node.type === 'subtraction' || node.type === 'opposite'
		? `\\left( ${latex} \\right)`
		: latex;
}

/** Standard 2-line render : integral on top, antiderivative below. */
function formatStandard(
	step: PedagogicalIntegrationStep,
	beforeLatex: string,
	afterLatex: string,
	dx: string
): string {
	const integralLhs = step.definite
		? `\\int_{${toLatex(step.definite.lower)}}^{${toLatex(step.definite.upper)}} ${beforeLatex}${dx}`
		: `\\int ${beforeLatex}${dx}`;
	return (
		`\\begin{aligned}\n` +
		`  & \\textcolor{blue}{${integralLhs}} \\\\\n` +
		`  & = ${afterLatex}\n` +
		`\\end{aligned}`
	);
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalIntegrationRenderer
	implements StepRenderer<PedagogicalIntegrationStep, IntegrationRenderOptions>
{
	render(step: PedagogicalIntegrationStep, options: IntegrationRenderOptions): RenderedStep {
		const effective = effectiveSchoolLevel(options.schoolLevel);
		const title = lookupTitle(step.rule, effective, step.bindings, step.description);
		const explanation =
			options.verbosity === 'detailed'
				? lookupExplanation(step.rule, effective, step.bindings)
				: undefined;

		const subSteps = step.subSteps?.map((s) => this.render(s, options));

		return {
			id: step.id,
			rule: step.rule,
			title,
			explanation,
			expressionLatex: formatExpressionLatex(step),
			schoolLevel: effective,
			subSteps: subSteps && subSteps.length > 0 ? subSteps : undefined
		};
	}

	renderAll(
		steps: readonly PedagogicalIntegrationStep[],
		options: IntegrationRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}
}
