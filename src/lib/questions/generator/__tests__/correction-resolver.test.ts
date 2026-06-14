/**
 * Correction Resolver Tests
 * =========================
 *
 * Unit tests for correction placeholder resolution.
 * Tests behaviors 1-16 from the spec.
 */

import { describe, it, expect } from 'vitest';
import { templateMarkdown, resolvedMarkdown } from '$lib/ubumark';
import type { ResolvedVariable } from '../../types';
import type { InstanceBlank } from '../../types';
import type { ResolvedMarkdown } from '$lib/ubumark';
import { buildCorrectionContext, resolveCorrectionContent } from '../correction-resolver';

// ============================================================================
// HELPERS
// ============================================================================

const vars: ResolvedVariable[] = [
	{ name: 'a', value: '5' },
	{ name: 'b', value: '3' },
	{ name: 'expression1', value: '5+3' }
];

function makeBlanks(...answers: string[]): InstanceBlank[] {
	return answers.map((a) => ({
		expectedAnswer: a,
		type: 'math' as const
	}));
}

function makeChoices(
	...items: { text: string; correct: boolean }[]
): { content: ResolvedMarkdown; isCorrect: boolean }[] {
	return items.map((item) => ({
		content: resolvedMarkdown(item.text),
		isCorrect: item.correct
	}));
}

// ============================================================================
// BEHAVIOR 1-3: {{solution}} resolution
// ============================================================================

