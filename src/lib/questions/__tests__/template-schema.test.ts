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
	optionsSchema,
	generatedStepsSchema,
	generatedStepsOptionsSchema
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

	it('accepts generatedSteps with kind arithmetic', () => {
		const result = correctionSchema.safeParse({
			generatedSteps: { kind: 'arithmetic', expression: '{{a}}+{{b}}' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts generatedSteps with kind linear-equation', () => {
		const result = correctionSchema.safeParse({
			generatedSteps: { kind: 'linear-equation', equation: '2x + 3 = 7' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts steps + generatedSteps coexistence', () => {
		const result = correctionSchema.safeParse({
			steps: ['Etape manuelle'],
			generatedSteps: { kind: 'arithmetic', expression: '2+3' }
		});
		expect(result.success).toBe(true);
	});

	it('rejects generatedSteps with unknown kind', () => {
		const result = correctionSchema.safeParse({
			generatedSteps: { kind: 'unknown', expression: 'foo' }
		});
		expect(result.success).toBe(false);
	});

	it('rejects generatedSteps arithmetic missing expression', () => {
		const result = correctionSchema.safeParse({
			generatedSteps: { kind: 'arithmetic' }
		});
		expect(result.success).toBe(false);
	});

	it('rejects generatedSteps arithmetic with empty expression', () => {
		const result = correctionSchema.safeParse({
			generatedSteps: { kind: 'arithmetic', expression: '' }
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// generatedStepsSchema — Mode B declarative correction
// ============================================================================

describe('generatedStepsSchema', () => {
	it('accepts arithmetic with expression only', () => {
		expect(generatedStepsSchema.safeParse({ kind: 'arithmetic', expression: '2+3' }).success).toBe(
			true
		);
	});

	it('accepts arithmetic with full options', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'arithmetic',
			expression: '{{a}}*{{b}}',
			options: { schoolLevel: 'auto', verbosity: 'detailed' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts linear-equation with explicit schoolLevel', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'linear-equation',
			equation: '3x + 5 = 14',
			options: { schoolLevel: 'college', verbosity: 'summarized' }
		});
		expect(result.success).toBe(true);
	});

	it('rejects unknown verbosity', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'arithmetic',
			expression: '2+3',
			options: { verbosity: 'verbose' }
		});
		expect(result.success).toBe(false);
	});

	it('rejects unknown schoolLevel', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'arithmetic',
			expression: '2+3',
			options: { schoolLevel: 'maternelle' }
		});
		expect(result.success).toBe(false);
	});

	it('accepts arithmetic-from-blank with expressionName', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'arithmetic-from-blank',
			expressionName: 'expression1'
		});
		expect(result.success).toBe(true);
	});

	it('accepts arithmetic-from-blank with options', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'arithmetic-from-blank',
			expressionName: 'expression1',
			options: { schoolLevel: 'lycee', verbosity: 'summarized' }
		});
		expect(result.success).toBe(true);
	});

	it('rejects arithmetic-from-blank without expressionName', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'arithmetic-from-blank'
		});
		expect(result.success).toBe(false);
	});

	it('rejects arithmetic-from-blank with empty expressionName', () => {
		const result = generatedStepsSchema.safeParse({
			kind: 'arithmetic-from-blank',
			expressionName: ''
		});
		expect(result.success).toBe(false);
	});
});

describe('generatedStepsOptionsSchema', () => {
	it('accepts empty object', () => {
		expect(generatedStepsOptionsSchema.safeParse({}).success).toBe(true);
	});

	it('accepts schoolLevel auto', () => {
		expect(generatedStepsOptionsSchema.safeParse({ schoolLevel: 'auto' }).success).toBe(true);
	});

	it('accepts all four explicit school levels', () => {
		for (const lvl of ['primaire', 'college', 'lycee', 'superieur'] as const) {
			expect(generatedStepsOptionsSchema.safeParse({ schoolLevel: lvl }).success).toBe(true);
		}
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
// variableSchema — promoted constraints (regex + min(1))
// ============================================================================

describe('variableSchema', () => {
	it('rejects invalid identifier name', () => {
		expect(variableSchema.safeParse({ name: '1bad', expression: 'x' }).success).toBe(false);
	});

	it('rejects name with spaces', () => {
		expect(variableSchema.safeParse({ name: 'a b', expression: 'x' }).success).toBe(false);
	});

	it('accepts valid identifier with underscore', () => {
		expect(variableSchema.safeParse({ name: '_foo_2', expression: 'x' }).success).toBe(true);
	});

	it('rejects empty expression', () => {
		expect(variableSchema.safeParse({ name: 'x', expression: '' }).success).toBe(false);
	});
});

// ============================================================================
// blankSchema — required fields
// ============================================================================

describe('blankSchema', () => {
	it('rejects blank without expectedAnswer', () => {
		expect(blankSchema.safeParse({}).success).toBe(false);
	});

	it('accepts blank with only expectedAnswer', () => {
		expect(blankSchema.safeParse({ expectedAnswer: '42' }).success).toBe(true);
	});
});

// ============================================================================
// precisionSchema — missing required fields
// ============================================================================

describe('precisionSchema rejection', () => {
	it('rejects decimal without digits', () => {
		expect(precisionSchema.safeParse({ type: 'decimal' }).success).toBe(false);
	});

	it('rejects significant without digits', () => {
		expect(precisionSchema.safeParse({ type: 'significant' }).success).toBe(false);
	});

	it('rejects tolerance without tolerance/mode', () => {
		expect(precisionSchema.safeParse({ type: 'tolerance' }).success).toBe(false);
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

// ============================================================================
// questionTemplateSchema refine — statement requirement
// ============================================================================

describe('questionTemplateSchema refine', () => {
	const base = {
		title: 'Test',
		grades: ['6e'],
		theme: 'Calcul',
		domain: 'Addition',
		level: 1,
		status: 'published' as const
	};

	it('rejects template with no statement anywhere', () => {
		const result = questionTemplateSchema.safeParse({
			...base,
			variations: [{ blanks: [{ expectedAnswer: '2' }] }]
		});
		expect(result.success).toBe(false);
	});

	it('accepts template with shared statement and no variation statement', () => {
		const result = questionTemplateSchema.safeParse({
			...base,
			shared: { statement: 'Calculer' },
			variations: [{}]
		});
		expect(result.success).toBe(true);
	});
});
