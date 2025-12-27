/**
 * Polymorphic Grid Item Types for Guess Who Math Game
 *
 * Supports different types of items on the game grid:
 * - Numbers (existing packs)
 * - Fractions
 * - 2D Shapes
 * - Algebraic Expressions
 * - Function Graphs
 * - 3D Polyhedra
 *
 * @module utils/guess-who/grid-item
 */

import type { Fraction } from './fraction-properties';
import { fractionToUbumark, fractionsEqual } from './fraction-properties';
import type { Shape2D } from './shape2d-properties';
import type { Expression } from './expression-properties';
import { expressionToUbumark, expressionsEqual } from './expression-properties';
import type { FunctionGraph } from './function-properties';
import { functionToUbumark, functionsEqual } from './function-properties';
import type { Polyhedron } from './polyhedron-properties';
import { polyhedronToUbumark, polyhedraEqual } from './polyhedron-properties';

// ============================================================================
// GRID ITEM TYPES
// ============================================================================

/**
 * A number item on the grid
 */
export interface NumberGridItem {
	type: 'number';
	value: number;
}

/**
 * A fraction item on the grid
 */
export interface FractionGridItem {
	type: 'fraction';
	numerator: number;
	denominator: number;
}

/**
 * A 2D shape item on the grid
 */
export interface Shape2DGridItem {
	type: 'shape2d';
	/** Shape name from SHAPES_2D */
	shapeName: string;
	/** Number of sides */
	sideCount: number;
	/** Is a regular polygon */
	isRegular: boolean;
	/** Is convex */
	isConvex: boolean;
	/** Has at least one right angle */
	hasRightAngle: boolean;
	/** French name for display */
	nameFr: string;
	/** SVG path data for rendering */
	svgPath: string;
}

/**
 * An algebraic expression item on the grid
 */
export interface ExpressionGridItem {
	type: 'expression';
	/** LaTeX representation */
	latex: string;
}

/**
 * A function graph item on the grid
 */
export interface FunctionGridItem {
	type: 'function';
	/** LaTeX representation of the function */
	latex: string;
}

/**
 * A 3D polyhedron item on the grid
 */
export interface PolyhedronGridItem {
	type: 'polyhedron';
	/** Polyhedron name from POLYHEDRA */
	name: string;
	/** French name for display */
	nameFr: string;
	/** Number of faces */
	faceCount: number;
	/** Number of vertices */
	vertexCount: number;
	/** Number of edges */
	edgeCount: number;
	/** Is a regular polyhedron (Platonic solid) */
	isRegular: boolean;
}

/**
 * Union of all possible grid item types
 */
export type GridItem =
	| NumberGridItem
	| FractionGridItem
	| Shape2DGridItem
	| ExpressionGridItem
	| FunctionGridItem
	| PolyhedronGridItem;

/**
 * Type of grid item
 */
export type GridItemType = GridItem['type'];

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if item is a number
 */
export function isNumberItem(item: GridItem): item is NumberGridItem {
	return item.type === 'number';
}

/**
 * Check if item is a fraction
 */
export function isFractionItem(item: GridItem): item is FractionGridItem {
	return item.type === 'fraction';
}

/**
 * Check if item is a 2D shape
 */
export function isShape2DItem(item: GridItem): item is Shape2DGridItem {
	return item.type === 'shape2d';
}

/**
 * Check if item is an expression
 */
export function isExpressionItem(item: GridItem): item is ExpressionGridItem {
	return item.type === 'expression';
}

/**
 * Check if item is a function
 */
export function isFunctionItem(item: GridItem): item is FunctionGridItem {
	return item.type === 'function';
}

/**
 * Check if item is a polyhedron
 */
