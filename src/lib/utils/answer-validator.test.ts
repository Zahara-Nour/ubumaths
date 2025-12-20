/**
 * Answer Validator Tests - Constraint Integration
 * =================================================
 *
 * Integration tests for constraint checking within the validateAnswer function.
 * Tests focus on how constraints are applied to correct answers.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from './answer-validator';
import type { QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a minimal numerical question instance for testing
 */
function createNumericalInstance(
	solution: string,
	constraintOptions?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'test-template',
		type: 'numerical_exact',
		statement: 'Test question' as ResolvedMarkdown,
		solution,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		options: constraintOptions
	};
}

/**
 * Create a minimal algebraic question instance for testing
 */
function createAlgebraicInstance(
	solution: string,
	constraintOptions?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'test-template',
		type: 'algebraic_transform',
		statement: 'Test question' as ResolvedMarkdown,
		solution,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		options: constraintOptions
	};
}

// ============================================================================
// CONSTRAINT APPLICATION TESTS
// ============================================================================

describe('validateAnswer - Constraint Integration', () => {
	describe('Constraints Only Applied When Answer is Correct', () => {
		it('should not check constraints when answer is incorrect', () => {
			const instance = createNumericalInstance('42', {
				constraints: {
					spaces: 'strict',
					products: 'strict',
					brackets: 'strict',
					zeros: 'strict',
					form: 'off'
				}
			});

			// Incorrect answer - constraints shouldn't be checked
			const result = validateAnswer('100', instance, '100');

			expect(result.isCorrect).toBe(false);
			expect(result.constraintViolations).toBeUndefined();
		});

		it('should check constraints when answer is correct', () => {
			const instance = createNumericalInstance('12345', {
				constraints: {
					spaces: 'strict',
					products: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			// Correct answer but bad spacing
			const result = validateAnswer('12345', instance, '12345');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations).toBeDefined();
			expect(result.constraintViolations?.length).toBeGreaterThan(0);
		});
	});

	describe('Constraints Require LaTeX Input', () => {
		it('should skip constraint checks when no LaTeX provided', () => {
			const instance = createNumericalInstance('42', {
				constraints: {
					spaces: 'strict',
					products: 'strict',
					brackets: 'strict',
					zeros: 'strict',
					form: 'off'
				}
			});

			// Correct answer but no LaTeX - constraints should be skipped
			const result = validateAnswer('42', instance);

			expect(result.isCorrect).toBe(true);
			expect(result.constraintViolations).toBeUndefined();
			expect(result.status).toBeUndefined();
		});

		it('should check constraints when LaTeX is provided', () => {
			const instance = createNumericalInstance('5', {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			// Correct answer with LaTeX that has unnecessary brackets
			const result = validateAnswer('5', instance, '(5)');

			expect(result.isCorrect).toBe(false); // bad_form makes it incorrect
			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations).toBeDefined();
		});
	});

	describe('Constraint Mode: strict (bad_form)', () => {
		it('should mark answer as incorrect (bad_form) when constraint is strict and violated', () => {
			const instance = createNumericalInstance('12345', {
				constraints: {
					spaces: 'strict',
					products: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('12345', instance, '12345');

			expect(result.status).toBe('bad_form');
			expect(result.isCorrect).toBe(false);
			expect(result.constraintViolations).toBeDefined();
			expect(result.constraintViolations![0].severity).toBe('error');
			expect(result.constraintViolations![0].constraint).toBe('spaces');
			expect(result.feedback).toBeDefined();
		});

		it('should use feedback from constraint violation as main feedback', () => {
			const instance = createNumericalInstance('5', {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('5', instance, '(5)');

			expect(result.isCorrect).toBe(false);
			expect(result.feedback).toContain('parenthèses');
		});
	});

	describe('Constraint Mode: warn (unoptimal_form)', () => {
		it('should give partial credit (unoptimal_form) when constraint is warn and violated', () => {
			const instance = createNumericalInstance('12345', {
				constraints: {
					spaces: 'warn',
					products: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('12345', instance, '12345');

			expect(result.status).toBe('unoptimal_form');
			expect(result.isCorrect).toBe(true); // Still correct, just warning
			expect(result.constraintViolations).toBeDefined();
			expect(result.constraintViolations![0].severity).toBe('warning');
			expect(result.constraintViolations![0].constraint).toBe('spaces');
			expect(result.feedback).toBeDefined();
		});

		it('should keep isCorrect true but add feedback for unoptimal form', () => {
			const instance = createNumericalInstance('5', {
				constraints: {
					brackets: 'warn',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('5', instance, '(5)');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('unoptimal_form');
			expect(result.feedback).toBeDefined();
		});
	});

	describe('Constraint Mode: off', () => {
		it('should skip constraint when mode is off', () => {
			const instance = createNumericalInstance('12345', {
				constraints: {
					spaces: 'off',
					products: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('12345', instance, '12345');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('correct');
			expect(result.constraintViolations).toHaveLength(0);
		});

		it('should allow violations when off mode', () => {
			const instance = createNumericalInstance('5', {
				constraints: {
					brackets: 'off',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('5', instance, '(5)');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('correct');
		});
	});

	describe('No Constraints Configured', () => {
		it('should skip constraint checks when no constraints in options', () => {
			const instance = createNumericalInstance('12345');

			const result = validateAnswer('12345', instance, '12345');

			expect(result.isCorrect).toBe(true);
			expect(result.constraintViolations).toBeUndefined();
		});

		it('should skip constraint checks when options is undefined', () => {
			const instance: QuestionInstance = {
				templateId: 'test',
				type: 'numerical_exact',
				statement: 'Test' as ResolvedMarkdown,
				solution: '5',
				grades: ['6'],
				theme: 'Test',
				domain: 'Test',
				level: 1,
				generatedAt: new Date().toISOString()
				// options is undefined
			};

			const result = validateAnswer('5', instance, '(5)');

			expect(result.isCorrect).toBe(true);
			expect(result.constraintViolations).toBeUndefined();
		});
	});
});

// ============================================================================
// SPECIFIC CONSTRAINT TESTS
// ============================================================================

describe('validateAnswer - Specific Constraints', () => {
	describe('Spaces Constraint', () => {
		it('should detect spacing violations in strict mode', () => {
			const instance = createNumericalInstance('12345', {
				constraints: {
					spaces: 'strict',
					products: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('12345', instance, '12345');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations![0].constraint).toBe('spaces');
		});

		it('should accept correct spacing', () => {
			const instance = createNumericalInstance('12 345', {
				constraints: {
					spaces: 'strict',
					products: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('12 345', instance, '12\\,345');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('correct');
		});
	});

	describe('Products Constraint', () => {
		it('should detect explicit multiplication in strict mode', () => {
			const instance = createAlgebraicInstance('2x', {
				constraints: {
					products: 'strict',
					spaces: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('2x', instance, '2\\times x');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations![0].constraint).toBe('products');
		});

		it('should accept implicit multiplication', () => {
			const instance = createAlgebraicInstance('2x', {
				constraints: {
					products: 'strict',
					spaces: 'off',
					brackets: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('2x', instance, '2x');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('correct');
		});
	});

	describe('Brackets Constraint', () => {
		it('should detect unnecessary brackets in strict mode', () => {
			const instance = createNumericalInstance('5', {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('5', instance, '(5)');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations![0].constraint).toBe('brackets');
		});

		it('should respect allowBracketsInFirstNegativeTerm option', () => {
			const instance = createAlgebraicInstance('(-5)+3', {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off',
					allowBracketsInFirstNegativeTerm: true
				}
			});

			const result = validateAnswer('(-5)+3', instance, '(-5)+3');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('correct');
		});

		it('should detect brackets around first negative when option is false', () => {
			const instance = createAlgebraicInstance('(-5)+3', {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off',
					allowBracketsInFirstNegativeTerm: false
				}
			});

			const result = validateAnswer('(-5)+3', instance, '(-5)+3');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations![0].constraint).toBe('brackets');
		});
	});

	describe('Zeros Constraint', () => {
		it('should detect leading zeros in strict mode', () => {
			const instance = createNumericalInstance('1', {
				constraints: {
					zeros: 'strict',
					spaces: 'off',
					products: 'off',
					brackets: 'off',
					form: 'off'
				}
			});

			// Note: checkZeros uses plain text, not LaTeX
			const result = validateAnswer('01', instance, '01');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations![0].constraint).toBe('zeros');
		});

		it('should detect trailing zeros in strict mode', () => {
			const instance = createNumericalInstance('1', {
				constraints: {
					zeros: 'strict',
					spaces: 'off',
					products: 'off',
					brackets: 'off',
					form: 'off'
				}
			});

			const result = validateAnswer('1.0', instance, '1.0');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations![0].constraint).toBe('zeros');
		});
	});

	describe('Form Constraint', () => {
		it('should detect form violations when form is strict mode', () => {
			const instance = createAlgebraicInstance('x+1', {
				constraints: {
					form: 'strict',
					spaces: 'off',
					products: 'off',
					brackets: 'off',
					zeros: 'off'
				}
			});

			// Mathematically correct but different form
			const result = validateAnswer('1+x', instance, '1+x');

			expect(result.status).toBe('bad_form');
			expect(result.constraintViolations![0].constraint).toBe('form');
		});

		it('should accept exact form match', () => {
			const instance = createAlgebraicInstance('x+1', {
				constraints: {
					form: 'strict',
					spaces: 'off',
					products: 'off',
					brackets: 'off',
					zeros: 'off'
				}
			});

			const result = validateAnswer('x+1', instance, 'x+1');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('correct');
		});

		it('should normalize whitespace in form comparison', () => {
			const instance = createAlgebraicInstance('x+1', {
				constraints: {
					form: 'strict',
					spaces: 'off',
					products: 'off',
					brackets: 'off',
					zeros: 'off'
				}
			});

			const result = validateAnswer('x + 1', instance, 'x + 1');

			expect(result.isCorrect).toBe(true);
			expect(result.status).toBe('correct');
		});
	});
});

// ============================================================================
// MULTIPLE CONSTRAINTS TESTS
// ============================================================================

describe('validateAnswer - Multiple Constraints', () => {
	it('should check multiple constraints and report first violation', () => {
		const instance = createAlgebraicInstance('2x', {
			constraints: {
				products: 'strict',
				brackets: 'strict',
				spaces: 'off',
				zeros: 'off',
				form: 'off'
			}
		});

		// Violates products (explicit multiplication) but brackets are OK
		const result = validateAnswer('2x', instance, '2\\times x');

		expect(result.status).toBe('bad_form');
		expect(result.constraintViolations![0].constraint).toBe('products');
	});

	it('should prioritize strict mode violations over warn mode', () => {
		const instance = createNumericalInstance('5', {
			constraints: {
				brackets: 'strict',
				zeros: 'warn',
				spaces: 'off',
				products: 'off',
				form: 'off'
			}
		});

		// Violates brackets (strict) - should be bad_form, not unoptimal_form
		const result = validateAnswer('5', instance, '(5)');

		expect(result.status).toBe('bad_form');
		expect(result.isCorrect).toBe(false);
	});

	it('should report unoptimal_form when only warn violations', () => {
		const instance = createNumericalInstance('12345', {
			constraints: {
				spaces: 'warn',
				products: 'warn',
				brackets: 'off',
				zeros: 'off',
				form: 'off'
			}
		});

		const result = validateAnswer('12345', instance, '12345');

		expect(result.status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
	});
});

// ============================================================================
// MULTIPLE ANSWERS TESTS
// ============================================================================

describe('validateAnswer - Multiple Answers', () => {
	it('should check constraints for all answers', () => {
		const instance: QuestionInstance = {
			templateId: 'test',
			type: 'fill_in_blanks',
			statement: 'Test {{blank:0}} and {{blank:1}}' as ResolvedMarkdown,
			solution: ['5', '10'],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			generatedAt: new Date().toISOString(),
			blanks: [
				{ position: 0, expectedAnswer: '5' },
				{ position: 1, expectedAnswer: '10' }
			],
			options: {
				constraints: {
					brackets: 'strict',
					spaces: 'off',
					products: 'off',
					zeros: 'off',
					form: 'off'
				}
			}
		};

		// First answer has unnecessary brackets
		const result = validateAnswer(['5', '10'], instance, ['(5)', '10']);

		expect(result.status).toBe('bad_form');
		expect(result.constraintViolations).toBeDefined();
	});

	it('should handle array conversion for single answer', () => {
		const instance = createNumericalInstance('5', {
			constraints: {
				brackets: 'strict',
				spaces: 'off',
				products: 'off',
				zeros: 'off',
				form: 'off'
			}
		});

		// Pass single value, should be converted to array internally
		const result = validateAnswer('5', instance, '(5)');

		expect(result.status).toBe('bad_form');
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('validateAnswer - Edge Cases', () => {
	it('should handle empty LaTeX string', () => {
		const instance = createNumericalInstance('5', {
			constraints: {
				brackets: 'strict',
				spaces: 'off',
				products: 'off',
				zeros: 'off',
				form: 'off'
			}
		});

		const result = validateAnswer('5', instance, '');

		// Empty string should be treated as no violation
		expect(result.isCorrect).toBe(true);
	});

	it('should handle constraint check with incorrect answer gracefully', () => {
		const instance = createNumericalInstance('42', {
			constraints: {
				spaces: 'strict',
				products: 'strict',
				brackets: 'strict',
				zeros: 'strict',
				form: 'off'
			}
		});

		// Wrong answer - constraints shouldn't be checked
		const result = validateAnswer('12345', instance, '12345');

		expect(result.isCorrect).toBe(false);
		expect(result.constraintViolations).toBeUndefined();
	});

	it('should handle numerical answer type conversion', () => {
		const instance = createNumericalInstance('5', {
			constraints: {
				brackets: 'strict',
				spaces: 'off',
				products: 'off',
				zeros: 'off',
				form: 'off'
			}
		});

		// Pass number instead of string
		const result = validateAnswer(5, instance, '(5)');

		expect(result.status).toBe('bad_form');
	});
});
