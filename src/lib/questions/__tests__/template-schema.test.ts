import { describe, it, expect } from 'vitest';
import {
	correctionSchema,
	precisionSchema,
	validationRuleSchema,
	questionTemplateSchema,
	displayOptionsSchema,
	variableSchema,
	blankSchema,
	choiceSchema,
	optionsSchema
} from '../template-schema';

// ============================================================================
// correctionSchema — FIX: now accepts feedback + optional steps
// ============================================================================

describe('correctionSchema', () => {
	it('accepts empty object', () => {
		expect(correctionSchema.safeParse({}).success).toBe(true);
	});

	it('accepts steps only', () => {
		const result = correctionSchema.safeParse({ steps: ['step1', 'step2'] });
		expect(result.success).toBe(true);
	});

	it('accepts feedback only', () => {
		const result = correctionSchema.safeParse({
			feedback: { correct: 'Bravo!', incorrect: 'Essaie encore' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts feedback + steps', () => {
		const result = correctionSchema.safeParse({
			feedback: { correct: 'OK', partial: 'Presque' },
			steps: ['Étape 1']
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid steps type', () => {
		expect(correctionSchema.safeParse({ steps: 'not-array' }).success).toBe(false);
	});
});

// ============================================================================
// precisionSchema — 5 variants
// ============================================================================

describe('precisionSchema', () => {
	it('accepts none', () => {
		expect(precisionSchema.safeParse({ type: 'none' }).success).toBe(true);
	});

	it('accepts decimal', () => {
		expect(precisionSchema.safeParse({ type: 'decimal', digits: 2 }).success).toBe(true);
	});

	it('accepts significant', () => {
		expect(precisionSchema.safeParse({ type: 'significant', digits: 3 }).success).toBe(true);
	});

	it('accepts magnitude', () => {
		expect(precisionSchema.safeParse({ type: 'magnitude', digits: 1 }).success).toBe(true);
	});

	it('accepts tolerance', () => {
		const result = precisionSchema.safeParse({
			type: 'tolerance',
			tolerance: 0.01,
			mode: 'relative'
		});
		expect(result.success).toBe(true);
	});

	it('rejects unknown type', () => {
		expect(precisionSchema.safeParse({ type: 'unknown' }).success).toBe(false);
	});
});

// ============================================================================
// validationRuleSchema — 7 variants
// ============================================================================

describe('validationRuleSchema', () => {
	it('accepts divisor', () => {
		expect(validationRuleSchema.safeParse({ type: 'divisor', dividend: 'x' }).success).toBe(true);
	});

	it('accepts multiple', () => {
		expect(validationRuleSchema.safeParse({ type: 'multiple', base: '3' }).success).toBe(true);
	});

	it('accepts range', () => {
		const result = validationRuleSchema.safeParse({ type: 'range', min: '0', max: '10' });
		expect(result.success).toBe(true);
	});

	it('accepts equation_root', () => {
		const result = validationRuleSchema.safeParse({
			type: 'equation_root',
			equation: 'x^2-1=0'
		});
		expect(result.success).toBe(true);
	});

	it('accepts equivalent', () => {
		const result = validationRuleSchema.safeParse({ type: 'equivalent', expression: '2x+1' });
		expect(result.success).toBe(true);
	});

	it('accepts predicate', () => {
		const result = validationRuleSchema.safeParse({ type: 'predicate', predicate: 'isPrime' });
		expect(result.success).toBe(true);
	});

	it('accepts custom', () => {
		const result = validationRuleSchema.safeParse({ type: 'custom', expression: 'x > 0' });
		expect(result.success).toBe(true);
	});

	it('rejects unknown type', () => {
		expect(validationRuleSchema.safeParse({ type: 'foo' }).success).toBe(false);
	});
});

// ============================================================================
// questionTemplateSchema (strict) — rejects unknown keys
// ============================================================================

describe('questionTemplateSchema (strict)', () => {
	const validTemplate = {
		title: 'Test',
		variations: [{ statement: 'What is 1+1?' }],
		grades: ['6e'],
		theme: 'Calcul',
		domain: 'Addition',
		level: 1,
		status: 'published' as const
	};

	it('accepts a valid template', () => {
		expect(questionTemplateSchema.safeParse(validTemplate).success).toBe(true);
	});

	it('rejects unknown keys at root', () => {
		const result = questionTemplateSchema.safeParse({ ...validTemplate, unknownKey: true });
		expect(result.success).toBe(false);
	});

	it('rejects unknown keys in variation', () => {
		const result = questionTemplateSchema.safeParse({
			...validTemplate,
			variations: [{ statement: 'test', badField: true }]
		});
		expect(result.success).toBe(false);
	});

	it('rejects unknown keys in correction', () => {
		const result = questionTemplateSchema.safeParse({
			...validTemplate,
			variations: [
				{
					statement: 'test',
					correction: { steps: ['a'], unknownField: 'bad' }
				}
			]
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// Building blocks (non-strict) — strip unknown keys
// ============================================================================

describe('building blocks (non-strict)', () => {
	it('correctionSchema strips unknown keys', () => {
		const result = correctionSchema.parse({ steps: ['a'], extra: 'ignored' });
		expect(result).toEqual({ steps: ['a'] });
		expect('extra' in result).toBe(false);
	});

	it('displayOptionsSchema strips unknown keys', () => {
		const result = displayOptionsSchema.parse({ removeSpaces: true, extra: 'ignored' });
		expect(result).toEqual({ removeSpaces: true });
	});

	it('choiceSchema strips unknown keys', () => {
		const result = choiceSchema.parse({ content: 'A', extra: 'x' });
		expect(result).toEqual({ content: 'A' });
	});

	it('variableSchema strips unknown keys', () => {
		const result = variableSchema.parse({ name: 'x', expression: '2', extra: true });
		expect(result).toEqual({ name: 'x', expression: '2' });
	});

	it('blankSchema strips unknown keys', () => {
		const result = blankSchema.parse({ expectedAnswer: '42', extra: true });
		expect(result).toEqual({ expectedAnswer: '42' });
	});

	it('optionsSchema strips unknown keys', () => {
		const result = optionsSchema.parse({ shuffleChoices: true, extra: true });
		expect(result).toEqual({ shuffleChoices: true });
	});
});
