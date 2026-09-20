/**
 * Le signal d'interruption doit atteindre l'arithmétique polynomiale.
 *
 * `makeAbortChecker` existe depuis longtemps, `simplify` l'installe, et
 * `pattern/match.ts` le consulte. Mais `polynomial.ts` ne le lisait nulle part,
 * et `areEquivalent` ne l'installait pas : un `timeoutMs` ne bornait donc RIEN
 * sur le chemin qui coûte le plus cher, le développement d'une puissance de
 * somme large.
 *
 * ## ⚠️ Ce que chaque cas prouve, exactement
 *
 * La PR contient DEUX changements qui bornent le même chemin par des moyens
 * différents : le signal rendu lisible, et la suppression d'un carré mort dans
 * `powPolynomial` (au dernier tour, `exp` vaut 1 et ce carré — le plus gros du
 * calcul — n'était jamais lu). Les trois cas lourds meurent bien sur `main`,
 * mais ils ne discriminent PAS la même chose. Mesuré en neutralisant un garde à
 * la fois, depuis une copie, tas plafonné à 700 Mo :
 *
 * | neutralisation                     | `(…d)^8` | trigo   | `(…g)^9` |
 * | ---------------------------------- | -------- | ------- | -------- |
 * | rien (branche intacte)             | 402 ms   | 502 ms  | 503 ms   |
 * | `checkAbort` retiré de polynomial  | 415 ms   | 501 ms  | **OOM**  |
 * | installation ambiante retirée      | 432 ms   | 501 ms  | **OOM**  |
 * | carré mort rétabli, aborts intacts | 515 ms   | 506 ms  | 502 ms   |
 *
 * Autrement dit : **seul `(x+y+z+w+a+b+c+d+e+f+g)^9` prouve le canal ambiant.**
 * Les deux premiers sont bornés par la seule suppression du carré mort, et le
 * dernier ligne prouve le contraire : les trois tiennent sans elle dès que les
 * aborts sont là. Les quatre cas gardent leur valeur — ils couvrent les deux
 * moitiés du correctif — mais il ne faut pas leur faire dire plus.
 *
 * Le troisième cas ne contient aucune trigonométrie : le mur est dans
 * l'arithmétique elle-même, pas dans une règle.
 *
 * ## Ce que les tests n'affirment pas
 *
 * Rien sur le verdict au-delà de `false`, qui est la réponse conservatrice d'un
 * décideur qui abandonne : il n'a pas prouvé l'égalité, il ne la déclare pas.
 *
 * La tolérance est de 1500 ms pour un budget de 500 ms. Le dépassement réel
 * mesuré ne va pas au-delà de 5 % (402, 502, 503, 430 ms) ; laisser un facteur
 * dix de mou ne rattraperait aucune régression de granularité.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { withActiveAbortChecker } from '../../common/abort';
import { evaluate } from '../../eval/evaluate';
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
		expect(performance.now() - started).toBeLessThan(1500);
	});

	it('simplify aussi rend la main sur la même forme', () => {
		const started = performance.now();
		simplify(parseLatex('(x+y+z+w+a+b+c+d)^{8}'), { timeoutMs: 500 });
		expect(performance.now() - started).toBeLessThan(1500);
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

// =============================================================================
// Un abandon ne doit jamais devenir une AFFIRMATION
// =============================================================================

/**
 * Le prix de l'héritage du signal ambiant : un `areEquivalent` sans budget,
 * imbriqué dans un extent budgété dont le délai est écoulé, rend `false` faute
 * d'avoir pu conclure. Partout où ce `false` est lu tel quel, c'est
 * conservateur. Le seul endroit où il était NIÉ est la relation `!=` de
 * `eval/evaluate.ts` : la négation retournait un « ces deux expressions
 * diffèrent » affirmatif, et faux.
 *
 * Mesuré : sous un checker dont la deadline est passée,
 * `(x+y+z)^3 ≠ (z+y+x)^3` rendait `{ status: 'value', value: true }`. Les deux
 * membres sont pourtant égaux.
 */
describe('un abandon rend « non évaluable », jamais une affirmation', () => {
	const DIFFERENT = parseLatex('(x+y+z)^{3} \\neq (z+y+x)^{3}');
	const EGAL = parseLatex('(x+y+z)^{3} = (z+y+x)^{3}');

	it('hors de tout extent, la relation se décide normalement', () => {
		expect(evaluate(DIFFERENT)).toMatchObject({ status: 'value', value: false });
		expect(evaluate(EGAL)).toMatchObject({ status: 'value', value: true });
	});

	it('sous un signal déjà écoulé, les deux relations deviennent non évaluables', () => {
		withActiveAbortChecker(
			() => true,
			() => {
				expect(evaluate(DIFFERENT)).toMatchObject({ status: 'unevaluable' });
				expect(evaluate(EGAL)).toMatchObject({ status: 'unevaluable' });
			}
		);
	});

	it('le signal ne survit pas à son extent', () => {
		withActiveAbortChecker(
			() => true,
			() => evaluate(DIFFERENT)
		);
		expect(evaluate(DIFFERENT)).toMatchObject({ status: 'value', value: false });
	});
});
