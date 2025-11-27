/**
 * Correction Types System - Unit Tests
 * =====================================
 *
 * Comprehensive tests for:
 * 1. QuestionCorrection interface type checking
 * 2. ValidationRule discriminated union types
 * 3. Placeholder parsing and extraction utilities
 * 4. PLACEHOLDER_PATTERNS regex matching
 * 5. Context validation
 */

import { describe, it, expect } from 'vitest';
import {
	parsePlaceholder,
	extractPlaceholders,
	hasPlaceholders,
	getPlaceholderTypes,
	validatePlaceholderContext,
	PLACEHOLDER_PATTERNS,
	type PlaceholderContext
} from '../correction-placeholders';
import type {
	QuestionCorrection,
	ValidationRule,
	DivisorRule,
	MultipleRule,
	RangeRule,
	EquationRootRule,
	EquivalenceRule,
	PredicateRule,
	CustomExpressionRule
} from '../types';
import { templateMarkdown } from '$lib/shared/markdown';

// ============================================================================
// TYPE INTERFACE TESTS
// ============================================================================

describe('QuestionCorrection interface', () => {
	it('accepts minimal correction with just feedback.correct', () => {
		const correction: QuestionCorrection = {
			feedback: { correct: templateMarkdown('Bravo!') }
		};
		expect(correction.feedback?.correct).toBe('Bravo!');
	});

	it('accepts correction with feedback.incorrect only', () => {
		const correction: QuestionCorrection = {
			feedback: { incorrect: templateMarkdown('Incorrect, la réponse était {{solution}}') }
		};
		expect(correction.feedback?.incorrect).toContain('{{solution}}');
	});

	it('accepts correction with feedback.partial only', () => {
		const correction: QuestionCorrection = {
			feedback: { partial: templateMarkdown('Presque! La bonne réponse est {{solution}}') }
		};
		expect(correction.feedback?.partial).toContain('{{solution}}');
	});

	it('accepts correction with steps only', () => {
		const correction: QuestionCorrection = {
			steps: [
				templateMarkdown('Étape 1: On pose {{expression}}'),
				templateMarkdown('Étape 2: On calcule {{solution}}')
			]
		};
		expect(correction.steps).toHaveLength(2);
		expect(correction.steps?.[0]).toContain('{{expression}}');
	});

	it('accepts full correction with feedback and steps', () => {
		const correction: QuestionCorrection = {
			feedback: {
				correct: templateMarkdown('Excellent!'),
				incorrect: templateMarkdown('La réponse était {{solution}}')
			},
			steps: [
				templateMarkdown('On pose...'),
				templateMarkdown('On calcule...'),
				templateMarkdown('Donc {{solution}}')
			]
		};
		expect(correction.feedback?.correct).toBe('Excellent!');
		expect(correction.steps).toHaveLength(3);
	});

	it('accepts correction with all feedback variants', () => {
		const correction: QuestionCorrection = {
			feedback: {
				correct: templateMarkdown('Parfait!'),
				incorrect: templateMarkdown("Non, c'est {{solution}}"),
				partial: templateMarkdown('Presque, essayez encore')
			}
		};
		expect(correction.feedback?.correct).toBeDefined();
		expect(correction.feedback?.incorrect).toBeDefined();
		expect(correction.feedback?.partial).toBeDefined();
	});

	it('accepts empty correction object', () => {
		const correction: QuestionCorrection = {};
		expect(correction.feedback).toBeUndefined();
		expect(correction.steps).toBeUndefined();
	});
});

// ============================================================================
// VALIDATION RULE DISCRIMINATED UNION TESTS
// ============================================================================

