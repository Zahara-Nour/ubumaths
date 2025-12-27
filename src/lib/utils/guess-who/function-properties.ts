/**
 * Function Graph Properties for Guess Who Math Game
 *
 * Provides types and utilities for checking properties of function graphs.
 * Uses grapheur for analysis and mathAST for parsing/evaluation.
 *
 * @module utils/guess-who/function-properties
 */

import { parseLatex, substitute, evaluate, type MathNode } from '$lib/mathAST';
import type { EvalResult } from '$lib/mathAST';
import { type Viewport } from '$lib/grapheur/types';
import {
	findRoots,
	findExtrema,
	findVerticalAsymptotes,
	findHorizontalAsymptotes
} from '$lib/grapheur/analysis';

// ============================================================================
// FUNCTION TYPES
// ============================================================================

/**
 * A function graph with its properties
 */
export interface FunctionGraph {
	/** Unique identifier */
	id: string;
	/** The LaTeX representation */
	latex: string;
	/** The parsed AST */
	ast: MathNode | undefined;
	/** Variable name (default: 'x') */
	variable: string;
	/** Analysis results (computed on demand) */
	analysis: FunctionAnalysisResult | null;
}

/**
 * Computed analysis result for a function
 */
export interface FunctionAnalysisResult {
	/** f(0) value if defined */
	valueAtZero: number | null;
	/** f'(0) derivative at zero if defined */
	derivativeAtZero: number | null;
	/** Whether the function passes through origin (f(0) = 0) */
	passesOrigin: boolean;
	/** Whether increasing at x=0 */
	increasingAtZero: boolean;
	/** Whether decreasing at x=0 */
	decreasingAtZero: boolean;
	/** Has at least one local maximum in [-10, 10] */
	hasMaximum: boolean;
	/** Has at least one local minimum in [-10, 10] */
	hasMinimum: boolean;
	/** Has at least one root in [-10, 10] */
	hasRoot: boolean;
	/** Number of roots in [-10, 10] */
	rootCount: number;
	/** Has a horizontal asymptote */
	hasHorizontalAsymptote: boolean;
	/** Has a vertical asymptote in [-10, 10] */
	hasVerticalAsymptote: boolean;
	/** Is even function: f(-x) = f(x) */
	isEven: boolean;
	/** Is odd function: f(-x) = -f(x) */
	isOdd: boolean;
	/** y-intercept (f(0)) */
	yIntercept: number | null;
	/** Is always positive in [-10, 10] */
	isAlwaysPositive: boolean;
	/** Is always negative in [-10, 10] */
	isAlwaysNegative: boolean;
}

/**
 * Question types for function graphs
 */
export type FunctionQuestionType =
	| 'passes_origin'
	| 'increasing_at_zero'
	| 'decreasing_at_zero'
	| 'has_maximum'
	| 'has_minimum'
	| 'has_root'
	| 'root_count'
	| 'root_count_greater_than'
	| 'has_horizontal_asymptote'
	| 'has_vertical_asymptote'
	| 'is_even'
	| 'is_odd'
	| 'y_intercept_positive'
	| 'y_intercept_negative'
	| 'y_intercept_zero'
	| 'is_always_positive'
	| 'is_always_negative';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard viewport for analysis */
const ANALYSIS_VIEWPORT: Viewport = {
	xMin: -10,
	xMax: 10,
	yMin: -10,
	yMax: 10
};

/** Tolerance for numerical comparisons */
const TOLERANCE = 1e-6;

/** Step for numerical derivative */
const DERIVATIVE_H = 1e-6;

// ============================================================================
// EVALUATOR
// ============================================================================

/**
 * Extract numeric value from EvalResult
 */
function extractNumber(result: EvalResult): number | null {
	const val = result.value;
	if (typeof val === 'number') {
		return isFinite(val) ? val : null;
	}
	// Handle Rational type from mathAST
	if (typeof val === 'object' && val !== null && 'numerator' in val && 'denominator' in val) {
		const num = Number(val.numerator) / Number(val.denominator);
		return isFinite(num) ? num : null;
	}
	return null;
}

/**
 * Create an evaluator function from AST
 */
