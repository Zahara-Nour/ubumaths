/**
 * Pedagogical Solve — Quadratic Equation Renderer
 *
 * Maps `EquationStep[]` produced by `generateQuadraticEquationSteps` into
 * `RenderedStep[]` adapted to a French SchoolLevel and verbosity. Mirrors the
 * structure of `LinearEquationRenderer` but handles the quadratic-specific
 * `EquationOperation` kinds.
 *
 * Levels supported : `lycee`, `superieur`. `primaire` and `college` are
 * refused at runtime (the second-degree formula is not in the syllabus before
 * 1ère).
 *
 * @module mathAST/pedagogical-solve/quadratic-renderer
 */

import type {
	StepRenderer,
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel
} from '../common/step-renderer-base';
import { toLatex } from '../latex-generator';
import type { MathNode } from '../types';
import type { EquationStep, EquationOperation, QuadraticSchoolLevel } from './types';

// =============================================================================
// Vocabulary tables
// =============================================================================

type TitleFn = (op: EquationOperation, step: EquationStep) => string;
type ExplanationFn = (op: EquationOperation, step: EquationStep) => string;

/** Render a MathNode to LaTeX with the implicit-mult literal space removed. */
function fmt(node: MathNode): string {
	return toLatex(node).replace(/(\d|\})\s+([a-zA-Z\\])/g, '$1$2');
}

/**
 * Best-effort detection of the unknown variable name in an EquationStep —
 * walks the AST searching for a `variable` node. Falls back to `'x'`.
 */
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

/** Format a coefficient with surrounding parentheses for substitution display. */
function paren(node: MathNode): string {
	return `\\left(${fmt(node)}\\right)`;
}

/** Pick the right discriminant-comparison symbol for the supérieur narrative. */
function discriminantSymbol(numericValue: number | undefined): '>' | '=' | '<' {
	if (numericValue === undefined || numericValue === null) return '>';
	if (numericValue > 0) return '>';
	if (numericValue === 0) return '=';
	return '<';
}

// =============================================================================
// TITLES
// =============================================================================

const TITLES: Record<QuadraticSchoolLevel, Partial<Record<EquationOperation['kind'], TitleFn>>> = {
	lycee: {
		'identify-equation': () => 'Équation du second degré',
		standardize: () => 'On met l’équation sous la forme `ax² + bx + c = 0`',
		'identify-coefficients': () => 'On identifie les coefficients a, b et c',
		'compute-discriminant': () => 'On calcule le discriminant Δ = b² − 4ac',
		'discriminant-positive': () => 'Δ > 0 : deux solutions distinctes',
		'discriminant-zero': () => 'Δ = 0 : une solution double',
		'discriminant-negative': () => 'Δ < 0 : pas de solution réelle',
		'apply-quadratic-formula': (op) =>
			(op as EquationOperation & { kind: 'apply-quadratic-formula' }).case === 'double'
				? 'On applique la formule : x = −b / (2a)'
				: 'On applique la formule : x = (−b ± √Δ) / (2a)',
		'simplify-solutions': () => 'On simplifie les solutions',
		'read-solutions': () => 'Solutions',
		'no-real-solution': () => 'Pas de solution réelle',
		'recognize-no-linear-term': () => 'Le coefficient de x est nul : on isole le carré',
		'recognize-no-constant-term': () => 'Le terme constant est nul : on factorise par x',
		'recognize-factored': () => 'L’équation est déjà sous forme factorisée',
		'isolate-square': () => 'On isole le carré',
		'extract-square-root': () => 'On extrait la racine carrée',
		'factor-common-x': (_op, step) => `On factorise par ${variableOf(step)}`,
		'zero-product': () => 'Par la propriété du produit nul',
		'solve-each-factor': () => 'On résout chaque facteur séparément'
	},
	superieur: {
		// Identify-equation deliberately omitted at supérieur (the level-strategy
		// skips it). Standardize prefix is also more compact.
		standardize: () => 'Forme standard',
		'identify-coefficients': () => 'Coefficients a, b, c',
		'compute-discriminant': (op) => {
			const numeric = (op as EquationOperation & { kind: 'compute-discriminant' }).numericValue;
			const sym = discriminantSymbol(numeric);
			return `Discriminant : Δ ${sym} 0`;
		},
		// discriminant-{positive,zero,negative} : not emitted at supérieur (folded).
		'apply-quadratic-formula': () => 'Formule du second degré',
		'simplify-solutions': () => 'Simplification',
		'read-solutions': () => 'Ensemble des solutions',
		'no-real-solution': () => 'S = ∅',
		'recognize-no-linear-term': () => 'b = 0 → isoler x²',
		'recognize-no-constant-term': () => 'c = 0 → factoriser par x',
		'recognize-factored': () => 'Forme factorisée',
		'isolate-square': () => 'Isoler x²',
		'extract-square-root': () => 'Racine carrée',
		'factor-common-x': () => 'Factorisation par x',
		'zero-product': () => 'Produit nul',
		'solve-each-factor': () => 'Résolution par facteur'
	}
};