describe('ValidationRule discriminated union', () => {
	it('creates DivisorRule correctly', () => {
		const rule: DivisorRule = {
			type: 'divisor',
			dividend: '{{n}}'
		};
		expect(rule.type).toBe('divisor');
		expect(rule.dividend).toBe('{{n}}');
	});

	it('creates DivisorRule with numeric dividend', () => {
		const rule: DivisorRule = {
			type: 'divisor',
			dividend: '60'
		};
		expect(rule.dividend).toBe('60');
	});

	it('creates MultipleRule correctly', () => {
		const rule: MultipleRule = {
			type: 'multiple',
			base: '{{a}}'
		};
		expect(rule.type).toBe('multiple');
		expect(rule.base).toBe('{{a}}');
	});

	it('creates RangeRule with inclusive bounds', () => {
		const rule: RangeRule = {
			type: 'range',
			min: '1',
			max: '{{max}}',
			inclusive: true
		};
		expect(rule.type).toBe('range');
		expect(rule.inclusive).toBe(true);
	});

	it('creates RangeRule with default inclusive', () => {
		const rule: RangeRule = {
			type: 'range',
			min: '0',
			max: '100'
		};
		expect(rule.type).toBe('range');
		expect(rule.inclusive).toBeUndefined();
	});

	it('creates EquationRootRule correctly', () => {
		const rule: EquationRootRule = {
			type: 'equation_root',
			equation: 'x^2 - {{sum}}*x + {{product}} = 0'
		};
		expect(rule.type).toBe('equation_root');
		expect(rule.equation).toContain('{{sum}}');
	});

	it('creates EquationRootRule with custom variable', () => {
		const rule: EquationRootRule = {
			type: 'equation_root',
			equation: 't^2 - 5*t + 6 = 0',
			variable: 't'
		};
		expect(rule.variable).toBe('t');
	});

	it('creates EquivalenceRule correctly', () => {
		const rule: EquivalenceRule = {
			type: 'equivalent',
			expression: '{{a}}/{{b}}'
		};
		expect(rule.type).toBe('equivalent');
		expect(rule.expression).toBe('{{a}}/{{b}}');
	});

	it('creates PredicateRule with isPrime', () => {
		const rule: PredicateRule = {
			type: 'predicate',
			predicate: 'isPrime'
		};
		expect(rule.type).toBe('predicate');
		expect(rule.predicate).toBe('isPrime');
	});

	it('creates PredicateRule with all predicate types', () => {
		const predicates = [
			'isPrime',
			'isComposite',
			'isEven',
			'isOdd',
			'isPositive',
			'isNegative',
			'isInteger'
		] as const;

		predicates.forEach((pred) => {
			const rule: PredicateRule = {
				type: 'predicate',
				predicate: pred
			};
			expect(rule.predicate).toBe(pred);
		});
	});

	it('creates CustomExpressionRule for legacy patterns', () => {
		const rule: CustomExpressionRule = {
			type: 'custom',
			expression: 'gcd(answer, {{n}}) > 1',
			description: 'Answer shares a factor with n'
		};
		expect(rule.type).toBe('custom');
		expect(rule.expression).toContain('gcd');
		expect(rule.description).toBeDefined();
	});

	it('creates CustomExpressionRule without description', () => {
		const rule: CustomExpressionRule = {
			type: 'custom',
			expression: 'complex_validation(answer)'
		};
		expect(rule.description).toBeUndefined();
	});

	it('supports ValidationRule union type assignment', () => {
		const rules: ValidationRule[] = [
			{ type: 'divisor', dividend: '12' },
			{ type: 'multiple', base: '{{a}}' },
			{ type: 'range', min: '0', max: '100' },
			{ type: 'equation_root', equation: 'x^2 = 4' },
			{ type: 'equivalent', expression: '1/2' },
			{ type: 'predicate', predicate: 'isPrime' },
			{ type: 'custom', expression: 'custom_check(answer)' }
		];

		expect(rules).toHaveLength(7);
		expect(rules[0].type).toBe('divisor');
		expect(rules[6].type).toBe('custom');
	});
});

// ============================================================================
// PLACEHOLDER PARSING TESTS
// ============================================================================

