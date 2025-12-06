/**
 * Tests for Construction Expression Evaluator
 */

import { describe, it, expect } from 'vitest';
import {
	extractReferences,
	getAllReferenceNames,
	preprocessExpression,
	evaluateExpr,
	evaluateExprSafe,
	tryEvaluateExpr,
	validateExprReferences,
	createContext,
	createEmptyContext,
	type EvaluationContext
} from '../evaluator';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestContext(): EvaluationContext {
	return {
		parameters: {
			sideLength: 200,
			offset: 50,
			scale: 1.5,
			count: 3
		},
		objectPositions: new Map([
			['A', { x: 100, y: 200 }],
			['B', { x: 300, y: 200 }],
			['C', { x: 200, y: 50 }]
		])
	};
}

// =============================================================================
// extractReferences Tests
// =============================================================================

describe('extractReferences', () => {
	it('should extract simple parameter references', () => {
		const result = extractReferences('$sideLength');
		expect(result.parameters).toEqual(['sideLength']);
		expect(result.objectCoords).toEqual([]);
	});

	it('should extract multiple parameter references', () => {
		const result = extractReferences('$sideLength + $offset * 2');
		expect(result.parameters).toEqual(['sideLength', 'offset']);
		expect(result.objectCoords).toEqual([]);
	});

	it('should extract object coordinate references', () => {
		const result = extractReferences('$A.x + $A.y');
		expect(result.parameters).toEqual([]);
		expect(result.objectCoords).toEqual([
			{ id: 'A', coord: 'x' },
			{ id: 'A', coord: 'y' }
		]);
	});

	it('should extract mixed references', () => {
		const result = extractReferences('$A.x + $offset');
		expect(result.parameters).toEqual(['offset']);
		expect(result.objectCoords).toEqual([{ id: 'A', coord: 'x' }]);
	});

	it('should not duplicate parameter references', () => {
		const result = extractReferences('$sideLength + $sideLength * 2');
		expect(result.parameters).toEqual(['sideLength']);
	});

	it('should handle expressions with math functions', () => {
		const result = extractReferences('$sideLength * sqrt(3) / 2');
		expect(result.parameters).toEqual(['sideLength']);
	});

	it('should return empty arrays for expressions without references', () => {
		const result = extractReferences('100 + 50 * 2');
		expect(result.parameters).toEqual([]);
		expect(result.objectCoords).toEqual([]);
	});
});

// =============================================================================
// getAllReferenceNames Tests
// =============================================================================

describe('getAllReferenceNames', () => {
	it('should return all unique reference names', () => {
		const names = getAllReferenceNames('$sideLength + $A.x + $B.y');
		expect(names).toContain('sideLength');
		expect(names).toContain('A');
		expect(names).toContain('B');
		expect(names).toHaveLength(3);
	});

	it('should not duplicate names when object and parameter have same name', () => {
		const names = getAllReferenceNames('$A + $A.x');
		// $A is a parameter ref, $A.x is an object coord ref
		// Both reference 'A', so only one entry
		expect(names).toEqual(['A']);
	});
});

// =============================================================================
// preprocessExpression Tests
// =============================================================================

describe('preprocessExpression', () => {
	const context = createTestContext();

	it('should replace parameter references with values', () => {
		const result = preprocessExpression('$sideLength', context);
		expect(result).toBe('200');
	});

	it('should replace object coordinate references', () => {
		const result = preprocessExpression('$A.x', context);
		expect(result).toBe('100');
	});

	it('should handle complex expressions', () => {
		const result = preprocessExpression('$sideLength + $A.x', context);
		expect(result).toBe('200 + 100');
	});

	it('should convert sqrt() to LaTeX format', () => {
		const result = preprocessExpression('sqrt(3)', context);
		expect(result).toBe('\\sqrt{3}');
	});

	it('should convert trig functions to LaTeX format', () => {
		const result = preprocessExpression('sin(x) + cos(y)', context);
		expect(result).toBe('\\sin(x) + \\cos(y)');
	});

	it('should convert pi to LaTeX format', () => {
		const result = preprocessExpression('2 * pi', context);
		expect(result).toBe('2 * \\pi');
	});

	it('should handle negative values in parentheses', () => {
		const contextWithNegative: EvaluationContext = {
			parameters: { offset: -50 },
			objectPositions: new Map([['A', { x: -100, y: 200 }]])
		};
		const result = preprocessExpression('$offset + $A.x', contextWithNegative);
		expect(result).toBe('(-50) + (-100)');
	});

	it('should throw for unknown parameter references', () => {
		expect(() => preprocessExpression('$unknownParam', context)).toThrow(
			'Unknown parameter reference: unknownParam'
		);
	});

	it('should throw for unknown object references', () => {
		expect(() => preprocessExpression('$Unknown.x', context)).toThrow(
			'Unknown object reference: Unknown'
		);
	});
});

