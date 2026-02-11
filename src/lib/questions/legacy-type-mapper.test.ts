/**
 * Tests for Legacy Type Mapper and updated QuestionType system
 *
 * Validates:
 * 1. QuestionType only has 3 values
 * 2. mapLegacyType correctly maps old types to new types
 * 3. isLegacyType correctly identifies legacy types
 * 4. SharedVariationDefaults has answerFormat field
 * 5. QuestionVariation has answerFormat field
 * 6. blanks support type: 'math' | 'text' and pool
 * 7. QuestionInstance has answerFormat field
 */

import { describe, it, expect } from 'vitest';
import { mapLegacyType, isLegacyType } from './legacy-type-mapper';
import type {
	QuestionType,
	QuestionVariation,
	SharedVariationDefaults,
	QuestionInstance,
	QuestionTemplate
} from './types';

// ============================================================================
// QuestionType — only 3 values
// ============================================================================

describe('QuestionType', () => {
	it('should accept fill_in_blanks', () => {
		const t: QuestionType = 'fill_in_blanks';
		expect(t).toBe('fill_in_blanks');
	});

	it('should accept multiple_choice', () => {
		const t: QuestionType = 'multiple_choice';
		expect(t).toBe('multiple_choice');
	});

	it('should accept open_answer', () => {
		const t: QuestionType = 'open_answer';
		expect(t).toBe('open_answer');
	});
});

// ============================================================================
// mapLegacyType
// ============================================================================

describe('mapLegacyType', () => {
	it('should map numerical_exact to fill_in_blanks', () => {
		expect(mapLegacyType('numerical_exact')).toBe('fill_in_blanks');
	});

	it('should map numerical_decimal to fill_in_blanks', () => {
		expect(mapLegacyType('numerical_decimal')).toBe('fill_in_blanks');
	});

	it('should map numerical_rounded to fill_in_blanks', () => {
		expect(mapLegacyType('numerical_rounded')).toBe('fill_in_blanks');
	});

	it('should map numerical_with_unit to fill_in_blanks', () => {
		expect(mapLegacyType('numerical_with_unit')).toBe('fill_in_blanks');
	});

	it('should map algebraic_transform to fill_in_blanks', () => {
		expect(mapLegacyType('algebraic_transform')).toBe('fill_in_blanks');
	});

	it('should pass through fill_in_blanks', () => {
		expect(mapLegacyType('fill_in_blanks')).toBe('fill_in_blanks');
	});

	it('should pass through multiple_choice', () => {
		expect(mapLegacyType('multiple_choice')).toBe('multiple_choice');
	});

	it('should pass through open_answer', () => {
		expect(mapLegacyType('open_answer')).toBe('open_answer');
	});

	it('should throw on unknown type', () => {
		expect(() => mapLegacyType('unknown_type')).toThrow('Unknown question type: "unknown_type"');
	});

	it('should throw on empty string', () => {
		expect(() => mapLegacyType('')).toThrow('Unknown question type: ""');
	});
});

// ============================================================================
// isLegacyType
// ============================================================================

describe('isLegacyType', () => {
	it('should identify numerical_exact as legacy', () => {
		expect(isLegacyType('numerical_exact')).toBe(true);
	});

	it('should identify numerical_decimal as legacy', () => {
		expect(isLegacyType('numerical_decimal')).toBe(true);
	});

	it('should identify numerical_rounded as legacy', () => {
		expect(isLegacyType('numerical_rounded')).toBe(true);
	});

	it('should identify numerical_with_unit as legacy', () => {
		expect(isLegacyType('numerical_with_unit')).toBe(true);
	});

	it('should identify algebraic_transform as legacy', () => {
		expect(isLegacyType('algebraic_transform')).toBe(true);
	});

	it('should NOT identify fill_in_blanks as legacy', () => {
		expect(isLegacyType('fill_in_blanks')).toBe(false);
	});

	it('should NOT identify multiple_choice as legacy', () => {
		expect(isLegacyType('multiple_choice')).toBe(false);
	});

	it('should NOT identify open_answer as legacy', () => {
		expect(isLegacyType('open_answer')).toBe(false);
	});
});