describe('parsePlaceholder', () => {
	describe('solution placeholders', () => {
		it('parses {{solution}} correctly', () => {
			const result = parsePlaceholder('{{solution}}');
			expect(result).toEqual({
				type: 'solution',
				raw: '{{solution}}'
			});
		});

		it('parses {{solution:1}} with index', () => {
			const result = parsePlaceholder('{{solution:1}}');
			expect(result).toEqual({
				type: 'solution',
				raw: '{{solution:1}}',
				index: 1
			});
		});

		it('parses {{solution:0}} with zero index', () => {
			const result = parsePlaceholder('{{solution:0}}');
			expect(result).toEqual({
				type: 'solution',
				raw: '{{solution:0}}',
				index: 0
			});
		});

		it('parses {{solution:html}} with format', () => {
			const result = parsePlaceholder('{{solution:html}}');
			expect(result).toEqual({
				type: 'solution',
				raw: '{{solution:html}}',
				format: 'html'
			});
		});
	});

	describe('answer placeholders', () => {
		it('parses {{answer}} correctly', () => {
			const result = parsePlaceholder('{{answer}}');
			expect(result).toEqual({
				type: 'answer',
				raw: '{{answer}}'
			});
		});

		it('parses {{answer:1}} with index', () => {
			const result = parsePlaceholder('{{answer:1}}');
			expect(result).toEqual({
				type: 'answer',
				raw: '{{answer:1}}',
				index: 1
			});
		});

		it('parses {{answer:0}} with zero index', () => {
			const result = parsePlaceholder('{{answer:0}}');
			expect(result).toEqual({
				type: 'answer',
				raw: '{{answer:0}}',
				index: 0
			});
		});
	});

	describe('expression placeholders', () => {
		it('parses {{expression}} correctly', () => {
			const result = parsePlaceholder('{{expression}}');
			expect(result).toEqual({
				type: 'expression',
				raw: '{{expression}}'
			});
		});

		it('parses {{expression:raw}} with format', () => {
			const result = parsePlaceholder('{{expression:raw}}');
			expect(result).toEqual({
				type: 'expression',
				raw: '{{expression:raw}}',
				format: 'raw'
			});
		});
	});

	describe('variable placeholders', () => {
		it('parses {{1}} indexed variable', () => {
			const result = parsePlaceholder('{{1}}');
			expect(result).toEqual({
				type: 'variable',
				raw: '{{1}}',
				index: 1
			});
		});

		it('parses {{0}} indexed variable', () => {
			const result = parsePlaceholder('{{0}}');
			expect(result).toEqual({
				type: 'variable',
				raw: '{{0}}',
				index: 0
			});
		});

		it('parses {{a}} named variable', () => {
			const result = parsePlaceholder('{{a}}');
			expect(result).toEqual({
				type: 'variable',
				raw: '{{a}}',
				name: 'a'
			});
		});

		it('parses {{coefficient}} named variable', () => {
			const result = parsePlaceholder('{{coefficient}}');
			expect(result).toEqual({
				type: 'variable',
				raw: '{{coefficient}}',
				name: 'coefficient'
			});
		});

		it('parses {{varName_123}} with underscore and numbers', () => {
			const result = parsePlaceholder('{{varName_123}}');
			expect(result).toEqual({
				type: 'variable',
				raw: '{{varName_123}}',
				name: 'varName_123'
			});
		});

		it('parses {{_privateVar}} starting with underscore', () => {
			const result = parsePlaceholder('{{_privateVar}}');
			expect(result).toEqual({
				type: 'variable',
				raw: '{{_privateVar}}',
				name: '_privateVar'
			});
		});
	});

	describe('color placeholders', () => {
		it('parses {{color:primary}} correctly', () => {
			const result = parsePlaceholder('{{color:primary}}');
			expect(result).toEqual({
				type: 'color',
				raw: '{{color:primary}}',
				name: 'primary'
			});
		});

		it('parses {{color:error}} correctly', () => {
			const result = parsePlaceholder('{{color:error}}');
			expect(result).toEqual({
				type: 'color',
				raw: '{{color:error}}',
				name: 'error'
			});
		});

		it('parses {{color:custom_color1}} with underscore', () => {
			const result = parsePlaceholder('{{color:custom_color1}}');
			expect(result).toEqual({
				type: 'color',
				raw: '{{color:custom_color1}}',
				name: 'custom_color1'
			});
		});
	});

	describe('conditional placeholders', () => {
		it('parses {{if:cond|text}} without else', () => {
			const result = parsePlaceholder('{{if:isCorrect|Bravo!}}');
			expect(result).toEqual({
				type: 'conditional',
				raw: '{{if:isCorrect|Bravo!}}',
				condition: 'isCorrect',
				thenText: 'Bravo!',
				elseText: undefined
			});
		});

		it('parses {{if:cond|text|else}} with else', () => {
			const result = parsePlaceholder('{{if:hasError|Erreur|Correct}}');
			expect(result).toEqual({
				type: 'conditional',
				raw: '{{if:hasError|Erreur|Correct}}',
				condition: 'hasError',
				thenText: 'Erreur',
				elseText: 'Correct'
			});
		});

		it('parses conditional with spaces', () => {
			const result = parsePlaceholder('{{if:isCorrect | Bravo! | Réessayez }}');
			expect(result).toEqual({
				type: 'conditional',
				raw: '{{if:isCorrect | Bravo! | Réessayez }}',
				condition: 'isCorrect',
				thenText: 'Bravo!',
				elseText: 'Réessayez'
			});
		});

		it('parses conditional with complex condition', () => {
			const result = parsePlaceholder('{{if:score>5|Excellent|Passable}}');
			expect(result).toEqual({
				type: 'conditional',
				raw: '{{if:score>5|Excellent|Passable}}',
				condition: 'score>5',
				thenText: 'Excellent',
				elseText: 'Passable'
			});
		});
	});

	describe('unknown placeholders', () => {
		it('returns unknown for invalid placeholder format', () => {
			const result = parsePlaceholder('{{invalid format}}');
			expect(result.type).toBe('unknown');
			expect(result.raw).toBe('{{invalid format}}');
		});

		it('returns unknown for placeholder with mixed number/letter', () => {
			const result = parsePlaceholder('{{1abc}}');
			expect(result.type).toBe('unknown');
			expect(result.raw).toBe('{{1abc}}');
		});

		it('returns unknown for empty placeholder', () => {
			const result = parsePlaceholder('{{}}');
			expect(result.type).toBe('unknown');
		});

		it('returns unknown for placeholder with special characters', () => {
			const result = parsePlaceholder('{{var-name}}');
			expect(result.type).toBe('unknown');
		});
	});
});

