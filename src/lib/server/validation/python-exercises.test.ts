/**
 * Tests for the new Python exercises validation schemas (AST + behavior pipeline).
 * See docs/wip/python-validation-refactor-spec.md.
 */

import { describe, it, expect } from 'vitest';
import {
	behaviorCheckSchema,
	validationConfigSchema,
	validationConfigSchemaLegacy,
	validationResultSchema,
	validationResultSchemaLegacy
} from './python-exercises';

const exactComparison = { kind: 'exact' as const };

const validAstRequirement = {
	type: 'uses_loop' as const,
	message: 'Le code doit contenir une boucle'
};

const validOutputBehavior = {
	kind: 'output' as const,
	test_cases: [
		{
			input: '',
			expected_output: '42\n',
			hidden: false
		}
	],
	comparison: exactComparison
};

const validUnitTestBehavior = {
	kind: 'unit_test' as const,
	function_name: 'add',
	test_cases: [
		{
			args: [1, 2],
			expected: 3,
			hidden: false
		}
	]
};

describe('validationConfigSchema (new shape)', () => {
	describe('valid configs round-trip', () => {
		it('accepts AST-only config', () => {
			const cfg = {
				ast_requirements: [validAstRequirement]
			};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.ast_requirements).toHaveLength(1);
				expect(result.data.behavior).toBeUndefined();
				expect(result.data.timeout_ms).toBe(5000);
			}
		});

		it('accepts behavior-only output config', () => {
			const cfg = { behavior: validOutputBehavior };
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.ast_requirements).toBeUndefined();
				expect(result.data.behavior?.kind).toBe('output');
			}
		});

		it('accepts behavior-only unit_test config', () => {
			const cfg = { behavior: validUnitTestBehavior };
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(true);
			if (result.success && result.data.behavior?.kind === 'unit_test') {
				expect(result.data.behavior.function_name).toBe('add');
			}
		});

		it('accepts AST + behavior combined', () => {
			const cfg = {
				ast_requirements: [validAstRequirement],
				behavior: validOutputBehavior
			};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(true);
		});

		it('accepts custom timeout_ms', () => {
			const cfg = {
				ast_requirements: [validAstRequirement],
				timeout_ms: 10_000
			};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.timeout_ms).toBe(10_000);
			}
		});
	});

	describe('refine: at least one of ast_requirements or behavior', () => {
		it('rejects empty config (neither AST nor behavior)', () => {
			const cfg = {};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain(
					'Au moins une vérification de forme ou un comportement attendu'
				);
			}
		});

		it('rejects config with only timeout_ms', () => {
			const cfg = { timeout_ms: 3000 };
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(false);
		});
	});

	describe('field validation', () => {
		it('rejects ast_requirements as empty array', () => {
			const cfg = { ast_requirements: [] };
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(false);
		});

		it('rejects unknown behavior kind', () => {
			const cfg = {
				behavior: { kind: 'mystery', test_cases: [] }
			};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(false);
		});

		it('rejects unit_test behavior with invalid function_name', () => {
			const cfg = {
				behavior: {
					...validUnitTestBehavior,
					function_name: '123bad'
				}
			};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(false);
		});

		it('rejects output behavior with all test cases hidden', () => {
			const cfg = {
				behavior: {
					...validOutputBehavior,
					test_cases: [
						{ input: '', expected_output: '1\n', hidden: true },
						{ input: '', expected_output: '2\n', hidden: true }
					]
				}
			};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(false);
		});

		it('rejects timeout_ms below minimum', () => {
			const cfg = {
				ast_requirements: [validAstRequirement],
				timeout_ms: 50
			};
			const result = validationConfigSchema.safeParse(cfg);
			expect(result.success).toBe(false);
		});
	});
});

describe('behaviorCheckSchema', () => {
	it('discriminates output from unit_test', () => {
		expect(behaviorCheckSchema.safeParse(validOutputBehavior).success).toBe(true);
		expect(behaviorCheckSchema.safeParse(validUnitTestBehavior).success).toBe(true);
	});

	it('rejects output behavior missing comparison', () => {
		const broken = {
			kind: 'output',
			test_cases: validOutputBehavior.test_cases
		};
		const result = behaviorCheckSchema.safeParse(broken);
		expect(result.success).toBe(false);
	});

	it('rejects unit_test behavior missing function_name', () => {
		const broken = {
			kind: 'unit_test',
			test_cases: validUnitTestBehavior.test_cases
		};
		const result = behaviorCheckSchema.safeParse(broken);
		expect(result.success).toBe(false);
	});
});

describe('validationResultSchema (new shape)', () => {
	it('accepts a successful result', () => {
		const result = {
			valid: true,
			failed_layer: null,
			behavior_kind: 'output',
			test_results: [{ passed: true }],
			execution_time_ms: 42
		};
		expect(validationResultSchema.safeParse(result).success).toBe(true);
	});

	it('accepts an AST-failed result with no behavior_kind', () => {
		const result = {
			valid: false,
			failed_layer: 'ast',
			ast_issues: ['Le code doit contenir une boucle'],
			test_results: [],
			execution_time_ms: 12
		};
		expect(validationResultSchema.safeParse(result).success).toBe(true);
	});

	it('accepts a behavior-failed result', () => {
		const result = {
			valid: false,
			failed_layer: 'behavior',
			behavior_kind: 'unit_test',
			test_results: [{ passed: false, error: 'Wrong answer' }],
			execution_time_ms: 33
		};
		expect(validationResultSchema.safeParse(result).success).toBe(true);
	});

	it('rejects a result missing failed_layer', () => {
		const result = {
			valid: true,
			test_results: [],
			execution_time_ms: 0
		};
		expect(validationResultSchema.safeParse(result).success).toBe(false);
	});

	it('rejects an unknown failed_layer value', () => {
		const result = {
			valid: false,
			failed_layer: 'syntax',
			test_results: [],
			execution_time_ms: 5
		};
		expect(validationResultSchema.safeParse(result).success).toBe(false);
	});
});

describe('legacy schemas remain accepting old shape', () => {
	it('legacy validationConfigSchema accepts type=output', () => {
		const cfg = {
			type: 'output',
			test_cases: validOutputBehavior.test_cases,
			comparison: exactComparison
		};
		expect(validationConfigSchemaLegacy.safeParse(cfg).success).toBe(true);
	});

	it('legacy validationConfigSchema accepts type=unit_test', () => {
		const cfg = {
			type: 'unit_test',
			function_name: 'add',
			test_cases: validUnitTestBehavior.test_cases
		};
		expect(validationConfigSchemaLegacy.safeParse(cfg).success).toBe(true);
	});

	it('legacy validationConfigSchema accepts type=ast', () => {
		const cfg = {
			type: 'ast',
			requirements: [validAstRequirement]
		};
		expect(validationConfigSchemaLegacy.safeParse(cfg).success).toBe(true);
	});

	it('legacy validationResultSchema accepts result with strategy field', () => {
		const result = {
			valid: true,
			strategy: 'output',
			test_results: [{ passed: true }],
			execution_time_ms: 1
		};
		expect(validationResultSchemaLegacy.safeParse(result).success).toBe(true);
	});
});
