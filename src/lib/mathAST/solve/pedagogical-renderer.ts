/**
 * Pedagogical Step Renderer for Equation Solving
 *
 * Adapts solve steps (`SolveStep`) to a French school-level vocabulary so the
 * output matches what teachers would write at primaire, college, lycee, or
 * supérieur. MVP coverage: linear and quadratic rules (the two most common in
 * student-facing exercises). All other rules fall back to the lycee titles or
 * to `step.description` (which is already FR via `solve/descriptions-fr.ts`).
 *
 * @module mathAST/solve/pedagogical-renderer
 */

import type { MathNode } from '../types';
import { toLatex } from '../latex-generator';
import type { SolveStep } from './types';
import type {
	StepRenderer,
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel
} from '../common/step-renderer-base';

// =============================================================================
// Vocabulary tables
// =============================================================================

type TitleFn = (step: SolveStep) => string;
type ExplanationFn = (step: SolveStep) => string;

/** Format an operand for display (LaTeX or fallback "?") */
function fmt(node: MathNode | undefined): string {
	return node ? toLatex(node) : '?';
}

const TITLES: Record<SchoolLevel, Partial<Record<string, TitleFn>>> = {
	primaire: {
		// Linear — primaire-friendly phrasing
		'identify-linear': () => 'On a une équation simple avec une seule inconnue',
		'identify-linear-coefficients': () => 'On regarde les nombres devant et après la lettre',
		'subtract-constant': (s) => `On enlève ${fmt(s.operand)} des deux côtés`,
		'add-constant': (s) => `On ajoute ${fmt(s.operand)} des deux côtés`,
		'divide-coefficient': (s) => `On partage les deux côtés en ${fmt(s.operand)} parts égales`,
		'multiply-coefficient': (s) => `On multiplie les deux côtés par ${fmt(s.operand)}`,
		'isolate-variable': () => 'On laisse la lettre toute seule'
	},
	college: {
		// Linear
		'identify-linear': () => 'Équation du premier degré (linéaire)',
		'identify-linear-coefficients': () => 'Identification des coefficients a et b',
		'subtract-constant': (s) => `Soustraction de ${fmt(s.operand)} des deux membres`,
		'add-constant': (s) => `Addition de ${fmt(s.operand)} aux deux membres`,
		'divide-coefficient': (s) => `Division par ${fmt(s.operand)} des deux membres`,
		'multiply-coefficient': (s) => `Multiplication par ${fmt(s.operand)} des deux membres`,
		'isolate-variable': () => "On isole l'inconnue",
		// Quadratic
		'identify-quadratic': () => 'Équation du second degré',
		'identify-coefficients': () => 'Identification des coefficients a, b, c',
		'compute-discriminant': () => 'Calcul du discriminant Δ = b² − 4ac',
		'discriminant-positive': () => 'Δ > 0 : deux solutions distinctes',
		'discriminant-zero': () => 'Δ = 0 : une solution double',
		'discriminant-negative': () => 'Δ < 0 : pas de solution réelle',
		'apply-quadratic-formula': () => 'Application de la formule du second degré',
		'simplify-solution': () => 'Simplification de la solution'
	},
	lycee: {
		// Linear — terse formal style
		'identify-linear': () => 'Équation linéaire (degré 1)',
		'identify-linear-coefficients': () => 'Coefficients a, b',
		'subtract-constant': (s) => `−${fmt(s.operand)} de chaque côté`,
		'add-constant': (s) => `+${fmt(s.operand)} de chaque côté`,
		'divide-coefficient': (s) => `÷ ${fmt(s.operand)}`,
		'multiply-coefficient': (s) => `× ${fmt(s.operand)}`,
		'isolate-variable': () => "Isolement de l'inconnue",
		// Quadratic — terse
		'identify-quadratic': () => 'Équation du second degré',
		'identify-coefficients': () => 'Coefficients a, b, c',
		'compute-discriminant': () => 'Δ = b² − 4ac',
		'discriminant-positive': () => 'Δ > 0 ⇒ deux solutions',
		'discriminant-zero': () => 'Δ = 0 ⇒ solution double',
		'discriminant-negative': () => 'Δ < 0 ⇒ pas de solution réelle',
		'apply-quadratic-formula': () => 'x = (−b ± √Δ) / (2a)',
		'simplify-solution': () => 'Simplification'
	},
	superieur: {
		// Linear — symbol-only
		'identify-linear': () => 'ax + b = 0',
		'identify-linear-coefficients': () => 'a, b',
		'subtract-constant': (s) => `−${fmt(s.operand)}`,
		'add-constant': (s) => `+${fmt(s.operand)}`,
		'divide-coefficient': (s) => `/${fmt(s.operand)}`,
		'multiply-coefficient': (s) => `·${fmt(s.operand)}`,
		'isolate-variable': () => 'isol.',
		// Quadratic — symbol-only
		'identify-quadratic': () => 'ax² + bx + c = 0',
		'identify-coefficients': () => 'a, b, c',
		'compute-discriminant': () => 'Δ',
		'discriminant-positive': () => 'Δ > 0',
		'discriminant-zero': () => 'Δ = 0',
		'discriminant-negative': () => 'Δ < 0',
		'apply-quadratic-formula': () => 'x = (−b ± √Δ)/(2a)',
		'simplify-solution': () => 'simpl.'
	}
};

