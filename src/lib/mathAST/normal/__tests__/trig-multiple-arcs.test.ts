/**
 * Forme normale trigonométrique — étape 2 : les arcs commensurables.
 *
 * L'étape 1 (PR #382) a rendu équivalentes les expressions d'un **même**
 * argument : `sin²(u)+cos²(u)` vaut `1`, `tan(u)` vaut `sin(u)/cos(u)`. Mais
 * `sin(2x)` et `2 sin(x) cos(x)` restaient étrangers, faute de relation entre
 * deux arguments différents.
 *
 * ## Le générateur est absolu, pas relatif à l'expression
 *
 * C'est le point qui commande tout le reste. Chercher le plus petit angle
 * commun **à chaque expression prise séparément** ne marche pas : `sin(2x)`
 * seul garderait `2x` pour générateur, `2 sin(x) cos(x)` garderait `x`, et les
 * deux resteraient étrangers — exactement ce qu'on veut corriger.
 *
 * Le générateur canonique est donc l'atome de **coefficient 1**, et seuls les
 * coefficients **entiers** sont traités. Tout `sin(k·u)` et `cos(k·u)` se
 * réécrit en polynôme de `sin(u)` et `cos(u)` par les polynômes de Tchebychev :
 * `cos(ku) = T_k(cos u)` et `sin(ku) = sin(u)·U_{k−1}(cos u)`. Un argument à
 * plusieurs termes passe d'abord par les formules d'addition.
 *
 * ## Deux limites assumées
 *
 * - **Coefficient non entier** : `sin(x/2)` reste opaque. Le rendre équivalent
 *   demanderait de prendre `x/2` pour générateur, donc un générateur qui dépend
 *   de l'expression.
 * - **Plafond** : au-delà d'un certain multiple, l'arc reste opaque plutôt que
 *   de produire un polynôme de degré arbitraire. Faux négatif, jamais faux
 *   positif.
 *
 * Comme à l'étape 1 : **réduire pour comparer, pas pour écrire**. Rien de tout
 * ceci ne touche la forme que `simplify` affiche.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toCustom } from '../../custom-generator';

const eq = (a: string, b: string) => areEquivalent(parseCustom(a), parseCustom(b));
const eqLatex = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

// =============================================================================
// Arcs multiples
// =============================================================================

describe('duplication', () => {
	it.each([
		['sin(2x)', '2*sin(x)*cos(x)'],
		['cos(2x)', '2*cos(x)^2-1'],
		['cos(2x)', '1-2*sin(x)^2'],
		['cos(2x)', 'cos(x)^2-sin(x)^2'],
		['tan(2x)', '2*tan(x)/(1-tan(x)^2)'],
		['sin(2x)/sin(x)', '2*cos(x)'],
		['sin(2y)', '2*sin(y)*cos(y)']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('multiples supérieurs', () => {
	it.each([
		['sin(3x)', '3*sin(x)-4*sin(x)^3'],
		['cos(3x)', '4*cos(x)^3-3*cos(x)'],
		['sin(4x)', '2*sin(2x)*cos(2x)'],
		['cos(4x)', '8*cos(x)^4-8*cos(x)^2+1'],
		['sin(6x)', '2*sin(3x)*cos(3x)']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('un argument composé se comporte pareil : sin(2xy) ≡ 2 sin(xy) cos(xy)', () => {
		expect(eq('sin(2*x*y)', '2*sin(x*y)*cos(x*y)')).toBe(true);
	});
});

// =============================================================================
// La linéarisation vient gratuitement
// =============================================================================

describe('linéarisation — aucune règle dédiée, les deux écritures convergent', () => {
	it.each([
		['sin(x)^2', '(1-cos(2x))/2'],
		['cos(x)^2', '(1+cos(2x))/2'],
		['sin(x)*cos(x)', 'sin(2x)/2'],
		['sin(x)^3', '(3*sin(x)-sin(3x))/4'],
		['cos(x)^4', '(3+4*cos(2x)+cos(4x))/8']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

// =============================================================================
// Formules d'addition
// =============================================================================

describe('addition et soustraction d’angles', () => {
	it.each([
		['sin(x+y)', 'sin(x)*cos(y)+cos(x)*sin(y)'],
		['cos(x+y)', 'cos(x)*cos(y)-sin(x)*sin(y)'],
		['sin(x-y)', 'sin(x)*cos(y)-cos(x)*sin(y)'],
		['cos(x-y)', 'cos(x)*cos(y)+sin(x)*sin(y)'],
		['sin(2x+y)', 'sin(2x)*cos(y)+cos(2x)*sin(y)'],
		['sin(x+y)*sin(x-y)', 'sin(x)^2-sin(y)^2']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('une constante remarquable se combine : sin(x+π/2) ≡ cos(x)', () => {
		expect(eqLatex('\\sin(x+\\frac{\\pi}{2})', '\\cos(x)')).toBe(true);
		expect(eqLatex('\\sin(2x+\\frac{\\pi}{2})', '\\cos(2x)')).toBe(true);
	});
});

// =============================================================================
// Hyperboliques
// =============================================================================

describe('les mêmes relations pour les hyperboliques', () => {
	it.each([
		['sinh(2x)', '2*sinh(x)*cosh(x)'],
		['cosh(2x)', '2*cosh(x)^2-1'],
		['cosh(2x)', '1+2*sinh(x)^2'],
		['sinh(x+y)', 'sinh(x)*cosh(y)+cosh(x)*sinh(y)'],
		['cosh(x+y)', 'cosh(x)*cosh(y)+sinh(x)*sinh(y)']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

// =============================================================================
// Aucun faux positif — le risque majeur
// =============================================================================

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['sin(2x)', '2*sin(x)'],
		['cos(2x)', '2*cos(x)'],
		['sin(2x)', 'sin(3x)'],
		['sin(2x)', 'sin(x)*cos(x)'],
		['cos(2x)', 'cos(x)^2+sin(x)^2'],
		['sin(x+y)', 'sin(x)+sin(y)'],
		['cos(x+y)', 'cos(x)*cos(y)+sin(x)*sin(y)'],
		['sinh(2x)', 'sinh(x)*cosh(x)'],
		['sin(2x)', 'sin(2y)']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

// =============================================================================
// Les deux limites assumées
// =============================================================================

describe('limites assumées : faux négatif, jamais faux positif', () => {
	it('un coefficient non entier reste opaque : sin(x/2)', () => {
		expect(eq('sin(x/2)', 'sin(x/2)')).toBe(true);
		// Égaux en vérité, hors de portée du générateur canonique.
		expect(eq('sin(x)', '2*sin(x/2)*cos(x/2)')).toBe(false);
	});

	it('un multiple très grand reste opaque', () => {
		expect(eq('sin(40x)', 'sin(40x)')).toBe(true);
		expect(eq('sin(40x)', '2*sin(20x)*cos(20x)')).toBe(false);
	});
});

// =============================================================================
// Non-régression : l'étape 1, les valeurs remarquables, l'affichage
// =============================================================================

describe('non-régression', () => {
	it.each([
		['sin(x)^2+cos(x)^2', '1'],
		['tan(x)', 'sin(x)/cos(x)'],
		['sec(x)^2-1', 'tan(x)^2'],
		['cosh(x)^2-sinh(x)^2', '1'],
		['1/sqrt(2)', 'sqrt(2)/2'],
		['(x^2-1)/(x+1)', 'x-1'],
		['12000[m]', '12[km]']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['\\sin(x+2\\pi)', '\\sin(x)'],
		['\\sin(x+\\pi)', '-\\sin(x)'],
		['\\sin(-x)', '-\\sin(x)'],
		['\\cos(-x)', '\\cos(x)'],
		['\\cos(\\frac{\\pi}{3})', '\\frac{1}{2}']
	])('%s ≡ %s (valeurs remarquables et parité)', (a, b) => {
		expect(eqLatex(a, b)).toBe(true);
	});

	it('réflexivité, y compris sur les formes dégénérées', () => {
		for (const input of ['sin(2x)', 'sin(x/2)', '1/(sin(x)^2+cos(x)^2-1)', 'sin(40x)']) {
			const node = parseCustom(input);
			expect(areEquivalent(node, node)).toBe(true);
		}
	});

	it('l’affichage ne bouge pas : réduire pour comparer, pas pour écrire', () => {
		expect(toCustom(simplify(parseCustom('sin(2x)')).result)).toBe('sin(2x)');
		expect(toCustom(simplify(parseCustom('sin(x)*cos(x)')).result)).toBe('cos(x)sin(x)');
		expect(toCustom(simplify(parseCustom('sin(x)^2')).result)).toBe('sin(x)^2');
	});
});

// =============================================================================
// Le délai d'interruption couvre aussi cette réécriture
// =============================================================================

describe('le délai d’interruption couvre les arcs multiples', () => {
	it('rend la main vite sur un cas coûteux', () => {
		const lourd = parseCustom('sin(12x)*cos(12y)*sin(12z)+cos(11x)*sin(11y)');
		const started = performance.now();
		areEquivalent(lourd, parseCustom('1'), { timeoutMs: 200 });
		expect(performance.now() - started).toBeLessThan(5000);
	});

	it('une expression sans trigonométrie ne paie rien', () => {
		const started = performance.now();
		for (let i = 0; i < 200; i++) {
			areEquivalent(parseCustom('(x+1)^3/(x-1)'), parseCustom('(x+1)^3/(x-1)'));
		}
		expect(performance.now() - started).toBeLessThan(2000);
	});
});
