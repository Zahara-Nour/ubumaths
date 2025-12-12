/**
 * Tests for BaseTypstGenerator
 *
 * Tests the abstract base class using a concrete test implementation.
 */
import { describe, it, expect } from 'vitest';
import { BaseTypstGenerator } from './base-generator';
import type { GeneratorConfig, GeneratorContext, GenerateResult } from '../types';

/**
 * Concrete test implementation of BaseTypstGenerator
 */
class TestGenerator extends BaseTypstGenerator<string> {
	generate(input: string): GenerateResult {
		return {
			typstContent: `Test: ${input}\n${this.generateSetup()}`,
			metadata: {
				generator: 'test-generator',
				generatedAt: new Date()
			}
		};
	}

	// Expose protected methods for testing
	public testEscape(text: string): string {
		return this.escape(text);
	}

	public testFormatDate(date?: Date): string {
		return this.formatDate(date);
	}

	public testFormatExerciseNumber(num: number): string {
		return this.formatExerciseNumber(num);
	}

	public testGenerateSetup(): string {
		return this.generateSetup();
	}

	public getConfig(): GeneratorConfig {
		return this.config;
	}

	public getContext(): GeneratorContext {
		return this.context;
	}
}

describe('BaseTypstGenerator', () => {
	describe('constructor', () => {
		it('uses default config when none provided', () => {
			const generator = new TestGenerator();
			const config = generator.getConfig();

			expect(config.pageLayout).toBe('A4');
			expect(config.fontSize).toBe(12);
			expect(config.margins).toEqual({ top: 20, bottom: 20, left: 15, right: 15 });
		});

		it('merges partial config with defaults', () => {
			const generator = new TestGenerator({ fontSize: 14 });
			const config = generator.getConfig();

			expect(config.fontSize).toBe(14);
			expect(config.pageLayout).toBe('A4'); // default preserved
		});

		it('uses default context when none provided', () => {
			const generator = new TestGenerator();
			const context = generator.getContext();

			expect(context.mode).toBe('worksheet');
			expect(context.locale).toBe('fr');
		});

		it('merges partial context with defaults', () => {
			const generator = new TestGenerator(undefined, { mode: 'correction' });
			const context = generator.getContext();

			expect(context.mode).toBe('correction');
			expect(context.locale).toBe('fr'); // default preserved
		});

		it('accepts full config and context', () => {
			const config: GeneratorConfig = {
				pageLayout: 'Letter',
				fontSize: 11,
				margins: { top: 25, bottom: 25, left: 20, right: 20 },
				numberingStyle: 'roman'
			};
			const context: GeneratorContext = {
				mode: 'correction',
				locale: 'en',
				studentName: 'Test Student',
				className: 'Class A'
			};

			const generator = new TestGenerator(config, context);

			expect(generator.getConfig()).toEqual(expect.objectContaining(config));
			expect(generator.getContext()).toEqual(expect.objectContaining(context));
		});
	});

	describe('generateSetup', () => {
		it('generates correct Typst page setup', () => {
			const generator = new TestGenerator();
			const setup = generator.testGenerateSetup();

			expect(setup).toContain('#set page');
			expect(setup).toContain('paper: "a4"');
			expect(setup).toContain('top: 20mm');
			expect(setup).toContain('bottom: 20mm');
			expect(setup).toContain('left: 15mm');
			expect(setup).toContain('right: 15mm');
		});

		it('uses custom config values', () => {
			const generator = new TestGenerator({
				pageLayout: 'Letter',
				fontSize: 14,
				margins: { top: 25, bottom: 30, left: 20, right: 20 }
			});
			const setup = generator.testGenerateSetup();

			expect(setup).toContain('paper: "letter"');
			expect(setup).toContain('size: 14pt');
			expect(setup).toContain('top: 25mm');
			expect(setup).toContain('bottom: 30mm');
			expect(setup).toContain('left: 20mm');
			expect(setup).toContain('right: 20mm');
		});

		it('includes text and paragraph settings', () => {
			const generator = new TestGenerator();
			const setup = generator.testGenerateSetup();

			expect(setup).toContain('#set text');
			expect(setup).toContain('font: "New Computer Modern"');
			expect(setup).toContain('lang: "fr"');
			expect(setup).toContain('#set par');
			expect(setup).toContain('justify: true');
		});
	});

	describe('escape', () => {
		it('escapes special Typst characters', () => {
			const generator = new TestGenerator();

			expect(generator.testEscape('#test')).toBe('\\#test');
			expect(generator.testEscape('$math$')).toBe('\\$math\\$');
			expect(generator.testEscape('*bold*')).toBe('\\*bold\\*');
			expect(generator.testEscape('_italic_')).toBe('\\_italic\\_');
		});

		it('handles plain text without changes', () => {
			const generator = new TestGenerator();

			expect(generator.testEscape('Hello World')).toBe('Hello World');
			expect(generator.testEscape('Simple text')).toBe('Simple text');
		});
	});

	describe('formatDate', () => {
		it('formats provided date in French locale', () => {
			const generator = new TestGenerator();
			const date = new Date(2024, 11, 15); // December 15, 2024
			const result = generator.testFormatDate(date);

			expect(result).toContain('15');
			expect(result).toMatch(/d[eé]cembre/i);
			expect(result).toContain('2024');
		});

		it('uses current date when none provided', () => {
			const generator = new TestGenerator();
			const result = generator.testFormatDate();
			const now = new Date();

			expect(result).toContain(now.getFullYear().toString());
		});
	});

	describe('formatExerciseNumber', () => {
		it('uses configured numbering style', () => {
			const numericGenerator = new TestGenerator({ numberingStyle: 'numeric' });
			expect(numericGenerator.testFormatExerciseNumber(1)).toBe('1');

			const alphabeticGenerator = new TestGenerator({ numberingStyle: 'alphabetic' });
			expect(alphabeticGenerator.testFormatExerciseNumber(1)).toBe('A');

			const romanGenerator = new TestGenerator({ numberingStyle: 'roman' });
			expect(romanGenerator.testFormatExerciseNumber(4)).toBe('IV');
		});

		it('defaults to numeric when not specified', () => {
			const generator = new TestGenerator();
			expect(generator.testFormatExerciseNumber(5)).toBe('5');
		});
	});

	describe('generate', () => {
		it('returns a GenerateResult with typstContent and metadata', () => {
			const generator = new TestGenerator();
			const result = generator.generate('hello');

			expect(result.typstContent).toContain('Test: hello');
			expect(result.metadata.generator).toBe('test-generator');
			expect(result.metadata.generatedAt).toBeInstanceOf(Date);
		});
	});
});