const EXPLANATIONS: Record<SchoolLevel, Partial<Record<string, ExplanationFn>>> = {
	primaire: {
		// Linear — kid-friendly justifications
		'subtract-constant': (s) =>
			`Pour avoir l'inconnue toute seule, on enlève ${fmt(s.operand)} d'un côté ET de l'autre, comme une balance qui doit rester équilibrée.`,
		'add-constant': (s) =>
			`Pour avoir l'inconnue toute seule, on ajoute ${fmt(s.operand)} des deux côtés à la fois.`,
		'divide-coefficient': (s) =>
			`On partage chaque côté en ${fmt(s.operand)} parts égales pour trouver la valeur d'une seule lettre.`,
		'multiply-coefficient': (s) =>
			`On multiplie chaque côté par ${fmt(s.operand)} pour annuler la division.`,
		'isolate-variable': () =>
			"On a fait toutes les opérations pour avoir la lettre toute seule d'un côté."
	},
	college: {
		// Linear — equality-preservation language
		'identify-linear-coefficients': () =>
			"Une équation du premier degré s'écrit ax + b = 0. Identifier a et b permet d'isoler x.",
		'subtract-constant': (s) =>
			`On retire ${fmt(s.operand)} aux deux membres : l'égalité est préservée car on enlève la même quantité de chaque côté.`,
		'add-constant': (s) =>
			`On ajoute ${fmt(s.operand)} aux deux membres : l'égalité est préservée car on ajoute la même quantité de chaque côté.`,
		'divide-coefficient': (s) =>
			`On divise les deux membres par ${fmt(s.operand)} (le coefficient devant x) pour isoler x. L'égalité est préservée tant que ${fmt(s.operand)} ≠ 0.`,
		'multiply-coefficient': (s) =>
			`On multiplie les deux membres par ${fmt(s.operand)} pour faire disparaître la fraction. L'égalité est préservée car ${fmt(s.operand)} ≠ 0.`,
		'isolate-variable': () =>
			"L'inconnue est seule dans un membre : on peut lire directement la solution.",
		// Quadratic
		'compute-discriminant': () =>
			'Le discriminant Δ permet de savoir combien il y a de solutions : Δ > 0 → 2 solutions, Δ = 0 → 1 solution double, Δ < 0 → aucune solution réelle.',
		'apply-quadratic-formula': () =>
			'La formule x = (−b ± √Δ) / (2a) donne directement les solutions quand Δ ≥ 0.'
	},
	lycee: {
		// Linear — concise formal justifications
		'identify-linear-coefficients': () => 'Forme canonique ax + b = 0 avec a ≠ 0.',
		'subtract-constant': (s) =>
			`Soustraction de ${fmt(s.operand)} : transformation équivalente (l'ensemble des solutions est préservé).`,
		'add-constant': (s) =>
			`Addition de ${fmt(s.operand)} : transformation équivalente (l'ensemble des solutions est préservé).`,
		'divide-coefficient': (s) => `Division par ${fmt(s.operand)} ≠ 0 : transformation équivalente.`,
		'multiply-coefficient': (s) =>
			`Multiplication par ${fmt(s.operand)} ≠ 0 : transformation équivalente.`,
		'isolate-variable': () => 'Forme x = ... atteinte. Solution unique : S = { −b/a }.',
		// Quadratic
		'compute-discriminant': () => 'Δ = b² − 4ac détermine la nature des solutions dans ℝ.',
		'discriminant-positive': () => '√Δ ∈ ℝ : deux solutions réelles distinctes via la formule.',
		'discriminant-zero': () => 'Racine double : x = −b / (2a).',
		'discriminant-negative': () =>
			'Pas de racine réelle ; deux racines complexes conjuguées dans ℂ.',
		'apply-quadratic-formula': () => 'x = (−b ± √Δ) / (2a) issue de la mise sous forme canonique.'
	},
	superieur: {
		// Linear — minimal formal annotations
		'identify-linear-coefficients': () => 'ax + b = 0, (a, b) ∈ ℝ* × ℝ.',
		'subtract-constant': () => 'Translation : opération inversible préservant le noyau.',
		'add-constant': () => 'Translation : opération inversible préservant le noyau.',
		'divide-coefficient': () => 'Division par a ∈ ℝ* : multiplication par l’inverse a⁻¹.',
		'multiply-coefficient': () => 'Multiplication par a ∈ ℝ* : opération bijective sur ℝ.',
		'isolate-variable': () => 'S = { −b·a⁻¹ }.',
		// Quadratic
		'compute-discriminant': () => 'Δ := b² − 4ac.',
		'discriminant-positive': () => 'Δ > 0 ⇒ S = { (−b ± √Δ)/(2a) }, |S| = 2.',
		'discriminant-zero': () => 'Δ = 0 ⇒ S = { −b/(2a) }, racine double.',
		'discriminant-negative': () => 'Δ < 0 ⇒ S = ∅ dans ℝ ; { (−b ± i√|Δ|)/(2a) } dans ℂ.',
		'apply-quadratic-formula': () =>
			'Issue de la mise sous forme canonique : a(x + b/(2a))² − Δ/(4a) = 0.'
	}
};

