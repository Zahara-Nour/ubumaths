/**
 * Correction Generator (Mode B)
 * ==============================
 *
 * Glue between `QuestionInstance.correction.generatedSteps` (declarative,
 * authored on the template) and the mathAST pedagogical pipelines
 * (`pedagogical-arithmetic`, `pedagogical-solve/linear`).
 *
 * Called automatically at the tail of `generateInstance()`. Strict early-return
 * when `generatedSteps` is absent — coupling between `instance-generator.ts`
 * and this module is intentional and unidirectional.
 *
 * On success, returns a NEW instance with `correction._renderedSteps` populated.
 * On any failure (parse error, pipeline throw, unsupported kind), returns the
 * input instance UNCHANGED and emits a `console.warn` for author debugging —
 * the UI layer (CorrectionCard) detects the absence and falls back to Mode A
 * (manual `correction.steps`) or feedback-only.
 *
 * @module questions/generator/correction-generator
 */

import { parseCustomSafe } from '$lib/mathAST';
import type { MathNode, RelationNode } from '$lib/mathAST/types';
import type {
	PedagogicalRenderOptions,
	RenderedStep,
	SchoolLevel
} from '$lib/mathAST/common/step-renderer-base';
import { generatePedagogicalArithmeticSteps } from '$lib/mathAST/pedagogical-arithmetic/pipeline';
import { PedagogicalArithmeticRenderer } from '$lib/mathAST/pedagogical-arithmetic/renderer';
import { extractPedagogicalTarget } from '$lib/mathAST/pedagogical-arithmetic/target-extractor';
import { generatePedagogicalDifferentiationSteps } from '$lib/mathAST/pedagogical-differentiation/pipeline';
import { PedagogicalDifferentiationRenderer } from '$lib/mathAST/pedagogical-differentiation/renderer';
import { generateLinearEquationSteps } from '$lib/mathAST/pedagogical-solve/linear';
import { LinearEquationRenderer } from '$lib/mathAST/pedagogical-solve/linear-renderer';
import {
	generateQuadraticEquationSteps,
	PedagogicalQuadraticNotImplemented
} from '$lib/mathAST/pedagogical-solve/quadratic';
import { QuadraticEquationRenderer } from '$lib/mathAST/pedagogical-solve/quadratic-renderer';
import {
	generateLinearInequalitySteps,
	UnsupportedInequalityDegree,
	PedagogicalInequalityError
} from '$lib/mathAST/pedagogical-solve/linear-inequality';
import { generateQuadraticInequalitySteps } from '$lib/mathAST/pedagogical-solve/quadratic-inequality';
import { InequalityNotSolvable } from '$lib/mathAST/solve/inequality/types';
import type { LinearSchoolLevel, QuadraticSchoolLevel } from '$lib/mathAST/pedagogical-solve/types';

import type { GeneratedStepsOptions, QuestionInstance } from '../types';
import { gradeLevelToSchoolLevel } from '../grade-level-to-school-level';
import { resolveExpression } from './content-resolver';

// =============================================================================
// Public API
// =============================================================================

/**
 * Pre-render the pedagogical correction described by
 * `instance.correction.generatedSteps`.
 *
 * Returns a NEW instance with `correction._renderedSteps` populated, or the
 * INPUT instance unchanged when no work is needed (early-return) or when
 * generation fails (silent fallback).
 *
 * Wired into `generateInstance()`'s tail; can also be called directly on a
 * pre-built instance (e.g. tests, CLI demos).
 */
export function generateCorrection(instance: QuestionInstance): QuestionInstance {
	const generatedSteps = instance.correction?.generatedSteps;
	// Strict early-return : zero allocation, zero log, zero copy when Mode B
	// is not declared. Most existing questions hit this path.
	if (!generatedSteps) return instance;

	try {
		const opts: GeneratedStepsOptions = generatedSteps.options ?? {};
		const verbosity = opts.verbosity ?? 'detailed';
		const schoolLevel = resolveSchoolLevel(opts.schoolLevel, instance.grades);

		let renderedSteps: readonly RenderedStep[] | null;

		switch (generatedSteps.kind) {
			case 'arithmetic':
				renderedSteps = renderArithmetic({
					expression: generatedSteps.expression,
					instance,
					schoolLevel,
					verbosity
				});
				break;
			case 'linear-equation':
				renderedSteps = renderLinearEquation({
					equation: generatedSteps.equation,
					instance,
					schoolLevel,
					verbosity
				});
				break;
			case 'quadratic-equation':
				renderedSteps = renderQuadraticEquation({
					equation: generatedSteps.equation,
					instance,
					schoolLevel,
					verbosity
				});
				break;
			case 'differentiate':
				renderedSteps = renderDifferentiate({
					expression: generatedSteps.expression,
					variable: generatedSteps.variable ?? 'x',
					instance,
					schoolLevel,
					verbosity
				});
				break;
			case 'linear-inequality':
				renderedSteps = renderLinearInequality({
					inequality: generatedSteps.inequality,
					instance,
					schoolLevel,
					verbosity
				});
				break;
			case 'quadratic-inequality':
				renderedSteps = renderQuadraticInequality({
					inequality: generatedSteps.inequality,
					instance,
					schoolLevel,
					verbosity
				});
				break;
		}

		if (renderedSteps === null) return instance;

		return {
			...instance,
			correction: {
				...instance.correction,
				_renderedSteps: renderedSteps
			}
		};
	} catch (err) {
		console.warn(
			`[generateCorrection] failed to generate steps for template ${instance.templateId}:`,
			err
		);
		return instance;
	}
}

