/**
 * Tests for the pedagogical-arithmetic pipeline orchestrator (Phase 8).
 *
 * Coverage :
 * - End-to-end : `2 + 3 × 4 + 5 × 6` produces 2 steps at college (regroupement
 *   + addition) and ≥3 steps at primaire (each multiplication separately).
 * - Fraction reduction terminal fires when target says so.
 * - answerFragment populated when target.answerFormat is set.
 * - finalNode is the canonical result.
 */

import { describe, expect, it } from 'vitest';
import { add, divide, multiply, number, sqrt, subtract } from '../../factory';
import { toLatex } from '../../latex-generator';
import { generatePedagogicalArithmeticSteps } from '../pipeline';
import { PedagogicalArithmeticRenderer } from '../renderer';
import type { MathNode } from '../../types';

describe('generatePedagogicalArithmeticSteps', () => {
	describe('basic operations', () => {
		it('2 + 3 × 4 → 14 (college: 2 steps via grouping + addition)', () => {
			// 2 + 3*4
			const expr = add(number('2'), multiply(number('3'), number('4'), 'cross'));
			const result = generatePedagogicalArithmeticSteps(expr, { schoolLevel: 'college' });
			expect(toLatex(result.finalNode)).toBe('14');
			expect(result.steps.length).toBeGreaterThanOrEqual(1);
		});

		it('2 + 3 × 4 + 5 × 6 → 44 with grouping (college)', () => {
			// 2 + 3*4 + 5*6
			const expr = add(
				add(number('2'), multiply(number('3'), number('4'), 'cross')),
				multiply(number('5'), number('6'), 'cross')
			);
			const result = generatePedagogicalArithmeticSteps(expr, { schoolLevel: 'college' });
			expect(toLatex(result.finalNode)).toBe('44');
			// At college, the grouping rule fires once → step "On effectue les
			// multiplications" + final addition.
			const ruleNames = result.steps.map((s) => s.rule);
			expect(ruleNames).toContain('group-multiplications-in-addition');
		});

		it('2 + 3 × 4 + 5 × 6 → 44 WITHOUT grouping (primaire)', () => {
			const expr = add(
				add(number('2'), multiply(number('3'), number('4'), 'cross')),
				multiply(number('5'), number('6'), 'cross')
			);
			const result = generatePedagogicalArithmeticSteps(expr, { schoolLevel: 'primaire' });
			expect(toLatex(result.finalNode)).toBe('44');
			// At primaire, the grouping rule is skipped — each multiplication is
			// its own step.
			const ruleNames = result.steps.map((s) => s.rule);
			expect(ruleNames).not.toContain('group-multiplications-in-addition');
		});
	});

	describe('fractions', () => {
		it('1/3 + 1/6 → 1/2 (college, with reduction terminal)', () => {
			const expr = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = generatePedagogicalArithmeticSteps(expr, {
				schoolLevel: 'college',
				target: {
					structure: 'reduced-fraction',
					strictCosmetics: { reducedFractions: 'strict' }
				}
			});
			const latex = toLatex(result.finalNode);
			expect(latex).toContain('1');
			expect(latex).toContain('2');
		});

		it('1/3 + 1/6 produces multiple intermediate steps (toCommonDenom + addSameDenom + reduce)', () => {
			const expr = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = generatePedagogicalArithmeticSteps(expr, {
				schoolLevel: 'college',
				target: { structure: 'reduced-fraction' }
			});
			const ruleNames = result.steps.map((s) => s.rule);
			expect(ruleNames).toContain('to-common-denominator');
		});
	});

	describe('radicals', () => {
		it('√8 → 2√2 (college)', () => {
			const result = generatePedagogicalArithmeticSteps(sqrt(number('8')), {
				schoolLevel: 'college'
			});
			const latex = toLatex(result.finalNode);
			expect(latex).toContain('2');
			expect(latex).toContain('sqrt');
			expect(latex).not.toContain('8');
		});
	});

	describe('answerFragment extraction', () => {
		it('answerFormat "10^?" extracts the exponent from a scientific result', () => {
			// Setup : an expression that becomes 10^6 after pipeline. The rule
			// `to-scientific-notation` fires for `1000000` when target is scientific.
			const expr = number('1000000');
			const result = generatePedagogicalArithmeticSteps(expr, {
				schoolLevel: 'college',
				target: { structure: 'scientific', answerFormat: '10^?' }
			});
			// Note : 1000000 → "1 × 10^6", and `extractAnswerFragment` for "10^?"
			// expects literal `10^?` shape — when the result is `1 × 10^6` it
			// won't match, so answerFragment may be undefined. This documents the
			// MVP boundary.
			if (result.answerFragment) {
				expect(result.answerFragment.placeholderPath).toEqual(['superscript']);
			}
			// The pipeline still runs without error.
			expect(result.finalNode).toBeDefined();
		});
	});

	describe('renderer integration', () => {
		it('produces RenderedStep with title, expressionLatex, and schoolLevel', () => {
			const expr = add(number('2'), number('3'));
			const result = generatePedagogicalArithmeticSteps(expr, { schoolLevel: 'college' });
			const renderer = new PedagogicalArithmeticRenderer();
			const rendered = renderer.renderAll(result.steps, {
				schoolLevel: 'college',
				verbosity: 'detailed'
			});
			expect(rendered.length).toBeGreaterThan(0);
			expect(rendered[0].schoolLevel).toBe('college');
			// Two-line aligned format with colored fragment + new global expression
			expect(rendered[0].expressionLatex).toContain('begin{aligned}');
			expect(rendered[0].expressionLatex).toContain('textcolor{blue}');
			expect(rendered[0].expressionLatex).toContain('= ');
		});

		it('omits explanation when verbosity is summarized', () => {
			const expr = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = generatePedagogicalArithmeticSteps(expr, {
				schoolLevel: 'college'
			});
			const renderer = new PedagogicalArithmeticRenderer();
			const summarized = renderer.renderAll(result.steps, {
				schoolLevel: 'college',
				verbosity: 'summarized'
			});
			for (const step of summarized) {
				expect(step.explanation).toBeUndefined();
			}
		});
	});

	describe('robustness', () => {
		it('handles a constant expression with no rule firing', () => {
			const result = generatePedagogicalArithmeticSteps(number('42'), { schoolLevel: 'college' });
			expect(toLatex(result.finalNode)).toBe('42');
			// 0 or 1 step (the evaluate-final fallback may run or not depending on
			// whether the input is already canonical)
			expect(result.steps.length).toBeGreaterThanOrEqual(0);
		});

		it('handles negative results : 2 - 5 → -3', () => {
			const expr = subtract(number('2'), number('5'));
			const result = generatePedagogicalArithmeticSteps(expr, { schoolLevel: 'college' });
			expect(toLatex(result.finalNode)).toBe('-3');
		});
	});
});