// =============================================================================
// evaluateExpr Tests
// =============================================================================

describe('evaluateExpr', () => {
	const context = createTestContext();

	it('should return literal numbers directly', () => {
		expect(evaluateExpr(100, context)).toBe(100);
		expect(evaluateExpr(0, context)).toBe(0);
		expect(evaluateExpr(-50, context)).toBe(-50);
		expect(evaluateExpr(3.14, context)).toBe(3.14);
	});

	it('should evaluate simple parameter references', () => {
		expect(evaluateExpr('$sideLength', context)).toBe(200);
		expect(evaluateExpr('$offset', context)).toBe(50);
	});

	it('should evaluate object coordinate references', () => {
		expect(evaluateExpr('$A.x', context)).toBe(100);
		expect(evaluateExpr('$A.y', context)).toBe(200);
		expect(evaluateExpr('$B.x', context)).toBe(300);
	});

	it('should evaluate arithmetic expressions', () => {
		expect(evaluateExpr('$sideLength + $offset', context)).toBe(250);
		expect(evaluateExpr('$sideLength - $offset', context)).toBe(150);
		expect(evaluateExpr('$sideLength * 2', context)).toBe(400);
		expect(evaluateExpr('$sideLength / 2', context)).toBe(100);
	});

	it('should evaluate expressions with sqrt', () => {
		const result = evaluateExpr('$sideLength * sqrt(3) / 2', context);
		expect(result).toBeCloseTo((200 * Math.sqrt(3)) / 2, 10);
	});

	it('should evaluate expressions with pi', () => {
		const result = evaluateExpr('2 * pi', context);
		expect(result).toBeCloseTo(2 * Math.PI, 10);
	});

	it('should evaluate nested expressions', () => {
		const result = evaluateExpr('($A.x + $B.x) / 2', context);
		expect(result).toBe(200); // Midpoint x of A and B
	});

	it('should throw for non-finite literal numbers', () => {
		expect(() => evaluateExpr(Infinity, context)).toThrow('finite');
		expect(() => evaluateExpr(-Infinity, context)).toThrow('finite');
		expect(() => evaluateExpr(NaN, context)).toThrow('finite');
	});

	it('should throw for undefined parameters', () => {
		expect(() => evaluateExpr('$undefinedParam', context)).toThrow(
			'Unknown parameter reference: undefinedParam'
		);
	});
});

// =============================================================================
// evaluateExprSafe Tests
// =============================================================================

describe('evaluateExprSafe', () => {
	const context = createTestContext();

	it('should return computed value on success', () => {
		expect(evaluateExprSafe('$sideLength', context)).toBe(200);
	});

	it('should return default value on error', () => {
		expect(evaluateExprSafe('$unknownParam', context, 0)).toBe(0);
		expect(evaluateExprSafe('$unknownParam', context, 100)).toBe(100);
	});

	it('should return 0 as default when not specified', () => {
		expect(evaluateExprSafe('$unknownParam', context)).toBe(0);
	});
});

// =============================================================================
// tryEvaluateExpr Tests
// =============================================================================

describe('tryEvaluateExpr', () => {
	const context = createTestContext();

	it('should return success result with value', () => {
		const result = tryEvaluateExpr('$sideLength * 2', context);
		expect(result.success).toBe(true);
		expect(result.value).toBe(400);
		expect(result.error).toBeNull();
	});

	it('should return failure result with error', () => {
		const result = tryEvaluateExpr('$unknownParam', context);
		expect(result.success).toBe(false);
		expect(result.value).toBeNaN();
		expect(result.error).toContain('unknownParam');
	});
});

