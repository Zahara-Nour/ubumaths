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
import { toCustom } from '../custom-generator';
import type { MathNode } from '../types';
import type { EquationStep, EquationOperation, LinearSchoolLevel } from './types';
import { splitSide } from './linear';

// =============================================================================
// Vocabulary (titles + explanations)
// =============================================================================

type TitleFn = (op: EquationOperation, step: EquationStep) => string;
type ExplanationFn = (op: EquationOperation, step: EquationStep) => string;

/**
 * True when the step transforms an inequality (relation operator other than
 * `=`). Used to branch TITLES/EXPLANATIONS between equation- and inequality-
 * specific phrasing without duplicating the whole table per pipeline.
 */
function isInequalityStep(step: EquationStep): boolean {
	return step.before.type === 'relation' && step.before.relation !== '=';
}

/** Human-readable « l'inégalité » or « l'égalité » with appropriate elision. */
function preservedNoun(step: EquationStep): string {
	return isInequalityStep(step) ? "l'inégalité" : "l'égalité";
}

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

/**
 * Title for `identify-equation` — guards against cross-pipeline misuse and
 * adapts the wording for inequalities ("Inéquation du premier degré").
 *
 * The linear renderer hardcoded "Équation du premier degré" but the
 * `EquationOperation` union now allows `equationType: 'linear' | 'quadratic'`
 * (Phase 1 of the quadratic stepper). Silently mis-labeling a quadratic step
 * as first-degree would be confusing, so we throw instead and force the
 * caller to wire `QuadraticEquationRenderer` for quadratic pipelines.
 */
const identifyEquationTitle: TitleFn = (op, step) => {
	if (op.kind === 'identify-equation' && op.equationType !== 'linear') {
		throw new Error(
			`LinearEquationRenderer: cannot render an identify-equation step with equationType='${op.equationType}'. Use QuadraticEquationRenderer.`
		);
	}
	return isInequalityStep(step) ? 'Inéquation du premier degré' : 'Équation du premier degré';
};

/**
 * Format the title for `divide-both-sides`, `multiply-both-sides`, and
 * `simplify-coefficient` operations, appending the « (changement de sens) »
 * pedagogical note when `flipOperator: true`.
 *
 * Note placement is at the end of the title to match the wording standard
 * « On divise les deux membres par −2 (changement de sens car −2 est négatif) ».
 */
function flipNote(op: EquationOperation): string {
	if (
		(op.kind === 'divide-both-sides' ||
			op.kind === 'multiply-both-sides' ||
			op.kind === 'simplify-coefficient') &&
		op.flipOperator
	) {
		const operand = op.kind === 'simplify-coefficient' ? fmt(op.coefficient) : fmt(op.operand);
		return ` (changement de sens car ${operand} est négatif)`;
	}
	return '';
}

/**
 * Title for `inequality-conclude-truth`. The wording adapts to `truth`:
 * - `true`  → "L'inéquation est toujours vraie : S = ℝ"
 * - `false` → "L'inéquation est une contradiction : S = ∅"
 */
const inequalityConcludeTruthTitle: TitleFn = (op) => {
	if (op.kind !== 'inequality-conclude-truth') return '';
	return op.truth
		? "L'inéquation est toujours vraie : S = ℝ (tout réel est solution)"
		: "L'inéquation est une contradiction : S = ∅ (aucune solution)";
};

/** Explanation for `inequality-conclude-truth`. */
const inequalityConcludeTruthExplanation: ExplanationFn = (op) => {
	if (op.kind !== 'inequality-conclude-truth') return '';
	return op.truth
		? "Cette forme constante est vraie pour toute valeur de l'inconnue. La solution est donc l'ensemble des réels ℝ."
		: "Cette forme constante est fausse, indépendamment de l'inconnue. Aucune valeur ne satisfait l'inéquation : la solution est l'ensemble vide ∅.";
};