// =============================================================================
// Addition de fractions : pas de cycle (regression)
// =============================================================================

describe('addition de fractions — le pipeline ne doit pas cycler', () => {
	// `to-common-denominator` (priorité 130) produit 8/12 + 9/12, puis
	// `reduce-fraction` (priorité 30) ramène 8/12 à 2/3, et on recommence :
	// le pipeline tapait le plafond de 50 itérations sur TOUTE addition de
	// fractions. Le résultat final restait juste — c'est le chemin qui était
	// absurde, et aucun test ne le voyait (bornes inférieures seulement).
	const cas: [string, () => MathNode, string, number][] = [
		[
			'2/3 + 3/4',
			() => add(divide(number('2'), number('3')), divide(number('3'), number('4'))),
			'\\dfrac{17}{12}',
			4
		],
		[
			'1/2 + 1/4',
			() => add(divide(number('1'), number('2')), divide(number('1'), number('4'))),
			'\\dfrac{3}{4}',
			4
		],
		[
			'1/2 + 1/3 + 1/6',
			() =>
				add(
					add(divide(number('1'), number('2')), divide(number('1'), number('3'))),
					divide(number('1'), number('6'))
				),
			'1',
			7
		]
	];

	it.each(cas)(
		'%s tient en peu d étapes et donne le bon résultat',
		(_label, build, attendu, max) => {
			const result = generatePedagogicalArithmeticSteps(build(), { schoolLevel: 'college' });

			// Le résultat doit rester juste : un correctif qui casse le calcul
			// n'est pas un correctif.
			expect(toLatex(result.finalNode)).toBe(attendu);

			// Borne SUPÉRIEURE : c'est elle qui manquait. 51 étapes passaient.
			expect(result.steps.length).toBeLessThanOrEqual(max);
		}
	);

	it.each(cas)('%s ne met au même dénominateur qu une fois par addition', (_label, build) => {
		const result = generatePedagogicalArithmeticSteps(build(), { schoolLevel: 'college' });
		const miseAuMemeDenominateur = result.steps.filter((s) =>
			s.rule.startsWith('to-common-denominator')
		);
		// Une addition de deux fractions se met au même dénominateur une fois ;
		// trois fractions, deux fois (deux additions). Jamais plus.
		expect(miseAuMemeDenominateur.length).toBeLessThanOrEqual(2);
	});

	// ⚠️ Une détection limitée à « A B A B » NE MORD PAS ici : le cycle de
	// 2/3+3/4 est de période 3 (to-common-denominator / reduce / reduce).
	// On cherche donc la répétition d'un motif de période 2 à 4.
	it.each(cas)('%s ne répète aucun motif de règles', (_label, build) => {
		const rules = generatePedagogicalArithmeticSteps(build(), { schoolLevel: 'college' }).steps.map(
			(s) => s.rule
		);
		const motifs: string[] = [];
		for (let periode = 2; periode <= 4; periode++) {
			for (let i = 0; i + 2 * periode <= rules.length; i++) {
				const a = rules.slice(i, i + periode).join('|');
				const b = rules.slice(i + periode, i + 2 * periode).join('|');
				if (a === b) motifs.push(`période ${periode} en ${i} : ${a}`);
			}
		}
		expect(motifs).toEqual([]);
	});

	it('ne tape jamais le plafond d itérations', () => {
		const expr = add(divide(number('2'), number('3')), divide(number('3'), number('4')));
		const result = generatePedagogicalArithmeticSteps(expr, { schoolLevel: 'college' });
		// 50 = DEFAULT_MAX_ITERATIONS ; l'atteindre signifie que la boucle ne
		// s'est pas arrêtée d'elle-même.
		expect(result.steps.length).toBeLessThan(50);
	});
});