// ============================================================================
// EXTRACT PLACEHOLDERS TESTS
// ============================================================================

describe('extractPlaceholders', () => {
	it('extracts all placeholders from template', () => {
		const template = 'La solution est {{solution}}, mais vous avez écrit {{answer}}.';
		const result = extractPlaceholders(template);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			type: 'solution',
			raw: '{{solution}}'
		});
		expect(result[1]).toEqual({
			type: 'answer',
			raw: '{{answer}}'
		});
	});

	it('returns empty array for no placeholders', () => {
		const template = 'Plain text without any placeholders';
		const result = extractPlaceholders(template);

		expect(result).toEqual([]);
	});

	it('handles multiple same-type placeholders', () => {
		const template = '{{solution}} ou {{solution:1}}';
		const result = extractPlaceholders(template);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			type: 'solution',
			raw: '{{solution}}'
		});
		expect(result[1]).toEqual({
			type: 'solution',
			raw: '{{solution:1}}',
			index: 1
		});
	});

	it('extracts all placeholder types in order', () => {
		const template =
			'{{solution}} vs {{answer}} avec {{expression}} et {{a}} couleur {{color:primary}} {{if:x|oui}}';
		const result = extractPlaceholders(template);

		expect(result).toHaveLength(6);
		expect(result[0].type).toBe('solution');
		expect(result[1].type).toBe('answer');
		expect(result[2].type).toBe('expression');
		expect(result[3].type).toBe('variable');
		expect(result[4].type).toBe('color');
		expect(result[5].type).toBe('conditional');
	});

	it('extracts placeholders from multiline template', () => {
		const template = `Étape 1: {{expression}}
Étape 2: On calcule {{solution}}
Votre réponse: {{answer}}`;
		const result = extractPlaceholders(template);

		expect(result).toHaveLength(3);
		expect(result.map((p) => p.type)).toEqual(['expression', 'solution', 'answer']);
	});

	it('handles adjacent placeholders', () => {
		const template = '{{solution}}{{answer}}{{expression}}';
		const result = extractPlaceholders(template);

		expect(result).toHaveLength(3);
	});

	it('handles placeholders at start and end', () => {
		const template = '{{solution}} est la réponse {{answer}}';
		const result = extractPlaceholders(template);

		expect(result).toHaveLength(2);
	});

	it('extracts duplicate placeholders', () => {
		const template = '{{solution}} et encore {{solution}}';
		const result = extractPlaceholders(template);

		expect(result).toHaveLength(2);
		expect(result[0].raw).toBe(result[1].raw);
	});
});