// =============================================================================
// validateExprReferences Tests
// =============================================================================

describe('validateExprReferences', () => {
	const context = createTestContext();

	it('should validate literal numbers as valid', () => {
		const result = validateExprReferences(100, context);
		expect(result.valid).toBe(true);
		expect(result.missing).toEqual([]);
	});

	it('should validate expressions with defined references', () => {
		const result = validateExprReferences('$sideLength + $A.x', context);
		expect(result.valid).toBe(true);
		expect(result.missing).toEqual([]);
	});

	it('should identify missing parameter references', () => {
		const result = validateExprReferences('$unknownParam + $sideLength', context);
		expect(result.valid).toBe(false);
		expect(result.missing).toContain('parameter: unknownParam');
	});

	it('should identify missing object references', () => {
		const result = validateExprReferences('$Unknown.x', context);
		expect(result.valid).toBe(false);
		expect(result.missing).toContain('object: Unknown.x');
	});

	it('should identify all missing references', () => {
		const result = validateExprReferences('$unknownParam + $Unknown.x', context);
		expect(result.valid).toBe(false);
		expect(result.missing).toHaveLength(2);
	});
});

// =============================================================================
// Context Creation Tests
// =============================================================================

describe('createEmptyContext', () => {
	it('should create an empty context', () => {
		const context = createEmptyContext();
		expect(context.parameters).toEqual({});
		expect(context.objectPositions.size).toBe(0);
	});
});

describe('createContext', () => {
	it('should create a context with given values', () => {
		const params = { a: 1, b: 2 };
		const objects = new Map([['P', { x: 10, y: 20 }]]);
		const context = createContext(params, objects);

		expect(context.parameters).toEqual(params);
		expect(context.objectPositions).toBe(objects);
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('evaluator integration', () => {
	it('should evaluate equilateral triangle height formula', () => {
		const context = createContext({ sideLength: 200 }, new Map());
		const height = evaluateExpr('$sideLength * sqrt(3) / 2', context);
		expect(height).toBeCloseTo((200 * Math.sqrt(3)) / 2, 10);
	});

	it('should evaluate midpoint calculation', () => {
		const context = createContext(
			{},
			new Map([
				['A', { x: 100, y: 100 }],
				['B', { x: 300, y: 200 }]
			])
		);

		const midX = evaluateExpr('($A.x + $B.x) / 2', context);
		const midY = evaluateExpr('($A.y + $B.y) / 2', context);

		expect(midX).toBe(200);
		expect(midY).toBe(150);
	});

	it('should evaluate distance formula', () => {
		const context = createContext(
			{},
			new Map([
				['A', { x: 0, y: 0 }],
				['B', { x: 3, y: 4 }]
			])
		);

		// Distance = sqrt((x2-x1)^2 + (y2-y1)^2)
		// For (0,0) to (3,4) = sqrt(9 + 16) = sqrt(25) = 5
		const distance = evaluateExpr('sqrt(($B.x - $A.x)^2 + ($B.y - $A.y)^2)', context);
		expect(distance).toBeCloseTo(5, 10);
	});

	it('should evaluate rotation formulas', () => {
		const context = createContext({ angle: 90 }, new Map([['P', { x: 1, y: 0 }]]));

		// Rotate point (1, 0) by 90 degrees around origin
		// New x = x*cos(angle) - y*sin(angle) = 1*0 - 0*1 = 0
		// New y = x*sin(angle) + y*cos(angle) = 1*1 + 0*0 = 1
		const newX = evaluateExpr(
			'$P.x * cos($angle * pi / 180) - $P.y * sin($angle * pi / 180)',
			context
		);
		const newY = evaluateExpr(
			'$P.x * sin($angle * pi / 180) + $P.y * cos($angle * pi / 180)',
			context
		);

		expect(newX).toBeCloseTo(0, 10);
		expect(newY).toBeCloseTo(1, 10);
	});
});
