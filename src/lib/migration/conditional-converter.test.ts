import { describe, it, expect } from 'vitest';
import {
	convertConditionals,
	convertConditionVariables,
	convertSingleConditional,
	convertPairedConditional,
	hasLegacyConditionals,
	findLegacyConditionals,
	areMutuallyExclusive,
	convertConditionalsWithStats,
	convertConditionalsBatch,
	validateConditionalConversion,
	countLegacyConditionals,
	extractConditions,
	CONDITIONAL_PATTERNS
} from './conditional-converter';

/**
 * Helper function to test successful conversion
 */
function expectConversion(input: string, expected: string) {
	const result = convertConditionals(input);
	expect(result.converted).toBe(expected);
	expect(result.hasChanges).toBe(input !== expected);
}

/**
 * Helper function to test that changes are tracked correctly
 */
function expectChanges(
	input: string,
	expectedChanges: Array<{ original: string; replacement: string; type: 'single' | 'paired' }>
) {
	const result = convertConditionals(input);
	expect(result.changes.length).toBe(expectedChanges.length);
	for (const expected of expectedChanges) {
		const found = result.changes.find(
			(c) =>
				c.original === expected.original &&
				c.replacement === expected.replacement &&
				c.type === expected.type
		);
		expect(found).toBeDefined();
	}
}