// =============================================================================
// Internal — pipeline dispatchers
// =============================================================================

interface ArithmeticDispatch {
	readonly expression: string;
	readonly instance: QuestionInstance;
	readonly schoolLevel: SchoolLevel;
	readonly verbosity: 'summarized' | 'detailed';
}

function renderArithmetic({
	expression,
	instance,
	schoolLevel,
	verbosity
}: ArithmeticDispatch): readonly RenderedStep[] | null {
	const node = parseExpression(expression, instance);
	if (node === null) return null;

	// Refuse a relation node in the arithmetic kind — the author meant to use
	// `linear-equation`. Silent fallback so a swap-of-kind doesn't crash the UI.
	if (node.type === 'relation') return null;

	const target = extractPedagogicalTarget(instance);
	const result = generatePedagogicalArithmeticSteps(node, {
		schoolLevel,
		target,
		verbosity
	});

	const renderer = new PedagogicalArithmeticRenderer();
	const renderOptions: PedagogicalRenderOptions = { schoolLevel, verbosity };
	return renderer.renderAll(result.steps, renderOptions);
}

interface LinearEquationDispatch {
	readonly equation: string;
	readonly instance: QuestionInstance;
	readonly schoolLevel: SchoolLevel;
	readonly verbosity: 'summarized' | 'detailed';
}

function renderLinearEquation({
	equation,
	instance,
	schoolLevel,
	verbosity
}: LinearEquationDispatch): readonly RenderedStep[] | null {
	const node = parseExpression(equation, instance);
	if (node === null) return null;

	// Linear equations require a relation; reject anything else silently.
	if (node.type !== 'relation') return null;
	// TypeScript does not narrow MathNode to RelationNode via the .type check
	// above (MathNode is a structural union without a single discriminator that
	// the compiler can fold). The cast is safe — the guard guarantees the type.
	const relationNode = node as RelationNode;

	// `LinearSchoolLevel` excludes 'primaire' (linear algebra not in primary
	// curriculum). Bump primaire→college so a CM2 question with a misplaced
	// linear-equation declaration still produces something useful.
	const linearLevel: LinearSchoolLevel = schoolLevel === 'primaire' ? 'college' : schoolLevel;

	const steps = generateLinearEquationSteps(relationNode, { level: linearLevel });
	const renderer = new LinearEquationRenderer();
	const renderOptions: PedagogicalRenderOptions = {
		schoolLevel: linearLevel,
		verbosity
	};
	return renderer.renderAll(steps, renderOptions);
}

interface QuadraticEquationDispatch {
	readonly equation: string;
	readonly instance: QuestionInstance;
	readonly schoolLevel: SchoolLevel;
	readonly verbosity: 'summarized' | 'detailed';
}

function renderQuadraticEquation({
	equation,
	instance,
	schoolLevel,
	verbosity
}: QuadraticEquationDispatch): readonly RenderedStep[] | null {
	const node = parseExpression(equation, instance);
	if (node === null) return null;

	if (node.type !== 'relation') return null;
	const relationNode = node as RelationNode;

	// `QuadraticSchoolLevel` excludes 'primaire' AND 'college' (the second-degree
	// formula is not in the syllabus before 1ère). Bump those levels to 'lycee'
	// so a misplaced quadratic-equation declaration on a sub-1ère question
	// still produces something useful.
	const quadraticLevel: QuadraticSchoolLevel =
		schoolLevel === 'primaire' || schoolLevel === 'college' ? 'lycee' : schoolLevel;

	let steps;
	try {
		steps = generateQuadraticEquationSteps(relationNode, { level: quadraticLevel });
	} catch (err) {
		// V1 scope refusal (parametric coefficients, etc.) → silent fallback to
		// Mode A. Any other Error type re-throws upstream (caught by the parent
		// try/catch in `generateCorrection`).
		if (err instanceof PedagogicalQuadraticNotImplemented) return null;
		throw err;
	}

	const renderer = new QuadraticEquationRenderer();
	const renderOptions: PedagogicalRenderOptions = {
		schoolLevel: quadraticLevel,
		verbosity
	};
	return renderer.renderAll(steps, renderOptions);
}

interface LinearInequalityDispatch {
	readonly inequality: string;
	readonly instance: QuestionInstance;
	readonly schoolLevel: SchoolLevel;
	readonly verbosity: 'summarized' | 'detailed';
}