// =============================================================================
// EXPLANATIONS
// =============================================================================

const EXPLANATIONS: Record<
	QuadraticSchoolLevel,
	Partial<Record<EquationOperation['kind'], ExplanationFn>>
> = {
	lycee: {
		'identify-equation': () =>
			'Une équation du second degré s’écrit ax² + bx + c = 0 avec a ≠ 0. On va calculer le discriminant pour déterminer le nombre de solutions.',
		standardize: () =>
			'On déplace tous les termes dans le membre de gauche : f(x) − g(x) = 0. La nouvelle équation est équivalente à la précédente.',
		'identify-coefficients': () =>
			'a est le coefficient de x², b celui de x, c le terme constant. Ils servent ensuite au calcul du discriminant.',
		'compute-discriminant': () =>
			'Le discriminant Δ = b² − 4ac détermine le nombre de solutions réelles : Δ > 0 (deux), Δ = 0 (une double), Δ < 0 (aucune).',
		'discriminant-positive': () =>
			'Le discriminant est strictement positif : l’équation possède deux solutions réelles distinctes données par la formule quadratique.',
		'discriminant-zero': () =>
			'Le discriminant est nul : l’équation possède une unique solution dite double, x = −b / (2a).',
		'discriminant-negative': () =>
			'Le discriminant est strictement négatif : l’équation n’a pas de solution réelle. Dans ℝ, S = ∅.',
		'apply-quadratic-formula': () =>
			'On substitue les valeurs de a, b et Δ dans la formule pour obtenir les solutions brutes (avant simplification).',
		'simplify-solutions': () => 'On réduit chaque solution à sa forme canonique.',
		'read-solutions': () => 'On donne l’ensemble des solutions sous la forme S = { … }.',
		'no-real-solution': () => 'Dans ℝ, l’équation n’admet aucune solution. On note S = ∅.',
		'recognize-no-linear-term': () =>
			'Quand b = 0, l’équation se réduit à ax² + c = 0 : on isole x² et on extrait la racine carrée plutôt que d’utiliser la formule générale.',
		'recognize-no-constant-term': () =>
			'Quand c = 0, x est facteur commun : l’équation devient x(ax + b) = 0 et on applique la propriété du produit nul.',
		'recognize-factored': () =>
			'L’équation est déjà un produit de facteurs égal à zéro : on applique directement la propriété du produit nul.',
		'isolate-square': () => 'En divisant par a et en transposant, on obtient x² = −c / a.',
		'extract-square-root': () =>
			'Si le second membre est positif, x = ±√(rhs) ; s’il est nul, x = 0 ; s’il est négatif, pas de solution réelle.',
		'factor-common-x': () => 'On met x en facteur : ax² + bx = x(ax + b).',
		'zero-product': () => 'Si A · B = 0, alors A = 0 ou B = 0.',
		'solve-each-factor': () =>
			'On résout indépendamment chaque équation linéaire issue du produit nul.'
	},
	superieur: {
		// Compact one-liners for supérieur — students at this level know the
		// algebra and only need anchor phrases.
		'compute-discriminant': () => 'Δ = b² − 4ac détermine le cardinal de l’ensemble solution.',
		'apply-quadratic-formula': () => 'Substitution dans x = (−b ± √Δ) / (2a).',
		'simplify-solutions': () => 'Réduction canonique.',
		'read-solutions': () => 'Ensemble solution.',
		'no-real-solution': () => 'Δ < 0 ⇒ S = ∅ dans ℝ.',
		'recognize-no-linear-term': () => 'ax² + c = 0 ⇒ x² = −c/a.',
		'recognize-no-constant-term': () => 'ax² + bx = 0 ⇒ x(ax + b) = 0.',
		'recognize-factored': () => 'Produit de facteurs nul.',
		'zero-product': () => 'A · B = 0 ⇒ A = 0 ∨ B = 0.'
	}
};

// =============================================================================
// Renderer
// =============================================================================

