/**
 * Forme normale trigonométrique — étape 1 : définitions et Pythagore.
 *
 * `normalize` traitait `sin(x)`, `cos(x)`, `tan(x)`, `sec(x)` comme quatre
 * atomes **indépendants**, sans aucune relation. D'où une famille entière de
 * faux négatifs pour `areEquivalent`, donc pour la correction des copies :
 * `tan(x) ≢ sin(x)/cos(x)` et `sec(x) ≢ 1/cos(x)` sont pourtant les
 * **définitions** de ces fonctions.
 *
 * Deux gestes, dans cet ordre :
 *
 * 1. **Les définitions s'éliminent** — `tan`, `cot`, `sec`, `csc` s'écrivent
 *    avec `sin` et `cos` ; `tanh`, `coth`, `sech`, `csch` avec `sinh` et `cosh`.
 * 2. **Pythagore réduit** — `sin²(u) → 1 − cos²(u)` jusqu'au point fixe, et
 *    `sinh²(u) → cosh²(u) − 1`. Tout polynôme trigonométrique s'écrit alors de
 *    façon **unique** `A(cos u) + sin(u)·B(cos u)` : c'est la forme canonique de
 *    l'anneau quotient.
 *
 * Limite assumée de cette étape : les relations valent **à argument constant**.
 * `sin(2x)` et `sin(x)` restent indépendants ; les arcs commensurables sont
 * l'étape 2 (Tchebychev et formules d'addition).
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { equivalenceForm, normalize } from '../normalize';
import { preprocess } from '../rules';
import { hashNormalForm } from '../hash';
import type { MathNode } from '../../types';

const eq = (a: string, b: string) => areEquivalent(parseCustom(a), parseCustom(b));

/**
 * L'empreinte du **décideur**. `normalize` seul ne réduit pas la trigonométrie
 * — c'est tout l'objet du choix d'architecture : réduire pour comparer, pas
 * pour écrire.
 */
const hash = (node: MathNode) => hashNormalForm(equivalenceForm(node));

/** L'empreinte ordinaire, celle de la forme qui s'affiche. */
const plainHash = (node: MathNode) => hashNormalForm(normalize(preprocess(node)));

// =============================================================================
// 1. Les définitions
// =============================================================================

