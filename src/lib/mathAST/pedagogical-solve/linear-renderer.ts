/**
 * Pedagogical Solve — Linear Equation Renderer
 *
 * Maps `EquationStep[]` (produced by `generateLinearEquationSteps`) into
 * `RenderedStep[]` adapted to a French SchoolLevel and verbosity. Recursively
 * renders `subSteps` for drill-down UX.
 *
 * Coverage in MVP: linear equation operations only (the discriminated
 * `EquationOperation` union). Quadratic/transcendental will extend the
 * vocabulary tables when those pipelines are added.
 *
 * @module mathAST/pedagogical-solve/linear-renderer
 */

import type {
	StepRenderer,
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel
} from '../common/step-renderer-base';
import { toLatex } from '../latex-generator';
import type { EquationStep, EquationOperation, LinearSchoolLevel } from './types';

// =============================================================================
// Vocabulary (titles + explanations)
// =============================================================================

type TitleFn = (op: EquationOperation, step: EquationStep) => string;
type ExplanationFn = (op: EquationOperation, step: EquationStep) => string;

function fmt(node: { type: string } & object): string {
	// `toLatex` emits a literal space for implicit multiplication (`5 x`) for
	// LaTeX source readability. In our pedagogical operand strings (titles
	// shown in plain text or via MathLive) we want the tighter `5x`. Strip
	// the space only between a digit/closing-brace and a letter — leave
	// `\dfrac{...}{...}` etc. untouched.
	return toLatex(node as Parameters<typeof toLatex>[0]).replace(/(\d|\})\s+([a-zA-Z\\])/g, '$1$2');
}

// Helpers to extract operand-ish strings
function operandStr(op: EquationOperation): string {
	if (op.kind === 'add-both-sides' || op.kind === 'subtract-both-sides') return fmt(op.operand);
	if (op.kind === 'multiply-both-sides' || op.kind === 'divide-both-sides') return fmt(op.operand);
	if (op.kind === 'read-solution') return fmt(op.value);
	return '';
}

const TITLES: Record<LinearSchoolLevel, Partial<Record<EquationOperation['kind'], TitleFn>>> = {
	college: {
		'identify-equation': () => 'Équation du premier degré (linéaire)',
		'add-both-sides': (op) => `Addition de ${operandStr(op)} aux deux membres`,
		'subtract-both-sides': (op) => `Soustraction de ${operandStr(op)} aux deux membres`,
		'multiply-both-sides': (op) => `Multiplication des deux membres par ${operandStr(op)}`,
		'divide-both-sides': (op) => `Division des deux membres par ${operandStr(op)}`,
		simplify: () => 'Simplification',
		'group-variable-terms': (op) =>
			`Regroupement des termes en ${(op as { variable: string }).variable}`,
		'group-constants': () => 'Regroupement des constantes',
		'reduce-to-canonical': () => 'Mise sous forme ax = b',
		'read-solution': (op) =>
			`Solution : ${(op as { variable: string }).variable} = ${operandStr(op)}`
	},
	lycee: {
		'identify-equation': () => 'Équation linéaire (degré 1)',
		'add-both-sides': (op) => `+${operandStr(op)} de chaque côté`,
		'subtract-both-sides': (op) => `−${operandStr(op)} de chaque côté`,
		'multiply-both-sides': (op) => `× ${operandStr(op)}`,
		'divide-both-sides': (op) => `÷ ${operandStr(op)}`,
		simplify: () => 'Simplification',
		'group-variable-terms': (op) => `Regroupement des ${(op as { variable: string }).variable}`,
		'group-constants': () => 'Regroupement des constantes',
		'reduce-to-canonical': () => 'Forme canonique ax = b',
		'read-solution': (op) => `S = { ${operandStr(op)} }`
	},
	superieur: {
		'identify-equation': () => 'ax + b = cx + d',
		'add-both-sides': (op) => `+${operandStr(op)}`,
		'subtract-both-sides': (op) => `−${operandStr(op)}`,
		'multiply-both-sides': (op) => `·${operandStr(op)}`,
		'divide-both-sides': (op) => `/${operandStr(op)}`,
		simplify: () => 'simpl.',
		'group-variable-terms': () => 'regroup. var.',
		'group-constants': () => 'regroup. const.',
		'reduce-to-canonical': () => 'forme can.',
		'read-solution': (op) => `S = { ${operandStr(op)} }`
	}
};

const EXPLANATIONS: Record<
	LinearSchoolLevel,
	Partial<Record<EquationOperation['kind'], ExplanationFn>>
