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
import { number } from '../factory';
import { integrationLatex as toLatex } from './latex';
import { numericValueOrNaN } from '../integration/forbidden-value';
import { withExplicitNumberProducts } from '../pedagogical-differentiation/tidy-step';
import type {
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel,
	StepRenderer
} from '../common/step-renderer-base';
import {
	EXPLANATIONS,
	TITLES,
	coefficientPrefix,
	onlyConstantOut,
	revealedProduct
} from './descriptions-fr';
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
 * - `simplify-result` (« On simplifie ») : one line, `raw = tidied` ; quand
 *   l'exponentielle est mise en facteur et que la forme développée diffère de la
 *   brute, trois lignes : brute, `= développée`, `= factorisée`.
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
			return `\\textcolor{blue}{${integralLatex(step, dx)}}`;
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

		case 'integrand-undefined-on-interval': {
			// L'intégrale, puis la phrase du refus : mots dans \text{}, valeurs en
			// mathématiques ; l'intervalle écrit dans l'ordre croissant (V28)
			const point = step.bindings?.point ? forbiddenPointLatex(step.bindings.point) : '= ?';
			const lines = [
				`  & \\textcolor{blue}{${integralLatex(step, dx)}}`,
				`  & \\text{La fonction n’est pas définie en } ${step.variable} ${point} \\text{, qui appartient à } ${closedIntervalLatex(step)} \\text{ :}`,
				`  & \\text{l’intégrale n’est pas définie sur cet intervalle.}`
			];
			return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`;
		}

		case 'reveal-derivative': {
			// On fait apparaître u′ (décision de David du 2026-10-13) :
			// ∫ f dx = ∫ k × u′g(u) dx = k ∫ u′g(u) dx — la réécriture est un calcul,
			// elle reste en version résumée
			const bindings = step.bindings ?? {};
			const revealed = bindings.revealed;
			if (!revealed || !bindings.k) return formatStandard(step, afterLatex, dx);
			// Jamais `\\int -…` : un produit qui commence par un signe va entre parenthèses
			const product = revealedProduct(bindings);
			const underIntegral = product.startsWith('-') ? `\\left( ${product} \\right)` : product;
			// u′ = 1 : « On sort la constante k », pas de ligne `k × …` (décision de
			// David du 2026-10-13) — ∫ 3/x dx = 3 ∫ 1/x dx
			const lines = [
				`  & \\textcolor{blue}{\\int ${integrandLatex(step.before)}${dx}}`,
				...(onlyConstantOut(bindings) ? [] : [`  & = \\int ${underIntegral}${dx}`]),
				`  & = ${coefficientPrefix(bindings)}\\int ${integrandLatex(revealed)}${dx}`
			];
			return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`;
		}

		case 'apply-composite-exp':
		case 'apply-composite-ln':
		case 'apply-composite-sin':
		case 'apply-composite-cos':
		case 'apply-composite-power': {
			// Après « On fait apparaître u′ » : k ∫ u′g(u) dx = k·G(u)
			const bindings = step.bindings ?? {};
			if (!bindings.k) return formatStandard(step, afterLatex, dx);
			return (
				`\\begin{aligned}\n` +
				`  & \\textcolor{blue}{${coefficientPrefix(bindings)}\\int ${integrandLatex(step.before)}${dx}} \\\\\n` +
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
			if (!uv || !vdu) return formatStandard(step, afterLatex, dx);
			const result = step.bindings?.result;
			const lines = [
				`  & \\textcolor{blue}{\\int ${integrandLatex(step.before)}${dx}}`,
				`  & = ${toLatex(uv)} - \\int ${integrandLatex(vdu)}${dx}`,
				...(result ? [`  & = ${toLatex(result)}`] : [])
			];
			return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`;
		}

		case 'simplify-result': {
			// Une ligne, comme « On simplifie » des dérivées : brute = rangée
			const raw = toLatex(withExplicitNumberProducts(step.before));
			// Exponentielle mise en facteur (lot 4 de l'ADR 0024) : brute = développée = factorisée
			const developed = step.bindings?.developed;
			if (developed && toLatex(developed) !== beforeLatex) {
				const lines = [`  & ${raw}`, `  & = ${toLatex(developed)}`, `  & = ${afterLatex}`];
				return `\\begin{aligned}\n${lines.join(' \\\\\n')}\n\\end{aligned}`;
			}
			return `${raw} = ${afterLatex}`;
		}

		case 'factor-result':
		case 'expand-result':
			// Forme demandée par l'énoncé (D4) : une ligne, simplifiée = demandée
			return `${beforeLatex} = ${afterLatex}`;

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
				`  & \\textcolor{blue}{${integralLatex(step, dx)}} \\\\\n` +
				`  & = \\left[${F}\\right]_{${a}}^{${b}}\n` +
				`\\end{aligned}`
			);
		}

		default:
			return formatStandard(step, afterLatex, dx);
	}
}

/**
 * `\\int_{a}^{b} f\\,dx` (ou `\\int f\\,dx` sans bornes), l'intégrande `step.before`
 * entre parenthèses si c'est une somme ou un opposé (`integrandLatex`)
 */
function integralLatex(step: PedagogicalIntegrationStep, dx: string): string {
	const integrand = integrandLatex(step.before);
	return step.definite
		? `\\int_{${toLatex(step.definite.lower)}}^{${toLatex(step.definite.upper)}} ${integrand}${dx}`
		: `\\int ${integrand}${dx}`;
}

/** Chiffres significatifs d'une valeur interdite approchée */
const FORBIDDEN_POINT_SIGNIFICANT = 3;

/**
 * `= 3/2`, `= \\dfrac{\\pi}{2}`, `= 0.5` : la valeur interdite exacte ; un
 * décimal plus long (racine de x³ − 2, seule écriture que rend le domaine)
 * s'écrit à 3 chiffres significatifs, `\\approx 1.26`, `\\approx 0.000412`,
 * jamais `= 1.2599210498948732` ni « ≈ 0 » (revue du 2026-10-13 : un arrondi à
 * 3 décimales écrasait les petites valeurs). Le binding `point` reste la valeur
 * complète (la garde de l'atelier la compare).
 */
function forbiddenPointLatex(point: MathNode): string {
	// −1,2599… : un opposé de nombre (pas de nombre négatif littéral)
	const negative = point.type === 'opposite';
	const magnitude = point.type === 'opposite' ? point.operand : point;
	if (magnitude.type !== 'number') return `= ${toLatex(point)}`;
	const value = Number(magnitude.value);
	if (!Number.isFinite(value) || value === 0) return `= ${toLatex(point)}`;
	const text = significantDecimal(value, FORBIDDEN_POINT_SIGNIFICANT);
	if (Number(text) === value) return `= ${toLatex(point)}`;
	return `\\approx ${negative ? '-' : ''}${toLatex(number(text))}`;
}

/**
 * Un réel strictement positif à `digits` chiffres significatifs, en écriture
 * décimale (jamais `1.23e-7`), sans zéro final : `0.000412`, `1.26`, `1230`.
 */
function significantDecimal(value: number, digits: number): string {
	const rounded = Number(value.toPrecision(digits));
	const exponent = Math.floor(Math.log10(rounded));
	const decimals = Math.max(0, digits - 1 - exponent);
	const fixed = rounded.toFixed(decimals);
	return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}

/**
 * `\\left[ a ; b \\right]`, bornes dans l'ordre croissant (∫₂¹ porte sur
 * [1 ; 2]) ; ordre d'écriture gardé quand les bornes sont littérales.
 */
function closedIntervalLatex(step: PedagogicalIntegrationStep): string {
	if (!step.definite) return '?';
	const { lower, upper } = step.definite;
	const reversed = numericValueOrNaN(lower) > numericValueOrNaN(upper);
	const [lo, hi] = reversed ? [upper, lower] : [lower, upper];
	return `\\left[ ${toLatex(lo)} ; ${toLatex(hi)} \\right]`;
}

/**
 * Un intégrande somme, opposé ou qui commence par un signe (`-3\\sin(x+2)`),
 * entre parenthèses : `\\int \\left( -\\cos x \\right)\\,dx` — jamais `\\int -…`
 */
function integrandLatex(node: MathNode): string {
	const latex = toLatex(node);
	const wrap = node.type === 'addition' || node.type === 'subtraction' || node.type === 'opposite';
	return wrap || latex.startsWith('-') ? `\\left( ${latex} \\right)` : latex;
}

/** Standard 2-line render : integral on top, antiderivative below. */
function formatStandard(step: PedagogicalIntegrationStep, afterLatex: string, dx: string): string {
	return (
		`\\begin{aligned}\n` +
		`  & \\textcolor{blue}{${integralLatex(step, dx)}} \\\\\n` +
		`  & = ${afterLatex}\n` +
		`\\end{aligned}`
	);
}

// =============================================================================
// Renderer
// =============================================================================

export class PedagogicalIntegrationRenderer implements StepRenderer<
	PedagogicalIntegrationStep,
	IntegrationRenderOptions
> {
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
