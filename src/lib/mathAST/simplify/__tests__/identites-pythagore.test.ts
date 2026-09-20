/**
 * Les identités de Pythagore l'emportent sur la factorisation.
 *
 * Relevé du 2026-09-20 §6.5 : `cosh²(x) − sinh²(x)` ne rendait pas `1`.
 * Mesuré : les trois règles concernées apparient, mais `diff-squares-symbolic`
 * porte `priority: 1` quand les règles pythagoriciennes n'en portent aucune
 * (donc 0), et le tri est décroissant. La factorisation `a²−b² → (a+b)(a−b)`
 * passait donc devant, produisait une forme plus chère, et la mise au propre
 * la repliait sur l'entrée.
 *
 * `sin²+cos²` échappait au piège pour une seule raison : c'est une **addition**,
 * que `diff-squares-symbolic` n'apparie pas.
 *
 * §6.7 (`sec²−1`) : ce n'était **pas** un défaut d'appariement. La règle existe
 * mais `trigSimplifyRules` l'écarte délibérément, avec toutes celles qui
 * introduiraient `sec`, `csc` ou `cot` — hors programme au lycée. Seule
 * `sec²(a) − 1 → tan²(a)` va dans le sens de l'exclusion, puisqu'elle **retire**
 * un `sec` : elle est réintégrée ici.
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../simplify';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import { trigSimplifyRules } from '../../pattern/rule-sets/trig-identities';

const s = (input: string) => toCustom(simplify(parseCustom(input)).result);

describe('une identité qui rend une constante passe avant la factorisation', () => {
	it('cosh(x)^2-sinh(x)^2 → 1', () => {
		expect(s('cosh(x)^2-sinh(x)^2')).toBe('1');
	});

	it('sin(x)^2+cos(x)^2 → 1 (inchangé)', () => {
		expect(s('sin(x)^2+cos(x)^2')).toBe('1');
	});

	it('cosh(2x)^2-sinh(2x)^2 → 1 (argument composé)', () => {
		expect(s('cosh(2x)^2-sinh(2x)^2')).toBe('1');
	});

	// Le décideur d'équivalence connaît désormais l'identité — il réduit la
	// trigonométrie pour comparer, sans toucher à la forme qui s'affiche. La
	// règle de motif, elle, reste ce qui la fait **apparaître** dans le résultat.
	it('l’équivalence et la règle disent la même chose', () => {
		expect(areEquivalent(parseCustom('cosh(x)^2-sinh(x)^2'), parseCustom('1'))).toBe(true);
		expect(s('cosh(x)^2-sinh(x)^2')).toBe('1');
	});
});

describe('la factorisation garde sa place partout ailleurs', () => {
	it.each([
		['x^2-y^2', 'x^2-y^2'],
		['x^2-1', 'x^2-1'],
		['cosh(x)^2+sinh(x)^2', 'cosh(x)^2+sinh(x)^2'],
		// L'ordre canonique de `tidy` est alphabétique : cosh avant sinh.
		['sinh(x)^2-cosh(x)^2', '-cosh(x)^2+sinh(x)^2']
	])('%s → %s', (input, expected) => {
		expect(s(input)).toBe(expected);
	});
});

describe('sec²(a) − 1 → tan²(a) : la seule identité qui retire un sec', () => {
	it('la règle est chargée par simplify', () => {
		expect(trigSimplifyRules.map((r) => r.name)).toContain('sec-squared-minus-one');
	});

	it('sec(x)^2-1 → tan(x)^2', () => {
		expect(s('sec(x)^2-1')).toBe('tan(x)^2');
	});

	it.each(['tan-squared-plus-one', 'cot-squared-plus-one', 'csc-squared-minus-one'])(
		'%s reste écartée : elle introduirait sec, csc ou cot',
		(name) => {
			expect(trigSimplifyRules.map((r) => r.name)).not.toContain(name);
		}
	);

	it('tan(x)^2+1 reste tel quel (pas de sec introduit)', () => {
		expect(s('tan(x)^2+1')).toBe('tan(x)^2+1');
	});
});