export function isPolyhedronItem(item: GridItem): item is PolyhedronGridItem {
	return item.type === 'polyhedron';
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a number grid item
 */
export function numberItem(value: number): NumberGridItem {
	return { type: 'number', value };
}

/**
 * Create a fraction grid item
 */
export function fractionItem(numerator: number, denominator: number): FractionGridItem {
	return { type: 'fraction', numerator, denominator };
}

/**
 * Create a fraction grid item from a Fraction object
 */
export function fractionItemFrom(f: Fraction): FractionGridItem {
	return { type: 'fraction', numerator: f.numerator, denominator: f.denominator };
}

/**
 * Create a 2D shape grid item from a Shape2D object
 */
export function shape2DItemFrom(shape: Shape2D): Shape2DGridItem {
	return {
		type: 'shape2d',
		shapeName: shape.name,
		sideCount: shape.sideCount,
		isRegular: shape.isRegular,
		isConvex: shape.isConvex,
		hasRightAngle: shape.hasRightAngle,
		nameFr: shape.nameFr,
		svgPath: shape.svgPath
	};
}

/**
 * Create an expression grid item from an Expression object
 */
export function expressionItemFrom(expr: Expression): ExpressionGridItem {
	return {
		type: 'expression',
		latex: expr.latex
	};
}

/**
 * Create a function grid item from a FunctionGraph object
 */
export function functionItemFrom(fn: FunctionGraph): FunctionGridItem {
	return {
		type: 'function',
		latex: fn.latex
	};
}

/**
 * Create a polyhedron grid item from a Polyhedron object
 */
export function polyhedronItemFrom(p: Polyhedron): PolyhedronGridItem {
	return {
		type: 'polyhedron',
		name: p.name,
		nameFr: p.nameFr,
		faceCount: p.faceCount,
		vertexCount: p.vertexCount,
		edgeCount: p.edgeCount,
		isRegular: p.isRegular
	};
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

/**
 * Get the ubumark display string for a grid item
 * This is what gets rendered in the UI
 */
export function gridItemToUbumark(item: GridItem): string {
	switch (item.type) {
		case 'number':
			return String(item.value);
		case 'fraction':
			return fractionToUbumark({ numerator: item.numerator, denominator: item.denominator });
		case 'shape2d':
			return item.nameFr;
		case 'expression':
			return expressionToUbumark({ latex: item.latex } as Expression);
		case 'function':
			return functionToUbumark({ latex: item.latex } as FunctionGraph);
		case 'polyhedron':
			return polyhedronToUbumark({ nameFr: item.nameFr } as Polyhedron);
	}
}

/**
 * Get a simple string identifier for a grid item
 * Used for logging, debugging, keys, etc.
 */
export function gridItemToKey(item: GridItem): string {
	switch (item.type) {
		case 'number':
			return `n:${item.value}`;
		case 'fraction':
			return `f:${item.numerator}/${item.denominator}`;
		case 'shape2d':
			return `s:${item.shapeName}`;
		case 'expression':
			return `e:${item.latex}`;
		case 'function':
			return `fn:${item.latex}`;
		case 'polyhedron':
			return `p:${item.name}`;
	}
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

/**
 * Check if two grid items are equal (same type and same value)
 */
export function gridItemsEqual(a: GridItem, b: GridItem): boolean {
	if (a.type !== b.type) return false;

	switch (a.type) {
		case 'number':
			return a.value === (b as NumberGridItem).value;
		case 'fraction':
			return fractionsEqual(
				{ numerator: a.numerator, denominator: a.denominator },
				{
					numerator: (b as FractionGridItem).numerator,
					denominator: (b as FractionGridItem).denominator
				}
			);
		case 'shape2d':
			return a.shapeName === (b as Shape2DGridItem).shapeName;
		case 'expression':
			return expressionsEqual(
				{ latex: a.latex } as Expression,
				{ latex: (b as ExpressionGridItem).latex } as Expression
			);
		case 'function':
			return functionsEqual(
				{ latex: a.latex } as FunctionGraph,
				{ latex: (b as FunctionGridItem).latex } as FunctionGraph
			);
		case 'polyhedron':
			return polyhedraEqual(
				{ name: a.name } as Polyhedron,
				{ name: (b as PolyhedronGridItem).name } as Polyhedron
			);
	}
}

// ============================================================================
// SERIALIZATION (for DB storage)
// ============================================================================

/**
 * Serialize a grid item to JSON-compatible format for DB storage
 */
export function serializeGridItem(item: GridItem): object {
	return { ...item };
}

/**
 * Deserialize a grid item from DB storage
 */
export function deserializeGridItem(data: unknown): GridItem {
	if (typeof data === 'number') {
		// Backward compatibility: plain numbers
		return numberItem(data);
	}

	if (typeof data === 'object' && data !== null && 'type' in data) {
		const obj = data as { type: string };
		switch (obj.type) {
			case 'number':
				return data as NumberGridItem;
			case 'fraction':
				return data as FractionGridItem;
			case 'shape2d':
				return data as Shape2DGridItem;
			case 'expression':
				return data as ExpressionGridItem;
			case 'function':
				return data as FunctionGridItem;
			case 'polyhedron':
				return data as PolyhedronGridItem;
			default:
				throw new Error(`Unknown grid item type: ${obj.type}`);
		}
	}

	throw new Error(`Invalid grid item data: ${JSON.stringify(data)}`);
}

/**
 * Serialize an array of grid items for DB storage
 */
export function serializeGrid(items: GridItem[]): object[] {
	return items.map(serializeGridItem);
}

/**
 * Deserialize a grid from DB storage
 * Handles backward compatibility with number[] format
 */
export function deserializeGrid(data: unknown[]): GridItem[] {
	return data.map(deserializeGridItem);
}

// ============================================================================
// CONVERSION HELPERS (for backward compatibility)
// ============================================================================

/**
 * Convert number array to GridItem array (for existing number packs)
 */
export function numbersToGridItems(numbers: number[]): GridItem[] {
	return numbers.map(numberItem);
}

/**
 * Convert fraction array to GridItem array
 */
export function fractionsToGridItems(fractions: Fraction[]): GridItem[] {
	return fractions.map(fractionItemFrom);
}

/**
 * Convert 2D shape array to GridItem array
 */
export function shapes2DToGridItems(shapes: Shape2D[]): GridItem[] {
	return shapes.map(shape2DItemFrom);
}

/**
 * Convert expression array to GridItem array
 */
export function expressionsToGridItems(expressions: Expression[]): GridItem[] {
	return expressions.map(expressionItemFrom);
}

/**
 * Convert function array to GridItem array
 */
export function functionsToGridItems(functions: FunctionGraph[]): GridItem[] {
	return functions.map(functionItemFrom);
}

/**
 * Convert polyhedron array to GridItem array
 */
export function polyhedraToGridItems(polyhedra: Polyhedron[]): GridItem[] {
	return polyhedra.map(polyhedronItemFrom);
}

/**
 * Extract number values from grid items (for backward compat with number-only code)
 * Throws if any non-number items are present
 */
export function gridItemsToNumbers(items: GridItem[]): number[] {
	return items.map((item) => {
		if (!isNumberItem(item)) {
			throw new Error(`Expected number item, got ${item.type}`);
		}
		return item.value;
	});
}