// ============================================================================
// HAS PLACEHOLDERS TESTS
// ============================================================================

describe('hasPlaceholders', () => {
	it('returns true when placeholders exist', () => {
		expect(hasPlaceholders('La solution est {{solution}}')).toBe(true);
	});

	it('returns false for plain text', () => {
		expect(hasPlaceholders('Plain text without placeholders')).toBe(false);
	});

	it('returns true for single placeholder', () => {
		expect(hasPlaceholders('{{answer}}')).toBe(true);
	});

	it('returns true for multiple placeholders', () => {
		expect(hasPlaceholders('{{a}} + {{b}} = {{solution}}')).toBe(true);
	});

	it('returns false for empty string', () => {
		expect(hasPlaceholders('')).toBe(false);
	});

	it('returns true for malformed placeholder-like text', () => {
		// Any {{...}} pattern is detected, even if invalid format
		expect(hasPlaceholders('{{not a valid placeholder}}')).toBe(true);
	});
});

// ============================================================================
// GET PLACEHOLDER TYPES TESTS
// ============================================================================

describe('getPlaceholderTypes', () => {
	it('returns unique types from template', () => {
		const template = '{{solution}} vs {{answer}} and {{expression}}';
		const types = getPlaceholderTypes(template);

		expect(types).toHaveLength(3);
		expect(types).toContain('solution');
		expect(types).toContain('answer');
		expect(types).toContain('expression');
	});

	it('deduplicates same-type placeholders', () => {
		const template = '{{solution}} et {{solution:1}}';
		const types = getPlaceholderTypes(template);

		expect(types).toEqual(['solution']);
	});

	it('returns empty array for no placeholders', () => {
		const template = 'No placeholders here';
		const types = getPlaceholderTypes(template);

		expect(types).toEqual([]);
	});

	it('returns all distinct types', () => {
		const template = '{{a}} {{solution}} {{color:primary}} {{if:x|y}} {{answer}}';
		const types = getPlaceholderTypes(template);

		expect(types).toHaveLength(5);
		expect(new Set(types)).toEqual(
			new Set(['variable', 'solution', 'color', 'conditional', 'answer'])
		);
	});

	it('handles multiple variables as single type', () => {
		const template = '{{a}} {{b}} {{c}}';
		const types = getPlaceholderTypes(template);

		expect(types).toEqual(['variable']);
	});
});

// ============================================================================
// VALIDATE PLACEHOLDER CONTEXT TESTS
// ============================================================================

