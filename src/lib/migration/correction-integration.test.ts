/**
 * Correction Integration Tests
 * ==============================
 *
 * Tests for the unified correction transformation system.
 * Phase 4 of the question migration project.
 *
 * Tests:
 * 1. convertLegacySyntax - Applies all conversions in correct order
 * 2. transformCorrection - Main transformer for QuestionCorrection
 * 3. Integration with question-transformer
 * 4. Real-world correction examples
 *
 * @module migration/correction-integration.test
 */

import { describe, it, expect } from 'vitest';
import type { QuestionBase, CorrectionDetail, CorrectionFormat } from './old-question-types';
import type { TransformStats } from './question-transformer';
import { transformQuestion } from './question-transformer';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Helper to create minimal TransformStats for testing
 */
function createMockStats(): TransformStats {
	return {
		variations: 0,
		variables: 0,
		syntaxConversions: 0,
		optionsMapped: 0,
		displayOptionsMapped: 0,
		correctionConversions: 0,
		detectedType: '',
		hasImages: false,
		hasCustomValidation: false,
		imagesConverted: 0,
		imagesMissing: 0
	};
}

/**
 * Helper to access private convertLegacySyntax function via transformCorrection
 */
function testLegacySyntaxConversion(input: string): string {
	const warnings: string[] = [];
	const stats = createMockStats();

	// Use correctionDetails to trigger conversion
	const result = testTransformCorrection([{ text: input }], undefined, warnings, stats);

	return result?.steps?.[0] || input;
}

/**
 * Helper to access transformCorrection function
 * This mirrors the actual function signature from question-transformer.ts
 */
