/**
 * Tests for the new Python exercises validation schemas (AST + behavior pipeline).
 * See docs/wip/python-validation-refactor-spec.md.
 */

import { describe, it, expect } from 'vitest';
import {
	behaviorCheckSchema,
	createExerciseSchema,
	updateExerciseSchema,
	validationConfigSchema,
	validationResultSchema
} from '../python-exercises';

const validCreatePayload = {
	title: 'Médiane',
	solution_code: 'def f(L):\n    return sorted(L)[len(L) // 2]\n',
	validation_config: {
		behavior: {
			kind: 'unit_test',
			function_name: 'f',
			test_cases: [{ args: [[1, 2, 3]], expected: 2, hidden: false }]
		}
	},
	level: 'lycee' as const
};

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

const validVariableCheckBehavior = {
	kind: 'variable_check' as const,
	expected_vars: { x: 6, y: 7 }
};

const validReferenceSolutionFixed = {
	kind: 'reference_solution' as const,
	function_name: 'mediane',
	reference_code: 'def mediane(L):\n    return sorted(L)[len(L) // 2]\n',
	fixed: {
		cases: [
			{ args: [[1, 2, 3]], expected: 2 },
			{ args: [[1]], expected: 1 }
		]
	}
};

const validReferenceSolutionGenerator = {
	kind: 'reference_solution' as const,
	function_name: 'mediane',
	reference_code: 'def mediane(L):\n    return sorted(L)[len(L) // 2]\n',
	generator: {
		code: '([1, 2, 3],)',
		count: 10,
		seed: 42
	}
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
	it('discriminates output, unit_test and variable_check', () => {
		expect(behaviorCheckSchema.safeParse(validOutputBehavior).success).toBe(true);
		expect(behaviorCheckSchema.safeParse(validUnitTestBehavior).success).toBe(true);
		expect(behaviorCheckSchema.safeParse(validVariableCheckBehavior).success).toBe(true);
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

	describe('variable_check', () => {
		it('accepts a simple expected_vars map', () => {
			const ok = { kind: 'variable_check', expected_vars: { x: 6 } };
			expect(behaviorCheckSchema.safeParse(ok).success).toBe(true);
		});

		it('accepts None (null) as expected value', () => {
			const ok = { kind: 'variable_check', expected_vars: { x: null } };
			expect(behaviorCheckSchema.safeParse(ok).success).toBe(true);
		});

		it('accepts nested structures (list, dict)', () => {
			const ok = {
				kind: 'variable_check',
				expected_vars: { xs: [1, 2, 3], meta: { name: 'Alice', age: 12 } }
			};
			expect(behaviorCheckSchema.safeParse(ok).success).toBe(true);
		});

		it('accepts optional tolerance', () => {
			const ok = {
				kind: 'variable_check',
				expected_vars: { x: 3.14 },
				tolerance: { eps_abs: 1e-6, eps_rel: 1e-6 }
			};
			expect(behaviorCheckSchema.safeParse(ok).success).toBe(true);
		});

		it('rejects empty expected_vars', () => {
			const broken = { kind: 'variable_check', expected_vars: {} };
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects a variable name that is not a Python identifier', () => {
			const broken = { kind: 'variable_check', expected_vars: { '1x': 5 } };
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects a variable name with a dash', () => {
			const broken = { kind: 'variable_check', expected_vars: { 'a-b': 5 } };
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects more than 50 variables', () => {
			const expected_vars: Record<string, number> = {};
			for (let i = 0; i < 51; i++) expected_vars[`v${i}`] = i;
			const broken = { kind: 'variable_check', expected_vars };
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('accepts valid identifiers with underscores and digits', () => {
			const ok = {
				kind: 'variable_check',
				expected_vars: { _x: 1, snake_case: 2, abc123: 3 }
			};
			expect(behaviorCheckSchema.safeParse(ok).success).toBe(true);
		});
	});

	describe('reference_solution', () => {
		it('accepts fixed-only config', () => {
			expect(behaviorCheckSchema.safeParse(validReferenceSolutionFixed).success).toBe(true);
		});

		it('accepts generator-only config', () => {
			expect(behaviorCheckSchema.safeParse(validReferenceSolutionGenerator).success).toBe(true);
		});

		it('accepts fixed + generator combined', () => {
			const both = {
				...validReferenceSolutionFixed,
				generator: validReferenceSolutionGenerator.generator
			};
			expect(behaviorCheckSchema.safeParse(both).success).toBe(true);
		});

		it('accepts optional tolerance', () => {
			const withTolerance = {
				...validReferenceSolutionFixed,
				tolerance: { eps_abs: 1e-6, eps_rel: 1e-6 }
			};
			expect(behaviorCheckSchema.safeParse(withTolerance).success).toBe(true);
		});

		it('rejects when neither fixed nor generator is present', () => {
			const broken = {
				kind: 'reference_solution',
				function_name: 'f',
				reference_code: 'def f(x): return x'
			};
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects empty reference_code', () => {
			const broken = { ...validReferenceSolutionFixed, reference_code: '' };
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects invalid function_name', () => {
			const broken = { ...validReferenceSolutionFixed, function_name: '1bad' };
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects fixed cases all hidden', () => {
			const broken = {
				...validReferenceSolutionFixed,
				fixed: {
					cases: [{ args: [[1]], expected: 1, hidden: true }]
				}
			};
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects generator with count < 1', () => {
			const broken = {
				...validReferenceSolutionGenerator,
				generator: { ...validReferenceSolutionGenerator.generator, count: 0 }
			};
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects generator with count > 200', () => {
			const broken = {
				...validReferenceSolutionGenerator,
				generator: { ...validReferenceSolutionGenerator.generator, count: 201 }
			};
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects generator missing seed', () => {
			const broken = {
				kind: 'reference_solution',
				function_name: 'f',
				reference_code: 'def f(x): return x',
				generator: { code: '(1,)', count: 5 }
			};
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});

		it('rejects reference_code exceeding 5000 chars', () => {
			const broken = {
				...validReferenceSolutionFixed,
				reference_code: 'a'.repeat(5001)
			};
			expect(behaviorCheckSchema.safeParse(broken).success).toBe(false);
		});
	});
});

describe('createExerciseSchema / updateExerciseSchema — locked-zones markers', () => {
	it('accepts a payload with no starter_code', () => {
		const ok = createExerciseSchema.safeParse(validCreatePayload);
		expect(ok.success).toBe(true);
	});

	it('accepts a payload with a starter_code containing no markers', () => {
		const r = createExerciseSchema.safeParse({
			...validCreatePayload,
			starter_code: 'x = 5\nprint(x)\n'
		});
		expect(r.success).toBe(true);
	});

	it('accepts a payload with well-formed locked-zone markers', () => {
		const r = createExerciseSchema.safeParse({
			...validCreatePayload,
			starter_code:
				'while {{cond | "False"}}:\n    A = {{update | "..."}}    # à compléter\n    n = n + 1\n'
		});
		expect(r.success).toBe(true);
	});

	it('rejects a payload with a malformed marker (invalid id)', () => {
		const r = createExerciseSchema.safeParse({
			...validCreatePayload,
			starter_code: 'x = {{1bad}}'
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error.issues.some((i) => i.path.includes('starter_code'))).toBe(true);
		}
	});

	it('rejects a payload with a duplicate marker id', () => {
		const r = createExerciseSchema.safeParse({
			...validCreatePayload,
			starter_code: 'a = {{x}}\nb = {{x}}'
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error.issues.some((i) => i.message.toLowerCase().includes('plusieurs fois'))).toBe(
				true
			);
		}
	});

	it('rejects a payload with an unterminated marker', () => {
		const r = createExerciseSchema.safeParse({
			...validCreatePayload,
			starter_code: 'x = {{cond'
		});
		expect(r.success).toBe(false);
	});

	it('updateExerciseSchema applies the same locked-zone validation', () => {
		const r = updateExerciseSchema.safeParse({
			id: '00000000-0000-0000-0000-000000000000',
			starter_code: 'x = {{1bad}}'
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error.issues.some((i) => i.path.includes('starter_code'))).toBe(true);
		}
	});

	it('updateExerciseSchema accepts well-formed markers', () => {
		const r = updateExerciseSchema.safeParse({
			id: '00000000-0000-0000-0000-000000000000',
			starter_code: 'while {{cond | "False"}}:\n    pass\n'
		});
		expect(r.success).toBe(true);
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

	it('accepts a variable_check result', () => {
		const result = {
			valid: false,
			failed_layer: 'behavior',
			behavior_kind: 'variable_check',
			test_results: [
				{ passed: true, input: 'x', expected: '6', actual: '6' },
				{
					passed: false,
					input: 'y',
					expected: '7',
					actual: '8',
					diff: 'attendu 7, obtenu 8'
				}
			],
			execution_time_ms: 27
		};
		expect(validationResultSchema.safeParse(result).success).toBe(true);
	});

	it('accepts a reference_solution result', () => {
		const result = {
			valid: false,
			failed_layer: 'behavior',
			behavior_kind: 'reference_solution',
			test_results: [
				{ passed: true, input: 'mediane([1, 2, 3])', expected: '2', actual: '2' },
				{
					passed: false,
					input: 'mediane([3, 7])',
					expected: '5',
					actual: '7',
					diff: 'attendu 5, obtenu 7'
				}
			],
			execution_time_ms: 412
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