export class QuadraticEquationRenderer
	implements StepRenderer<EquationStep, PedagogicalRenderOptions>
{
	render(step: EquationStep, options: PedagogicalRenderOptions): RenderedStep {
		assertSupportedLevel(options.schoolLevel);
		const level = options.schoolLevel;

		const title = this.resolveTitle(step, level);
		const explanation =
			options.verbosity === 'detailed' ? this.resolveExplanation(step, level) : undefined;

		const expressionLatex = formatExpressionLatex(step);
		const renderedSubSteps = step.subSteps?.map((s) => this.render(s, options));

		const base: RenderedStep = {
			id: step.id,
			rule: step.rule,
			title,
			...(explanation !== undefined && { explanation }),
			expressionLatex,
			schoolLevel: level,
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

	private resolveTitle(step: EquationStep, level: QuadraticSchoolLevel): string {
		const op = step.operation;
		if (op) {
			const titleFn = TITLES[level][op.kind] ?? TITLES.lycee[op.kind];
			if (titleFn) return titleFn(op, step);
		}
		return step.description;
	}

	private resolveExplanation(step: EquationStep, level: QuadraticSchoolLevel): string | undefined {
		const op = step.operation;
		if (!op) return undefined;
		const explanationFn = EXPLANATIONS[level][op.kind] ?? EXPLANATIONS.lycee[op.kind];
		return explanationFn?.(op, step);
	}
}

/**
 * Narrow `SchoolLevel` to `QuadraticSchoolLevel`. The quadratic pipeline does
 * not cover `primaire` nor `college` (the second-degree formula is not in the
 * syllabus before 1ère), so calling the renderer with either is a programmer
 * error.
 */
function assertSupportedLevel(level: SchoolLevel): asserts level is QuadraticSchoolLevel {
	if (level === 'primaire' || level === 'college') {
		throw new Error(
			`QuadraticEquationRenderer: school level '${level}' is not supported (the second-degree formula is not in the syllabus before 1ère).`
		);
	}
}

// =============================================================================
// Per-kind LaTeX formatting
// =============================================================================

/**
 * Build the LaTeX expression for a step. Branches on `operation.kind` because
 * many quadratic kinds carry side information (formula, discriminant value,
 * solution set) that needs to be displayed instead of the raw equation.
 */
function formatExpressionLatex(step: EquationStep): string {
	const op = step.operation;
	if (!op) return fmt(step.before);

	switch (op.kind) {
		// -------- Pure-label kinds : just show the equation --------
		case 'identify-equation':
		case 'recognize-no-linear-term':
		case 'recognize-no-constant-term':
		case 'discriminant-positive':
		case 'discriminant-zero':
		case 'discriminant-negative':
			return fmt(step.before);

		// -------- Equation transformation kinds (before → after) --------
		case 'standardize':
		case 'isolate-square':
		case 'factor-common-x':
			return alignedTransformation(step);

		case 'extract-square-root':
			return formatExtractSquareRoot(step, op);

		// -------- Info-rich kinds : custom rendering from operation fields --------
		case 'identify-coefficients':
			return formatIdentifyCoefficients(op);
		case 'compute-discriminant':
			return formatComputeDiscriminant(op);
		case 'apply-quadratic-formula':
			return formatApplyQuadraticFormula(op);
		case 'simplify-solutions':
			return formatSimplifySolutions(op);
		case 'read-solutions':
			return formatReadSolutions(op);
		case 'no-real-solution':
			return 'S = \\emptyset';
		case 'recognize-factored':
			return fmt(step.before);
		case 'zero-product':
			return formatZeroProduct(op);
		case 'solve-each-factor':
			return formatSolveEachFactor(op);

		// -------- Linear kinds (cross-pipeline misuse) — fallback to plain equation --------
		default:
			return fmt(step.before);
	}
}

/**
 * Render an aligned `before / after` block for transformation steps where
 * both sides are relations and `before !== after` structurally. Falls back to
 * a single line when either condition fails.
 */
function alignedTransformation(step: EquationStep): string {
	const rel = step.before.type === 'relation' ? step.before.relation : '=';
	const bL = step.before.type === 'relation' ? fmt(step.before.left) : fmt(step.before);
	const bR = step.before.type === 'relation' ? fmt(step.before.right) : '';
	const aL = step.after.type === 'relation' ? fmt(step.after.left) : fmt(step.after);
	const aR = step.after.type === 'relation' ? fmt(step.after.right) : '';

	if (bL === aL && bR === aR) {
		// No actual transformation — display once.
		return `${bL} ${rel} ${bR}`;
	}

	return [
		'\\begin{aligned}',
		`  ${bL} &${rel} ${bR} \\\\`,
		`  ${aL} &${rel} ${aR}`,
		'\\end{aligned}'
	].join(' ');
}

/** `a = …, \quad b = …, \quad c = …` */
function formatIdentifyCoefficients(
	op: EquationOperation & { kind: 'identify-coefficients' }
): string {
	return `a = ${fmt(op.a)}, \\quad b = ${fmt(op.b)}, \\quad c = ${fmt(op.c)}`;
}

/**
 * `Δ = b² − 4ac = (b)² − 4 · (a) · (c) = result`
 *
 * The substituted form uses `\left(\right)` around each coefficient to keep
 * the sign visible (negative coefficients are properly bracketed).
 */
function formatComputeDiscriminant(
	op: EquationOperation & { kind: 'compute-discriminant' }
): string {
	const substituted = `${paren(op.b)}^2 - 4 \\cdot ${paren(op.a)} \\cdot ${paren(op.c)}`;
	const result = fmt(op.discriminant);
	return `\\Delta = b^2 - 4ac = ${substituted} = ${result}`;
}

/**
 * Apply-formula : show the general formula AND the substituted form, on
 * separate lines. The simplification of the result is handled by the next
 * step (`simplify-solutions`).
 */
function formatApplyQuadraticFormula(
	op: EquationOperation & { kind: 'apply-quadratic-formula' }
): string {
	if (op.case === 'double') {
		const substituted = `\\dfrac{-${paren(op.b)}}{2 \\cdot ${paren(op.a)}}`;
		return [
			'\\begin{aligned}',
			'  x &= \\dfrac{-b}{2a} \\\\',
			`  &= ${substituted}`,
			'\\end{aligned}'
		].join(' ');
	}
	const substituted = `\\dfrac{-${paren(op.b)} \\pm \\sqrt{${fmt(op.discriminant)}}}{2 \\cdot ${paren(op.a)}}`;
	return [
		'\\begin{aligned}',
		'  x &= \\dfrac{-b \\pm \\sqrt{\\Delta}}{2a} \\\\',
		`  &= ${substituted}`,
		'\\end{aligned}'
	].join(' ');
}

/**
 * Display each raw solution and its simplified form, side by side. Layout
 * adapts to the cardinality (1 = double, 2 = distinct).
 */
function formatSimplifySolutions(op: EquationOperation & { kind: 'simplify-solutions' }): string {
	if (op.solutions.length === 1) {
		return `x_0 = ${fmt(op.rawSolutions[0])} = ${fmt(op.solutions[0])}`;
	}
	const lines = op.solutions.map(
		(s, i) => `  x_${i + 1} &= ${fmt(op.rawSolutions[i])} = ${fmt(s)}`
	);
	return ['\\begin{aligned}', lines.join(' \\\\\n'), '\\end{aligned}'].join(' ');
}

/** `S = \{x_1 \,;\, x_2\}` (FR convention with semicolon) — or singleton / empty. */
function formatReadSolutions(op: EquationOperation & { kind: 'read-solutions' }): string {
	if (op.solutions.length === 0) return 'S = \\emptyset';
	if (op.solutions.length === 1) {
		return `S = \\left\\{ ${fmt(op.solutions[0])} \\right\\}`;
	}
	const items = op.solutions.map(fmt).join(' \\,;\\, ');
	return `S = \\left\\{ ${items} \\right\\}`;
}

/**
 * `extract-square-root` : custom rendering — for rhs > 0 the after-equation is
 * the same as the before-equation (the operation is encoded only in the
 * `argument` field), so we synthesise `x = \pm\sqrt{rhs}` for display.
 */
function formatExtractSquareRoot(
	step: EquationStep,
	op: EquationOperation & { kind: 'extract-square-root' }
): string {
	// If the step's `after` differs from `before` (rhs == 0 case), use the
	// transformation display.
	if (step.before.type === 'relation' && step.after.type === 'relation') {
		const before = `${fmt(step.before.left)} ${step.before.relation} ${fmt(step.before.right)}`;
		const after = `${fmt(step.after.left)} ${step.after.relation} ${fmt(step.after.right)}`;
		if (before !== after) {
			return alignedTransformation(step);
		}
	}
	// Synthetic `x = \pm \sqrt{argument}` line for rhs > 0.
	return `x = \\pm \\sqrt{${fmt(op.argument)}}`;
}

/** `A \cdot B = 0 \;\Longleftrightarrow\; A = 0 \;\text{ou}\; B = 0` */
function formatZeroProduct(op: EquationOperation & { kind: 'zero-product' }): string {
	const factorsNullified = op.factors.map((f) => `${fmt(f)} = 0`).join(' \\;\\text{ou}\\; ');
	const product = op.factors.map(fmt).join(' \\cdot ');
	return `${product} = 0 \\;\\Longleftrightarrow\\; ${factorsNullified}`;
}

/** `factor_1 = 0 ⇒ x = value_1` ; one line per pair. */
function formatSolveEachFactor(op: EquationOperation & { kind: 'solve-each-factor' }): string {
	if (op.pairs.length === 0) return '';
	const lines = op.pairs.map(
		(p) => `  ${fmt(p.factor)} = 0 &\\;\\Longleftrightarrow\\; x = ${fmt(p.value)}`
	);
	return ['\\begin{aligned}', lines.join(' \\\\\n'), '\\end{aligned}'].join(' ');
}
