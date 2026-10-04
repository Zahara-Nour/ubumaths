/**
 * `seuil:` pour la loi géométrique (manche 14, PR a, spec validée par David le
 * 2026-10-04) : les huit formes de la binomiale, en valeurs exactes, k cherché
 * de 0 à 1 000.
 *
 * Valeurs de référence (Python) pour G(0,2) : P(X > k) ⩽ 0,05 → k = 14
 * (≈ 0,044) ; P(X ⩽ k) ⩾ 0,95 → 14 ; P(X ⩽ k) ⩽ 0,5 → plus grand k = 3
 * (= 0,488) ; P(X > k) ⩾ 0,1 → plus grand k = 10 (≈ 0,107) ; G(0,000001),
 * P(X > k) ⩽ 0,05 → aucun k de 0 à 1 000. G(1) : P(X ⩽ k) = 1 dès k = 1.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { geometricThreshold } from '$lib/statistics/geometric';
import { binomialDistribution, binomialThreshold } from '$lib/statistics/binomial';
import { Fraction } from '$lib/statistics/fraction';

// =============================================================================
// Helpers
// =============================================================================

const G = 'X ~ G(0,2)';

function nodeOf(source: string) {
	return parseStatChartContent('loi', source);
}

function linesOf(source: string, locale: 'fr' | 'en' = 'fr') {
	const node = nodeOf(source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return (buildStatChartScene(node.spec, { locale }) as LawScene).indicators;
}

function errorOf(source: string) {
	const node = nodeOf(source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

// =============================================================================
// Module statistique
// =============================================================================

/**
 * Le sens attendu des huit formes : P(X > k), P(X ⩾ k) décroissent avec k,
 * P(X < k), P(X ⩽ k) croissent (true : plus petit k ; false : plus grand k)
 */
const SMALLEST: Record<string, boolean> = {
	'>⩽': true,
	'>⩾': false,
	'⩾⩽': true,
	'⩾⩾': false,
	'<⩽': false,
	'<⩾': true,
	'⩽⩽': false,
	'⩽⩾': true
};

describe('geometricThreshold — les huit formes contre une boucle de référence', () => {
	const events = ['>', '⩾', '<', '⩽'] as const;
	const comparisons = ['⩽', '⩾'] as const;
	const alphas = [0.05, 0.1, 0.3, 0.5, 0.9, 0.95];
	// P(X ⋄ k) en flottants, pour G(0,2)
	const reference = (event: (typeof events)[number], k: number): number => {
		const above = (j: number) => 0.8 ** Math.max(j, 0); // P(X > j)
		switch (event) {
			case '>':
				return above(k);
			case '⩾':
				return above(k - 1);
			case '<':
				return 1 - above(k - 1);
			case '⩽':
				return 1 - above(k);
		}
	};

	for (const event of events) {
		for (const comparison of comparisons) {
			it(`P(X ${event} k) ${comparison} α`, () => {
				// Écrit EN DUR (revue) : pas la formule de l'implémentation
				const smallest = SMALLEST[`${event}${comparison}`];
				for (const alpha of alphas) {
					const fits = Array.from({ length: 51 }, (_, k) => k).filter((k) =>
						comparison === '⩽' ? reference(event, k) <= alpha : reference(event, k) >= alpha
					);
					const expected = fits.length === 0 ? null : smallest ? fits[0] : fits[fits.length - 1];
					const result = geometricThreshold(
						new Fraction(1n, 5n),
						event,
						comparison,
						Fraction.fromNumber(alpha)!
					);
					expect({ alpha, k: result.k, smallest: result.smallest }).toEqual({
						alpha,
						k: expected,
						smallest
					});
				}
			});
		}
	}
});

// =============================================================================
// Bloc
// =============================================================================

describe('X ~ G(p) — `seuil:`', () => {
	it('les valeurs de référence', () => {
		expect(linesOf(`${G}\nseuil: P(X > k) ⩽ 0,05`)).toEqual([
			'E(X) = 5',
			'plus petit k tel que P(X > k) ⩽ 0,05 : k = 14 (P(X > 14) ≈ 0,044)'
		]);
		expect(linesOf(`${G}\nindicateurs: aucun\nseuil: P(X ⩽ k) ⩾ 0,95`)).toEqual([
			'plus petit k tel que P(X ⩽ k) ⩾ 0,95 : k = 14 (P(X ⩽ 14) ≈ 0,956)'
		]);
		expect(linesOf(`${G}\nindicateurs: aucun\nseuil: P(X ⩽ k) ⩽ 0,5`)).toEqual([
			'plus grand k tel que P(X ⩽ k) ⩽ 0,5 : k = 3 (P(X ⩽ 3) = 0,488)'
		]);
		expect(linesOf(`${G}\nindicateurs: aucun\nseuil: P(X > k) >= 0,1`)).toEqual([
			'plus grand k tel que P(X > k) ⩾ 0,1 : k = 10 (P(X > 10) ≈ 0,107)'
		]);
	});

	it('aucun k de 0 à 1 000 ; G(1)', () => {
		expect(linesOf('X ~ G(0,000001)\nindicateurs: aucun\nseuil: P(X > k) ⩽ 0,05')).toEqual([
			'aucun k de 0 à 1 000 ne vérifie P(X > k) ⩽ 0,05'
		]);
		expect(linesOf('X ~ G(1)\nindicateurs: aucun\nseuil: P(X ⩽ k) ⩾ 0,5')).toEqual([
			'plus petit k tel que P(X ⩽ k) ⩾ 0,5 : k = 1 (P(X ⩽ 1) = 1)'
		]);
	});

	it('avant les probabilités, après les indicateurs', () => {
		expect(linesOf(`${G}\nseuil: P(X > k) ⩽ 0,05\nprobabilités: P(X = 1)`)).toEqual([
			'E(X) = 5',
			'plus petit k tel que P(X > k) ⩽ 0,05 : k = 14 (P(X > 14) ≈ 0,044)',
			'P(X = 1) = 0,2'
		]);
	});

	it('en anglais', () => {
		expect(linesOf(`${G}\nindicateurs: aucun\nseuil: P(X > k) ⩽ 0,05`, 'en')).toEqual([
			'smallest k such that P(X > k) ⩽ 0.05: k = 14 (P(X > 14) ≈ 0.044)'
		]);
		expect(linesOf('X ~ G(0,000001)\nindicateurs: aucun\nseuil: P(X > k) ⩽ 0,05', 'en')).toEqual([
			'no k from 0 to 1,000 satisfies P(X > k) ⩽ 0.05'
		]);
	});

	it('Typst : la ligne, en français et en anglais', () => {
		const source = `${G}\nseuil: P(X > k) ⩽ 0,05`;
		const fr = generateStatChartTypst(nodeOf(source)).replace(/\u00a0/g, ' ');
		const en = generateStatChartTypst(nodeOf(source), { language: 'en' }).replace(/\u00a0/g, ' ');
		expect(fr).toContain('plus petit k tel que P(X > k) ⩽ 0,05 : k = 14 (P(X > 14) ≈ 0,044)');
		expect(en).toContain('smallest k such that P(X > k) ⩽ 0.05: k = 14 (P(X > 14) ≈ 0.044)');
	});
});