> = {
	college: {
		'identify-equation': () =>
			"Une équation du premier degré s'écrit ax + b = 0. On va isoler x étape par étape.",
		'add-both-sides': (op) =>
			`On ajoute ${operandStr(op)} aux deux membres : l'égalité est préservée car on ajoute la même quantité de chaque côté.`,
		'subtract-both-sides': (op) =>
			`On soustrait ${operandStr(op)} aux deux membres : l'égalité est préservée.`,
		'divide-both-sides': (op) =>
			`On divise les deux membres par ${operandStr(op)} pour isoler x. L'égalité est préservée tant que ${operandStr(op)} ≠ 0.`,
		'multiply-both-sides': (op) =>
			`On multiplie les deux membres par ${operandStr(op)}. L'égalité est préservée car ${operandStr(op)} ≠ 0.`,
		'reduce-to-canonical': () =>
			'On regroupe les termes en x à gauche et les constantes à droite pour atteindre la forme ax = b.',
		'read-solution': () => "L'inconnue est isolée : on lit directement la solution."
	},
	lycee: {
		'identify-equation': () => 'Forme canonique ax + b = 0 avec a ≠ 0.',
		'add-both-sides': (op) =>
			`Addition de ${operandStr(op)} : transformation équivalente (l'ensemble des solutions est préservé).`,
		'subtract-both-sides': (op) =>
			`Soustraction de ${operandStr(op)} : transformation équivalente.`,
		'divide-both-sides': (op) => `Division par ${operandStr(op)} ≠ 0 : transformation équivalente.`,
		'multiply-both-sides': (op) =>
			`Multiplication par ${operandStr(op)} ≠ 0 : transformation équivalente.`,
		'reduce-to-canonical': () =>
			'Réduction à la forme ax = b par transformations équivalentes successives.',
		'read-solution': () => 'Solution unique S = { −b/a }.'
	},
	superieur: {
		'add-both-sides': () => 'Translation : opération inversible préservant le noyau.',
		'subtract-both-sides': () => 'Translation : opération inversible préservant le noyau.',
		'divide-both-sides': () => 'Multiplication par a⁻¹ ∈ ℝ*.',
		'multiply-both-sides': () => 'Opération bijective sur ℝ.',
		'reduce-to-canonical': () => 'Forme canonique : ax + b = 0.',
		'read-solution': () => 'S = { −b·a⁻¹ }.'
	}
};

// =============================================================================
// Renderer
// =============================================================================

/**
 * Pedagogical renderer for linear equation steps. Recursively renders
 * subSteps so the dual-rendering Phase 1 `RenderedStep.subSteps` field
 * is populated end-to-end.
 */
export class LinearEquationRenderer
	implements StepRenderer<EquationStep, PedagogicalRenderOptions>
{
	render(step: EquationStep, options: PedagogicalRenderOptions): RenderedStep {
		const title = this.resolveTitle(step, options.schoolLevel);
		const explanation =
			options.verbosity === 'detailed'
				? this.resolveExplanation(step, options.schoolLevel)
				: undefined;

		const expressionLatex = formatExpressionLatex(step);
		const renderedSubSteps = step.subSteps?.map((s) => this.render(s, options));

		const base: RenderedStep = {
			id: step.id,
			rule: step.rule,
			title,
			...(explanation !== undefined && { explanation }),
			expressionLatex,
			schoolLevel: options.schoolLevel,
			...(renderedSubSteps !== undefined &&
				renderedSubSteps.length > 0 && { subSteps: renderedSubSteps })
		};

		if (options.format === 'text') {
			const lines = [`[${step.id}] ${title}`, `  ${expressionLatex}`];
			if (explanation) lines.push(`  → ${explanation}`);
			return { ...base, text: lines.join('\n') };
		}

		return base;
	}

	renderAll(
		steps: readonly EquationStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}

	private resolveTitle(step: EquationStep, level: SchoolLevel): string {
		assertSupportedLevel(level);
		const op = step.operation;
		if (op) {
			const titleFn = TITLES[level][op.kind] ?? TITLES.lycee[op.kind];
			if (titleFn) return titleFn(op, step);
		}
		return step.description;
	}

	private resolveExplanation(step: EquationStep, level: SchoolLevel): string | undefined {
		assertSupportedLevel(level);
		const op = step.operation;
		if (!op) return undefined;
		const explanationFn = EXPLANATIONS[level][op.kind];
		return explanationFn?.(op, step);
	}
}

/**
 * Narrow `SchoolLevel` to `LinearSchoolLevel`. The linear pipeline does not
 * cover primaire (linear algebra is not in the primary curriculum), so calling
 * the renderer with `schoolLevel: 'primaire'` is a programmer error.
 */
function assertSupportedLevel(level: SchoolLevel): asserts level is LinearSchoolLevel {
	if (level === 'primaire') {
		throw new Error(
			"LinearEquationRenderer: school level 'primaire' is not supported (linear algebra is not in the primary curriculum)."
		);
	}
}

/**
 * Build the LaTeX expression for a step.
 *
 * - When `before === after` (info-only steps like `identify-equation` or
 *   `read-solution`), returns the single equation as plain LaTeX.
 * - When `before !== after` AND both are equations (RelationNode), returns
 *   a `\begin{aligned}` block aligning both equations on `=`. MathLive
 *   renders it as two stacked lines aligned on the relation symbol.
 * - Fallback for non-equation transformations: `before \quad\Rightarrow\quad after`.
 */
function formatExpressionLatex(step: EquationStep): string {
	const beforeLatex = fmt(step.before);
	const afterLatex = fmt(step.after);
	if (beforeLatex === afterLatex) return beforeLatex;
	if (step.before.type === 'relation' && step.after.type === 'relation') {
		const beforeAligned = `${fmt(step.before.left)} &${step.before.relation} ${fmt(step.before.right)}`;
		const afterAligned = `${fmt(step.after.left)} &${step.after.relation} ${fmt(step.after.right)}`;
		return `\\begin{aligned}${beforeAligned} \\\\ ${afterAligned}\\end{aligned}`;
	}
	return `${beforeLatex} \\quad\\Rightarrow\\quad ${afterLatex}`;
}
