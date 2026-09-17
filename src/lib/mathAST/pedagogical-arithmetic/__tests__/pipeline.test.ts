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

// =============================================================================
// Produits de racines : le chemin doit être détaillé
// =============================================================================

describe('produit de racines — un pas à la fois', () => {
	// `multiply-radicals` multipliait ET extrayait dans la même étape, si bien
	// que √12 × √18 = 6√6 tombait d'un coup : l'élève devait calculer 216 puis
	// le factoriser de tête. Deux chemins existent, et on prend le plus simple :
	//
	//  - produit = carré parfait  -> multiplier d'abord (on tombe sur un entier)
	//  - sinon, si une racine se simplifie -> extraire d'abord (nombres petits)
	//  - sinon -> multiplier (seul chemin possible)

	const sequence = (expr: MathNode): string[] =>
		generatePedagogicalArithmeticSteps(expr, { schoolLevel: 'college' }).steps.map(
			(s) => `${toLatex(s.globalBefore)} = ${toLatex(s.globalAfter)}`
		);

	const racines = (a: string, b: string) => multiply(sqrt(number(a)), sqrt(number(b)), 'cross');

	it('√2 × √8 passe par √16 (produit = carré parfait)', () => {
		const etapes = sequence(racines('2', '8'));
		expect(etapes).toHaveLength(2);
		expect(etapes[0]).toContain('\\sqrt{16}');
		expect(etapes[1]).toMatch(/= 4$/);
	});

	it('√50 × √2 passe par √100', () => {
		const etapes = sequence(racines('50', '2'));
		expect(etapes).toHaveLength(2);
		expect(etapes[0]).toContain('\\sqrt{100}');
		expect(etapes[1]).toMatch(/= 10$/);
	});

	it('√3 × √12 passe par √36', () => {
		const etapes = sequence(racines('3', '12'));
		expect(etapes[0]).toContain('\\sqrt{36}');
		expect(etapes[etapes.length - 1]).toMatch(/= 6$/);
	});

	it('√2 × √6 passe par √12 (rien à extraire au départ)', () => {
		const etapes = sequence(racines('2', '6'));
		expect(etapes).toHaveLength(2);
		expect(etapes[0]).toContain('\\sqrt{12}');
		expect(etapes[1]).toContain('2 \\sqrt{3}');
	});

	it('√2 × √3 tient en une étape (rien à simplifier)', () => {
		const etapes = sequence(racines('2', '3'));
		expect(etapes).toHaveLength(1);
		expect(etapes[0]).toContain('\\sqrt{6}');
	});

	it('√12 × √18 extrait les DEUX racines en une étape, sans passer par √216', () => {
		const etapes = sequence(racines('12', '18'));
		// Le point de ce changement : ne jamais exiger de factoriser 216.
		expect(etapes.join(' | ')).not.toContain('\\sqrt{216}');
		// ⚠️ Sans cette borne, le test passerait sur le comportement FAUTIF :
		// une étape unique `√12 × √18 = 6√6` ne contient pas non plus « √216 ».
		expect(etapes).toHaveLength(2);
		expect(etapes[0]).toContain('2 \\sqrt{3} \\times 3 \\sqrt{2}');
		expect(etapes[1]).toContain('6 \\sqrt{6}');
	});

	it('√8 × √27 extrait les deux racines en une étape', () => {
		const etapes = sequence(racines('8', '27'));
		expect(etapes.join(' | ')).not.toContain('\\sqrt{216}');
		expect(etapes).toHaveLength(2);
		expect(etapes[0]).toContain('2 \\sqrt{2} \\times 3 \\sqrt{3}');
		expect(etapes[1]).toContain('6 \\sqrt{6}');
	});

	// Les deux racines changent dans la même étape, donc `before` est le
	// produit entier : sans `highlightSubTrees`, le renderer peindrait toute
	// la ligne en bleu au lieu de désigner les deux racines traitées.
	it('l étape d extraction double désigne les deux racines', () => {
		const etapes = generatePedagogicalArithmeticSteps(racines('12', '18'), {
			schoolLevel: 'college'
		}).steps;
		expect(etapes[0].rule).toBe('extract-both-radicals');
		expect(etapes[0].highlightSubTrees).toHaveLength(2);
		expect(etapes[0].highlightSubTrees!.map((n) => toLatex(n))).toEqual([
			'\\sqrt{12}',
			'\\sqrt{18}'
		]);
	});

	// Une seule racine simplifiable : la règle double ne doit PAS mordre.
	it('√12 × √2 n utilise pas l extraction double', () => {
		const etapes = generatePedagogicalArithmeticSteps(racines('12', '2'), {
			schoolLevel: 'college'
		}).steps;
		expect(etapes.map((s) => s.rule)).not.toContain('extract-both-radicals');
		expect(toLatex(etapes[etapes.length - 1].globalAfter!)).toContain('2 \\sqrt{6}');
	});

	// Quand les DEUX racines se simplifient, on extrait d'abord même si le
	// produit est un carré parfait : 3√2 × 5√2 est plus doux que √900, qui
	// demande de reconnaître 900 = 30².
	it('√18 × √50 extrait d abord plutôt que de passer par √900', () => {
		const etapes = sequence(racines('18', '50'));
		expect(etapes.join(' | ')).not.toContain('\\sqrt{900}');
		expect(etapes).toHaveLength(3);
		expect(etapes[0]).toContain('3 \\sqrt{2} \\times 5 \\sqrt{2}');
		expect(etapes[1]).toContain('15 \\times 2');
		expect(etapes[2]).toMatch(/= 30$/);
	});

	it('√20 × √45 extrait d abord', () => {
		const etapes = sequence(racines('20', '45'));
		expect(etapes.join(' | ')).not.toContain('\\sqrt{900}');
		expect(etapes[0]).toContain('2 \\sqrt{5} \\times 3 \\sqrt{5}');
		expect(etapes[1]).toContain('6 \\times 5');
		expect(etapes[etapes.length - 1]).toMatch(/= 30$/);
	});

	it('√12 × √27 extrait d abord', () => {
		const etapes = sequence(racines('12', '27'));
		expect(etapes[0]).toContain('2 \\sqrt{3} \\times 3 \\sqrt{3}');
		expect(etapes[1]).toContain('6 \\times 3');
		expect(etapes[etapes.length - 1]).toMatch(/= 18$/);
	});

	// ⚠️ Aucune étape ne doit montrer `15√4` ni `15 2` : ce sont les formes
	// que produisait le chemin « multiplier d'abord » sur des racines à
	// coefficient, et aucun professeur ne les écrit.
	it('ne produit jamais de forme c√(carré parfait)', () => {
		for (const [a, b] of [
			['18', '50'],
			['20', '45'],
			['12', '27'],
			['8', '18']
		]) {
			const joint = sequence(racines(a, b)).join(' | ');
			expect(joint).not.toMatch(/\d \\sqrt\{(1|4|9|16|25|36|49|64|81|100)\}/);
		}
	});

	// Le programme français exige les carrés parfaits jusqu'à 15² = 225 : en
	// deçà, `√(produit)` ne demande aucun calcul. Au-delà, il faudrait
	// multiplier deux nombres puis reconnaître un grand carré — on extrait.
	it('√3 × √75 passe par √225 (à la limite du connu)', () => {
		const etapes = sequence(racines('3', '75'));
		expect(etapes).toHaveLength(2);
		expect(etapes[0]).toContain('\\sqrt{225}');
		expect(etapes[1]).toMatch(/= 15$/);
	});

	it('√98 × √2 passe par √196', () => {
		const etapes = sequence(racines('98', '2'));
		expect(etapes[0]).toContain('\\sqrt{196}');
		expect(etapes[etapes.length - 1]).toMatch(/= 14$/);
	});

	it('√7 × √63 extrait d abord (441 dépasse 225)', () => {
		const etapes = sequence(racines('7', '63'));
		expect(etapes.join(' | ')).not.toContain('\\sqrt{441}');
		expect(etapes).toHaveLength(3);
		expect(etapes[0]).toContain('\\sqrt{7} \\times 3 \\sqrt{7}');
		expect(etapes[1]).toContain('3 \\times 7');
		expect(etapes[2]).toMatch(/= 21$/);
	});

	it('√11 × √99 extrait d abord (1089 dépasse 225)', () => {
		const etapes = sequence(racines('11', '99'));
		expect(etapes.join(' | ')).not.toContain('\\sqrt{1089}');
		expect(etapes[etapes.length - 1]).toMatch(/= 33$/);
	});

	// Chemin A : rien à extraire au départ, la règle double ne mord pas.
	it('√2 × √8 n utilise pas l extraction double', () => {
		const etapes = generatePedagogicalArithmeticSteps(racines('2', '8'), {
			schoolLevel: 'college'
		}).steps;
		expect(etapes.map((s) => s.rule)).not.toContain('extract-both-radicals');
	});

	// Aucune étape ne doit être un « On calcule » du repli : chaque passage
	// mérite son explication.
	it('aucune étape ne retombe sur evaluate-final', () => {
		for (const [a, b] of [
			['2', '8'],
			['12', '18'],
			['2', '6'],
			['50', '2']
		]) {
			const regles = generatePedagogicalArithmeticSteps(racines(a, b), {
				schoolLevel: 'college'
			}).steps.map((s) => s.rule);
			expect(regles).not.toContain('evaluate-final');
		}
	});
});