describe('X ~ G(p) — `seuil:` : erreurs situées', () => {
	it('α hors de ]0 ; 1[, seuil mal écrit, autre variable', () => {
		expect(errorOf(`${G}\nseuil: P(X > k) ⩽ 1`)).toBe(
			'Ligne 2 : seuil : α est un nombre strictement entre 0 et 1'
		);
		expect(errorOf(`${G}\nseuil: X > k`)).toBe('Ligne 2 : seuil : écrire P(X > k) ⩽ 0,05');
		expect(errorOf(`${G}\nseuil: P(Y > k) ⩽ 0,05`)).toBe(
			'Ligne 2 : seuil : « P(Y > k) » parle de Y, la variable est X'
		);
	});

	it('U, U([…]), E : option réservée aux lois binomiale et géométrique', () => {
		for (const law of ['X ~ U(1 ; 6)', 'X ~ U([0 ; 10])', 'X ~ E(0,5)']) {
			expect(errorOf(`${law}\nseuil: P(X > k) ⩽ 0,05`), law).toBe(
				'Ligne 2 : seuil : option réservée aux lois binomiale et géométrique'
			);
		}
	});
});

describe('revue : borne de recherche, dichotomie, message', () => {
	it('plus grand k au-delà de 1 000 : ne pas annoncer k = 1 000', () => {
		const source = 'X ~ G(0,000001)\nindicateurs: aucun\nseuil: P(X > k) ⩾ 0,5';
		expect(linesOf(source)).toEqual([
			'tous les k de 0 à 1 000 vérifient P(X > k) ⩾ 0,5 (le plus grand est au-delà de 1 000)'
		]);
		expect(linesOf(source, 'en')).toEqual([
			'every k from 0 to 1,000 satisfies P(X > k) ⩾ 0.5 (the largest is beyond 1,000)'
		]);
		const result = geometricThreshold(new Fraction(1n, 1000000n), '>', '⩾', new Fraction(1n, 2n));
		expect(result.k).toBeNull();
		expect(result.beyond).toBe(true);
	});

	it('binomiale : la dichotomie donne le k de la recherche linéaire', () => {
		const events = ['>', '⩾', '<', '⩽'] as const;
		const comparisons = ['⩽', '⩾'] as const;
		const alphas = ['0', '1/100', '1/20', '1/4', '1/2', '3/4', '19/20', '99/100', '1'];
		for (const p of [Fraction.ZERO, Fraction.ONE, new Fraction(1n, 2n)]) {
			for (const n of [1, 10]) {
				const law = binomialDistribution(n, p);
				const den = law.denominator;
				const cumulative = [0n];
				for (const value of law.numerators) cumulative.push(cumulative.at(-1)! + value);
				const total = cumulative[n + 1];
				// Référence linéaire, écrite ici : P(X ⋄ k) · den
				const scaled = (event: (typeof events)[number], k: number) =>
					event === '>'
						? total - cumulative[k + 1]
						: event === '⩾'
							? total - cumulative[k]
							: event === '<'
								? cumulative[k]
								: cumulative[k + 1];
				for (const event of events) {
					for (const comparison of comparisons) {
						for (const written of alphas) {
							const alpha = Fraction.parse(written)!;
							const fits = Array.from({ length: n + 1 }, (_, k) => k).filter((k) => {
								const left = scaled(event, k) * alpha.den;
								const right = alpha.num * den;
								return comparison === '⩽' ? left <= right : left >= right;
							});
							const smallest = SMALLEST[`${event}${comparison}`];
							const expected = fits.length === 0 ? null : smallest ? fits[0] : fits.at(-1)!;
							expect(
								binomialThreshold(law, event, comparison, alpha).k,
								`B(${n} ; ${p}) P(X ${event} k) ${comparison} ${written}`
							).toBe(expected);
						}
					}
				}
			}
		}
	});

	it('une loi écrite à la main : seuil seulement avec une loi binomiale ou géométrique', () => {
		expect(errorOf('X = 0 ; 1\nP = 1/2 ; 1/2\nseuil: P(X > k) ⩽ 0,05')).toBe(
			'Ligne 3 : seuil : seulement avec une loi binomiale ou géométrique (X ~ B(n ; p) ou G(p))'
		);
	});
});