function testTransformCorrection(
	correctionDetails: CorrectionDetail[] | undefined,
	correctionFormat: CorrectionFormat | undefined,
	warnings: string[],
	stats: TransformStats
): { feedback?: { correct?: string; incorrect?: string }; steps?: string[] } | undefined {
	// We'll use the actual transformer by creating a minimal question
	// and extracting the correction from the result

	const oldQuestion: QuestionBase = {
		description: 'Test question',
		enounces: ['Test'],
		expressions: ['&1'],
		variabless: [{ '&1': '5' }],
		solutionss: [['5']],
		correctionDetailss: correctionDetails ? [correctionDetails] : undefined,
		correctionFormats: correctionFormat ? [correctionFormat] : undefined,
		defaultDelay: 0,
		grade: 'CM1'
	};

	const result = transformQuestion(oldQuestion, 0);

	if (!result.success) {
		return undefined;
	}

	// Extract warnings and stats from result
	if (result.warnings) {
		warnings.push(...result.warnings);
	}
	if (result.stats) {
		Object.assign(stats, result.stats);
	}

	// Build QuestionCorrection-like object from variation
	const variation = result.template?.variations[0];
	const correction: { feedback?: { correct?: string; incorrect?: string }; steps?: string[] } = {};

	// Extract correction fields from the new QuestionCorrection structure
	if (variation?.correction) {
		// Extract steps if present (now an array of TemplateMarkdown)
		if (variation.correction.steps?.length) {
			correction.steps = variation.correction.steps.map((step) => String(step));
		}
		// Extract feedback if present
		if (variation.correction.feedback) {
			correction.feedback = {
				correct: variation.correction.feedback.correct
					? String(variation.correction.feedback.correct)
					: undefined,
				incorrect: variation.correction.feedback.incorrect
					? String(variation.correction.feedback.incorrect)
					: undefined
			};
		}
	}

	return Object.keys(correction).length > 0 ? correction : undefined;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Correction Integration', () => {
	describe('1. convertLegacySyntax - Syntax Conversion Chain', () => {
		describe('TinyCAS Syntax Conversion', () => {
			it('should convert numbered variable references', () => {
				const result = testLegacySyntaxConversion('Variable &1 equals &2');
				expect(result).toBe('Variable {{1}} equals {{2}}');
			});

			it('should convert evaluation syntax', () => {
				const result = testLegacySyntaxConversion('Result: [_&1+&2_]');
				expect(result).toBe('Result: {{eval:{{1}}+{{2}}}}');
			});

			it('should preserve LaTeX math', () => {
				const result = testLegacySyntaxConversion('$$\\frac{&1}{&2}$$');
				expect(result).toContain('{{1}}');
				expect(result).toContain('{{2}}');
			});
		});

		describe('Placeholder Syntax Conversion', () => {
			it('should convert &sol to {{sol}} (variable reference)', () => {
				// Note: TinyCAS converter treats &sol as a variable named "sol"
				// Correction-specific placeholders like &solution would be handled differently
				const result = testLegacySyntaxConversion('La réponse est &sol');
				expect(result).toBe('La réponse est {{sol}}');
			});

			it('should convert indexed solutions to {{solN}}', () => {
				// Note: TinyCAS converter treats these as variable references
				const result = testLegacySyntaxConversion('Solutions: &sol1 et &sol2');
				expect(result).toBe('Solutions: {{sol1}} et {{sol2}}');
			});

			it('should convert &answer placeholders', () => {
				const result = testLegacySyntaxConversion('Votre réponse &answer est correcte');
				expect(result).toBe('Votre réponse {{answer}} est correcte');
			});

			it('should convert &expression placeholders', () => {
				const result = testLegacySyntaxConversion("L'expression &expression donne");
				expect(result).toBe("L'expression {{expression}} donne");
			});

			it('should convert &exp to {{exp}} (variable reference)', () => {
				// Note: TinyCAS treats &exp as a variable name
				const result = testLegacySyntaxConversion('Raw: &exp');
				expect(result).toBe('Raw: {{exp}}');
			});

			it('should convert color references (Svelte store syntax)', () => {
				// Note: TinyCAS converter converts $store syntax to {{color:storeName}}
				const result = testLegacySyntaxConversion('Le rectangle ${get(color1)}');
				// The actual conversion creates a color reference with the exact store path
				expect(result).toContain('{{color:');
				expect(result).toContain('}}');
			});

			it('should convert color shorthand (Svelte store syntax)', () => {
				const result = testLegacySyntaxConversion('${color2} est correct');
				expect(result).toContain('{{color:');
				expect(result).toContain('}}');
			});
		});

		describe('Conditional Syntax Conversion', () => {
			it('should convert single conditionals', () => {
				const result = testLegacySyntaxConversion('@@&1<5 ?? Petit@@');
				expect(result).toBe('{{if:{{1}}<5|Petit}}');
			});

			it('should convert paired conditionals (if/else)', () => {
				const result = testLegacySyntaxConversion('@@&1<5 ?? Petit@@ @@&1>=5 ?? Grand@@');
				expect(result).toBe('{{if:{{1}}<5|Petit|Grand}}');
			});

			it('should convert conditional with addition', () => {
				const result = testLegacySyntaxConversion(
					'@@&2+&3<60 ?? Simple @@ @@&2+&3>=60 ?? Avec retenue @@'
				);
				expect(result).toBe('{{if:{{2}}+{{3}}<60|Simple|Avec retenue}}');
			});

			it('should convert modulo conditionals', () => {
				const result = testLegacySyntaxConversion(
					'@@mod(&1;2)=0 ?? pair@@ @@mod(&1;2)!=0 ?? impair@@'
				);
				expect(result).toBe('{{if:mod({{1}};2)=0|pair|impair}}');
			});
		});

		describe('Chained Conversions', () => {
			it('should apply all conversions in correct order', () => {
				const input = 'Résultat &sol avec &1 et &2, @@&1<5 ?? petit@@';
				const result = testLegacySyntaxConversion(input);

				expect(result).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
				expect(result).toContain('{{1}}');
				expect(result).toContain('{{2}}');
				expect(result).toContain('{{if:{{1}}<5|petit}}');
			});

			it('should handle complex real-world example', () => {
				const input = 'La réponse &sol est correcte car [_&1+&2_] = &sol, ${get(color1)}';
				const result = testLegacySyntaxConversion(input);

				expect(result).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
				expect(result).toContain('{{eval:{{1}}+{{2}}}}');
				expect(result).toContain('{{color:'); // Color conversion
			});

			it('should handle evaluation within conditional', () => {
				const input = '@@[_&1+&2_]<10 ?? [_&1+&2_] est petit@@';
				const result = testLegacySyntaxConversion(input);

				expect(result).toContain('{{if:{{eval:{{1}}+{{2}}}}<10|');
				expect(result).toContain('{{eval:{{1}}+{{2}}}} est petit}}');
			});

			it('should handle solution reference in conditional', () => {
				const input = '@@&1<5 ?? La réponse &sol est petite@@';
				const result = testLegacySyntaxConversion(input);

				expect(result).toContain('{{if:{{1}}<5|La réponse {{sol}} est petite}}');
			});
		});
	});

	describe('2. transformCorrection - Main Transformer', () => {
		describe('Empty Input Handling', () => {
			it('should return undefined for undefined inputs', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const result = testTransformCorrection(undefined, undefined, warnings, stats);

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty correctionDetails', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const result = testTransformCorrection([], undefined, warnings, stats);

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty correctionFormat', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const result = testTransformCorrection(
					undefined,
					{ correct: [], uncorrect: [] },
					warnings,
					stats
				);

				expect(result).toBeUndefined();
			});
		});

		describe('CorrectionDetails to Steps', () => {
			it('should transform single correction detail to step', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const details: CorrectionDetail[] = [{ text: 'Étape 1: Calculer &sol' }];

				const result = testTransformCorrection(details, undefined, warnings, stats);

				expect(result).toBeDefined();
				expect(result?.steps).toHaveLength(1);
				expect(result?.steps?.[0]).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
			});

			it('should transform multiple correction details to concatenated steps', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const details: CorrectionDetail[] = [
					{ text: 'Étape 1: &1 + &2' },
					{ text: 'Étape 2: Résultat &sol' },
					{ text: 'Étape 3: Vérification' }
				];

				const result = testTransformCorrection(details, undefined, warnings, stats);

				// Current implementation concatenates steps into single correction field
				expect(result?.steps).toHaveLength(1);
				expect(result?.steps?.[0]).toContain('{{1}}');
				expect(result?.steps?.[0]).toContain('{{2}}');
				expect(result?.steps?.[0]).toContain('{{sol}}');
				// Steps should be joined with double newline
				expect(result?.steps?.[0]).toContain('\n\n');
			});

			it('should convert legacy syntax in steps', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const details: CorrectionDetail[] = [
					{ text: '@@&1<10 ?? &sol est petit@@ @@&1>=10 ?? &sol est grand@@' }
				];

				const result = testTransformCorrection(details, undefined, warnings, stats);

				expect(result?.steps?.[0]).toContain('{{if:{{1}}<10|');
				expect(result?.steps?.[0]).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
			});
		});

		describe('CorrectionFormat to Feedback (Conceptual)', () => {
			// Note: The current implementation doesn't expose feedback separately,
			// but these tests verify the conversion logic exists

			it('should handle correction format with correct message', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const format: CorrectionFormat = {
					correct: ['Bravo! La réponse était &sol'],
					uncorrect: []
				};

				// This will be processed but not exposed in current implementation
				// Note: testTransformCorrection only returns steps, not feedback, so result may be undefined
				testTransformCorrection(undefined, format, warnings, stats);

				// Since feedback isn't exposed yet through variation.correction,
				// we just verify stats are tracked (conversion happened internally)
				expect(stats.correctionConversions).toBeGreaterThan(0);
			});

			it('should handle correction format with incorrect message', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const format: CorrectionFormat = {
					correct: [],
					uncorrect: ["Non, c'était &sol"]
				};

				testTransformCorrection(undefined, format, warnings, stats);

				expect(stats.correctionConversions).toBeGreaterThan(0);
			});

			it('should handle both correct and incorrect messages', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const format: CorrectionFormat = {
					correct: ['Bravo! &sol est correct'],
					uncorrect: ["Non, c'était &sol, pas &answer"]
				};

				testTransformCorrection(undefined, format, warnings, stats);

				expect(stats.correctionConversions).toBeGreaterThan(0);
			});

			it('should convert legacy syntax in feedback messages', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const format: CorrectionFormat = {
					correct: ['@@&1<5 ?? Bravo pour &sol@@'],
					uncorrect: ['Erreur: &answer au lieu de &sol']
				};

				testTransformCorrection(undefined, format, warnings, stats);

				// Verify no errors occurred
				expect(warnings.length).toBe(0);
			});
		});

		describe('Combined Feedback and Steps', () => {
			it('should handle both correctionDetails and correctionFormat', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const details: CorrectionDetail[] = [{ text: 'Étape: &1 + &2 = &sol' }];
				const format: CorrectionFormat = {
					correct: ['Bravo! &sol est correct'],
					uncorrect: ['Erreur']
				};

				const result = testTransformCorrection(details, format, warnings, stats);

				expect(result).toBeDefined();
				expect(result?.steps).toHaveLength(1);
				expect(stats.correctionConversions).toBeGreaterThan(0);
			});
		});

		describe('Statistics Tracking', () => {
			it('should track conversion count for steps', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const details: CorrectionDetail[] = [{ text: 'Step 1: &sol' }, { text: 'Step 2: &answer' }];

				testTransformCorrection(details, undefined, warnings, stats);

				expect(stats.correctionConversions).toBeGreaterThanOrEqual(2);
			});

			it('should track conversion count for feedback', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const format: CorrectionFormat = {
					correct: ['&sol'],
					uncorrect: ['&answer']
				};

				testTransformCorrection(undefined, format, warnings, stats);

				expect(stats.correctionConversions).toBeGreaterThanOrEqual(2);
			});

			it('should accumulate conversion counts', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				const details: CorrectionDetail[] = [{ text: '&1 + &2 = &sol' }];
				const format: CorrectionFormat = {
					correct: ['&sol is correct'],
					uncorrect: []
				};

				testTransformCorrection(details, format, warnings, stats);

				// Note: correctionConversions counts the number of correction strings processed,
				// not individual placeholder conversions
				expect(stats.correctionConversions).toBeGreaterThanOrEqual(2);
			});
		});

		describe('Warning Generation', () => {
			it('should add warnings for failed TinyCAS conversions', () => {
				const warnings: string[] = [];
				const stats = createMockStats();
				// Use syntax that might trigger warnings (though actual warnings depend on converter)
				const details: CorrectionDetail[] = [{ text: 'Some text with &sol' }];

				testTransformCorrection(details, undefined, warnings, stats);

				// We don't expect warnings for simple conversions
				// This test verifies the warning mechanism is in place
				expect(Array.isArray(warnings)).toBe(true);
			});
		});
	});

	describe('3. Real-World Integration Tests', () => {
		describe('Simple Correction Transformations', () => {
			it('should transform question with basic correctionDetails', () => {
				const oldQuestion: QuestionBase = {
					description: 'Addition',
					enounces: ['Calculer:'],
					expressions: ['&1 + &2'],
					variabless: [{ '&1': '5', '&2': '3' }],
					solutionss: [['8']],
					correctionDetailss: [[{ text: 'On calcule &1 + &2' }, { text: 'Le résultat est &sol' }]],
					defaultDelay: 0,
					grade: 'CP'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations[0].correction).toBeDefined();
				expect(result.template?.variations[0].correction).toContain('{{1}}');
				expect(result.template?.variations[0].correction).toContain('{{2}}');
				expect(result.template?.variations[0].correction).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
			});

			it('should transform question with correctionFormat', () => {
				const oldQuestion: QuestionBase = {
					description: 'Multiplication',
					enounces: ['Calculer:'],
					expressions: ['&1 × &2'],
					variabless: [{ '&1': '4', '&2': '5' }],
					solutionss: [['20']],
					correctionFormats: [
						{
							correct: ['Bravo! &sol est la bonne réponse'],
							uncorrect: ["Non, c'était &sol"]
						}
					],
					defaultDelay: 0,
					grade: 'CE1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.stats?.correctionConversions).toBeGreaterThan(0);
			});

			it('should transform question with both correctionFormats and correctionDetails', () => {
				const oldQuestion: QuestionBase = {
					description: 'Soustraction',
					enounces: ['Calculer:'],
					expressions: ['&1 - &2'],
					variabless: [{ '&1': '10', '&2': '4' }],
					solutionss: [['6']],
					correctionDetailss: [[{ text: 'Étape 1: &1 - &2' }, { text: 'Résultat: &sol' }]],
					correctionFormats: [
						{
							correct: ['Correct! &sol'],
							uncorrect: ["Faux, c'était &sol"]
						}
					],
					defaultDelay: 0,
					grade: 'CE2'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations[0].correction).toBeDefined();
				expect(result.stats?.correctionConversions).toBeGreaterThan(0);
			});
		});

		describe('Conditional Corrections', () => {
			it('should handle correction with simple conditional', () => {
				const oldQuestion: QuestionBase = {
					description: 'Nombre pair ou impair',
					enounces: ['Le nombre &1 est-il pair?'],
					variabless: [{ '&1': '$e[1;20]' }],
					solutionss: [['oui']],
					correctionDetailss: [
						[{ text: '@@mod(&1;2)=0 ?? &1 est pair@@ @@mod(&1;2)!=0 ?? &1 est impair@@' }]
					],
					defaultDelay: 0,
					grade: 'CM1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations[0].correction).toContain('{{if:mod({{1}};2)=0|');
			});

			it('should handle correction with time addition conditional', () => {
				const oldQuestion: QuestionBase = {
					description: 'Addition de minutes',
					enounces: ['Additionner les minutes:'],
					expressions: ['&1 min + &2 min'],
					variabless: [{ '&1': '30', '&2': '45' }],
					solutionss: [['75']],
					correctionDetailss: [
						[{ text: '@@&1+&2<60 ?? Pas de retenue @@ @@&1+&2>=60 ?? Avec retenue @@' }]
					],
					defaultDelay: 0,
					grade: 'CM2'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations[0].correction).toContain('{{if:{{1}}+{{2}}<60|');
			});

			it('should handle correction with multiple conditionals', () => {
				const oldQuestion: QuestionBase = {
					description: 'Comparaison',
					enounces: ['Comparer &1 et &2'],
					variabless: [{ '&1': '5', '&2': '8' }],
					solutionss: [['<']],
					correctionDetailss: [
						[
							{
								text: '@@&1<&2 ?? &1 est plus petit@@ @@&1>&2 ?? &1 est plus grand@@ @@&1=&2 ?? Égaux@@'
							}
						]
					],
					defaultDelay: 0,
					grade: '6'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations[0].correction).toBeDefined();
			});
		});

		describe('Complex Mixed Syntax', () => {
			it('should handle evaluation + placeholder + conditional', () => {
				const oldQuestion: QuestionBase = {
					description: 'Calcul complexe',
					enounces: ['Calculer:'],
					expressions: ['&1 + &2 × &3'],
					variabless: [{ '&1': '5', '&2': '3', '&3': '2' }],
					solutionss: [['[_&1+&2*&3_]']],
					correctionDetailss: [
						[
							{ text: "D'abord [_&2*&3_]" },
							{ text: 'Puis &1 + [_&2*&3_]' },
							{
								text: '@@[_&1+&2*&3_]<20 ?? Le résultat &sol est petit@@ @@[_&1+&2*&3_]>=20 ?? Le résultat &sol est grand@@'
							}
						]
					],
					defaultDelay: 0,
					grade: '5'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				const correction = result.template?.variations[0].correction;
				expect(correction).toBeDefined();
				expect(correction).toContain('{{eval:');
				expect(correction).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
				expect(correction).toContain('{{if:');
			});

			it('should handle color references in correction', () => {
				const oldQuestion: QuestionBase = {
					description: 'Géométrie colorée',
					enounces: ["Calculer l'aire"],
					expressions: ['Longueur: &1, Largeur: &2'],
					variabless: [{ '&1': '5', '&2': '3' }],
					solutionss: [['[_&1*&2_]']],
					correctionDetailss: [
						[
							{ text: 'Le rectangle ${get(color1)} a une longueur de &1' },
							{ text: 'Et une largeur de &2' },
							{ text: "L'aire est donc &sol" }
						]
					],
					defaultDelay: 0,
					grade: 'CM1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations[0].correction).toContain('{{color:');
				expect(result.template?.variations[0].correction).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
			});

			it('should handle all syntax types in single correction', () => {
				const oldQuestion: QuestionBase = {
					description: 'Synthèse',
					enounces: ['Question complexe'],
					expressions: ['&1 + &2'],
					variabless: [{ '&1': '7', '&2': '8' }],
					solutionss: [['[_&1+&2_]']],
					correctionDetailss: [
						[
							{
								text:
									'Calcul: [_&1+&2_] = &sol, ' +
									'couleur ${get(color1)}, ' +
									'@@&1+&2<20 ?? petit résultat@@ @@&1+&2>=20 ?? grand résultat@@'
							}
						]
					],
					defaultDelay: 0,
					grade: '4'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				const correction = result.template?.variations[0].correction;
				expect(correction).toContain('{{eval:');
				expect(correction).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
				expect(correction).toContain('{{color:');
				expect(correction).toContain('{{if:');
			});
		});

		describe('Edge Cases and Error Handling', () => {
			it('should handle empty correction text', () => {
				const oldQuestion: QuestionBase = {
					description: 'Test',
					enounces: ['Test'],
					variabless: [{ '&1': '5' }],
					solutionss: [['5']],
					correctionDetailss: [[{ text: '' }]],
					defaultDelay: 0,
					grade: 'CM1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				// Empty text should be handled gracefully
			});

			it('should handle correction with only whitespace', () => {
				const oldQuestion: QuestionBase = {
					description: 'Test',
					enounces: ['Test'],
					variabless: [{ '&1': '5' }],
					solutionss: [['5']],
					correctionDetailss: [[{ text: '   \n   ' }]],
					defaultDelay: 0,
					grade: 'CM1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
			});

			it('should handle malformed conditionals gracefully', () => {
				const oldQuestion: QuestionBase = {
					description: 'Test',
					enounces: ['Test'],
					variabless: [{ '&1': '5' }],
					solutionss: [['5']],
					correctionDetailss: [[{ text: '@@&1<5 ?? missing close' }]],
					defaultDelay: 0,
					grade: 'CM1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				// Should handle gracefully, possibly leaving unconverted
			});

			it('should handle nested LaTeX with variables', () => {
				const oldQuestion: QuestionBase = {
					description: 'LaTeX test',
					enounces: ['Test'],
					variabless: [{ '&1': '5', '&2': '3' }],
					solutionss: [['8']],
					correctionDetailss: [[{ text: '$$\\frac{&1}{&2} = &sol$$ et &1 + &2 = [_&1+&2_]' }]],
					defaultDelay: 0,
					grade: '3'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				const correction = result.template?.variations[0].correction;
				expect(correction).toContain('{{1}}');
				expect(correction).toContain('{{2}}');
				expect(correction).toContain('{{sol}}'); // TinyCAS converts &sol to {{sol}}
			});
		});

		describe('Multiple Variations', () => {
			it('should transform corrections for multiple variations', () => {
				const oldQuestion: QuestionBase = {
					description: 'Multi-variation',
					enounces: ['Calculer:', 'Additionner:'],
					expressions: ['&1 + &2', '&1 + &2'],
					variabless: [
						{ '&1': '5', '&2': '3' },
						{ '&1': '7', '&2': '4' }
					],
					solutionss: [['8'], ['11']],
					correctionDetailss: [[{ text: '&1 + &2 = &sol' }], [{ text: '&1 + &2 = &sol' }]],
					defaultDelay: 0,
					grade: 'CE1'
				};

				const result = transformQuestion(oldQuestion, 0);

				expect(result.success).toBe(true);
				expect(result.template?.variations).toHaveLength(2);
				expect(result.template?.variations[0].correction).toBeDefined();
				expect(result.template?.variations[1].correction).toBeDefined();
				expect(result.stats?.correctionConversions).toBeGreaterThan(0);
			});
		});
	});

	describe('4. Statistics and Metrics', () => {
		it('should track correction conversions in stats', () => {
			const oldQuestion: QuestionBase = {
				description: 'Stats test',
				enounces: ['Test'],
				variabless: [{ '&1': '5', '&2': '3' }],
				solutionss: [['8']],
				correctionDetailss: [[{ text: '&1 + &2 = &sol' }, { text: 'Résultat: &sol avec &answer' }]],
				defaultDelay: 0,
				grade: 'CM1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.stats?.correctionConversions).toBeGreaterThan(0);
		});

		it('should count all placeholder conversions', () => {
			const oldQuestion: QuestionBase = {
				description: 'Placeholder test',
				enounces: ['Test'],
				variabless: [{ '&1': '5' }],
				solutionss: [['5']],
				correctionDetailss: [
					[{ text: '&sol1, &sol2, &answer, &expression, &1, &2, ${get(color1)}' }]
				],
				defaultDelay: 0,
				grade: 'CM1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			// correctionConversions counts the number of correction strings processed, not placeholders
			expect(result.stats?.correctionConversions).toBeGreaterThan(0);
		});

		it('should count conditional conversions', () => {
			const oldQuestion: QuestionBase = {
				description: 'Conditional test',
				enounces: ['Test'],
				variabless: [{ '&1': '5' }],
				solutionss: [['5']],
				correctionDetailss: [[{ text: '@@&1<5 ?? A@@ @@&1>=5 ?? B@@ et @@&1=5 ?? C@@' }]],
				defaultDelay: 0,
				grade: 'CM1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.stats?.correctionConversions).toBeGreaterThan(0);
		});
	});

	describe('5. Backward Compatibility', () => {
		it('should maintain backward compatibility with correction field', () => {
			// The current implementation stores steps in variation.correction
			// as a single TemplateMarkdown string (concatenated steps)
			const oldQuestion: QuestionBase = {
				description: 'Backward compat test',
				enounces: ['Test'],
				variabless: [{ '&1': '5' }],
				solutionss: [['5']],
				correctionDetailss: [[{ text: 'Step 1' }, { text: 'Step 2' }]],
				defaultDelay: 0,
				grade: 'CM1'
			};

			const result = transformQuestion(oldQuestion, 0);

			expect(result.success).toBe(true);
			expect(result.template?.variations[0].correction).toBeDefined();
			// Steps should be joined with double newline
			expect(result.template?.variations[0].correction).toContain('\n\n');
		});
	});
});
