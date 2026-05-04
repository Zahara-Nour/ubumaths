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
	// College : on explicite « aux deux membres » et la notation « Solution : x = … »
	college: {
		'identify-equation': () => 'Équation du premier degré',
		'add-both-sides': (op) => `On ajoute ${operandStr(op)} aux deux membres`,
		'subtract-both-sides': (op) => `On soustrait ${operandStr(op)} aux deux membres`,
		'multiply-both-sides': (op) => `On multiplie les deux membres par ${operandStr(op)}`,
		'divide-both-sides': (op) => `On divise les deux membres par ${operandStr(op)}`,
		simplify: () => 'On simplifie',
		'group-variable-terms': (op) =>
			`On regroupe les termes en ${(op as { variable: string }).variable}`,
		'group-constants': () => 'On regroupe les constantes',
		'reduce-to-canonical': (_op, step) => `On isole ${variableOf(step)}`,
		'read-solution': (op) =>
			`Solution : ${(op as { variable: string }).variable} = ${operandStr(op)}`
	},
	// Lycée : « aux deux membres » devient implicite, notation S = { … } pour la solution
	lycee: {
		'identify-equation': () => 'Équation du premier degré',
		'add-both-sides': (op) => `On ajoute ${operandStr(op)}`,
		'subtract-both-sides': (op) => `On soustrait ${operandStr(op)}`,
		'multiply-both-sides': (op) => `On multiplie par ${operandStr(op)}`,
		'divide-both-sides': (op) => `On divise par ${operandStr(op)}`,
		simplify: () => 'On simplifie',
		'group-variable-terms': (op) =>
			`On regroupe les termes en ${(op as { variable: string }).variable}`,
		'group-constants': () => 'On regroupe les constantes',
		'reduce-to-canonical': (_op, step) => `On isole ${variableOf(step)}`,
		'read-solution': (op) => `S = { ${operandStr(op)} }`
	},
	// Supérieur : vocabulaire identique au lycée — la différence est structurelle
	// (mergeAll regroupe tout en une seule étape avec drill-down vers les détails).
	superieur: {
		'identify-equation': () => 'Équation du premier degré',
		'add-both-sides': (op) => `On ajoute ${operandStr(op)}`,
		'subtract-both-sides': (op) => `On soustrait ${operandStr(op)}`,
		'multiply-both-sides': (op) => `On multiplie par ${operandStr(op)}`,
		'divide-both-sides': (op) => `On divise par ${operandStr(op)}`,
		simplify: () => 'On simplifie',
		'group-variable-terms': (op) =>
			`On regroupe les termes en ${(op as { variable: string }).variable}`,
		'group-constants': () => 'On regroupe les constantes',
		'reduce-to-canonical': (_op, step) => `On isole ${variableOf(step)}`,
		'read-solution': (op) => `S = { ${operandStr(op)} }`
	}
};

/** Best-effort detection of the unknown variable name in an EquationStep. */
function variableOf(step: EquationStep): string {
	const find = (n: { type: string } & object): string | null => {
		if ((n as { type: string }).type === 'variable') return (n as { name: string }).name;
		const rec = n as Record<string, unknown>;
		for (const key of Object.keys(rec)) {
			const v = rec[key];
			if (Array.isArray(v)) {
				for (const item of v) {
					if (typeof item === 'object' && item !== null && 'type' in item) {
						const found = find(item as { type: string } & object);
						if (found) return found;
					}
				}
			} else if (typeof v === 'object' && v !== null && 'type' in v) {
				const found = find(v as { type: string } & object);
				if (found) return found;
			}
		}
		return null;
	};
	return find(step.before as { type: string } & object) ?? 'x';
}

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
 * Shape of the output:
 * - **Info-only** ops (`identify-equation`, `read-solution`) → the single
 *   equation as plain LaTeX.
 * - **Transformation** ops (`add/subtract/multiply/divide-both-sides`) → a
 *   `\begin{aligned}` block with TWO lines:
 *     1. The original equation with the applied operation in `\textcolor{blue}`
 *        on each side (e.g. `3x - 2 + \textcolor{blue}{5x} = -5x + 7 + \textcolor{blue}{5x}`).
 *     2. The simplified result (`8x - 2 = 7`).
 * - **Composite** ops (`reduce-to-canonical`, `group-*`, `simplify`) — there
 *   is no single operation to highlight, so we fall back to a plain
 *   before/after `\begin{aligned}` block.
 */
function formatExpressionLatex(step: EquationStep): string {
	const lines = formatTransformationLines(step);
	if (lines === null) return fmt(step.before);
	return lines.join(' ');
}

/**
 * Build the multi-line LaTeX form of a step transformation. Returns `null`
 * for info-only steps (no transformation to display). Exposed for the demo
 * which prints each line on its own terminal row.
 */
export function formatTransformationLines(step: EquationStep): readonly string[] | null {
	const op = step.operation;
	const rel = step.before.type === 'relation' ? step.before.relation : '=';
	const bL = step.before.type === 'relation' ? fmt(step.before.left) : fmt(step.before);
	const bR = step.before.type === 'relation' ? fmt(step.before.right) : '';
	const aL = step.after.type === 'relation' ? fmt(step.after.left) : fmt(step.after);
	const aR = step.after.type === 'relation' ? fmt(step.after.right) : '';
	const beforeEqualsAfter = bL === aL && bR === aR;

	// Info-only ops: identify-equation, read-solution → no transformation
	if (!op || op.kind === 'identify-equation' || op.kind === 'read-solution') {
		return null;
	}

	// Composite ops without a single operand to highlight → before/after fallback
	if (
		op.kind === 'reduce-to-canonical' ||
		op.kind === 'group-variable-terms' ||
		op.kind === 'group-constants' ||
		op.kind === 'simplify'
	) {
		if (beforeEqualsAfter) return null;
		return [
			'\\begin{aligned}',
			`  ${bL} &${rel} ${bR} \\\\`,
			`  ${aL} &${rel} ${aR}`,
			'\\end{aligned}'
		];
	}

	// Transformation ops with a colored operand
	const operand = fmt(op.operand);
	let leftApplied: string;
	let rightApplied: string;
	switch (op.kind) {
		case 'add-both-sides':
			leftApplied = `${bL} \\textcolor{blue}{+ ${operand}}`;
			rightApplied = `${bR} \\textcolor{blue}{+ ${operand}}`;
			break;
		case 'subtract-both-sides':
			leftApplied = `${bL} \\textcolor{blue}{- ${operand}}`;
			rightApplied = `${bR} \\textcolor{blue}{- ${operand}}`;
			break;
		case 'multiply-both-sides':
			leftApplied = `\\textcolor{blue}{${operand} \\times} \\left(${bL}\\right)`;
			rightApplied = `\\textcolor{blue}{${operand} \\times} \\left(${bR}\\right)`;
			break;
		case 'divide-both-sides':
			leftApplied = `\\dfrac{${bL}}{\\textcolor{blue}{${operand}}}`;
			rightApplied = `\\dfrac{${bR}}{\\textcolor{blue}{${operand}}}`;
			break;
	}
	return [
		'\\begin{aligned}',
		`  ${leftApplied} &${rel} ${rightApplied} \\\\`,
		`  ${aL} &${rel} ${aR}`,
		'\\end{aligned}'
	];
}