describe('Conditional Converter', () => {
	describe('1. Variable Conversion in Conditions', () => {
		it('should convert single digit variables', () => {
			expect(convertConditionVariables('&1')).toBe('{{1}}');
			expect(convertConditionVariables('&2')).toBe('{{2}}');
			expect(convertConditionVariables('&9')).toBe('{{9}}');
		});

		it('should convert multi-digit variables', () => {
			expect(convertConditionVariables('&10')).toBe('{{10}}');
			expect(convertConditionVariables('&99')).toBe('{{99}}');
		});

		it('should convert multiple variables', () => {
			expect(convertConditionVariables('&1+&2')).toBe('{{1}}+{{2}}');
			expect(convertConditionVariables('&2+&3<60')).toBe('{{2}}+{{3}}<60');
		});

		it('should handle variables in function calls', () => {
			expect(convertConditionVariables('mod(&1;2)=0')).toBe('mod({{1}};2)=0');
			expect(convertConditionVariables('pgcd(&3;&1)=1')).toBe('pgcd({{3}};{{1}})=1');
		});

		it('should preserve spaces', () => {
			expect(convertConditionVariables('&1 + &2 = &3')).toBe('{{1}} + {{2}} = {{3}}');
			expect(convertConditionVariables('&5 < &6')).toBe('{{5}} < {{6}}');
		});

		it('should handle empty or null input', () => {
			expect(convertConditionVariables('')).toBe('');
		});

		it('should not convert variables followed by letters', () => {
			// This pattern should not match &1a (handled by other converters)
			expect(convertConditionVariables('&1a')).toBe('&1a');
		});
	});

	describe('2. Mutually Exclusive Detection', () => {
		it('should detect < and >= as mutually exclusive', () => {
			expect(areMutuallyExclusive('&2+&3<60', '&2+&3>=60')).toBe(true);
			expect(areMutuallyExclusive('&1<5', '&1>=5')).toBe(true);
		});

		it('should detect > and <= as mutually exclusive', () => {
			expect(areMutuallyExclusive('&1>10', '&1<=10')).toBe(true);
		});

		it('should detect = and != as mutually exclusive', () => {
			expect(areMutuallyExclusive('mod(&1;2)=0', 'mod(&1;2)!=0')).toBe(true);
			expect(areMutuallyExclusive('pgcd(&3;&1)=1', 'pgcd(&3;&1)!=1')).toBe(true);
		});

		it('should detect adjacent numeric values as mutually exclusive', () => {
			// <60 and >59 are effectively exclusive for integers
			expect(areMutuallyExclusive('&2+&3<60', '&2+&3>59')).toBe(true);
			expect(areMutuallyExclusive('&1>10', '&1<11')).toBe(true);
		});

		it('should not consider different expressions as mutually exclusive', () => {
			expect(areMutuallyExclusive('&1<5', '&2>=5')).toBe(false);
			expect(areMutuallyExclusive('&1+&2<60', '&3+&4>=60')).toBe(false);
		});

		it('should not consider same operators as mutually exclusive', () => {
			expect(areMutuallyExclusive('&1<5', '&1<10')).toBe(false);
		});

		it('should handle empty input', () => {
			expect(areMutuallyExclusive('', '&1>=5')).toBe(false);
			expect(areMutuallyExclusive('&1<5', '')).toBe(false);
		});

		it('should handle whitespace differences', () => {
			expect(areMutuallyExclusive('&1 < 5', '&1>=5')).toBe(true);
			expect(areMutuallyExclusive('&1<5', '&1 >= 5')).toBe(true);
		});
	});

	describe('3. Single Conditional Conversion', () => {
		it('should convert basic single conditionals', () => {
			expectConversion('@@&1<5 ?? text@@', '{{if:{{1}}<5|text}}');
			expectConversion('@@&2+&3<60 ?? Simple@@', '{{if:{{2}}+{{3}}<60|Simple}}');
		});

		it('should convert conditionals with function calls', () => {
			expectConversion('@@mod(&1;2)=0 ?? even@@', '{{if:mod({{1}};2)=0|even}}');
			expectConversion('@@pgcd(&3;&1)=1 ?? coprime@@', '{{if:pgcd({{3}};{{1}})=1|coprime}}');
		});

		it('should handle whitespace in conditionals', () => {
			expectConversion('@@ &1 < 5 ?? text @@', '{{if:{{1}} < 5|text}}');
			expectConversion('@@  &1<5  ??  text  @@', '{{if:{{1}}<5|text}}');
		});

		it('should preserve surrounding text', () => {
			expectConversion('Before @@&1<5 ?? text@@ after', 'Before {{if:{{1}}<5|text}} after');
		});

		it('should convert multiple non-paired conditionals', () => {
			expectConversion(
				'@@&1<5 ?? small@@ some text @@&2>10 ?? big@@',
				'{{if:{{1}}<5|small}} some text {{if:{{2}}>10|big}}'
			);
		});
	});

	describe('4. Paired (If/Else) Conditional Conversion', () => {
		it('should convert basic paired conditionals', () => {
			expectConversion(
				'@@&2+&3<60 ?? Simple @@ @@&2+&3>=60 ?? Avec retenue @@',
				'{{if:{{2}}+{{3}}<60|Simple|Avec retenue}}'
			);
		});

		it('should convert paired conditionals with adjacent values', () => {
			expectConversion(
				'@@&2+&3<60 ?? Simple @@ @@&2+&3>59 ?? Avec retenue @@',
				'{{if:{{2}}+{{3}}<60|Simple|Avec retenue}}'
			);
		});

		it('should convert conditionals with = and !=', () => {
			expectConversion(
				'@@mod(&1;2)=0 ?? even@@ @@mod(&1;2)!=0 ?? odd@@',
				'{{if:mod({{1}};2)=0|even|odd}}'
			);
		});

		it('should handle multiple pairs', () => {
			const input = '@@&1<5 ?? small@@ @@&1>=5 ?? big@@ and @@&2=0 ?? zero@@ @@&2!=0 ?? nonzero@@';
			const result = convertConditionals(input);
			expect(result.converted).toBe('{{if:{{1}}<5|small|big}} and {{if:{{2}}=0|zero|nonzero}}');
		});

		it('should preserve text between pairs', () => {
			expectConversion(
				'Start @@&1<5 ?? small@@ @@&1>=5 ?? big@@ end',
				'Start {{if:{{1}}<5|small|big}} end'
			);
		});
	});

	describe('5. Real-World Examples from Codebase', () => {
		it('should convert divisibility check (mod)', () => {
			const input =
				'@@ mod(&1;2)=0 ?? &solution, $$[_&1_]$$ est divisible par $$2$$ car il se termine par $$0$$,$$2$$,$$4$$,$$6$$ ou $$8$$.@@' +
				"@@ mod(&1;2)!=0 ?? &solution, $$[_&1_]$$ n'est <b>pas</b> divisible par $$2$$ car il se termine par $$1$$,$$3$$,$$5$$,$$7$$ ou $$9$$.@@";
			const result = convertConditionals(input);

			expect(result.hasChanges).toBe(true);
			expect(result.changes.length).toBe(1);
			expect(result.changes[0].type).toBe('paired');
			expect(result.converted).toContain('{{if:mod({{1}};2)=0|');
		});

		it('should convert time addition with carry check', () => {
			const input = '@@&2+&3<60 ?? Simple @@ @@&2+&3>59 ?? Avec retenue @@';
			const result = convertConditionals(input);

			expect(result.converted).toBe('{{if:{{2}}+{{3}}<60|Simple|Avec retenue}}');
		});

		it('should convert probability simplification check', () => {
			const input =
				'@@ pgcd(&3;&1)=1 ?? La probabilite est donc &solution1.@@ ' +
				'@@ pgcd(&3;&1)!=1 ?? La probabilite est donc $$\\frac{&3}{&1}=&sol1$$.@@';
			const result = convertConditionals(input);

			expect(result.hasChanges).toBe(true);
			expect(result.changes[0].type).toBe('paired');
		});

		it('should convert comparison conditionals', () => {
			const input =
				'@@ &5 < &6 ?? &solution est plus petite que $$[&6]$$ car $$[&5]<1$$ et $$[&6]>1$$@@ ' +
				'@@ &5 > &6 ?? &solution est plus petite que $$[&5]$$ car $$[&6]<1$$ et $$[&5]>1$$@@';
			const result = convertConditionals(input);

			// These are not mutually exclusive (< and > with same values)
			// So they should be converted as two single conditionals
			expect(result.changes.length).toBe(2);
		});
	});

	describe('6. Helper Functions', () => {
		describe('convertSingleConditional', () => {
			it('should convert condition and text', () => {
				expect(convertSingleConditional('&1<5', 'small')).toBe('{{if:{{1}}<5|small}}');
				expect(convertSingleConditional('&2+&3<60', 'Simple')).toBe('{{if:{{2}}+{{3}}<60|Simple}}');
			});

			it('should trim whitespace', () => {
				expect(convertSingleConditional('  &1<5  ', '  text  ')).toBe('{{if:{{1}}<5|text}}');
			});
		});

		describe('convertPairedConditional', () => {
			it('should convert condition with then and else text', () => {
				expect(convertPairedConditional('&1<5', 'small', 'big')).toBe('{{if:{{1}}<5|small|big}}');
			});

			it('should trim whitespace', () => {
				expect(convertPairedConditional('  &1<5  ', '  then  ', '  else  ')).toBe(
					'{{if:{{1}}<5|then|else}}'
				);
			});
		});
	});

	describe('7. Detection Functions', () => {
		describe('hasLegacyConditionals', () => {
			it('should detect legacy conditionals', () => {
				expect(hasLegacyConditionals('@@&1<5 ?? text@@')).toBe(true);
				expect(hasLegacyConditionals('some @@&1<5 ?? text@@ text')).toBe(true);
			});

			it('should return false for new syntax', () => {
				expect(hasLegacyConditionals('{{if:{{1}}<5|text}}')).toBe(false);
			});

			it('should return false for empty input', () => {
				expect(hasLegacyConditionals('')).toBe(false);
			});

			it('should return false for plain text', () => {
				expect(hasLegacyConditionals('No conditionals here')).toBe(false);
			});
		});

		describe('findLegacyConditionals', () => {
			it('should find all conditionals', () => {
				const found = findLegacyConditionals('@@&1<5 ?? small@@ and @@&2>10 ?? big@@');
				expect(found).toHaveLength(2);
				expect(found[0].condition).toBe('&1<5');
				expect(found[0].text).toBe('small');
				expect(found[1].condition).toBe('&2>10');
				expect(found[1].text).toBe('big');
			});

			it('should return empty array for no conditionals', () => {
				expect(findLegacyConditionals('No conditionals')).toHaveLength(0);
				expect(findLegacyConditionals('')).toHaveLength(0);
			});
		});

		describe('countLegacyConditionals', () => {
			it('should count conditionals correctly', () => {
				expect(countLegacyConditionals('@@&1<5 ?? text@@')).toBe(1);
				expect(countLegacyConditionals('@@&1<5 ?? a@@ @@&2>10 ?? b@@')).toBe(2);
				expect(countLegacyConditionals('No conditionals')).toBe(0);
			});
		});

		describe('extractConditions', () => {
			it('should extract unique conditions', () => {
				const conditions = extractConditions('@@&1<5 ?? a@@ @@&1<5 ?? b@@ @@&2>10 ?? c@@');
				expect(conditions).toContain('&1<5');
				expect(conditions).toContain('&2>10');
				expect(conditions.filter((c) => c === '&1<5')).toHaveLength(1);
			});
		});
	});

	describe('8. Edge Cases', () => {
		it('should handle empty string', () => {
			const result = convertConditionals('');
			expect(result.converted).toBe('');
			expect(result.hasChanges).toBe(false);
			expect(result.changes).toHaveLength(0);
		});

		it('should handle string without conditionals', () => {
			expectConversion('No conditionals here', 'No conditionals here');
			expectConversion('Just plain text', 'Just plain text');
		});

		it('should handle conditionals at boundaries', () => {
			expectConversion('@@&1<5 ?? text@@', '{{if:{{1}}<5|text}}');
			expectConversion('@@&1<5 ?? text@@ at end', '{{if:{{1}}<5|text}} at end');
			expectConversion('at start @@&1<5 ?? text@@', 'at start {{if:{{1}}<5|text}}');
		});

		it('should handle newlines and whitespace between pairs', () => {
			expectConversion('@@&1<5 ?? small@@\n@@&1>=5 ?? big@@', '{{if:{{1}}<5|small|big}}');
			expectConversion('@@&1<5 ?? small@@\t@@&1>=5 ?? big@@', '{{if:{{1}}<5|small|big}}');
		});

		it('should preserve LaTeX content in text', () => {
			expectConversion('@@&1<5 ?? $$x^2$$@@', '{{if:{{1}}<5|$$x^2$$}}');
		});

		it('should handle special characters in text', () => {
			expectConversion('@@&1<5 ?? <b>bold</b>@@', '{{if:{{1}}<5|<b>bold</b>}}');
		});
	});

	describe('9. Statistics Tests', () => {
		it('should track single conditional conversions', () => {
			const result = convertConditionalsWithStats('@@&1<5 ?? a@@ text @@&2>10 ?? b@@');
			expect(result.stats.single).toBe(2);
			expect(result.stats.paired).toBe(0);
			expect(result.stats.total).toBe(2);
		});

		it('should track paired conditional conversions', () => {
			const result = convertConditionalsWithStats('@@&1<5 ?? small@@ @@&1>=5 ?? big@@');
			expect(result.stats.single).toBe(0);
			expect(result.stats.paired).toBe(1);
			expect(result.stats.total).toBe(1);
		});

		it('should track mixed conversions', () => {
			const result = convertConditionalsWithStats(
				'@@&1<5 ?? small@@ @@&1>=5 ?? big@@ and @@&3=0 ?? zero@@'
			);
			expect(result.stats.single).toBe(1);
			expect(result.stats.paired).toBe(1);
			expect(result.stats.total).toBe(2);
		});
	});

	describe('10. Batch Conversion Tests', () => {
		it('should convert multiple strings', () => {
			const inputs = ['@@&1<5 ?? small@@', '@@&1<5 ?? a@@ @@&1>=5 ?? b@@', 'No conditionals'];
			const results = convertConditionalsBatch(inputs);

			expect(results).toHaveLength(3);
			expect(results[0].converted).toBe('{{if:{{1}}<5|small}}');
			expect(results[1].converted).toBe('{{if:{{1}}<5|a|b}}');
			expect(results[2].converted).toBe('No conditionals');
		});

		it('should handle empty array', () => {
			const results = convertConditionalsBatch([]);
			expect(results).toHaveLength(0);
		});
	});

	describe('11. Validation Tests', () => {
		it('should validate successful conversions', () => {
			expect(validateConditionalConversion('@@&1<5 ?? text@@', '{{if:{{1}}<5|text}}')).toBe(true);
			expect(
				validateConditionalConversion('@@&1<5 ?? a@@ @@&1>=5 ?? b@@', '{{if:{{1}}<5|a|b}}')
			).toBe(true);
		});

		it('should detect incomplete conversions', () => {
			expect(
				validateConditionalConversion(
					'@@&1<5 ?? a@@ @@&2>10 ?? b@@',
					'{{if:{{1}}<5|a}} @@&2>10 ?? b@@'
				)
			).toBe(false);
		});

		it('should detect missing new syntax', () => {
			expect(validateConditionalConversion('@@&1<5 ?? text@@', 'something else')).toBe(false);
		});

		it('should pass for strings without conditionals', () => {
			expect(validateConditionalConversion('plain text', 'plain text')).toBe(true);
		});
	});

	describe('12. Change Tracking Tests', () => {
		it('should track changes with positions', () => {
			const result = convertConditionals('The @@&1<5 ?? text@@ is here');
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0].original).toBe('@@&1<5 ?? text@@');
			expect(result.changes[0].replacement).toBe('{{if:{{1}}<5|text}}');
			expect(result.changes[0].position).toBe(4);
			expect(result.changes[0].type).toBe('single');
		});

		it('should track paired changes', () => {
			expectChanges('@@&1<5 ?? small@@ @@&1>=5 ?? big@@', [
				{
					original: '@@&1<5 ?? small@@ @@&1>=5 ?? big@@',
					replacement: '{{if:{{1}}<5|small|big}}',
					type: 'paired'
				}
			]);
		});

		it('should track multiple changes', () => {
			const result = convertConditionals('@@&1<5 ?? a@@ text @@&2>10 ?? b@@');
			expect(result.changes).toHaveLength(2);
			expect(result.changes[0].type).toBe('single');
			expect(result.changes[1].type).toBe('single');
		});
	});

	describe('13. Pattern Definition Tests', () => {
		it('should have all required pattern definitions', () => {
			expect(CONDITIONAL_PATTERNS.single).toBeInstanceOf(RegExp);
			expect(CONDITIONAL_PATTERNS.variable).toBeInstanceOf(RegExp);
		});

		it('should have global flag on all patterns', () => {
			for (const pattern of Object.values(CONDITIONAL_PATTERNS)) {
				expect(pattern.global).toBe(true);
			}
		});
	});

	describe('14. Complex Nested Content', () => {
		it('should handle LaTeX in conditional text', () => {
			expectConversion(
				'@@&5>=10 ?? $$&1\\times &3 = [_(&5-&6):10_]\\textcolor{${get(correct_color)}}{&6}$$@@',
				'{{if:{{5}}>=10|$$&1\\times &3 = [_(&5-&6):10_]\\textcolor{${get(correct_color)}}{&6}$$}}'
			);
		});

		it('should handle multiple LaTeX expressions', () => {
			expectConversion('@@&1<5 ?? $$x^2$$ and $$y^2$$@@', '{{if:{{1}}<5|$$x^2$$ and $$y^2$$}}');
		});

		it('should handle HTML tags in text', () => {
			expectConversion(
				"@@mod(&1;2)!=0 ?? n'est <b>pas</b> divisible@@",
				"{{if:mod({{1}};2)!=0|n'est <b>pas</b> divisible}}"
			);
		});
	});
});
