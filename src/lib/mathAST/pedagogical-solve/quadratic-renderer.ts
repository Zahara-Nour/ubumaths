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
import { computeNumericValue } from '../solve/numeric-value';
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
 * True when the step transforms an inequality (relation operator other than
 * `=`). Used to branch TITLES/EXPLANATIONS between equation- and inequality-
 * specific phrasing — same pattern as `linear-renderer.ts:isInequalityStep`.
 */
function isInequalityStep(step: EquationStep): boolean {
	return step.before.type === 'relation' && step.before.relation !== '=';
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
		'identify-equation': (_op, step) =>
			isInequalityStep(step) ? 'Inéquation du second degré' : 'Équation du second degré',
		standardize: (_op, step) =>
			isInequalityStep(step)
				? 'On met l’inéquation sous la forme `ax² + bx + c ⊻ 0`'
				: 'On met l’équation sous la forme `ax² + bx + c = 0`',
		'identify-coefficients': () => 'On identifie les coefficients a, b et c',
		'compute-discriminant': () => 'On calcule le discriminant Δ = b² − 4ac',
		'discriminant-positive': (_op, step) =>
			isInequalityStep(step)
				? 'Δ > 0 : le polynôme admet deux racines distinctes'
				: 'Δ > 0 : deux solutions distinctes',
		'discriminant-zero': (_op, step) =>
			isInequalityStep(step)
				? 'Δ = 0 : le polynôme admet une racine double'
				: 'Δ = 0 : une solution double',
		'discriminant-negative': (_op, step) =>
			isInequalityStep(step)
				? 'Δ < 0 : le polynôme n’a pas de racine réelle'
				: 'Δ < 0 : pas de solution réelle',
		'apply-quadratic-formula': (op, step) => {
			const kind = (op as EquationOperation & { kind: 'apply-quadratic-formula' }).case;
			// Equation phrasing (preserved verbatim for snapshot stability) ; the
			// inequality context only swaps the implicit noun "solutions" → "racines"
			// inside the explanation field, not the title.
			if (kind === 'double') {
				return 'On applique la formule : x = −b / (2a)';
			}
			void step;
			return 'On applique la formule : x = (−b ± √Δ) / (2a)';
		},
		'simplify-solutions': (_op, step) =>
			isInequalityStep(step) ? 'On simplifie les racines' : 'On simplifie les solutions',
		'read-solutions': () => 'Solutions',
		'no-real-solution': () => 'Pas de solution réelle',
		'recognize-no-linear-term': () => 'Le coefficient de x est nul : on isole le carré',
		'recognize-no-constant-term': () => 'Le terme constant est nul : on factorise par x',
		'recognize-factored': (_op, step) =>
			isInequalityStep(step)
				? 'L’inéquation est déjà sous forme factorisée'
				: 'L’équation est déjà sous forme factorisée',
		'isolate-square': () => 'On isole le carré',
		'extract-square-root': () => 'On extrait la racine carrée',
		'factor-common-x': (_op, step) => `On factorise par ${variableOf(step)}`,
		'zero-product': () => 'Par la propriété du produit nul',
		'solve-each-factor': () => 'On résout chaque facteur séparément',
		'factor-gcd': (op) => {
			const g = (op as EquationOperation & { kind: 'factor-gcd' }).gcd;
			return `On divise les deux membres par ${fmt(g)} (PGCD)`;
		},
		// === Quadratic inequality kinds (palier 2b) ===
		'quadratic-sign-table': () => 'On dresse le tableau de signes',
		'inequality-conclude-quadratic': (op) => {
			const description = (op as EquationOperation & { kind: 'inequality-conclude-quadratic' })
				.solutionDescription;
			return `Solution : S = ${description}`;
		},
		// === Palier 2c — fast path b = 0 ===
		'inequality-conclude-from-isolated-square': (op) => {
			const description = (
				op as EquationOperation & { kind: 'inequality-conclude-from-isolated-square' }
			).solutionDescription;
			return `Solution : S = ${description}`;
		}
	},
	superieur: {
		'identify-equation': (_op, step) =>
			isInequalityStep(step) ? 'Inéquation du second degré' : 'Équation du second degré',
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
		'solve-each-factor': () => 'Résolution par facteur',
		'factor-gcd': (op) => {
			const g = (op as EquationOperation & { kind: 'factor-gcd' }).gcd;
			return `Simplification (÷ ${fmt(g)})`;
		},
		// === Quadratic inequality kinds (palier 2b) ===
		'quadratic-sign-table': () => 'Tableau de signes',
		'inequality-conclude-quadratic': (op) => {
			const description = (op as EquationOperation & { kind: 'inequality-conclude-quadratic' })
				.solutionDescription;
			return `S = ${description}`;
		},
		// === Palier 2c — fast path b = 0 ===
		'inequality-conclude-from-isolated-square': (op) => {
			const description = (
				op as EquationOperation & { kind: 'inequality-conclude-from-isolated-square' }
			).solutionDescription;
			return `S = ${description}`;
		}
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
		'identify-equation': (_op, step) =>
			isInequalityStep(step)
				? 'Une inéquation du second degré s’écrit ax² + bx + c ⊻ 0 avec a ≠ 0 (où ⊻ ∈ {<, >, ≤, ≥, ≠}). On calcule le discriminant pour déterminer les racines, puis on dresse le tableau de signes pour lire la solution.'
				: 'Une équation du second degré s’écrit ax² + bx + c = 0 avec a ≠ 0. On va calculer le discriminant pour déterminer le nombre de solutions.',
		standardize: () =>
			'On déplace tous les termes dans le membre de gauche : f(x) − g(x) ⊻ 0. La nouvelle relation est équivalente à la précédente.',
		'identify-coefficients': () =>
			'a est le coefficient de x², b celui de x, c le terme constant. Ils servent ensuite au calcul du discriminant.',
		'compute-discriminant': () =>
			'Le discriminant Δ = b² − 4ac détermine le nombre de racines réelles du polynôme : Δ > 0 (deux), Δ = 0 (une double), Δ < 0 (aucune).',
		'discriminant-positive': (_op, step) =>
			isInequalityStep(step)
				? 'Le discriminant est strictement positif : le polynôme possède deux racines réelles distinctes. Elles serviront à dresser le tableau de signes.'
				: 'Le discriminant est strictement positif : l’équation possède deux solutions réelles distinctes données par la formule quadratique.',
		'discriminant-zero': (_op, step) =>
			isInequalityStep(step)
				? 'Le discriminant est nul : le polynôme admet une racine double. Le polynôme est du signe de a sauf en cette racine, où il s’annule.'
				: 'Le discriminant est nul : l’équation possède une unique solution dite double, x = −b / (2a).',
		'discriminant-negative': (_op, step) =>
			isInequalityStep(step)
				? 'Le discriminant est strictement négatif : le polynôme n’a pas de racine réelle. Le polynôme garde un signe constant (celui de a) sur tout ℝ.'
				: 'Le discriminant est strictement négatif : l’équation n’a pas de solution réelle. Dans ℝ, S = ∅.',
		'apply-quadratic-formula': (_op, step) =>
			isInequalityStep(step)
				? 'On substitue les valeurs de a, b et Δ dans la formule pour obtenir les racines du polynôme (avant simplification).'
				: 'On substitue les valeurs de a, b et Δ dans la formule pour obtenir les solutions brutes (avant simplification).',
		'simplify-solutions': (_op, step) =>
			isInequalityStep(step)
				? 'On réduit chaque racine à sa forme canonique.'
				: 'On réduit chaque solution à sa forme canonique.',
		'read-solutions': () => 'On donne l’ensemble des solutions sous la forme S = { … }.',
		'no-real-solution': () => 'Dans ℝ, l’équation n’admet aucune solution. On note S = ∅.',
		'factor-gcd': () =>
			'Quand les coefficients ont un facteur entier commun, on divise les deux membres par ce PGCD pour simplifier les calculs ; les solutions de l’équation simplifiée sont identiques à celles de l’équation originale.',
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
			'On résout indépendamment chaque équation linéaire issue du produit nul.',
		// === Quadratic inequality kinds (palier 2b) ===
		'quadratic-sign-table': () =>
			'Le tableau de signes synthétise le signe du polynôme sur chaque intervalle déterminé par les racines. Le polynôme est du signe de a à l’extérieur des racines et du signe opposé entre les racines (cas Δ > 0).',
		'inequality-conclude-quadratic': () =>
			'On lit la solution dans le tableau : on garde les intervalles où le signe satisfait l’opérateur de l’inéquation.',
		// === Palier 2c — fast paths ===
		'inequality-conclude-from-isolated-square': () =>
			'Comme x² ≥ 0 toujours, on raisonne directement sur la valeur isolée à droite : selon son signe et l’opérateur, la solution est ∅, ℝ, ou un intervalle borné par ±√k.'
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
		'zero-product': () => 'A · B = 0 ⇒ A = 0 ∨ B = 0.',
		'quadratic-sign-table': () => 'Signe(P) = signe(a) à l’extérieur des racines.',
		'inequality-conclude-quadratic': () => 'Lecture du tableau pour l’opérateur donné.',
		'inequality-conclude-from-isolated-square': () => 'x² ≥ 0 ⇒ déduction directe sans tableau.'
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
		case 'factor-gcd':
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

		// -------- Quadratic inequality kinds (palier 2b) --------
		case 'quadratic-sign-table':
			return formatSignTable(op);
		case 'inequality-conclude-quadratic':
			return formatConcludeQuadratic(op);

		// -------- Palier 2c — fast path b = 0 conclude --------
		case 'inequality-conclude-from-isolated-square':
			return formatConcludeFromIsolatedSquare(op);

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
	// Each line carries its OWN relation operator. For flip-aware steps (palier
	// 2c b=0 fast path divides by `a < 0`), the after-line uses the flipped
	// operator, while the before-line keeps the original. For non-flip steps,
	// both relations are equal and the rendering is unchanged.
	const relBefore = step.before.type === 'relation' ? step.before.relation : '=';
	const relAfter = step.after.type === 'relation' ? step.after.relation : '=';
	const bL = step.before.type === 'relation' ? fmt(step.before.left) : fmt(step.before);
	const bR = step.before.type === 'relation' ? fmt(step.before.right) : '';
	const aL = step.after.type === 'relation' ? fmt(step.after.left) : fmt(step.after);
	const aR = step.after.type === 'relation' ? fmt(step.after.right) : '';

	if (bL === aL && bR === aR && relBefore === relAfter) {
		// No actual transformation — display once.
		return `${bL} ${relBefore} ${bR}`;
	}

	return [
		'\\begin{aligned}',
		`  ${bL} &${relBefore} ${bR} \\\\`,
		`  ${aL} &${relAfter} ${aR}`,
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

/**
 * `(A) \cdot (B) = 0 \;\Longleftrightarrow\; A = 0 \;\text{ou}\; B = 0`
 *
 * Each factor is wrapped in `\left( \right)` on the product side so the
 * multiplication binds correctly when the factor is itself a sum or
 * difference (e.g. `(x − 2)(x + 3) = 0`). On the disjunction side we drop the
 * parens — `x − 2 = 0` reads cleaner than `(x − 2) = 0`.
 */
function formatZeroProduct(op: EquationOperation & { kind: 'zero-product' }): string {
	const factorsNullified = op.factors.map((f) => `${fmt(f)} = 0`).join(' \\;\\text{ou}\\; ');
	const product = op.factors.map((f) => `\\left(${fmt(f)}\\right)`).join(' \\cdot ');
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

/**
 * Format the quadratic sign table as a LaTeX `\begin{array}` block.
 *
 * Layout :
 * - Header row with `x`, then alternating roots and the labels `-\infty` /
 *   `+\infty` at the boundaries.
 * - Body row with the polynomial label on the left, then alternating signs
 *   (`+`, `-`, `0`) on the intervals and roots.
 *
 * Sign rules :
 * - 2 roots (Δ > 0) : signe(a), 0, signe(−a), 0, signe(a)
 * - 1 root (Δ = 0)  : signe(a), 0, signe(a)
 * - 0 roots (Δ < 0) : signe(a) on the whole line
 */
function formatSignTable(op: EquationOperation & { kind: 'quadratic-sign-table' }): string {
	const aValue = computeNumericValueLite(op.a);
	const aSign = aValue !== null && aValue < 0 ? '-' : '+';
	const oppSign = aSign === '+' ? '-' : '+';
	const polyLabel = formatQuadraticPolynomialLabel(op);

	const sortedRoots = sortRoots(op.roots);
	const numRoots = sortedRoots.length;

	// Defensive: a quadratic has at most 2 distinct roots. If a future caller
	// passes more (degree-3 extension, internal bug), fall back to the row of
	// roots without trying to mis-format a misdimensioned table.
	if (numRoots > 2) {
		return `\\text{tableau de signes (${numRoots} racines, hors V1)}`;
	}

	if (numRoots === 0) {
		// Δ < 0 : single sign over all ℝ
		return [
			'\\begin{array}{|c|ccc|}',
			'\\hline',
			`${op.variable} & -\\infty & & +\\infty \\\\`,
			'\\hline',
			`${polyLabel} & & ${aSign} & \\\\`,
			'\\hline',
			'\\end{array}'
		].join(' ');
	}

	if (numRoots === 1) {
		// Δ = 0 : signe(a), 0, signe(a)
		const r0 = fmt(sortedRoots[0]);
		return [
			'\\begin{array}{|c|ccccc|}',
			'\\hline',
			`${op.variable} & -\\infty & & ${r0} & & +\\infty \\\\`,
			'\\hline',
			`${polyLabel} & & ${aSign} & 0 & ${aSign} & \\\\`,
			'\\hline',
			'\\end{array}'
		].join(' ');
	}

	// numRoots === 2 : Δ > 0
	const r1 = fmt(sortedRoots[0]);
	const r2 = fmt(sortedRoots[1]);
	return [
		'\\begin{array}{|c|ccccccc|}',
		'\\hline',
		`${op.variable} & -\\infty & & ${r1} & & ${r2} & & +\\infty \\\\`,
		'\\hline',
		`${polyLabel} & & ${aSign} & 0 & ${oppSign} & 0 & ${aSign} & \\\\`,
		'\\hline',
		'\\end{array}'
	].join(' ');
}

/** `S = ]2 ; 3[` etc. — the description is computed by the inequality module. */
function formatConcludeQuadratic(
	op: EquationOperation & { kind: 'inequality-conclude-quadratic' }
): string {
	return `S = ${escapeLatexBacktickFreeText(op.solutionDescription)}`;
}

/**
 * Palier 2c — fast path conclusion when `b = 0`. Same Unicode-to-LaTeX
 * post-processing as `formatConcludeQuadratic`.
 */
function formatConcludeFromIsolatedSquare(
	op: EquationOperation & { kind: 'inequality-conclude-from-isolated-square' }
): string {
	return `S = ${escapeLatexBacktickFreeText(op.solutionDescription)}`;
}

/**
 * Build a short LaTeX label for the polynomial `ax² + bx + c` to use as the
 * row header in the sign table. Falls back to a generic `P(x)` if the
 * coefficient `a` is non-trivial enough that re-printing would clutter the
 * table.
 */
function formatQuadraticPolynomialLabel(
	op: EquationOperation & { kind: 'quadratic-sign-table' }
): string {
	// Always use the generic `P(x)` label for the table — the explicit polynomial
	// has already been displayed in earlier steps and would crowd the array.
	return `P(${op.variable})`;
}

/**
 * Lightweight numeric extraction — returns `null` if the node isn't a simple
 * integer/decimal/opposite. Avoids importing the full `computeNumericValue`
 * machinery since we only need to decide the SIGN of `a`.
 */
function computeNumericValueLite(node: MathNode): number | null {
	if (node.type === 'number') return parseFloat(node.value);
	if (node.type === 'opposite' && (node as { operand: MathNode }).operand.type === 'number') {
		return -parseFloat(((node as { operand: MathNode }).operand as { value: string }).value);
	}
	return null;
}

/** Sort roots by approximate numeric value (smallest first). Uses the full
 *  `computeNumericValue` so irrational forms like `(1 + \sqrt{5}) / 2` are
 *  ordered correctly — `computeNumericValueLite` only handles integers. */
function sortRoots(roots: readonly MathNode[]): MathNode[] {
	const withVals = roots.map((r) => ({
		node: r,
		value: computeNumericValue(r) ?? Number.MAX_SAFE_INTEGER
	}));
	withVals.sort((a, b) => a.value - b.value);
	return withVals.map((w) => w.node);
}

/**
 * The `solutionDescription` carries Unicode characters like `∅`, `ℝ`, `∪`
 * that are LaTeX-safe in math mode but need a small post-processing pass to
 * harmonise with the rest of the renderer's output. Currently a no-op — kept
 * as a hook for future escaping needs (e.g. converting `∪` to `\cup`).
 */
function escapeLatexBacktickFreeText(s: string): string {
	// Escape literal `{` / `}` first (they come from set notation like `{2}` and
	// are unrelated to any LaTeX braces — those are introduced AFTER, by the
	// Unicode → macro substitutions below).
	return s
		.replace(/\{/g, '\\{')
		.replace(/\}/g, '\\}')
		.replace(/∪/g, '\\cup')
		.replace(/∅/g, '\\emptyset')
		.replace(/ℝ\s*\\\s*/g, '\\mathbb{R} \\setminus ')
		.replace(/ℝ/g, '\\mathbb{R}')
		.replace(/∞/g, '\\infty');
}