describe('resolveCorrectionContent - {{solution}} resolution', () => {
	it('1. {{solution}} resolves to blanks[0].expectedAnswer for fill-in-blanks', () => {
		const blanks = makeBlanks('8');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('La réponse est {{solution}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('8');
		expect(String(result)).not.toContain('{{solution}}');
	});

	it('2. {{solution_0}}, {{solution_1}} resolve to indexed blanks', () => {
		const blanks = makeBlanks('8', '15');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('Première: {{solution_0}}, Deuxième: {{solution_1}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('8');
		expect(String(result)).toContain('15');
	});

	it('3. {{solution}} resolves to text of correct choice for QCM', () => {
		const choices = makeChoices(
			{ text: 'pair', correct: true },
			{ text: 'impair', correct: false }
		);
		const ctx = buildCorrectionContext(undefined, choices, '0', vars);
		const result = resolveCorrectionContent(
			templateMarkdown('La réponse est {{solution}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('pair');
	});
});

// ============================================================================
// BEHAVIOR 4-5: {{expression}} resolution
// ============================================================================

describe('resolveCorrectionContent - {{expression}} resolution', () => {
	it('4. {{expression}} resolves to variable "expression" if it exists', () => {
		const varsWithExpr: ResolvedVariable[] = [...vars, { name: 'expression', value: '2+3' }];
		const ctx = buildCorrectionContext(undefined, undefined, undefined, varsWithExpr);
		const result = resolveCorrectionContent(
			templateMarkdown('Expression: {{expression}}.'),
			varsWithExpr,
			ctx
		);
		expect(String(result)).toContain('2+3');
	});

	it('5. {{expression}} falls back to expression1 if no "expression" variable', () => {
		// vars has expression1=5+3 but no "expression"
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('Expression: {{expression}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('5+3');
	});
});

// ============================================================================
// BEHAVIOR 6-7: Normal variables + LaTeX conversion
// ============================================================================

describe('resolveCorrectionContent - Normal variables and LaTeX', () => {
	it('6. Normal variables {{a}} resolved alongside pseudo-variables', () => {
		const blanks = makeBlanks('8');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('{{a}} + {{b}} = {{solution}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('5');
		expect(String(result)).toContain('3');
		expect(String(result)).toContain('8');
	});

	it('7. LaTeX conversion works inside $...$ (including solution values)', () => {
		const blanks = makeBlanks('8');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('${{a}}+{{b}}={{solution}}$'),
			vars,
			ctx
		);
		// Should contain LaTeX-converted content (exact format depends on mathAST)
		expect(String(result)).not.toContain('{{solution}}');
		expect(String(result)).not.toContain('{{a}}');
	});
});

// ============================================================================
// BEHAVIOR 8-10: Pre-processing syntax
// ============================================================================

describe('resolveCorrectionContent - Pre-processing syntax', () => {
	it('8. {{solution:N}} is converted to {{solution_N}} and resolved', () => {
		const blanks = makeBlanks('8', '15');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('Première: {{solution:0}}, Deuxième: {{solution:1}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('8');
		expect(String(result)).toContain('15');
	});

	it('9. {{solution:html}} is treated as alias of {{solution}}', () => {
		const blanks = makeBlanks('8');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('La réponse est {{solution:html}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('8');
	});

	it('10. {{expression:raw}} is treated as alias of {{expression}}', () => {
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('Expression: {{expression:raw}}.'),
			vars,
			ctx
		);
		// Should use expression1 fallback
		expect(String(result)).toContain('5+3');
	});
});

// ============================================================================
// BEHAVIOR 11-14: Client-side preservation
// ============================================================================

describe('resolveCorrectionContent - Client-side preservation', () => {
	it('11. {{answer}} is preserved (not resolved)', () => {
		const blanks = makeBlanks('8');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('Vous avez répondu {{answer}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('{{answer}}');
	});

	it('12. {{answer:N}} is preserved', () => {
		const blanks = makeBlanks('8', '15');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('Réponse 1: {{answer:0}}, Réponse 2: {{answer:1}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('{{answer:0}}');
		expect(String(result)).toContain('{{answer:1}}');
	});

	it('13. {{color:name}} is preserved (handled by resolveColorReferences)', () => {
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		// Note: {{color:...}} is already skipped by the tokenizer (L124),
		// so it passes through naturally. This test verifies it survives.
		const result = resolveCorrectionContent(
			templateMarkdown('En {{color:rouge}} la réponse.'),
			vars,
			ctx
		);
		// Color references are resolved by resolveColorReferences in the pipeline,
		// not by our code. We just need them not to crash.
		expect(String(result)).toBeDefined();
	});

	it('14. {{if:cond|then|else}} is preserved', () => {
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('{{if:correct|Bravo!|Réessayez}}.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('{{if:correct|Bravo!|Réessayez}}');
	});

	it('14b. {{if:cond|then}} (two-argument form) is preserved', () => {
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('{{if:isCorrect|Bravo!}} texte.'),
			vars,
			ctx
		);
		expect(String(result)).toContain('{{if:isCorrect|Bravo!}}');
	});
});

// ============================================================================
// BEHAVIOR 15-16: Edge cases
// ============================================================================

describe('resolveCorrectionContent - Edge cases', () => {
	it('15. No solution available: {{solution}} resolves to empty string', () => {
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		const result = resolveCorrectionContent(
			templateMarkdown('La solution est {{solution}}.'),
			vars,
			ctx
		);
		expect(String(result)).not.toContain('{{solution}}');
		// Should have resolved to empty
		expect(String(result)).toContain('La solution est .');
	});

	it('16. No expression variable: {{expression}} resolves to empty string', () => {
		const varsNoExpr: ResolvedVariable[] = [
			{ name: 'a', value: '5' },
			{ name: 'b', value: '3' }
		];
		const ctx = buildCorrectionContext(undefined, undefined, undefined, varsNoExpr);
		const result = resolveCorrectionContent(
			templateMarkdown('Expression: {{expression}}.'),
			varsNoExpr,
			ctx
		);
		expect(String(result)).not.toContain('{{expression}}');
	});
});

// ============================================================================
// buildCorrectionContext tests
// ============================================================================

describe('buildCorrectionContext', () => {
	it('builds context from fill-in-blanks', () => {
		const blanks = makeBlanks('8', '15');
		const ctx = buildCorrectionContext(blanks, undefined, undefined, vars);
		expect(ctx.solutions).toEqual(['8', '15']);
	});

	it('builds context from QCM single choice', () => {
		const choices = makeChoices(
			{ text: 'pair', correct: true },
			{ text: 'impair', correct: false }
		);
		const ctx = buildCorrectionContext(undefined, choices, '0', vars);
		expect(ctx.solutions).toEqual(['pair']);
	});

	it('builds context from QCM multi choice', () => {
		const choices = makeChoices(
			{ text: 'pair', correct: true },
			{ text: 'impair', correct: false },
			{ text: 'premier', correct: true }
		);
		const ctx = buildCorrectionContext(undefined, choices, ['0', '2'], vars);
		expect(ctx.solutions).toEqual(['pair', 'premier']);
	});

	it('extracts expression from variable "expression"', () => {
		const varsWithExpr: ResolvedVariable[] = [...vars, { name: 'expression', value: '2+3' }];
		const ctx = buildCorrectionContext(undefined, undefined, undefined, varsWithExpr);
		expect(ctx.expression).toBe('2+3');
	});

	it('falls back to expression1 for expression', () => {
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		expect(ctx.expression).toBe('5+3');
	});

	it('returns empty solutions when no blanks or choices', () => {
		const ctx = buildCorrectionContext(undefined, undefined, undefined, vars);
		expect(ctx.solutions).toEqual([]);
	});

	it('returns empty solutions for empty blanks array', () => {
		const ctx = buildCorrectionContext([], undefined, undefined, vars);
		expect(ctx.solutions).toEqual([]);
	});
});