function createEvaluator(ast: MathNode, variable: string = 'x'): (x: number) => number | null {
	return (x: number) => {
		try {
			// First substitute the variable with the value
			const substituted = substitute(ast, { [variable]: x });
			// Then evaluate the substituted expression
			const result = evaluate(substituted, { mode: 'decimal' });
			return extractNumber(result);
		} catch {
			return null;
		}
	};
}

/**
 * Compute numerical derivative at a point
 */
function numericalDerivative(evaluator: (x: number) => number | null, x: number): number | null {
	const yPlus = evaluator(x + DERIVATIVE_H);
	const yMinus = evaluator(x - DERIVATIVE_H);

	if (yPlus === null || yMinus === null) return null;

	return (yPlus - yMinus) / (2 * DERIVATIVE_H);
}

// ============================================================================
// ANALYSIS
// ============================================================================

/**
 * Check if function is increasing around x=0
 * Uses function values rather than derivative to handle cases like x^3 where f'(0)=0
 */
function checkIncreasingAtZero(evaluator: (x: number) => number | null): boolean {
	const delta = 0.1;
	const yLeft = evaluator(-delta);
	const yZero = evaluator(0);
	const yRight = evaluator(delta);

	if (yLeft === null || yZero === null || yRight === null) return false;

	// Function is increasing if f(-δ) < f(0) < f(δ) with some tolerance for equal values
	return yLeft < yZero - TOLERANCE && yZero < yRight - TOLERANCE;
}

/**
 * Check if function is decreasing around x=0
 */
function checkDecreasingAtZero(evaluator: (x: number) => number | null): boolean {
	const delta = 0.1;
	const yLeft = evaluator(-delta);
	const yZero = evaluator(0);
	const yRight = evaluator(delta);

	if (yLeft === null || yZero === null || yRight === null) return false;

	// Function is decreasing if f(-δ) > f(0) > f(δ)
	return yLeft > yZero + TOLERANCE && yZero > yRight + TOLERANCE;
}

/**
 * Check if function has a local minimum at x=0
 */
function checkMinAtZero(evaluator: (x: number) => number | null): boolean {
	const delta = 0.1;
	const yLeft = evaluator(-delta);
	const yZero = evaluator(0);
	const yRight = evaluator(delta);

	if (yLeft === null || yZero === null || yRight === null) return false;

	// Local minimum if both neighbors are higher
	return yLeft > yZero + TOLERANCE && yRight > yZero + TOLERANCE;
}

/**
 * Check if function has a local maximum at x=0
 */
function checkMaxAtZero(evaluator: (x: number) => number | null): boolean {
	const delta = 0.1;
	const yLeft = evaluator(-delta);
	const yZero = evaluator(0);
	const yRight = evaluator(delta);

	if (yLeft === null || yZero === null || yRight === null) return false;

	// Local maximum if both neighbors are lower
	return yLeft < yZero - TOLERANCE && yRight < yZero - TOLERANCE;
}

/**
 * Analyze a function to compute its properties
 */
function analyzeGraph(ast: MathNode, variable: string = 'x'): FunctionAnalysisResult {
	const evaluator = createEvaluator(ast, variable);

	// Basic evaluations
	const valueAtZero = evaluator(0);
	const derivativeAtZero = numericalDerivative(evaluator, 0);

	// Find roots and extrema using grapheur
	const roots = findRoots(evaluator, ANALYSIS_VIEWPORT, 'temp');
	const extrema = findExtrema(evaluator, ANALYSIS_VIEWPORT, 'temp');
	const verticalAsymptotes = findVerticalAsymptotes(evaluator, ANALYSIS_VIEWPORT, 'temp');
	const horizontalAsymptotes = findHorizontalAsymptotes(evaluator, 'temp');

	// Check increasing/decreasing at zero using function values
	const increasingAtZero = checkIncreasingAtZero(evaluator);
	const decreasingAtZero = checkDecreasingAtZero(evaluator);

	// Check for extrema - combine grapheur results with special x=0 check
	const hasMinimum = extrema.some((e) => e.type === 'min') || checkMinAtZero(evaluator);
	const hasMaximum = extrema.some((e) => e.type === 'max') || checkMaxAtZero(evaluator);

	// Check even/odd
	const isEven = checkEvenFunction(evaluator);
	const isOdd = checkOddFunction(evaluator);

	// Check sign
	const signCheck = checkSign(evaluator);

	return {
		valueAtZero,
		derivativeAtZero,
		passesOrigin: valueAtZero !== null && Math.abs(valueAtZero) < TOLERANCE,
		increasingAtZero,
		decreasingAtZero,
		hasMaximum,
		hasMinimum,
		hasRoot: roots.length > 0,
		rootCount: roots.length,
		hasHorizontalAsymptote: horizontalAsymptotes.length > 0,
		hasVerticalAsymptote: verticalAsymptotes.length > 0,
		isEven,
		isOdd,
		yIntercept: valueAtZero,
		isAlwaysPositive: signCheck === 'positive',
		isAlwaysNegative: signCheck === 'negative'
	};
}

