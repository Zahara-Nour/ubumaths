/**
 * Robustesse du décideur trigonométrique — findings de la revue du 2026-09-20.
 *
 * Le cœur mathématique est sain (deux campagnes de 27 000 expressions n'ont
 * sorti aucun faux positif), mais la réduction avait quatre défauts de
 * plomberie, tous mesurés :
 *
 * - **le délai d'interruption ne la couvrait pas** : elle tourne après le retour
 *   de `normalize` et n'appelait jamais `checkAbort`. C'est la seule protection
 *   contre le gel du navigateur pendant la correction d'une copie
 *   (`utils/answer-validator.ts` la documente comme telle) ;
 * - **la réflexivité était cassée** : `areEquivalent(e, e)` rendait `false` dès
 *   que la réduction annulait un dénominateur, et `Exp.isEquivalent` **jetait** ;
 * - **deux notions d'égalité coexistaient** : `isZeroExpression` et
 *   `isOneExpression`, que `geometry-core` utilise pour comparer deux valeurs,
 *   ignoraient la réduction ;
 * - **`Exp.hash` contredisait `Exp.isEquivalent`**, alors que sa docstring
 *   promet le contraire.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { Exp } from '../../exp';
import { isZeroExpression, isOneExpression } from '../normalize';

// =============================================================================
// Le délai d'interruption couvre la réduction
// =============================================================================

describe('le délai d’interruption couvre la réduction', () => {
	// Le coût de la réduction est le **produit** des degrés des facteurs d'un même
	// monôme, pas leur maximum : quatre `sin^40` en produit, c'est 21⁴ termes.
	// Mesuré sans garde : 5,7 s. Un facteur de plus, ou `sin^64`, et le processus
	// meurt d'un dépassement mémoire avant même d'avoir eu le temps de ramer.
	const pathologique = parseLatex('\\sin(a)^{40}\\sin(b)^{40}\\sin(c)^{40}\\sin(d)^{40}');

	it('rend la main avant 5 secondes avec timeoutMs: 200', () => {
		const started = performance.now();
		const verdict = areEquivalent(pathologique, parseLatex('1'), { timeoutMs: 200 });
		const elapsed = performance.now() - started;

		expect(verdict).toBe(false);
		expect(elapsed).toBeLessThan(5000);
	});

	it('un signal déjà abandonné arrête tout de suite', () => {
		const controller = new AbortController();
		controller.abort();

		const started = performance.now();
		expect(areEquivalent(pathologique, parseLatex('1'), { signal: controller.signal })).toBe(false);
		expect(performance.now() - started).toBeLessThan(1000);
	});

	it('une expression ordinaire n’est pas gênée par un délai généreux', () => {
		expect(
			areEquivalent(parseCustom('sin(x)^2+cos(x)^2'), parseCustom('1'), { timeoutMs: 5000 })
		).toBe(true);
	});
});

// =============================================================================
// Réflexivité : une expression est toujours équivalente à elle-même
// =============================================================================

describe('réflexivité, même quand la réduction annule un dénominateur', () => {
	const degenerees = [
		'1/(sin(x)^2+cos(x)^2-1)',
		'1/(1-sin(x)^2-cos(x)^2)',
		'x/(sin(x)^2+cos(x)^2-1)',
		'1/(cos(x)^2-1+sin(x)^2)'
	];

	it.each(degenerees)('areEquivalent(e, e) vaut vrai pour %s', (input) => {
		const node = parseCustom(input);
		expect(areEquivalent(node, node)).toBe(true);
	});

	it.each(degenerees)('Exp.isEquivalent ne jette pas sur %s', (input) => {
		const exp = Exp.from(parseCustom(input));
		expect(() => exp.isEquivalent(parseCustom(input))).not.toThrow();
		expect(exp.isEquivalent(parseCustom(input))).toBe(true);
	});

	it('et la réduction continue de fonctionner à côté', () => {
		expect(areEquivalent(parseCustom('sin(x)^2+cos(x)^2'), parseCustom('1'))).toBe(true);
	});
});

// =============================================================================
// Une seule notion d'égalité dans toute la base
// =============================================================================

describe('isZeroExpression et isOneExpression décident comme areEquivalent', () => {
	it.each([
		'sin(x)^2+cos(x)^2-1',
		'tan(x)*cos(x)-sin(x)',
		'cosh(x)^2-sinh(x)^2-1',
		'sec(x)*cos(x)-1'
	])('isZeroExpression(%s) vaut vrai', (input) => {
		expect(isZeroExpression(parseCustom(input))).toBe(true);
	});

	it.each(['sin(x)^2+cos(x)^2', 'tan(x)*cot(x)', 'sec(x)*cos(x)', 'cosh(x)^2-sinh(x)^2'])(
		'isOneExpression(%s) vaut vrai',
		(input) => {
			expect(isOneExpression(parseCustom(input))).toBe(true);
		}
	);

	it('et ne se trompent pas dans l’autre sens', () => {
		expect(isZeroExpression(parseCustom('sin(x)^2+cos(x)^2'))).toBe(false);
		expect(isOneExpression(parseCustom('sin(x)^2'))).toBe(false);
		expect(isZeroExpression(parseCustom('x'))).toBe(false);
		expect(isOneExpression(parseCustom('x'))).toBe(false);
		expect(isZeroExpression(parseCustom('x-x'))).toBe(true);
		expect(isOneExpression(parseCustom('x/x'))).toBe(true);
	});
});

// =============================================================================
// Exp.hash tient sa promesse
// =============================================================================

describe('Exp.hash et Exp.isEquivalent disent la même chose', () => {
	it.each([
		['sin(x)^2', '1-cos(x)^2'],
		['tan(x)', 'sin(x)/cos(x)'],
		['sec(x)^2-1', 'tan(x)^2'],
		['x^2+2x+1', '(x+1)^2']
	])('%s et %s : même hash et équivalents', (a, b) => {
		const expA = Exp.from(parseCustom(a));
		const expB = Exp.from(parseCustom(b));
		expect(expA.isEquivalent(parseCustom(b))).toBe(true);
		expect(expA.hash).toBe(expB.hash);
	});

	it('deux expressions différentes gardent deux hash différents', () => {
		expect(Exp.from(parseCustom('sin(x)')).hash).not.toBe(Exp.from(parseCustom('cos(x)')).hash);
	});
});