describe('validatePlaceholderContext', () => {
	it('validates complete context', () => {
		const template = '{{solution}} vs {{answer}} avec {{a}}';
		const context: PlaceholderContext = {
			solutions: ['x = 2'],
			answers: ['x = 3'],
			variables: { a: 5 }
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(true);
		expect(result.missing).toEqual([]);
		expect(result.outOfBounds).toEqual([]);
	});

	it('detects missing solutions', () => {
		const template = '{{solution}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: [],
			variables: {}
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.outOfBounds).toHaveLength(1);
		expect(result.outOfBounds[0].placeholder).toBe('{{solution}}');
		expect(result.outOfBounds[0].requested).toBe(0);
		expect(result.outOfBounds[0].available).toBe(0);
	});

	it('detects out-of-bounds solution index', () => {
		const template = '{{solution}} et {{solution:1}}';
		const context: PlaceholderContext = {
			solutions: ['x = 2'], // Only 1 solution
			answers: [],
			variables: {}
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.outOfBounds).toHaveLength(1);
		expect(result.outOfBounds[0].placeholder).toBe('{{solution:1}}');
		expect(result.outOfBounds[0].requested).toBe(1);
		expect(result.outOfBounds[0].available).toBe(1);
	});

	it('detects out-of-bounds answer index', () => {
		const template = '{{answer:2}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: ['a', 'b'], // Only 2 answers (indices 0, 1)
			variables: {}
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.outOfBounds).toHaveLength(1);
		expect(result.outOfBounds[0].requested).toBe(2);
		expect(result.outOfBounds[0].available).toBe(2);
	});

	it('detects missing expression', () => {
		const template = '{{expression}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: [],
			variables: {}
			// expression missing
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.missing).toContain('expression');
	});

	it('detects missing named variable', () => {
		const template = '{{a}} + {{b}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: [],
			variables: { a: 5 } // b is missing
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.missing).toContain('variables.b');
	});

	it('detects missing indexed variable', () => {
		const template = '{{0}} + {{1}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: [],
			variables: { '0': 5 } // '1' is missing
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.missing).toContain('variables.1');
	});

	it('detects missing color', () => {
		const template = '{{color:primary}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: [],
			variables: {}
			// colors missing
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.missing).toContain('colors.primary');
	});

	it('handles conditional placeholders gracefully', () => {
		const template = '{{if:isCorrect|Bravo!}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: [],
			variables: {}
			// conditions missing - should not fail validation
		};

		const result = validatePlaceholderContext(template, context);

		// Conditionals are optional, so this should be valid
		expect(result.valid).toBe(true);
	});

	it('validates context with all fields present', () => {
		const template = '{{solution}} {{answer}} {{expression}} {{a}} {{color:primary}} {{if:x|y}}';
		const context: PlaceholderContext = {
			solutions: ['x = 2'],
			answers: ['x = 3'],
			expression: 'x^2 - 4',
			variables: { a: 5 },
			colors: { primary: '#3b82f6' },
			conditions: { x: true }
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(true);
		expect(result.missing).toEqual([]);
		expect(result.outOfBounds).toEqual([]);
	});

	it('deduplicates missing fields', () => {
		const template = '{{a}} {{a}} {{a}}';
		const context: PlaceholderContext = {
			solutions: [],
			answers: [],
			variables: {}
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.missing).toEqual(['variables.a']);
	});

	it('handles multiple validation errors', () => {
		const template = '{{solution:5}} {{answer:10}} {{a}} {{color:error}}';
		const context: PlaceholderContext = {
			solutions: ['x = 1'], // Only 1 solution
			answers: ['x = 2'], // Only 1 answer
			variables: {}
			// Missing: a, colors
		};

		const result = validatePlaceholderContext(template, context);

		expect(result.valid).toBe(false);
		expect(result.outOfBounds).toHaveLength(2); // solution:5, answer:10
		expect(result.missing).toContain('variables.a');
		expect(result.missing).toContain('colors.error');
	});
});

// ============================================================================
// PLACEHOLDER_PATTERNS REGEX TESTS
// ============================================================================