function renderLinearInequality({
	inequality,
	instance,
	schoolLevel,
	verbosity
}: LinearInequalityDispatch): readonly RenderedStep[] | null {
	const node = parseExpression(inequality, instance);
	if (node === null) return null;

	// Linear inequalities require a relation; reject anything else silently.
	if (node.type !== 'relation') return null;
	const relationNode = node as RelationNode;

	// `LinearSchoolLevel` excludes 'primaire' (algebra not in primary curriculum).
	// Bump primaire→college so a misplaced declaration still produces output.
	const linearLevel: LinearSchoolLevel = schoolLevel === 'primaire' ? 'college' : schoolLevel;

	let steps;
	try {
		steps = generateLinearInequalitySteps(relationNode, { level: linearLevel });
	} catch (err) {
		// V1 scope refusals (degree ≥ 2, parametric coefficients, equality) →
		// silent fallback to Mode A. Anything else re-throws upstream.
		if (
			err instanceof UnsupportedInequalityDegree ||
			err instanceof InequalityNotSolvable ||
			err instanceof PedagogicalInequalityError
		) {
			return null;
		}
		throw err;
	}

	const renderer = new LinearEquationRenderer();
	const renderOptions: PedagogicalRenderOptions = {
		schoolLevel: linearLevel,
		verbosity
	};
	return renderer.renderAll(steps, renderOptions);
}

interface QuadraticInequalityDispatch {
	readonly inequality: string;
	readonly instance: QuestionInstance;
	readonly schoolLevel: SchoolLevel;
	readonly verbosity: 'summarized' | 'detailed';
}

function renderQuadraticInequality({
	inequality,
	instance,
	schoolLevel,
	verbosity
}: QuadraticInequalityDispatch): readonly RenderedStep[] | null {
	const node = parseExpression(inequality, instance);
	if (node === null) return null;

	if (node.type !== 'relation') return null;
	const relationNode = node as RelationNode;

	// `QuadraticSchoolLevel` excludes 'primaire' AND 'college'. Bump those levels
	// to 'lycee' so a misplaced declaration still produces output.
	const quadraticLevel: QuadraticSchoolLevel =
		schoolLevel === 'primaire' || schoolLevel === 'college' ? 'lycee' : schoolLevel;

	let steps;
	try {
		steps = generateQuadraticInequalitySteps(relationNode, { level: quadraticLevel });
	} catch (err) {
		// V1 scope refusals (degree ≥ 3, parametric coefficients, equality,
		// quadratic-not-implemented) → silent fallback to Mode A.
		if (
			err instanceof UnsupportedInequalityDegree ||
			err instanceof InequalityNotSolvable ||
			err instanceof PedagogicalInequalityError ||
			err instanceof PedagogicalQuadraticNotImplemented
		) {
			return null;
		}
		throw err;
	}

	const renderer = new QuadraticEquationRenderer();
	const renderOptions: PedagogicalRenderOptions = {
		schoolLevel: quadraticLevel,
		verbosity
	};
	return renderer.renderAll(steps, renderOptions);
}

interface DifferentiateDispatch {
	readonly expression: string;
	readonly variable: string;
	readonly instance: QuestionInstance;
	readonly schoolLevel: SchoolLevel;
	readonly verbosity: 'summarized' | 'detailed';
}

function renderDifferentiate({
	expression,
	variable,
	instance,
	schoolLevel,
	verbosity
}: DifferentiateDispatch): readonly RenderedStep[] | null {
	const node = parseExpression(expression, instance);
	if (node === null) return null;

	// Differentiation expects an expression — refuse a relation silently.
	if (node.type === 'relation') return null;

	const result = generatePedagogicalDifferentiationSteps(node, {
		variable,
		schoolLevel,
		verbosity
	});

	const renderer = new PedagogicalDifferentiationRenderer();
	const renderOptions: PedagogicalRenderOptions = { schoolLevel, verbosity };
	return renderer.renderAll(result.steps, renderOptions);
}

// =============================================================================
// Internal — helpers
// =============================================================================

/**
 * Resolve `{{vars}}` in a template string against the instance's resolved
 * variables, then parse the result as a mathAST node. Returns `null` on parse
 * failure (caller falls back silently).
 */
function parseExpression(template: string, instance: QuestionInstance): MathNode | null {
	const resolved = resolveExpression(template, instance.resolvedVariables ?? []);
	const parseResult = parseCustomSafe(resolved.trim());
	return parseResult.ast ?? null;
}

/**
 * Resolve the effective school level for the rendering pipelines.
 *
 * - `'auto'` (default) ⇒ map the instance's `grades` via `gradeLevelToSchoolLevel`.
 * - explicit `SchoolLevel` ⇒ used as-is.
 */
function resolveSchoolLevel(
	option: GeneratedStepsOptions['schoolLevel'],
	grades: QuestionInstance['grades']
): SchoolLevel {
	if (!option || option === 'auto') {
		return gradeLevelToSchoolLevel(grades);
	}
	return option;
}