const TITLES: Record<LinearSchoolLevel, Partial<Record<EquationOperation['kind'], TitleFn>>> = {
	// College : on explicite « aux deux membres » et la notation « Solution : x = … »
	college: {
		'identify-equation': identifyEquationTitle,
		'add-both-sides': (op) => `On ajoute ${operandStr(op)} aux deux membres`,
		'subtract-both-sides': (op) => `On soustrait ${operandStr(op)} aux deux membres`,
		'multiply-both-sides': (op) =>
			`On multiplie les deux membres par ${operandStr(op)}${flipNote(op)}`,
		'divide-both-sides': (op) => `On divise les deux membres par ${operandStr(op)}${flipNote(op)}`,
		simplify: () => 'On simplifie',
		'group-variable-terms': (op) =>
			`On regroupe les termes en ${(op as { variable: string }).variable}`,
		'group-constants': () => 'On regroupe les constantes',
		'reduce-to-canonical': (_op, step) => `On isole ${variableOf(step)}`,
		'read-solution': (op) =>
			`Solution : ${(op as { variable: string }).variable} = ${operandStr(op)}`,
		'inequality-conclude-truth': inequalityConcludeTruthTitle
	},
	// Lycée : « aux deux membres » devient implicite, notation S = { … } pour la solution.
	// Utilise transpose-terms (combiné) et simplify-coefficient (compact) à la place
	// des add-both-sides + divide-both-sides du collège.
	lycee: {
		'identify-equation': identifyEquationTitle,
		'add-both-sides': (op) => `On ajoute ${operandStr(op)}`,
		'subtract-both-sides': (op) => `On soustrait ${operandStr(op)}`,
		'multiply-both-sides': (op) => `On multiplie par ${operandStr(op)}${flipNote(op)}`,
		'divide-both-sides': (op) => `On divise par ${operandStr(op)}${flipNote(op)}`,
		'transpose-terms': (_op, step) =>
			`On isole les termes en ${variableOf(step)} dans le membre de gauche`,
		'simplify-coefficient': (op, step) =>
			`On termine en simplifiant le coefficient de ${variableOf(step)}${flipNote(op)}`,
		simplify: () => 'On simplifie',
		'group-variable-terms': (op) =>
			`On regroupe les termes en ${(op as { variable: string }).variable}`,
		'group-constants': () => 'On regroupe les constantes',
		'reduce-to-canonical': (_op, step) => `On isole ${variableOf(step)}`,
		'read-solution': (op) => `S = { ${operandStr(op)} }`,
		'inequality-conclude-truth': inequalityConcludeTruthTitle
	},
	// Supérieur : vocabulaire identique au lycée — la différence est structurelle
	// (mergeAll regroupe tout en une seule étape avec drill-down vers les détails).
	superieur: {
		'identify-equation': identifyEquationTitle,
		'add-both-sides': (op) => `On ajoute ${operandStr(op)}`,
		'subtract-both-sides': (op) => `On soustrait ${operandStr(op)}`,
		'multiply-both-sides': (op) => `On multiplie par ${operandStr(op)}${flipNote(op)}`,
		'divide-both-sides': (op) => `On divise par ${operandStr(op)}${flipNote(op)}`,
		'transpose-terms': (_op, step) =>
			`On isole les termes en ${variableOf(step)} dans le membre de gauche`,
		'simplify-coefficient': (op, step) =>
			`On termine en simplifiant le coefficient de ${variableOf(step)}${flipNote(op)}`,
		simplify: () => 'On simplifie',
		'group-variable-terms': (op) =>
			`On regroupe les termes en ${(op as { variable: string }).variable}`,
		'group-constants': () => 'On regroupe les constantes',
		'reduce-to-canonical': (_op, step) => `On isole ${variableOf(step)}`,
		'read-solution': (op) => `S = { ${operandStr(op)} }`,
		'inequality-conclude-truth': inequalityConcludeTruthTitle
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

/**
 * Explanation for `divide-both-sides` and `multiply-both-sides` adapted to
 * the operator kind (equation vs inequality) and the flip flag.
 *
 * For inequalities with `flipOperator: true`, the explanation explicitly
 * states the pedagogical rule: dividing/multiplying by a negative number
 * reverses the inequality direction.
 */
function divideExplanation(op: EquationOperation, step: EquationStep): string {
	if (op.kind !== 'divide-both-sides') return '';
	const operand = operandStr(op);
	if (isInequalityStep(step)) {
		if (op.flipOperator) {
			return `On divise les deux membres par ${operand} pour isoler ${variableOf(step)}. Comme ${operand} est négatif, l'opérateur de l'inéquation est retourné (changement de sens : < devient >, ≤ devient ≥, etc.).`;
		}
		return `On divise les deux membres par ${operand} pour isoler ${variableOf(step)}. ${operand} est positif, donc l'inéquation est préservée.`;
	}
	return `On divise les deux membres par ${operand} pour isoler ${variableOf(step)}. L'égalité est préservée tant que ${operand} ≠ 0.`;
}

function multiplyExplanation(op: EquationOperation, step: EquationStep): string {
	if (op.kind !== 'multiply-both-sides') return '';
	const operand = operandStr(op);
	if (isInequalityStep(step)) {
		if (op.flipOperator) {
			return `On multiplie les deux membres par ${operand}. Comme ${operand} est négatif, l'opérateur de l'inéquation est retourné (changement de sens).`;
		}
		return `On multiplie les deux membres par ${operand}. ${operand} est positif, donc l'inéquation est préservée.`;
	}
	return `On multiplie les deux membres par ${operand}. L'égalité est préservée car ${operand} ≠ 0.`;
}

const EXPLANATIONS: Record<
	LinearSchoolLevel,
	Partial<Record<EquationOperation['kind'], ExplanationFn>>
> = {
	college: {
		'identify-equation': (_op, step) =>
			isInequalityStep(step)
				? "Une inéquation du premier degré s'écrit ax + b ⊻ 0 (avec ⊻ ∈ {<, >, ≤, ≥, ≠}). On isole x étape par étape, en respectant la règle clé : multiplier ou diviser par un nombre négatif retourne l'opérateur."
				: "Une équation du premier degré s'écrit ax + b = 0. On va isoler x étape par étape.",
		'add-both-sides': (op, step) =>
			`On ajoute ${operandStr(op)} aux deux membres : ${preservedNoun(step)} est préservée car on ajoute la même quantité de chaque côté.`,
		'subtract-both-sides': (op, step) =>
			`On soustrait ${operandStr(op)} aux deux membres : ${preservedNoun(step)} est préservée.`,
		'divide-both-sides': divideExplanation,
		'multiply-both-sides': multiplyExplanation,
		'reduce-to-canonical': (_op, step) =>
			`On regroupe les termes en x à gauche et les constantes à droite pour atteindre la forme ax ${isInequalityStep(step) ? '⊻' : '='} b.`,
		'read-solution': () => "L'inconnue est isolée : on lit directement la solution.",
		'inequality-conclude-truth': inequalityConcludeTruthExplanation
	},
	lycee: {
		'identify-equation': (_op, step) =>
			isInequalityStep(step)
				? `Forme canonique ax + b ⊻ 0 avec a ≠ 0 et ⊻ ∈ {<, >, ≤, ≥, ≠}. La règle clé : si on divise (ou multiplie) par un négatif, on retourne l'opérateur.`
				: 'Forme canonique ax + b = 0 avec a ≠ 0.',
		'add-both-sides': (op, step) =>
			isInequalityStep(step)
				? `Addition de ${operandStr(op)} : transformation équivalente (l'inégalité est préservée).`
				: `Addition de ${operandStr(op)} : transformation équivalente (l'ensemble des solutions est préservé).`,
		'subtract-both-sides': (op) =>
			`Soustraction de ${operandStr(op)} : transformation équivalente.`,
		'divide-both-sides': divideExplanation,
		'multiply-both-sides': multiplyExplanation,
		'reduce-to-canonical': (_op, step) =>
			`Réduction à la forme ax ${isInequalityStep(step) ? '⊻' : '='} b par transformations équivalentes successives.`,
		'read-solution': () => 'Solution unique S = { −b/a }.',
		'inequality-conclude-truth': inequalityConcludeTruthExplanation
	},
	superieur: {
		'identify-equation': (_op, step) =>
			isInequalityStep(step)
				? 'Inéquation linéaire ax + b ⊻ 0 — résolution par transformations équivalentes (le sens est préservé sauf division par un négatif).'
				: 'Équation linéaire ax + b = 0.',
		'add-both-sides': () => 'Translation : opération inversible préservant le noyau.',
		'subtract-both-sides': () => 'Translation : opération inversible préservant le noyau.',
		'divide-both-sides': divideExplanation,
		'multiply-both-sides': multiplyExplanation,
		'reduce-to-canonical': (_op, step) =>
			isInequalityStep(step) ? 'Forme canonique : ax + b ⊻ 0.' : 'Forme canonique : ax + b = 0.',
		'read-solution': () => 'S = { −b·a⁻¹ }.',
		'inequality-conclude-truth': inequalityConcludeTruthExplanation
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
/**
 * Map a `RelationNode.relation` string to its LaTeX equivalent for use inside
 * an aligned block (where `>=`/`<=`/`!=` are not valid LaTeX tokens).
 *
 * Scope: only the 5 operators that the linear inequality pipeline emits
 * (`<`, `>`, `<=`, `>=`, `!=`), plus `=` for the equation pipeline. The
 * extended `RelationType` (`≡`, `≢`, `≈`, `⟹`, …) is not produced by either
 * pipeline; the `default` arm passes such tokens through unchanged.
 */
function relToLatex(rel: string): string {
	switch (rel) {
		case '<=':
			return '\\leq';
		case '>=':
			return '\\geq';
		case '!=':
			return '\\neq';
		case '<':
		case '>':
		case '=':
			return rel;
		default:
			return rel;
	}
}

export function formatTransformationLines(step: EquationStep): readonly string[] | null {
	const op = step.operation;
	// `relBefore` is used on the upper line of the aligned block ("operation
	// being applied"); `relAfter` is used on the lower line ("simplified
	// result"). They differ for inequality steps where `flipOperator: true`
	// — e.g. `-x < 3` divided by -1 yields `\dfrac{-x}{-1} < \dfrac{3}{-1}`
	// (before line, original operator) on the upper line and `x > -3`
	// (after line, flipped operator) on the lower line. For all
	// non-flip cases (equations, positive divisor), they are equal.
	const relBefore = step.before.type === 'relation' ? relToLatex(step.before.relation) : '=';
	const relAfter = step.after.type === 'relation' ? relToLatex(step.after.relation) : '=';
	const bL = step.before.type === 'relation' ? fmt(step.before.left) : fmt(step.before);
	const bR = step.before.type === 'relation' ? fmt(step.before.right) : '';
	const aL = step.after.type === 'relation' ? fmt(step.after.left) : fmt(step.after);
	const aR = step.after.type === 'relation' ? fmt(step.after.right) : '';
	const beforeEqualsAfter = bL === aL && bR === aR && relBefore === relAfter;

	// Info-only ops: identify-equation, read-solution, inequality-conclude-truth
	// → no transformation block (the title carries the message).
	if (
		!op ||
		op.kind === 'identify-equation' ||
		op.kind === 'read-solution' ||
		op.kind === 'inequality-conclude-truth'
	) {
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
			`  ${bL} &${relBefore} ${bR} \\\\`,
			`  ${aL} &${relAfter} ${aR}`,
			'\\end{aligned}'
		];
	}

	// `transpose-terms` (lycée+) — show reorganized form with BOTH operands
	// in color simultaneously, and the simplified result. Transpose never
	// flips the operator (it is an addition on both sides).
	if (op.kind === 'transpose-terms') {
		if (step.before.type !== 'relation') return null;
		const variable = variableOf(step);
		const leftSplit = splitSide(step.before.left, variable);
		const rightSplit = splitSide(step.before.right, variable);
		const leftRemainder = leftSplit.xPart !== null ? fmt(leftSplit.xPart) : '0';
		const rightRemainder = rightSplit.constPart !== null ? fmt(rightSplit.constPart) : '0';
		const leftAddend =
			op.variableOperand !== null ? ' ' + formatColoredAddend(op.variableOperand) : '';
		const rightAddend =
			op.constantOperand !== null ? ' ' + formatColoredAddend(op.constantOperand) : '';
		return [
			'\\begin{aligned}',
			`  ${leftRemainder}${leftAddend} &${relBefore} ${rightRemainder}${rightAddend} \\\\`,
			`  ${aL} &${relAfter} ${aR}`,
			'\\end{aligned}'
		];
	}

	// `simplify-coefficient` (lycée+) — display only the result equation
	// (single line, no transformation block). The division operation is
	// implicit in the title ("On termine en simplifiant le coefficient de x").
	// Use the AFTER relation so the flipped operator shows correctly when
	// `flipOperator: true` (e.g. `x > -3` for `-x < 3` divided by -1).
	if (op.kind === 'simplify-coefficient') {
		return [`${aL} ${relAfter} ${aR}`];
	}

	// Atomic transformation ops with a colored operand (college style). The
	// `default` arm covers quadratic-pipeline kinds (handled by
	// `QuadraticEquationRenderer`) and any future linear kind without an
	// `operand` field — they produce no transformation lines here.
	let leftApplied: string;
	let rightApplied: string;
	switch (op.kind) {
		case 'add-both-sides': {
			const operand = fmt(op.operand);
			leftApplied = `${bL} \\textcolor{blue}{+ ${operand}}`;
			rightApplied = `${bR} \\textcolor{blue}{+ ${operand}}`;
			break;
		}
		case 'subtract-both-sides': {
			const operand = fmt(op.operand);
			leftApplied = `${bL} \\textcolor{blue}{- ${operand}}`;
			rightApplied = `${bR} \\textcolor{blue}{- ${operand}}`;
			break;
		}
		case 'multiply-both-sides': {
			const operand = fmt(op.operand);
			leftApplied = `\\textcolor{blue}{${operand} \\times} \\left(${bL}\\right)`;
			rightApplied = `\\textcolor{blue}{${operand} \\times} \\left(${bR}\\right)`;
			break;
		}
		case 'divide-both-sides': {
			const operand = fmt(op.operand);
			leftApplied = `\\dfrac{${bL}}{\\textcolor{blue}{${operand}}}`;
			rightApplied = `\\dfrac{${bR}}{\\textcolor{blue}{${operand}}}`;
			break;
		}
		default:
			return null;
	}
	return [
		'\\begin{aligned}',
		`  ${leftApplied} &${relBefore} ${rightApplied} \\\\`,
		`  ${aL} &${relAfter} ${aR}`,
		'\\end{aligned}'
	];
}

/**
 * Format an operand for display in a colored `+` / `-` addition. Detects
 * negative operands (number literals or `opposite(...)` AST) and renders them
 * as `\textcolor{blue}{- |X|}` instead of the ugly `\textcolor{blue}{+ -X}`.
 */
function formatColoredAddend(operand: MathNode): string {
	if (operand.type === 'opposite') {
		return `\\textcolor{blue}{- ${fmt(operand.operand)}}`;
	}
	if (operand.type === 'number') {
		const numericValue = parseFloat(operand.value);
		if (numericValue < 0) {
			return `\\textcolor{blue}{- ${Math.abs(numericValue)}}`;
		}
	}
	return `\\textcolor{blue}{+ ${fmt(operand)}}`;
}

// =============================================================================
// Custom-syntax pretty printing (CLI / debug-friendly output)
// =============================================================================

/**
 * Custom-syntax counterpart of `formatTransformationLines`. Returns a
 * 2-line string (or `null` for info-only steps) using the ASCII / custom
 * syntax produced by `toCustom`, with `@blue{…}` markers wrapping the
 * operand of the operation. The CLI script post-processes those markers
 * into ANSI color codes ; snapshot tests keep them literal.
 *
 * Symmetrical to the LaTeX form:
 * - upper line uses `relBefore` (operation being applied);
 * - lower line uses `relAfter` (simplified result, with the operator
 *   already flipped when `flipOperator: true`).
 */
export function formatTransformationCustom(step: EquationStep): string | null {
	const op = step.operation;
	if (
		!op ||
		op.kind === 'identify-equation' ||
		op.kind === 'read-solution' ||
		op.kind === 'inequality-conclude-truth'
	) {
		return null;
	}

	const relBefore = step.before.type === 'relation' ? step.before.relation : '=';
	const relAfter = step.after.type === 'relation' ? step.after.relation : '=';
	const bL = step.before.type === 'relation' ? toCustom(step.before.left) : toCustom(step.before);
	const bR = step.before.type === 'relation' ? toCustom(step.before.right) : '';
	const aL = step.after.type === 'relation' ? toCustom(step.after.left) : toCustom(step.after);
	const aR = step.after.type === 'relation' ? toCustom(step.after.right) : '';

	// Composite ops: plain before/after with no highlight.
	if (
		op.kind === 'reduce-to-canonical' ||
		op.kind === 'group-variable-terms' ||
		op.kind === 'group-constants' ||
		op.kind === 'simplify'
	) {
		const beforeEqualsAfter = bL === aL && bR === aR && relBefore === relAfter;
		if (beforeEqualsAfter) return null;
		return `${bL} ${relBefore} ${bR}\n${aL} ${relAfter} ${aR}`;
	}

	if (op.kind === 'transpose-terms') {
		if (step.before.type !== 'relation') return null;
		const variable = variableOf(step);
		const leftSplit = splitSide(step.before.left, variable);
		const rightSplit = splitSide(step.before.right, variable);
		const leftRemainder = leftSplit.xPart !== null ? toCustom(leftSplit.xPart) : '0';
		const rightRemainder = rightSplit.constPart !== null ? toCustom(rightSplit.constPart) : '0';
		const leftAddend =
			op.variableOperand !== null ? ' ' + customColoredAddend(op.variableOperand) : '';
		const rightAddend =
			op.constantOperand !== null ? ' ' + customColoredAddend(op.constantOperand) : '';
		return `${leftRemainder}${leftAddend} ${relBefore} ${rightRemainder}${rightAddend}\n${aL} ${relAfter} ${aR}`;
	}

	if (op.kind === 'simplify-coefficient') {
		// Single-line: simplified result only (operation implicit in title).
		return `${aL} ${relAfter} ${aR}`;
	}

	// Atomic ops with a colored operand (add/subtract/multiply/divide).
	let leftApplied: string;
	let rightApplied: string;
	switch (op.kind) {
		case 'add-both-sides': {
			const operand = toCustom(op.operand);
			leftApplied = `${bL} @blue{+ ${operand}}`;
			rightApplied = `${bR} @blue{+ ${operand}}`;
			break;
		}
		case 'subtract-both-sides': {
			const operand = toCustom(op.operand);
			leftApplied = `${bL} @blue{- ${operand}}`;
			rightApplied = `${bR} @blue{- ${operand}}`;
			break;
		}
		case 'multiply-both-sides': {
			const operand = toCustom(op.operand);
			leftApplied = `@blue{${operand} *}(${bL})`;
			rightApplied = `@blue{${operand} *}(${bR})`;
			break;
		}
		case 'divide-both-sides': {
			const operand = toCustom(op.operand);
			leftApplied = `(${bL})/@blue{${operand}}`;
			rightApplied = `(${bR})/@blue{${operand}}`;
			break;
		}
		default:
			return null;
	}
	return `${leftApplied} ${relBefore} ${rightApplied}\n${aL} ${relAfter} ${aR}`;
}

/**
 * Custom-syntax variant of `formatColoredAddend`: emits `@blue{- X}` instead
 * of `@blue{+ -X}` when the operand is negative.
 */
function customColoredAddend(operand: MathNode): string {
	if (operand.type === 'opposite') {
		return `@blue{- ${toCustom(operand.operand)}}`;
	}
	if (operand.type === 'number') {
		const numericValue = parseFloat(operand.value);
		if (numericValue < 0) {
			return `@blue{- ${Math.abs(numericValue)}}`;
		}
	}
	return `@blue{+ ${toCustom(operand)}}`;
}
