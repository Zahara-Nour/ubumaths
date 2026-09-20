/**
 * `tidy()` — la mise au propre sans développement.
 *
 * Contrat : docs/wip/tidy-phase0.md, §A (validé par David le 2026-09-20).
 * Chaque `it` est une ligne de ce contrat. Les attendus sont écrits en syntaxe
 * maison, telle que `toCustom` l'imprime.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';

const t = (s: string) => toCustom(tidy(parseCustom(s)));

// =============================================================================
// Invariants
// =============================================================================

const PANEL_SANS_UNITE = [
	'2/6+1/4',
	'(2x)/(4y)',
	'sqrt(8)',
	'sqrt(12)+sqrt(3)',
	'1/sqrt(2)',
	'x+x',
	'3x+2x-x',
	'2x+3-x+1',
	'x*x*x',
	'(x+1)^2',
	'(x+1)*(x-1)',
	'2*(x+h)^2-2*x^2',
	'3*(x+1)^2*2',
	'x*(x+1)',
	'2*3*x*(x^2+1)^2',
	'2*x*sin(x)+x^2*cos(x)',
	'x/x',
	'sin(x)^2+cos(x)^2',
	'-(-x)',
	'x+(-3)',
	'(-x)/(-y)',
	'-(x+2)',
	'2(x+1)^2+3(x+1)^2',
	'(x+1)^2*(x+1)',
	'x^2*cos(x)+cos(x)*x^2'
];

// `areEquivalent` (normalize) ne rationalise pas un radical numérique au
// dénominateur : `1/√2 ≢ √2/2` pour lui, alors que tidy a raison de le faire
// (§C.7.2). Bug du décideur, relevé §6.8 — l'invariant ne peut pas être mesuré
// sur cette entrée tant qu'il n'est pas corrigé.
const EQUIVALENCE_NON_MESURABLE = ['1/sqrt(2)'];

describe('tidy — invariants', () => {
	it.each(PANEL_SANS_UNITE.filter((s) => !EQUIVALENCE_NON_MESURABLE.includes(s)))(
		'conserve la valeur : tidy(%s) ≡ entrée',
		(input) => {
			const node = parseCustom(input);
			expect(areEquivalent(tidy(node), node)).toBe(true);
		}
	);

	it.each(PANEL_SANS_UNITE)('est idempotent sur %s', (input) => {
		const once = tidy(parseCustom(input));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});

	it('ne développe jamais', () => {
		expect(t('(x+1)^2')).toBe('(x+1)^2');
		expect(t('x*(x+1)')).toBe('x(x+1)');
		expect(t('(x+1)*(x-1)')).toBe('(x+1)(x-1)');
		expect(t('2*(x+h)^2-2*x^2')).toBe('2(h+x)^2-2x^2');
	});

	it('ne factorise jamais', () => {
		expect(t('x^2+x')).toBe('x^2+x');
		expect(t('x^2-1')).toBe('x^2-1');
	});

	it('ne lève pas d’exception sur une relation : enfants mis au propre', () => {
		expect(t('x+x=2')).toBe('2x=2');
	});
});

// =============================================================================
// 1. Aplatir · 2. Parenthèses
// =============================================================================

describe('tidy — aplatir et parenthèses', () => {
	it('(a+b)+c → a+b+c', () => {
		expect(t('(a+b)+c')).toBe('a+b+c');
	});

	it('(a*b)*c → abc', () => {
		expect(t('(a*b)*c')).toBe('abc');
	});

	it('retire les parenthèses inutiles', () => {
		expect(t('(x)+1')).toBe('x+1');
		expect(t('2*(x)')).toBe('2x');
	});

	it('garde celles qu’exige la priorité', () => {
		expect(t('2*(x+1)')).toBe('2(x+1)');
		expect(t('(x+1)^2')).toBe('(x+1)^2');
		expect(t('x/(2y)')).toBe('x/(2y)');
	});
});

// =============================================================================
// 3. Neutres et signes
// =============================================================================

describe('tidy — neutres et signes', () => {
	it.each([
		['x+0', 'x'],
		['0+x', 'x'],
		['x*1', 'x'],
		['1*x', 'x'],
		['x*0', '0'],
		['x/1', 'x'],
		['0/x', '0'],
		['-(-x)', 'x'],
		['+x', 'x'],
		['x+(-3)', 'x-3'],
		['x-(-3)', 'x+3'],
		['x/(-y)', '-x/y'],
		['(-x)/(-y)', 'x/y'],
		['(-x)/y', '-x/y'],
		['-(x+2)', '-(x+2)']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

// =============================================================================
// 4. Arithmétique exacte entre littéraux
// =============================================================================

describe('tidy — arithmétique exacte', () => {
	it.each([
		['2*3*x', '6x'],
		['2/6+1/4', '7/12'],
		['1/2+1/3', '5/6'],
		['2/4*6/8', '3/8'],
		['3/6', '1/2'],
		['(2x)/(4y)', 'x/(2y)'],
		['(6x)/(4y)', '(3x)/(2y)'],
		['2*x*3*y', '6xy'],
		['2*(3x)', '6x'],
		['x/2*4', '2x']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('jamais de décimal : 1/3 reste 1/3', () => {
		expect(t('1/3')).toBe('1/3');
		expect(t('2/3+1/6')).toBe('5/6');
	});
});

// =============================================================================
// 5. Termes semblables — clé structurelle, sans développer
// =============================================================================

describe('tidy — termes semblables', () => {
	it.each([
		['x+x', '2x'],
		['x^2+x^2', '2x^2'],
		['3x+2x-x', '4x'],
		['2x+3-x+1', 'x+4'],
		['x-x', '0'],
		['2x-2x+1', '1'],
		['2(x+1)^2+3(x+1)^2', '5(x+1)^2'],
		['(x+1)^2+(x+1)^2', '2(x+1)^2'],
		['x^2*cos(x)+cos(x)*x^2', '2x^2cos(x)'],
		['sqrt(2)+sqrt(2)', '2sqrt(2)'],
		['x/2+x/2', 'x'],
		['a+b+a', '2a+b']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

// =============================================================================
// 6. Facteurs semblables
// =============================================================================

describe('tidy — facteurs semblables', () => {
	it.each([
		['x*x', 'x^2'],
		['x*x*x', 'x^3'],
		['x^2*x^3', 'x^5'],
		['x/x', '1'],
		// Parenthèses obligatoires : le parseur maison refuse `x^2/x` et lit
		// `x/x^2` comme `(x/x)^2` — bug de priorité du `^` après `/`, relevé §6.9.
		['(x^2)/x', 'x'],
		['x/(x^2)', '1/x'],
		['(x+1)^2*(x+1)', '(x+1)^3'],
		['x*y*x', 'x^2y'],
		['((x+1)^2)/(x+1)', 'x+1']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

// =============================================================================
// 7. Radicaux numériques
// =============================================================================

describe('tidy — radicaux numériques', () => {
	it.each([
		['sqrt(9)', '3'],
		['sqrt(8)', '2sqrt(2)'],
		['sqrt(2)*sqrt(8)', '4'],
		['sqrt(12)+sqrt(3)', '3sqrt(3)'],
		['1/sqrt(2)', 'sqrt(2)/2'],
		['sqrt(x)', 'sqrt(x)']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

// =============================================================================
// 8. Ordre canonique
// =============================================================================

describe('tidy — ordre canonique', () => {
	it('termes : degré décroissant, puis alphabétique, constante en dernier', () => {
		expect(t('3+x')).toBe('x+3');
		expect(t('x+x^2')).toBe('x^2+x');
		expect(t('b+a')).toBe('a+b');
		expect(t('1+x+x^2')).toBe('x^2+x+1');
		expect(t('cos(x)*x^2+sin(x)*2*x')).toBe('x^2cos(x)+2xsin(x)');
		expect(t('2*h^2+4*h*x')).toBe('4hx+2h^2');
	});

	it('facteurs : nombre, variables, fonctions, puissances de sommes', () => {
		expect(t('y*x')).toBe('xy');
		expect(t('x*2')).toBe('2x');
		expect(t('3*(x+1)^2*2')).toBe('6(x+1)^2');
		expect(t('(x^2+1)^2*x*2*3')).toBe('6x(x^2+1)^2');
		expect(t('sin(x)*x')).toBe('xsin(x)');
	});

	it('à degré égal, ordre alphabétique de l’écriture du terme — partout, sommes imbriquées comprises', () => {
		// (h+x), pas (x+h) : un seul ordre canonique, sinon (x+h)² et (h+x)² ne se
		// regroupent pas (revue du 2026-09-20, K1). Même choix que le Compute Engine.
		expect(t('-2*x^2+2*(x+h)^2')).toBe('2(h+x)^2-2x^2');
	});
});

// =============================================================================
// 9. Fonctions
// =============================================================================

describe('tidy — fonctions', () => {
	it('arguments mis au propre', () => {
		expect(t('sin(x+0)')).toBe('sin(x)');
		expect(t('cos(2*x*1)')).toBe('cos(2x)');
		expect(t('ln(x+x)')).toBe('ln(2x)');
	});

	it('une seule forme pour f^n(x) : le superscript', () => {
		expect(t('sin^2(x)')).toBe('sin(x)^2');
	});

	it('n’applique aucune identité, n’évalue rien', () => {
		expect(t('sin(x)^2+cos(x)^2')).toBe('cos(x)^2+sin(x)^2');
		expect(t('sin(0)')).toBe('sin(0)');
		expect(t('ln(exp(x))')).toBe('ln(exp(x))');
	});
});

// =============================================================================
// 10. Grandeurs — pour ce lot : l'unité survit (le choix de l'unité vient plus tard)
// =============================================================================

describe('tidy — grandeurs (lot 1 : l’unité survit)', () => {
	it.each([
		['12[km]', '12[km]'],
		['2*3[km]', '6[km]'],
		['12[km]+3[km]', '15[km]']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});