/**
 * Check if function is even: f(-x) = f(x)
 */
function checkEvenFunction(evaluator: (x: number) => number | null): boolean {
	const testPoints = [0.5, 1, 2, 3, 5, 7];

	for (const x of testPoints) {
		const yPos = evaluator(x);
		const yNeg = evaluator(-x);

		if (yPos === null || yNeg === null) continue;
		if (Math.abs(yPos - yNeg) > TOLERANCE * Math.max(1, Math.abs(yPos))) {
			return false;
		}
	}

	return true;
}

/**
 * Check if function is odd: f(-x) = -f(x)
 */
function checkOddFunction(evaluator: (x: number) => number | null): boolean {
	const testPoints = [0.5, 1, 2, 3, 5, 7];

	for (const x of testPoints) {
		const yPos = evaluator(x);
		const yNeg = evaluator(-x);

		if (yPos === null || yNeg === null) continue;
		if (Math.abs(yPos + yNeg) > TOLERANCE * Math.max(1, Math.abs(yPos))) {
			return false;
		}
	}

	return true;
}

/**
 * Check if function is always positive or always negative
 */
function checkSign(evaluator: (x: number) => number | null): 'positive' | 'negative' | 'mixed' {
	const numSamples = 100;
	let allPositive = true;
	let allNegative = true;

	for (let i = 0; i <= numSamples; i++) {
		const x =
			ANALYSIS_VIEWPORT.xMin + (i / numSamples) * (ANALYSIS_VIEWPORT.xMax - ANALYSIS_VIEWPORT.xMin);
		const y = evaluator(x);

		if (y === null) continue;

		if (y <= 0) allPositive = false;
		if (y >= 0) allNegative = false;

		if (!allPositive && !allNegative) return 'mixed';
	}

	if (allPositive) return 'positive';
	if (allNegative) return 'negative';
	return 'mixed';
}

// ============================================================================
// FUNCTION CREATION
// ============================================================================

/**
 * Create a FunctionGraph from a LaTeX string
 */
export function createFunctionGraph(latex: string, id?: string): FunctionGraph {
	let ast: MathNode | undefined;
	let analysis: FunctionAnalysisResult | null = null;

	try {
		ast = parseLatex(latex);
		analysis = analyzeGraph(ast);
	} catch {
		ast = undefined;
	}

	return {
		id: id ?? crypto.randomUUID(),
		latex,
		ast,
		variable: 'x',
		analysis
	};
}

/**
 * Safe version that returns null on parse errors
 */
export function createFunctionGraphSafe(latex: string, id?: string): FunctionGraph | null {
	try {
		const graph = createFunctionGraph(latex, id);
		return graph.ast ? graph : null;
	} catch {
		return null;
	}
}

// ============================================================================
// PROPERTY CHECKS
// ============================================================================

/**
 * Check a function property by type
 */
export function checkFunctionProperty(
	graph: FunctionGraph,
	type: FunctionQuestionType,
	param?: number
): boolean {
	if (!graph.analysis) return false;

	const analysis = graph.analysis;

	switch (type) {
		case 'passes_origin':
			return analysis.passesOrigin;
		case 'increasing_at_zero':
			return analysis.increasingAtZero;
		case 'decreasing_at_zero':
			return analysis.decreasingAtZero;
		case 'has_maximum':
			return analysis.hasMaximum;
		case 'has_minimum':
			return analysis.hasMinimum;
		case 'has_root':
			return analysis.hasRoot;
		case 'root_count':
			if (param === undefined) throw new Error('root_count requires param');
			return analysis.rootCount === param;
		case 'root_count_greater_than':
			if (param === undefined) throw new Error('root_count_greater_than requires param');
			return analysis.rootCount > param;
		case 'has_horizontal_asymptote':
			return analysis.hasHorizontalAsymptote;
		case 'has_vertical_asymptote':
			return analysis.hasVerticalAsymptote;
		case 'is_even':
			return analysis.isEven;
		case 'is_odd':
			return analysis.isOdd;
		case 'y_intercept_positive':
			return analysis.yIntercept !== null && analysis.yIntercept > 0;
		case 'y_intercept_negative':
			return analysis.yIntercept !== null && analysis.yIntercept < 0;
		case 'y_intercept_zero':
			return analysis.passesOrigin;
		case 'is_always_positive':
			return analysis.isAlwaysPositive;
		case 'is_always_negative':
			return analysis.isAlwaysNegative;
	}
}