// ============================================================================
// answerFormat on SharedVariationDefaults
// ============================================================================

describe('SharedVariationDefaults.answerFormat', () => {
	it('should accept answerFormat as optional string', () => {
		const shared: SharedVariationDefaults = {
			answerFormat: '10^?'
		};
		expect(shared.answerFormat).toBe('10^?');
	});

	it('should allow SharedVariationDefaults without answerFormat', () => {
		const shared: SharedVariationDefaults = {};
		expect(shared.answerFormat).toBeUndefined();
	});
});

// ============================================================================
// answerFormat on QuestionVariation
// ============================================================================

describe('QuestionVariation.answerFormat', () => {
	it('should accept answerFormat as optional override', () => {
		const variation: QuestionVariation = {
			statement: 'Calculate $2 + 3$' as QuestionVariation['statement'],
			solution: '5',
			answerFormat: '?*10^?'
		};
		expect(variation.answerFormat).toBe('?*10^?');
	});
});

// ============================================================================
// blanks structure with type and pool
// ============================================================================

describe('blanks structure', () => {
	it('should support math type blanks', () => {
		const variation: QuestionVariation = {
			statement: '$? + ? = 10$' as QuestionVariation['statement'],
			solution: ['3', '7'],
			blanks: [
				{ position: 0, expectedAnswer: '3', type: 'math' },
				{ position: 1, expectedAnswer: '7', type: 'math' }
			]
		};
		expect(variation.blanks![0].type).toBe('math');
	});

	it('should support text type blanks', () => {
		const variation: QuestionVariation = {
			statement: 'A triangle is a [_] shape' as QuestionVariation['statement'],
			solution: 'geometric',
			blanks: [{ position: 0, expectedAnswer: 'geometric', type: 'text' }]
		};
		expect(variation.blanks![0].type).toBe('text');
	});

	it('should support pool for text blanks', () => {
		const variation: QuestionVariation = {
			statement: 'f(x) = 2x + 1 is a [_] function' as QuestionVariation['statement'],
			solution: 'affine',
			blanks: [
				{
					position: 0,
					expectedAnswer: 'affine',
					type: 'text',
					pool: ['affine', 'lineaire', 'constante']
				}
			]
		};
		expect(variation.blanks![0].pool).toEqual(['affine', 'lineaire', 'constante']);
	});

	it('should use 0-based positional numbering', () => {
		const variation: QuestionVariation = {
			statement: '$? + ?$ is a [_] number' as QuestionVariation['statement'],
			solution: ['3', '7', 'entier'],
			blanks: [
				{ position: 0, expectedAnswer: '3', type: 'math' },
				{ position: 1, expectedAnswer: '7', type: 'math' },
				{ position: 2, expectedAnswer: 'entier', type: 'text' }
			]
		};
		expect(variation.blanks!.map((b) => b.position)).toEqual([0, 1, 2]);
		expect(variation.blanks!.map((b) => b.type)).toEqual(['math', 'math', 'text']);
	});
});

// ============================================================================
// QuestionInstance.answerFormat
// ============================================================================

describe('QuestionInstance.answerFormat', () => {
	it('should have answerFormat on instance (resolved)', () => {
		const instance: Partial<QuestionInstance> = {
			type: 'fill_in_blanks',
			answerFormat: '10^?'
		};
		expect(instance.answerFormat).toBe('10^?');
	});
});

// ============================================================================
// AlgebraicTransformType and transformType removed
// ============================================================================

describe('removed types', () => {
	it('should not have transformType on QuestionTemplate', () => {
		// TypeScript check: transformType should no longer exist
		// At runtime, we verify that a freshly created template object doesn't have it
		const template = {
			type: 'fill_in_blanks' as QuestionType,
			title: 'Test',
			variations: [],
			grades: ['6' as const],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			status: 'draft' as const
		} satisfies Omit<QuestionTemplate, 'id'>;

		expect('transformType' in template).toBe(false);
	});

	it('should not have transformType on QuestionInstance', () => {
		const instance: Partial<QuestionInstance> = {
			type: 'fill_in_blanks',
			answerFormat: '?'
		};
		expect('transformType' in instance).toBe(false);
	});
});
