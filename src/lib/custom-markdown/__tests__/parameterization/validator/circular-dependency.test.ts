/**
 * Circular Dependency Tests
 * ==========================
 *
 * Tests for detecting circular dependencies in variable definitions
 * using depth-first search algorithm.
 */

import { describe, it, expect } from 'vitest';
import { detectCircularDependencies } from '../../../parameterization/validator/circular-dependency';
import type { Variable } from '../../../types';

describe('detectCircularDependencies', () => {
	// ============================================================================
	// VALID DEPENDENCIES
	// ============================================================================

	describe('Valid dependencies', () => {
		it('should accept empty variables array', () => {
			const variables: Variable[] = [];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept single constant variable', () => {
			const variables: Variable[] = [{ name: 'a', expression: '5' }];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept simple linear chain', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'c', expression: '{{b}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept long chain', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '1' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'c', expression: '{{b}}' },
				{ name: 'd', expression: '{{c}}' },
				{ name: 'e', expression: '{{d}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept multiple independent chains', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '1' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'x', expression: '10' },
				{ name: 'y', expression: '{{x}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept diamond dependency pattern', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '1' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'c', expression: '{{a}}' },
				{ name: 'd', expression: '{{eval:{{b}}+{{c}}}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept complex DAG structure', () => {
			const variables: Variable[] = [
				{ name: 'min', expression: '1' },
				{ name: 'max', expression: '10' },
				{ name: 'a', expression: '{{random:{{min}}..{{max}}}}' },
				{ name: 'b', expression: '{{random:{{min}}..{{max}}!{{a}}}}' },
				{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept Markdown syntax', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'c', expression: '{{b}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	// ============================================================================
	// DIRECT CYCLES
	// ============================================================================

	describe('Direct cycles', () => {
		it('should detect self-reference', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{{a}}' }];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('circular-dependency');
			expect(result.errors[0].variable).toBe('a');
			expect(result.errors[0].path).toEqual(['a', 'a']);
			expect(result.errors[0].message).toBe('Circular dependency detected: a → a');
		});

		it('should detect two-variable cycle (a → b → a)', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{b}}' },
				{ name: 'b', expression: '{{a}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('circular-dependency');
			expect(result.errors[0].path).toContain('a');
			expect(result.errors[0].path).toContain('b');
			expect(result.errors[0].path?.length).toBe(3); // a → b → a
		});

		it('should detect three-variable cycle (a → b → c → a)', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{b}}' },
				{ name: 'b', expression: '{{c}}' },
				{ name: 'c', expression: '{{a}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('circular-dependency');
			expect(result.errors[0].path).toEqual(['a', 'b', 'c', 'a']);
		});

		it('should detect longer cycle', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{b}}' },
				{ name: 'b', expression: '{{c}}' },
				{ name: 'c', expression: '{{d}}' },
				{ name: 'd', expression: '{{e}}' },
				{ name: 'e', expression: '{{a}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toEqual(['a', 'b', 'c', 'd', 'e', 'a']);
		});
	});

	// ============================================================================
	// INDIRECT CYCLES
	// ============================================================================

	describe('Indirect cycles', () => {
		it('should detect cycle with intermediate valid variables', () => {
			const variables: Variable[] = [
				{ name: 'x', expression: '5' },
				{ name: 'a', expression: '{{x}}' },
				{ name: 'b', expression: '{{c}}' },
				{ name: 'c', expression: '{{b}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toContain('b');
			expect(result.errors[0].path).toContain('c');
		});

		it('should detect cycle in middle of chain', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '1' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'c', expression: '{{d}}' },
				{ name: 'd', expression: '{{c}}' },
				{ name: 'e', expression: '{{b}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toContain('c');
			expect(result.errors[0].path).toContain('d');
		});

		it('should detect cycle with multiple references', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{b}}' },
				{ name: 'b', expression: '{{c}} + {{d}}' },
				{ name: 'c', expression: '5' },
				{ name: 'd', expression: '{{a}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toContain('a');
			expect(result.errors[0].path).toContain('b');
			expect(result.errors[0].path).toContain('d');
		});
	});

	// ============================================================================
	// CYCLES IN COMPLEX EXPRESSIONS
	// ============================================================================

	describe('Cycles in complex expressions', () => {
		it('should detect cycle when variable ref is inside random spec bounds', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{random:1..{{b}}}}' },
				{ name: 'b', expression: '{{a}}' }
			];
			const result = detectCircularDependencies(variables);
			// The implementation correctly parses inside random spec bounds
			// and detects the circular dependency: a depends on b (in bounds), b depends on a
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toContain('a');
			expect(result.errors[0].path).toContain('b');
		});

		it('should not detect cycle when variable names used in eval', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{eval:b+1}}' },
				{ name: 'b', expression: '{{eval:a*2}}' }
			];
			const result = detectCircularDependencies(variables);
			// Eval uses variable names directly (not tokens), so not detected as cycles
			// This is expected - eval dependency checking happens at resolution time
			expect(result.valid).toBe(true);
		});

		it('should detect cycle with explicit variable token references', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{b}} + {{c}}' },
				{ name: 'b', expression: '5' },
				{ name: 'c', expression: '{{a}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toContain('a');
			expect(result.errors[0].path).toContain('c');
		});
	});

	// ============================================================================
	// MARKDOWN SYNTAX CYCLES
	// ============================================================================

	describe('Markdown syntax cycles', () => {
		it('should detect self-reference in Markdown syntax', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{{a}}' }];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toEqual(['a', 'a']);
		});

		it('should detect cycle in Markdown syntax', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{b}}' },
				{ name: 'b', expression: '{{c}}' },
				{ name: 'c', expression: '{{a}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].path).toEqual(['a', 'b', 'c', 'a']);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('Edge cases', () => {
		it('should handle variable with no dependencies', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '42' },
				{ name: 'b', expression: 'text' },
				{ name: 'c', expression: '{{random:1..10}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle variable referencing itself multiple times', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{{a}} + {{a}}' }];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
		});

		it('should handle variables with same value but no dependency', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '5' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle LaTeX expressions without cycles', () => {
			const variables: Variable[] = [
				{ name: 'numerator', expression: '6' },
				{ name: 'denominator', expression: '2' },
				{ name: 'result', expression: '{{eval:\\frac{{{numerator}}}{{{denominator}}}}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle variable names with underscores', () => {
			const variables: Variable[] = [
				{ name: 'my_var', expression: '{{other_var}}' },
				{ name: 'other_var', expression: '{{my_var}}' }
			];
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
		});

		it('should handle many variables without cycles', () => {
			const variables: Variable[] = Array.from({ length: 50 }, (_, i) => ({
				name: `var${i}`,
				expression: i === 0 ? '1' : `{{var${i - 1}}}`
			}));
			const result = detectCircularDependencies(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});