describe('les définitions s’éliminent', () => {
	it.each([
		['tan(x)', 'sin(x)/cos(x)'],
		['cot(x)', 'cos(x)/sin(x)'],
		['sec(x)', '1/cos(x)'],
		['csc(x)', '1/sin(x)'],
		['tan(x)*cot(x)', '1'],
		['sec(x)*cos(x)', '1'],
		['tan(x)*cos(x)', 'sin(x)'],
		['sin(x)*csc(x)', '1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['tanh(x)', 'sinh(x)/cosh(x)'],
		['coth(x)', 'cosh(x)/sinh(x)'],
		['sech(x)', '1/cosh(x)'],
		['csch(x)', '1/sinh(x)']
	])('%s ≡ %s (hyperbolique)', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

// =============================================================================
// 2. Pythagore
// =============================================================================

describe('Pythagore réduit', () => {
	it.each([
		['sin(x)^2+cos(x)^2', '1'],
		['1-sin(x)^2', 'cos(x)^2'],
		['1-cos(x)^2', 'sin(x)^2'],
		['cosh(x)^2-sinh(x)^2', '1'],
		['1+sinh(x)^2', 'cosh(x)^2'],
		['cosh(x)^2-1', 'sinh(x)^2']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['tan(x)^2+1', 'sec(x)^2'],
		['sec(x)^2-1', 'tan(x)^2'],
		['cot(x)^2+1', 'csc(x)^2'],
		['csc(x)^2-1', 'cot(x)^2'],
		['1-tanh(x)^2', 'sech(x)^2']
	])('%s ≡ %s (conséquence des définitions)', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('Pythagore aux puissances supérieures', () => {
	it.each([
		['sin(x)^4+2*sin(x)^2*cos(x)^2+cos(x)^4', '1'],
		['sin(x)^4', '(1-cos(x)^2)^2'],
		['sin(x)^3', 'sin(x)*(1-cos(x)^2)'],
		['sin(x)^6+3*sin(x)^4*cos(x)^2+3*sin(x)^2*cos(x)^4+cos(x)^6', '1'],
		['cos(x)^2-cos(x)^4', 'sin(x)^2*cos(x)^2']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('Pythagore au dénominateur', () => {
	it.each([
		['1/(sin(x)^2+cos(x)^2)', '1'],
		['cos(x)^2/(1-sin(x)^2)', '1'],
		['sin(x)/(sin(x)^2+cos(x)^2)', 'sin(x)'],
		['1/(1-sin(x)^2)', 'sec(x)^2']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

// =============================================================================
// 3. Ce qui reste indépendant — et doit le rester
// =============================================================================

describe('les relations valent par argument', () => {
	it.each([
		['sin(2x)^2+cos(2x)^2', '1'],
		['sin(x+1)^2+cos(x+1)^2', '1'],
		['tan(2x)', 'sin(2x)/cos(2x)'],
		['sin(x*y)^2+cos(x*y)^2', '1']
	])('%s ≡ %s (même argument, même relation)', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['sin(x)^2+cos(y)^2', '1'],
		['sin(x)*cos(x)', 'sin(x)'],
		['sin(x)', 'cos(x)'],
		['sin(x)^2', 'cos(x)^2'],
		['tan(x)', 'cot(x)'],
		['cosh(x)^2+sinh(x)^2', '1']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('arcs multiples : hors de portée de cette étape, et sans faux positif', () => {
		// Étape 2 (Tchebychev) : ces deux-là sont pourtant égaux.
		expect(eq('sin(2x)', '2*sin(x)*cos(x)')).toBe(false);
		expect(eq('cos(2x)', '1-2*sin(x)^2')).toBe(false);
	});
});

// =============================================================================
// 4. Ce qui marchait continue de marcher
// =============================================================================

describe('non-régression', () => {
	it.each([
		['sin(0)', '0'],
		['cos(0)', '1'],
		['tan(0)', '0'],
		['exp(x)*exp(2x)', 'exp(3x)'],
		['(x^2-1)/(x+1)', 'x-1'],
		['1/sqrt(2)', 'sqrt(2)/2'],
		['(2x)/(4y)', 'x/(2y)'],
		['12000[m]', '12[km]']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('sin(π/2) ≡ 1 et cos(π) ≡ -1', () => {
		expect(areEquivalent(parseLatex('\\sin(\\frac{\\pi}{2})'), parseLatex('1'))).toBe(true);
		expect(areEquivalent(parseLatex('\\cos(\\pi)'), parseLatex('-1'))).toBe(true);
	});

	it('une expression sans trigonométrie garde son hash', () => {
		expect(hash(parseCustom('x^2+2x+1'))).toBe(hash(parseCustom('(x+1)^2')));
		expect(plainHash(parseCustom('x^2+2x+1'))).toBe(plainHash(parseCustom('(x+1)^2')));
	});

	it('la forme qui s’affiche n’est pas réduite : sin²(x) reste sin²(x)', () => {
		expect(plainHash(parseCustom('sin(x)^2'))).toBe(plainHash(parseCustom('sin(x)^2')));
		expect(plainHash(parseCustom('sin(x)^2'))).not.toBe(plainHash(parseCustom('1-cos(x)^2')));
		expect(hash(parseCustom('sin(x)^2'))).toBe(hash(parseCustom('1-cos(x)^2')));
	});

	it('aucune exception sur les formes dégénérées', () => {
		for (const input of ['sin(x)/sin(x)', 'tan(0)', 'sqrt(sin(x))', 'sin(x)^(1/2)', '1/tan(x)']) {
			expect(() => normalize(preprocess(parseCustom(input)))).not.toThrow();
		}
	});
});

// =============================================================================
// 5. Transitivité — le propre d'un décideur
// =============================================================================

describe('l’équivalence reste transitive', () => {
	it('tan²+1, sec², 1/cos² et 1/(1−sin²) sont tous équivalents entre eux', () => {
		const forms = ['tan(x)^2+1', 'sec(x)^2', '1/cos(x)^2', '1/(1-sin(x)^2)'];
		const hashes = forms.map((f) => hash(parseCustom(f)));
		expect(new Set(hashes).size).toBe(1);
	});
});