// ============================================================================
// FUNCTION GENERATION
// ============================================================================

/**
 * Predefined function templates for generating varied functions
 */
export const FUNCTION_TEMPLATES = {
	// Linear functions
	linear: ['x', '2x', '-x', 'x + 1', 'x - 1', '2x + 1', '-x + 2', '3x - 2'],
	// Quadratic functions
	quadratic: ['x^2', '-x^2', 'x^2 + 1', 'x^2 - 1', 'x^2 - 4', '(x-1)^2', '(x+1)^2', '-x^2 + 4'],
	// Polynomial functions
	polynomial: ['x^3', '-x^3', 'x^3 - x', 'x^3 + x', 'x^4 - x^2'],
	// Trigonometric functions
	trigonometric: ['\\sin(x)', '\\cos(x)', '-\\sin(x)', '-\\cos(x)', '\\sin(x) + 1', '\\cos(x) - 1'],
	// Rational functions
	rational: ['\\frac{1}{x}', '\\frac{1}{x^2}', '\\frac{x}{x + 1}', '\\frac{1}{x + 1}'],
	// Exponential functions
	exponential: ['e^x', 'e^{-x}', '2^x', 'e^x - 1'],
	// Absolute value
	absolute: ['|x|', '-|x|', '|x| - 1', '|x - 1|']
} as const;

/**
 * Generate functions from a category
 */
export function generateFunctions(
	category: keyof typeof FUNCTION_TEMPLATES,
	count: number
): FunctionGraph[] {
	const templates = FUNCTION_TEMPLATES[category];
	const functions: FunctionGraph[] = [];
	const usedLatex = new Set<string>();

	const shuffled = [...templates].sort(() => Math.random() - 0.5);

	for (const latex of shuffled) {
		if (functions.length >= count) break;
		if (usedLatex.has(latex)) continue;

		const graph = createFunctionGraphSafe(latex);
		if (graph) {
			usedLatex.add(latex);
			functions.push(graph);
		}
	}

	if (functions.length < count) {
		throw new Error(
			`Could not generate ${count} functions from ${category} (got ${functions.length})`
		);
	}

	return functions;
}

/**
 * Generate a mixed grid of functions
 */
export function generateFunctionGrid(count: number): FunctionGraph[] {
	const categories: (keyof typeof FUNCTION_TEMPLATES)[] = [
		'linear',
		'quadratic',
		'polynomial',
		'trigonometric'
	];

	const allFunctions: FunctionGraph[] = [];
	const usedLatex = new Set<string>();

	// Collect all templates
	for (const category of categories) {
		for (const latex of FUNCTION_TEMPLATES[category]) {
			const graph = createFunctionGraphSafe(latex);
			if (graph && !usedLatex.has(latex)) {
				usedLatex.add(latex);
				allFunctions.push(graph);
			}
		}
	}

	// Shuffle and pick
	const shuffled = allFunctions.sort(() => Math.random() - 0.5);

	if (shuffled.length < count) {
		throw new Error(`Not enough functions (need ${count}, have ${shuffled.length})`);
	}

	return shuffled.slice(0, count);
}

// ============================================================================
// DISPLAY
// ============================================================================

/**
 * Convert function to ubumark for display (shows the LaTeX expression)
 */
export function functionToUbumark(graph: FunctionGraph): string {
	return `$y = ${graph.latex}$`;
}

/**
 * Get LaTeX string for display
 */
export function functionToLatex(graph: FunctionGraph): string {
	return graph.latex;
}

/**
 * Check if two functions are the same
 */
export function functionsEqual(f1: FunctionGraph, f2: FunctionGraph): boolean {
	return f1.latex === f2.latex;
}
