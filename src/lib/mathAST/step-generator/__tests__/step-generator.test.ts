/**
 * Step Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateSteps, canGenerateSteps, suggestLevel } from '../index';
import { parseCustom } from '../../parser/custom';

describe('Step Generator', () => {
	describe('generateSteps', () => {
		it('should generate steps for simple addition', () => {
			const ast = parseCustom('2 + 3');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].description).toBe('Addition');
			expect(result.steps[0].expression).toContain('5');
		});

		it('should generate steps for simple subtraction', () => {
			const ast = parseCustom('10 - 4');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].description).toBe('Soustraction');
			expect(result.steps[0].expression).toContain('6');
		});

		it('should generate steps for multiplication', () => {
			const ast = parseCustom('3 * 4');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].description).toBe('Multiplication');
			expect(result.steps[0].expression).toContain('12');
		});

		it('should generate steps for division', () => {
			const ast = parseCustom('15 / 3');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].description).toBe('Division');
			expect(result.steps[0].expression).toContain('5');
		});

		it('should generate steps for power', () => {
			const ast = parseCustom('2^3');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].description).toBe('Puissance');
			expect(result.steps[0].expression).toContain('8');
		});

		it('should respect operator precedence in steps', () => {
			const ast = parseCustom('2 + 3 * 4');
			const result = generateSteps(ast, { level: 'college' });

			// Multiplication should be first
			expect(result.steps.length).toBe(2);
			expect(result.steps[0].description).toBe('Multiplication');
			expect(result.steps[0].expression).toContain('12');
			// Then addition
			expect(result.steps[1].description).toBe('Addition');
			expect(result.steps[1].expression).toContain('14');
		});

		it('should adapt descriptions to primaire level', () => {
			const ast = parseCustom('2 + 3');
			const result = generateSteps(ast, { level: 'primaire' });

			expect(result.steps[0].description).toBe('On additionne');
			expect(result.steps[0].explanation).toBeDefined();
		});

		it('should adapt descriptions to superieur level', () => {
			const ast = parseCustom('2 + 3');
			const result = generateSteps(ast, { level: 'superieur' });

			expect(result.steps[0].description).toBe('+');
		});

		it('should generate steps for functions', () => {
			const ast = parseCustom('sin(0)');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].description).toBe('sin');
		});

		it('should generate explanation for power at primaire level', () => {
			const ast = parseCustom('2^3');
			const result = generateSteps(ast, { level: 'primaire' });

			expect(result.steps[0].explanation).toBeDefined();
			expect(result.steps[0].explanation).toContain('2 \\times 2 \\times 2');
		});
	});

	describe('canGenerateSteps', () => {
		it('should return false for simple numbers', () => {
			const ast = parseCustom('42');
			expect(canGenerateSteps(ast)).toBe(false);
		});

		it('should return false for simple variables', () => {
			const ast = parseCustom('x');
			expect(canGenerateSteps(ast)).toBe(false);
		});

		it('should return true for operations', () => {
			const ast = parseCustom('2 + 3');
			expect(canGenerateSteps(ast)).toBe(true);
		});

		it('should return true for expressions with variables (symbolic)', () => {
			const ast = parseCustom('x + 1');
			expect(canGenerateSteps(ast)).toBe(true);
		});
	});

	describe('suggestLevel', () => {
		it('should suggest primaire for simple expressions', () => {
			const ast = parseCustom('2 + 3');
			expect(suggestLevel(ast)).toBe('primaire');
		});

		it('should suggest college for medium complexity', () => {
			const ast = parseCustom('2 + 3 * 4 - 1');
			expect(suggestLevel(ast)).toBe('college');
		});

		it('should suggest lycee for complex expressions', () => {
			const ast = parseCustom('2^3 + sin(1) * cos(2)');
			expect(suggestLevel(ast)).toBe('lycee');
		});
	});

	describe('edge cases', () => {
		it('should handle nested operations', () => {
			const ast = parseCustom('(2 + 3) * (4 - 1)');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
		});

		it('should handle negative numbers', () => {
			const ast = parseCustom('-5 + 3');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
		});

		it('should handle decimal numbers', () => {
			const ast = parseCustom('3.14 * 2');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].expression).toContain('6.28');
		});

		it('should respect maxSteps configuration', () => {
			const ast = parseCustom('1 + 2 + 3 + 4 + 5');
			const result = generateSteps(ast, { level: 'college', maxSteps: 2 });

			expect(result.steps.length).toBeLessThanOrEqual(2);
		});

		it('should return empty steps for simple value', () => {
			const ast = parseCustom('42');
			const result = generateSteps(ast, { level: 'college' });

			expect(result.steps.length).toBe(0);
		});
	});
});