describe('PLACEHOLDER_PATTERNS', () => {
	describe('solution pattern', () => {
		it('matches {{solution}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.solution);
			expect('{{solution}}'.match(pattern)?.[0]).toBe('{{solution}}');
		});

		it('matches {{solution:1}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.solution);
			expect('{{solution:1}}'.match(pattern)?.[0]).toBe('{{solution:1}}');
		});

		it('matches {{solution:html}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.solution);
			expect('{{solution:html}}'.match(pattern)?.[0]).toBe('{{solution:html}}');
		});

		it('does not match {{solution:invalid}}', () => {
			const text = '{{solution:invalid}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.solution);
			expect(matches).toBeNull();
		});

		it('matches multiple occurrences', () => {
			const text = '{{solution}} et {{solution:1}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.solution);
			expect(matches).toHaveLength(2);
		});
	});

	describe('answer pattern', () => {
		it('matches {{answer}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.answer);
			expect('{{answer}}'.match(pattern)?.[0]).toBe('{{answer}}');
		});

		it('matches {{answer:0}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.answer);
			expect('{{answer:0}}'.match(pattern)?.[0]).toBe('{{answer:0}}');
		});

		it('matches {{answer:99}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.answer);
			expect('{{answer:99}}'.match(pattern)?.[0]).toBe('{{answer:99}}');
		});

		it('does not match {{answer:html}}', () => {
			const text = '{{answer:html}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.answer);
			expect(matches).toBeNull();
		});
	});

	describe('expression pattern', () => {
		it('matches {{expression}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.expression);
			expect('{{expression}}'.match(pattern)?.[0]).toBe('{{expression}}');
		});

		it('matches {{expression:raw}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.expression);
			expect('{{expression:raw}}'.match(pattern)?.[0]).toBe('{{expression:raw}}');
		});

		it('does not match {{expression:html}}', () => {
			const text = '{{expression:html}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.expression);
			expect(matches).toBeNull();
		});
	});

	describe('indexedVariable pattern', () => {
		it('matches {{0}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.indexedVariable);
			expect('{{0}}'.match(pattern)?.[0]).toBe('{{0}}');
		});

		it('matches {{123}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.indexedVariable);
			expect('{{123}}'.match(pattern)?.[0]).toBe('{{123}}');
		});

		it('does not match {{1a}}', () => {
			const text = '{{1a}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.indexedVariable);
			expect(matches).toBeNull();
		});
	});

	describe('namedVariable pattern', () => {
		it('matches {{a}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.namedVariable);
			expect('{{a}}'.match(pattern)?.[0]).toBe('{{a}}');
		});

		it('matches {{coefficient}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.namedVariable);
			expect('{{coefficient}}'.match(pattern)?.[0]).toBe('{{coefficient}}');
		});

		it('matches {{varName_123}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.namedVariable);
			expect('{{varName_123}}'.match(pattern)?.[0]).toBe('{{varName_123}}');
		});

		it('matches {{_private}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.namedVariable);
			expect('{{_private}}'.match(pattern)?.[0]).toBe('{{_private}}');
		});

		it('does not match {{1abc}}', () => {
			const text = '{{1abc}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.namedVariable);
			expect(matches).toBeNull();
		});
	});

	describe('color pattern', () => {
		it('matches {{color:primary}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.color);
			expect('{{color:primary}}'.match(pattern)?.[0]).toBe('{{color:primary}}');
		});

		it('matches {{color:error_1}}', () => {
			const pattern = new RegExp(PLACEHOLDER_PATTERNS.color);
			expect('{{color:error_1}}'.match(pattern)?.[0]).toBe('{{color:error_1}}');
		});

		it('does not match {{color:123}}', () => {
			const text = '{{color:123}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.color);
			expect(matches).toBeNull();
		});
	});

	describe('conditional pattern', () => {
		it('matches {{if:cond|text}}', () => {
			// Create non-global version for capture groups
			const pattern = /\{\{if:([^|]+)\|([^|}]+)(?:\|([^}]+))?\}\}/;
			const match = '{{if:isCorrect|Bravo!}}'.match(pattern);
			expect(match?.[0]).toBe('{{if:isCorrect|Bravo!}}');
			expect(match?.[1]).toBe('isCorrect');
			expect(match?.[2]).toBe('Bravo!');
		});

		it('matches {{if:cond|text|else}}', () => {
			const pattern = /\{\{if:([^|]+)\|([^|}]+)(?:\|([^}]+))?\}\}/;
			const match = '{{if:hasError|Error|OK}}'.match(pattern);
			expect(match?.[0]).toBe('{{if:hasError|Error|OK}}');
			expect(match?.[1]).toBe('hasError');
			expect(match?.[2]).toBe('Error');
			expect(match?.[3]).toBe('OK');
		});

		it('matches conditional with complex condition', () => {
			const pattern = /\{\{if:([^|]+)\|([^|}]+)(?:\|([^}]+))?\}\}/;
			const match = '{{if:score>5|Good|Bad}}'.match(pattern);
			expect(match?.[1]).toBe('score>5');
		});

		it('does not match malformed conditional', () => {
			const text = '{{if:cond}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.conditional);
			expect(matches).toBeNull();
		});
	});

	describe('any pattern', () => {
		it('matches all placeholder types', () => {
			const text = '{{solution}} {{answer}} {{expression}} {{a}} {{color:x}} {{if:y|z}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.any);
			expect(matches).toHaveLength(6);
		});

		it('matches unknown placeholders', () => {
			const text = '{{weird-format}}';
			const matches = text.match(PLACEHOLDER_PATTERNS.any);
			expect(matches).toHaveLength(1);
		});

		it('does not match non-placeholders', () => {
			const text = 'plain text';
			const matches = text.match(PLACEHOLDER_PATTERNS.any);
			expect(matches).toBeNull();
		});
	});
});