// =============================================================================
// Renderer
// =============================================================================

/**
 * Pedagogical renderer for solve steps, adapted to a French SchoolLevel.
 *
 * Coverage in MVP:
 * - **Linear** rules (`identify-linear`, `subtract-constant`, `add-constant`,
 *   `divide-coefficient`, `multiply-coefficient`, `isolate-variable`) — all 4
 *   levels.
 * - **Quadratic** rules (`identify-quadratic`, `identify-coefficients`,
 *   `compute-discriminant`, `discriminant-{positive,zero,negative}`,
 *   `apply-quadratic-formula`, `simplify-solution`) — college, lycee,
 *   superieur (primaire falls back to lycee since quadratic is out of curriculum).
 *
 * Fallback chain when a rule is not in the active level:
 *   `TITLES[level][rule]` → `TITLES.lycee[rule]` → `step.description`.
 *
 * Other solve domains (cubic, quartic, transcendental, numeric, …) fall
 * straight to `step.description`, which is already French via
 * `solve/descriptions-fr.ts`.
 */
export class SolvePedagogicalRenderer implements StepRenderer<SolveStep, PedagogicalRenderOptions> {
	render(step: SolveStep, options: PedagogicalRenderOptions): RenderedStep {
		const title = this.resolveTitle(step, options.schoolLevel);
		const explanation =
			options.verbosity === 'detailed'
				? EXPLANATIONS[options.schoolLevel]?.[step.rule]?.(step)
				: undefined;

		const beforeLatex = toLatex(step.before);
		const afterLatex = toLatex(step.after);
		const expressionLatex = `${beforeLatex} \\quad\\Rightarrow\\quad ${afterLatex}`;

		const base: RenderedStep = {
			id: step.id,
			rule: step.rule,
			title,
			...(explanation !== undefined && { explanation }),
			expressionLatex,
			schoolLevel: options.schoolLevel
		};

		if (options.format === 'text') {
			const lines = [`[${step.id}] ${title}`, `  ${beforeLatex} ⇒ ${afterLatex}`];
			if (explanation) lines.push(`  → ${explanation}`);
			return { ...base, text: lines.join('\n') };
		}

		return base;
	}

	renderAll(
		steps: readonly SolveStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}

	private resolveTitle(step: SolveStep, level: SchoolLevel): string {
		const titleFn = TITLES[level][step.rule] ?? TITLES.lycee[step.rule];
		if (titleFn) return titleFn(step);
		return step.description;
	}
}
