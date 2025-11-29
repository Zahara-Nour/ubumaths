import { describe, it, expect } from 'vitest';
import {
	convertPlaceholders,
	convertSinglePlaceholder,
	hasLegacyPlaceholders,
	findLegacyPlaceholders,
	convertPlaceholdersWithStats,
	convertPlaceholdersBatch,
	validatePlaceholderConversion,
	LEGACY_PLACEHOLDER_PATTERNS
} from './placeholder-converter';

/**
 * Helper function to test successful conversion
 */
function expectConversion(input: string, expected: string) {
	const result = convertPlaceholders(input);
	expect(result.converted).toBe(expected);
	expect(result.hasChanges).toBe(input !== expected);
}

/**
 * Helper function to test that changes are tracked correctly
 */
function expectChanges(
	input: string,
	expectedChanges: Array<{ original: string; replacement: string }>
) {
	const result = convertPlaceholders(input);
	expect(result.changes.length).toBe(expectedChanges.length);
	for (const expected of expectedChanges) {
		const found = result.changes.find(
			(c) => c.original === expected.original && c.replacement === expected.replacement
		);
		expect(found).toBeDefined();
	}
}

describe('Placeholder Converter', () => {
	describe('1. Solution Placeholder Tests', () => {
		it('should convert basic &sol', () => {
			expectConversion('&sol', '{{solution}}');
			expectConversion('The answer is &sol', 'The answer is {{solution}}');
			expectConversion('&sol is correct', '{{solution}} is correct');
		});

		it('should convert indexed &solN', () => {
			expectConversion('&sol1', '{{solution:1}}');
			expectConversion('&sol2', '{{solution:2}}');
			expectConversion('&sol10', '{{solution:10}}');
		});

		it('should convert &solution to HTML format', () => {
			expectConversion('&solution', '{{solution:html}}');
			expectConversion('Display: &solution', 'Display: {{solution:html}}');
		});

		it('should handle multiple solution placeholders', () => {
			expectConversion('&sol1 and &sol2', '{{solution:1}} and {{solution:2}}');
			expectConversion('First: &sol, second: &sol', 'First: {{solution}}, second: {{solution}}');
		});

		it('should not convert &solid or similar words', () => {
			expectConversion('&solid is not a placeholder', '&solid is not a placeholder');
			expectConversion('&solve this', '&solve this');
		});
	});

	describe('2. Answer Placeholder Tests', () => {
		it('should convert basic &answer', () => {
			expectConversion('&answer', '{{answer}}');
			expectConversion('Your answer: &answer', 'Your answer: {{answer}}');
		});

		it('should convert indexed &answerN', () => {
			expectConversion('&answer1', '{{answer:1}}');
			expectConversion('&answer2', '{{answer:2}}');
			expectConversion('&answer99', '{{answer:99}}');
		});

		it('should handle multiple answer placeholders', () => {
			expectConversion('&answer1 vs &answer2', '{{answer:1}} vs {{answer:2}}');
		});

		it('should not convert &answers or similar words', () => {
			expectConversion('&answers are here', '&answers are here');
		});
	});

	describe('3. Expression Placeholder Tests', () => {
		it('should convert &expression', () => {
			expectConversion('&expression', '{{expression}}');
			expectConversion('Evaluate &expression', 'Evaluate {{expression}}');
		});

		it('should convert &exp to raw expression', () => {
			expectConversion('&exp', '{{expression:raw}}');
			expectConversion('The &exp value', 'The {{expression:raw}} value');
		});

		it('should not convert &expressive or similar words', () => {
			expectConversion('&expressive', '&expressive');
			expectConversion('&expressions', '&expressions');
		});
	});

	describe('4. Numbered Variable Tests', () => {
		it('should convert single digit variables to letters', () => {
			expectConversion('&1', '{{a}}');
			expectConversion('&2', '{{b}}');
			expectConversion('&9', '{{i}}');
		});

		it('should convert multi-digit variables to letters', () => {
			expectConversion('&10', '{{j}}');
			expectConversion('&99', '{{cu}}');
			expectConversion('&123', '{{ds}}');
		});

		it('should handle multiple numbered variables', () => {
			expectConversion('&1 + &2 = &3', '{{a}} + {{b}} = {{c}}');
			expectConversion('Values: &1, &2, &3', 'Values: {{a}}, {{b}}, {{c}}');
		});

		it('should convert consecutive numbered variables', () => {
			expectConversion('&1&2&3', '{{a}}{{b}}{{c}}');
		});

		it('should not convert &1a or similar patterns', () => {
			// Variables with letters after should not be matched by numbered pattern
			expectConversion('&1a', '&1a');
		});
	});

	describe('5. Color Reference Tests', () => {
		it('should convert ${get(colorName)}', () => {
			expectConversion('${get(color1)}', '{{color:color1}}');
			expectConversion('${get(color2)}', '{{color:color2}}');
			expectConversion('${get(couleur1)}', '{{color:couleur1}}');
		});

		it('should convert ${colorName} shorthand', () => {
			expectConversion('${color1}', '{{color:color1}}');
			expectConversion('${myColor}', '{{color:myColor}}');
		});

		it('should handle multiple color references', () => {
			expectConversion(
				'${get(color1)} and ${get(color2)}',
				'{{color:color1}} and {{color:color2}}'
			);
		});

		it('should not convert LaTeX $ (escaped)', () => {
			// LaTeX uses \$ which should not trigger color conversion
			expectConversion('\\${something}', '\\${something}');
		});

		it('should handle colors in context', () => {
			expectConversion(
				'The ${get(color1)} box is next to the ${get(color2)} circle',
				'The {{color:color1}} box is next to the {{color:color2}} circle'
			);
		});
	});

	describe('6. Mixed Placeholder Tests', () => {
		it('should convert multiple different placeholder types', () => {
			expectConversion('Answer &sol with &1', 'Answer {{solution}} with {{a}}');
			expectConversion(
				'&answer equals &sol at position &1',
				'{{answer}} equals {{solution}} at position {{a}}'
			);
		});

		it('should handle complex mixed content', () => {
			expectConversion(
				'&1 + &2 = &sol, color: ${get(color1)}',
				'{{a}} + {{b}} = {{solution}}, color: {{color:color1}}'
			);
		});

		it('should preserve surrounding text', () => {
			expectConversion(
				'Calculate &expression where x = &1 and y = &2',
				'Calculate {{expression}} where x = {{a}} and y = {{b}}'
			);
		});
	});

	describe('7. Edge Cases', () => {
		it('should handle empty string', () => {
			const result = convertPlaceholders('');
			expect(result.converted).toBe('');
			expect(result.hasChanges).toBe(false);
			expect(result.changes).toHaveLength(0);
		});

		it('should handle string without placeholders', () => {
			expectConversion('No placeholders here', 'No placeholders here');
			expectConversion('Just plain text', 'Just plain text');
		});

		it('should handle placeholders at boundaries', () => {
			expectConversion('&sol', '{{solution}}');
			expectConversion('&sol at start', '{{solution}} at start');
			expectConversion('at end &sol', 'at end {{solution}}');
		});

		it('should handle adjacent placeholders', () => {
			expectConversion('&sol&answer', '{{solution}}{{answer}}');
			expectConversion('&1&2&3', '{{a}}{{b}}{{c}}');
		});

		it('should preserve LaTeX content', () => {
			// LaTeX math should be preserved
			expectConversion('$$&1 + &2$$', '$${{a}} + {{b}}$$');
			expectConversion('$x^2$ and &1', '$x^2$ and {{a}}');
		});

		it('should handle newlines and whitespace', () => {
			expectConversion('&1\n&2\n&3', '{{a}}\n{{b}}\n{{c}}');
			expectConversion('&1\t&2', '{{a}}\t{{b}}');
		});
	});

	describe('8. convertSinglePlaceholder Tests', () => {
		it('should convert individual placeholders correctly', () => {
			expect(convertSinglePlaceholder('&sol')).toBe('{{solution}}');
			expect(convertSinglePlaceholder('&sol1')).toBe('{{solution:1}}');
			expect(convertSinglePlaceholder('&solution')).toBe('{{solution:html}}');
			expect(convertSinglePlaceholder('&answer')).toBe('{{answer}}');
			expect(convertSinglePlaceholder('&answer2')).toBe('{{answer:2}}');
			expect(convertSinglePlaceholder('&expression')).toBe('{{expression}}');
			expect(convertSinglePlaceholder('&exp')).toBe('{{expression:raw}}');
			expect(convertSinglePlaceholder('&1')).toBe('{{a}}');
			expect(convertSinglePlaceholder('&42')).toBe('{{ap}}');
			expect(convertSinglePlaceholder('${get(color1)}')).toBe('{{color:color1}}');
			expect(convertSinglePlaceholder('${myColor}')).toBe('{{color:myColor}}');
		});

		it('should return unrecognized placeholders as-is', () => {
			expect(convertSinglePlaceholder('&unknown')).toBe('&unknown');
			expect(convertSinglePlaceholder('not a placeholder')).toBe('not a placeholder');
		});
	});

	describe('9. hasLegacyPlaceholders Tests', () => {
		it('should detect legacy placeholders', () => {
			expect(hasLegacyPlaceholders('&sol')).toBe(true);
			expect(hasLegacyPlaceholders('&answer')).toBe(true);
			expect(hasLegacyPlaceholders('&expression')).toBe(true);
			expect(hasLegacyPlaceholders('&1')).toBe(true);
			expect(hasLegacyPlaceholders('${get(color1)}')).toBe(true);
		});

		it('should return false for new syntax', () => {
			expect(hasLegacyPlaceholders('{{solution}}')).toBe(false);
			expect(hasLegacyPlaceholders('{{1}}')).toBe(false);
			expect(hasLegacyPlaceholders('{{color:color1}}')).toBe(false);
		});

		it('should return false for empty input', () => {
			expect(hasLegacyPlaceholders('')).toBe(false);
		});

		it('should return false for plain text', () => {
			expect(hasLegacyPlaceholders('No placeholders')).toBe(false);
		});
	});

	describe('10. findLegacyPlaceholders Tests', () => {
		it('should find all legacy placeholders', () => {
			const found = findLegacyPlaceholders('&sol and &1 and &answer');
			expect(found).toContain('&sol');
			expect(found).toContain('&1');
			expect(found).toContain('&answer');
		});

		it('should return unique placeholders', () => {
			const found = findLegacyPlaceholders('&sol and &sol and &sol');
			expect(found.filter((p) => p === '&sol')).toHaveLength(1);
		});

		it('should return empty array for no placeholders', () => {
			expect(findLegacyPlaceholders('No placeholders')).toHaveLength(0);
			expect(findLegacyPlaceholders('')).toHaveLength(0);
		});
	});

	describe('11. Statistics Tests', () => {
		it('should track solution conversions', () => {
			const result = convertPlaceholdersWithStats('&sol and &sol1');
			expect(result.stats.solutions).toBe(2);
		});

		it('should track answer conversions', () => {
			const result = convertPlaceholdersWithStats('&answer and &answer1');
			expect(result.stats.answers).toBe(2);
		});

		it('should track expression conversions', () => {
			const result = convertPlaceholdersWithStats('&expression and &exp');
			expect(result.stats.expressions).toBe(2);
		});

		it('should track numbered variable conversions', () => {
			const result = convertPlaceholdersWithStats('&1 + &2 + &3');
			expect(result.stats.numberedVariables).toBe(3);
		});

		it('should track color reference conversions', () => {
			const result = convertPlaceholdersWithStats('${get(color1)} and ${color2}');
			expect(result.stats.colorReferences).toBe(2);
		});

		it('should track total conversions', () => {
			const result = convertPlaceholdersWithStats('&sol with &1 and ${get(color1)}');
			expect(result.stats.total).toBe(3);
		});
	});

	describe('12. Batch Conversion Tests', () => {
		it('should convert multiple strings', () => {
			const inputs = ['&sol', '&1 + &2', '${get(color1)}'];
			const results = convertPlaceholdersBatch(inputs);

			expect(results).toHaveLength(3);
			expect(results[0].converted).toBe('{{solution}}');
			expect(results[1].converted).toBe('{{a}} + {{b}}');
			expect(results[2].converted).toBe('{{color:color1}}');
		});

		it('should handle empty array', () => {
			const results = convertPlaceholdersBatch([]);
			expect(results).toHaveLength(0);
		});
	});

	describe('13. Validation Tests', () => {
		it('should validate successful conversions', () => {
			expect(validatePlaceholderConversion('&sol', '{{solution}}')).toBe(true);
			expect(validatePlaceholderConversion('&1 + &2', '{{a}} + {{b}}')).toBe(true);
		});

		it('should detect incomplete conversions', () => {
			expect(validatePlaceholderConversion('&sol and &answer', '{{solution}} and &answer')).toBe(
				false
			);
		});

		it('should detect missing new syntax', () => {
			expect(validatePlaceholderConversion('&sol', 'something else')).toBe(false);
		});

		it('should pass for strings without placeholders', () => {
			expect(validatePlaceholderConversion('plain text', 'plain text')).toBe(true);
		});
	});

	describe('14. Change Tracking Tests', () => {
		it('should track changes with positions', () => {
			const result = convertPlaceholders('The &sol is here');
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0].original).toBe('&sol');
			expect(result.changes[0].replacement).toBe('{{solution}}');
			expect(result.changes[0].position).toBe(4);
		});

		it('should track multiple changes', () => {
			expectChanges('&1 and &2', [
				{ original: '&1', replacement: '{{a}}' },
				{ original: '&2', replacement: '{{b}}' }
			]);
		});
	});

	describe('15. Real-World Correction Text Tests', () => {
		it('should convert typical correction format', () => {
			expectConversion(
				'La réponse est &sol car &1 + &2 = &sol.',
				'La réponse est {{solution}} car {{a}} + {{b}} = {{solution}}.'
			);
		});

		it('should handle correction with expression', () => {
			expectConversion(
				"L'expression &expression donne &sol.",
				"L'expression {{expression}} donne {{solution}}."
			);
		});

		it('should handle answer comparison', () => {
			expectConversion(
				'Votre réponse &answer est correcte: &sol',
				'Votre réponse {{answer}} est correcte: {{solution}}'
			);
		});

		it('should handle colored elements in correction', () => {
			expectConversion(
				'Le rectangle ${get(color1)} a une aire de &sol.',
				'Le rectangle {{color:color1}} a une aire de {{solution}}.'
			);
		});

		it('should handle multi-solution corrections', () => {
			expectConversion(
				'Les solutions sont &sol1 et &sol2.',
				'Les solutions sont {{solution:1}} et {{solution:2}}.'
			);
		});
	});

	describe('16. Pattern Definition Tests', () => {
		it('should have all required pattern definitions', () => {
			expect(LEGACY_PLACEHOLDER_PATTERNS.solution).toBeInstanceOf(RegExp);
			expect(LEGACY_PLACEHOLDER_PATTERNS.solutionHtml).toBeInstanceOf(RegExp);
			expect(LEGACY_PLACEHOLDER_PATTERNS.answer).toBeInstanceOf(RegExp);
			expect(LEGACY_PLACEHOLDER_PATTERNS.expression).toBeInstanceOf(RegExp);
			expect(LEGACY_PLACEHOLDER_PATTERNS.expressionRaw).toBeInstanceOf(RegExp);
			expect(LEGACY_PLACEHOLDER_PATTERNS.numberedVariable).toBeInstanceOf(RegExp);
			expect(LEGACY_PLACEHOLDER_PATTERNS.color).toBeInstanceOf(RegExp);
		});

		it('should have global flag on all patterns', () => {
			for (const pattern of Object.values(LEGACY_PLACEHOLDER_PATTERNS)) {
				expect(pattern.global).toBe(true);
			}
		});
	});
});
