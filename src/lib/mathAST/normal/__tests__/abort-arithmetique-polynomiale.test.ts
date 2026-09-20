/**
 * Le signal d'interruption doit atteindre l'arithmétique polynomiale.
 *
 * `makeAbortChecker` existe depuis longtemps, `simplify` l'installe, et
 * `pattern/match.ts` le consulte. Mais `polynomial.ts`, `rational.ts` et
 * `univariate-gcd.ts` ne le consultaient nulle part, et `areEquivalent` ne
 * l'installait pas : un `timeoutMs` ne bornait donc RIEN sur le chemin qui
 * coûte le plus cher, le développement d'une puissance de somme large.
 *
 * Mesuré avant correctif, tas plafonné à 700 Mo, `timeoutMs: 500` — les trois
 * tuent le processus, exactement comme sans budget :
 *
 * | expression                                  | avec 500 ms  |
 * | ------------------------------------------- | ------------ |
 * | `(x+y+z+w+a+b+c+d)^8`                       | processus tué |
 * | `(sin x+cos y+sin z+cos w+x+y+z)^8`         | processus tué |
 * | `(x+y+z+w+a+b+c+d+e+f+g)^9`                 | processus tué |
 *
 * Le troisième ne contient aucune trigonométrie : le mur est bien dans
 * l'arithmétique elle-même, pas dans une règle.
 *
 * Ce que ces tests prouvent : la main est rendue. Ils n'affirment rien sur le
 * verdict au-delà de `false`, qui est la réponse conservatrice d'un décideur
 * qui abandonne — il n'a pas prouvé l'égalité, il ne la déclare pas.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';

const LOURD = [
	['une puissance de somme large, sans trigonométrie', '(x+y+z+w+a+b+c+d)^{8}'],
	['la même avec de la trigonométrie', '(\\sin(x)+\\cos(y)+\\sin(z)+\\cos(w)+x+y+z)^{8}'],
	['une somme plus large encore', '(x+y+z+w+a+b+c+d+e+f+g)^{9}']
] as const;

describe('le budget borne l’arithmétique polynomiale', () => {
	it.each(LOURD)('%s rend la main : %s', (_titre, expression) => {
		const started = performance.now();
		expect(areEquivalent(parseLatex(expression), parseLatex('1'), { timeoutMs: 500 })).toBe(false);
		expect(performance.now() - started).toBeLessThan(5000);
	});

	it('simplify aussi rend la main sur la même forme', () => {
		const started = performance.now();
		simplify(parseLatex('(x+y+z+w+a+b+c+d)^{8}'), { timeoutMs: 500 });
		expect(performance.now() - started).toBeLessThan(5000);
	});
});

describe('ce que le budget ne doit PAS changer', () => {
	it.each([
		['(x+1)^{3}', 'x^3+3x^2+3x+1'],
		['(x+y)^{4}', 'x^4+4x^3y+6x^2y^2+4xy^3+y^4'],
		['(a+b+c)^{3}', 'a^3+b^3+c^3+3a^2b+3a^2c+3ab^2+3b^2c+3ac^2+3bc^2+6abc'],
		['\\frac{x^2-1}{x+1}', 'x-1']
	])('%s ≡ %s, avec budget comme sans', (a, b) => {
		expect(areEquivalent(parseLatex(a), parseLatex(b))).toBe(true);
		expect(areEquivalent(parseLatex(a), parseLatex(b), { timeoutMs: 500 })).toBe(true);
	});

	it('une expression ordinaire ne paie pas la consultation du signal', () => {
		const started = performance.now();
		for (let i = 0; i < 300; i++) {
			areEquivalent(parseLatex('(x+1)^{3}(x-1)'), parseLatex('(x+1)^{3}(x-1)'), {
				timeoutMs: 500
			});
		}
		expect(performance.now() - started).toBeLessThan(3000);
	});
});
