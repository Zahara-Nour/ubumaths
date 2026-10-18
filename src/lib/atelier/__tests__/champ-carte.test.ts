/**
 * Le champ de la carte — passer d'une définition au champ MathLive, et retour.
 *
 * Phase 0 `/grapheur` §1 C5, C6, C8, C10. Les chaînes MathLive sont celles
 * mesurées au vrai clavier dans Chromium le 2026-10-04 (progression, lot 2a).
 */

import { describe, it, expect } from 'vitest';
import { fieldLatexOf, definitionFromField, forMathlive } from '../mathfield';
import { astOf, parseDefinition } from '../parse';
import { toLatex } from '$lib/mathAST/latex-generator';
import { Atelier } from '../atelier.svelte';

/** Deux écritures disent-elles la même chose, une fois relues ? */
function sameReading(latex: string, definition: string, provenance: 'text' | 'keyboard') {
	const a = astOf(latex, 'keyboard', ['f', 'g']);
	const b = astOf(definition, provenance, ['f', 'g']);
	expect(a).not.toBeNull();
	expect(b).not.toBeNull();
	expect(toLatex(a!)).toBe(toLatex(b!));
}

describe('de la définition au champ', () => {
	it('un objet vide donne un champ vide', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '' });

		expect(fieldLatexOf(atelier.get('f')!, atelier.functionNames)).toBe('');
	});

	// C8 : défini au clavier de Calcul (texte), relu dans la carte (LaTeX)
	it('traduit en LaTeX une définition tapée dans Calcul', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'sqrt(x) + 2x^2' }, 'text');

		const latex = fieldLatexOf(atelier.get('f')!, atelier.functionNames);

		expect(latex).not.toBe('sqrt(x) + 2x^2');
		sameReading(latex, 'sqrt(x) + 2x^2', 'text');
	});

	it('rend tel quel ce qui vient déjà d’un champ de maths', () => {
		const atelier = new Atelier();
		atelier.create(
			{ kind: 'function', name: 'f', definition: '\\sin\\left(x\\right)+1' },
			'keyboard'
		);

		expect(fieldLatexOf(atelier.get('f')!, atelier.functionNames)).toBe('\\sin\\left(x\\right)+1');
	});

	it('rend le texte brut d’une définition illisible, plutôt que rien', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '2 + * 3' }, 'text');

		expect(fieldLatexOf(atelier.get('f')!, atelier.functionNames)).toBe('2 + * 3');
	});
});

describe('du champ à la définition', () => {
	it('garde le LaTeX d’une fonction tel quel', () => {
		expect(definitionFromField('function', 'f^{\\prime}\\left(x\\right)+1')).toBe(
			'f^{\\prime}\\left(x\\right)+1'
		);
	});

	it('retire les espaces autour', () => {
		expect(definitionFromField('function', '  x^2  ')).toBe('x^2');
	});

	// MathLive écrit `12\operatorname{\mathrm{km}}`, que l'atelier refusait
	it('relit une grandeur tapée avec son unité', () => {
		const definition = definitionFromField('value', '12\\operatorname{\\mathrm{km}}');

		expect(parseDefinition('value', definition, 'keyboard')).toEqual({ unit: 'km' });
	});

	it('relit une vitesse écrite en fraction par MathLive', () => {
		const definition = definitionFromField('value', '\\frac{90\\operatorname{\\mathrm{km}}}{h}');

		expect(parseDefinition('value', definition, 'keyboard')).toEqual({ unit: 'km/h' });
	});

	// Lot C des grandeurs : l'espace tapée (`\,` dans MathLive) fait la grandeur
	it('« 5 m » tapé avec une espace est une grandeur ; collé, un produit', () => {
		expect(parseDefinition('value', definitionFromField('value', '5\\,m'), 'keyboard')).toEqual({
			unit: 'm'
		});
		expect(definitionFromField('value', '5m')).toBe('5m');
	});

	// Revue du lot C : la virgule décimale de MathLive (`{,}`) cachait l'espace
	it('« 2,5 km » tapé avec une espace est une grandeur', () => {
		expect(
			parseDefinition('value', definitionFromField('value', '2{,}5\\,km'), 'keyboard')
		).toEqual({ unit: 'km' });
	});

	// ⚠️ Le secours « unité » ne doit jamais toucher ce qui se lit déjà :
	// `normalizeStudentQuantity` ferait de `2b` le nombre 2 suivi de l'unité b
	it('ne transforme pas une valeur algébrique en grandeur', () => {
		expect(definitionFromField('value', '2b')).toBe('2b');
		expect(definitionFromField('value', '3,5')).toBe('3,5');
	});

	it('laisse une saisie illisible telle quelle, pour que l’erreur la cite', () => {
		expect(definitionFromField('value', '2+*')).toBe('2+*');
	});
});

// Revue du lot 2a, B : MathLive ne connaît pas `\unit`, il affichait « \unitkm »
describe('grandeurs et MathLive', () => {
	it('une grandeur arrive dans le champ sous la forme que MathLive écrit lui-même', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '12[km]' }, 'url');

		const latex = fieldLatexOf(atelier.get('a')!, atelier.functionNames);

		expect(latex).not.toContain('\\unit');
		expect(latex).toContain('km');
	});

	it('et se relit en grandeur au retour du champ', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '90[km/h]' }, 'url');

		const back = definitionFromField(
			'value',
			fieldLatexOf(atelier.get('a')!, atelier.functionNames)
		);

		expect(parseDefinition('value', back, 'keyboard')).toEqual({ unit: 'km/h' });
	});

	it('forMathlive réécrit chaque \\unit', () => {
		expect(forMathlive('12~\\unit{km}+3\\unit{m}')).not.toContain('\\unit');
	});
});

/**
 * Restes du lot C des grandeurs (2026-10-13) : une durée composée ou une
 * fraction suivie d'une unité ne se relisait plus au retour du champ, et ne se
 * lisait pas tapée dans la carte (`2\,h\,30\,\min` : MathLive écrit `\min`).
 */
describe('durées composées et fractions dans la carte', () => {
	/** La même grandeur, une fois relue : même écriture LaTeX de l'arbre. */
	function sameQuantity(definition: string, expected: string) {
		const a = astOf(definition, 'keyboard', []);
		const b = astOf(expected, 'keyboard', []);
		expect(a).not.toBeNull();
		expect(toLatex(a!)).toBe(toLatex(b!));
	}

	function roundTrip(definition: string, provenance: 'text' | 'keyboard') {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'd', definition }, provenance);
		const field = fieldLatexOf(atelier.get('d')!, atelier.functionNames);
		return { field, back: definitionFromField('value', field) };
	}

	it('une durée composée rangée par Calcul se relit après retouche', () => {
		const { back } = roundTrip('(2[h]+30[min])', 'text');

		expect(parseDefinition('value', back, 'keyboard')).toEqual({ unit: 'h' });
		sameQuantity(back, '(2\\unit{h}+30\\unit{min})');
	});

	it('elle s’affiche dans le champ comme l’élève l’écrit : 2 h 30 min', () => {
		for (const [definition, provenance] of [
			['(2[h]+30[min])', 'text'],
			['(2\\unit{h}+30\\unit{min})', 'keyboard']
		] as const) {
			const { field } = roundTrip(definition, provenance);
			expect(field).not.toContain('+');
			expect(field).not.toContain('\\left(');
			expect(field).toMatch(/2.*h.*30.*min/);
		}
	});

	it('une fraction suivie d’une unité se relit après retouche', () => {
		const { back } = roundTrip('(1/2)[m]', 'text');

		expect(parseDefinition('value', back, 'keyboard')).toEqual({ unit: 'm' });
		sameQuantity(back, '\\frac{1}{2}\\unit{m}');
	});

	it.each([
		['2\\,h\\,30\\,\\min', '(2\\unit{h}+30\\unit{min})'],
		['1\\,h\\,5\\,\\min\\,30\\,s', '(1\\unit{h}+5\\unit{min}+30\\unit{s})'],
		['2\\,\\min\\,30\\,s', '(2\\unit{min}+30\\unit{s})'],
		['\\frac{1}{2}\\,m', '\\frac{1}{2}\\unit{m}']
	])('%s tapé dans la carte est une grandeur', (typed, expected) => {
		sameQuantity(definitionFromField('value', typed), expected);
	});

	// Revue : la notation scientifique passait par le secours des cases à unité
	it.each([
		['2{,}5\\times10^3\\,m', 'm'],
		['1{,}5\\times10^8\\,km', 'km']
	])('%s reste une grandeur', (typed, unit) => {
		expect(parseDefinition('value', definitionFromField('value', typed), 'keyboard')).toEqual({
			unit
		});
	});

	it('une partie décimale garde sa virgule, un ordre inhabituel son écriture', () => {
		expect(roundTrip('(2.5[h]+30[min])', 'text').field).toContain('2{,}5');
		const { field, back } = roundTrip('(2[min]+3[h])', 'text');
		expect(field).toContain('+');
		expect(parseDefinition('value', back, 'keyboard')).toEqual({ unit: 'min' });
	});

	it('ce qui n’est pas une grandeur reste tel quel', () => {
		expect(definitionFromField('value', '\\min\\left(2,3\\right)')).toBe('\\min\\left(2,3\\right)');
		expect(definitionFromField('value', '\\frac{1}{2}m')).toBe('\\frac{1}{2}m');
	});
});

/**
 * Suites des restes du lot C (2026-10-13) : la virgule décimale dans le champ,
 * une durée composée prise dans un calcul.
 */
describe('virgule et durée composée dans un calcul', () => {
	function roundTrip(definition: string) {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'd', definition }, 'text');
		const field = fieldLatexOf(atelier.get('d')!, atelier.functionNames);
		return { field, back: definitionFromField('value', field) };
	}

	it.each([
		['2,5[km]', '2{,}5', 'km'],
		['0,75[kg]*4', '0{,}75', 'kg'],
		// Revue : la notation scientifique passe par le dernier secours
		['2,5*10^3[m]', '2{,}5', 'm']
	])('%s s’affiche avec une virgule et se relit', (definition, shown, unit) => {
		const { field, back } = roundTrip(definition);
		expect(field).toContain(shown);
		expect(field).not.toMatch(/\d\.\d/);
		expect(parseDefinition('value', back, 'keyboard')).toEqual({ unit });
	});

	it.each([
		['(1[h]+30[min])*2', '(1\\unit{h}+30\\unit{min})\\cdot2'],
		['2*(1[h]+30[min])', '2\\cdot(1\\unit{h}+30\\unit{min})'],
		['(1[h]+30[min])/3', '\\frac{(1\\unit{h}+30\\unit{min})}{3}']
	])('%s se relit après retouche', (definition, expected) => {
		const { back } = roundTrip(definition);
		expect(parseDefinition('value', back, 'keyboard')).toEqual({ unit: 'h' });
		const a = astOf(back, 'keyboard', []);
		const b = astOf(expected, 'keyboard', []);
		expect(a).not.toBeNull();
		expect(toLatex(a!)).toBe(toLatex(b!));
	});
});

/** Défauts anciens du champ, corrigés le 2026-10-13 (suites de #1296). */
describe('puissance de dix et virgule des fonctions', () => {
	it.each([
		['10^3[m]', '10^3\\unit{m}'],
		['10^(-3)[m]', '10^{-3}\\unit{m}'],
		['2,5*10^3[m]', '2{,}5\\times10^3\\unit{m}']
	])('%s se relit après retouche', (definition, expected) => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'd', definition }, 'text');
		const back = definitionFromField(
			'value',
			fieldLatexOf(atelier.get('d')!, atelier.functionNames)
		);
		expect(parseDefinition('value', back, 'keyboard')).toEqual({ unit: 'm' });
		expect(toLatex(astOf(back, 'keyboard', [])!)).toBe(toLatex(astOf(expected, 'keyboard', [])!));
	});

	// Revue : le dernier recours ne fait une unité que si la relecture en rend une
	it('min(2, 3) écrit en opérateur reste la fonction', () => {
		const typed = '\\operatorname{\\mathrm{min}}\\left(2,3\\right)';
		expect(definitionFromField('value', typed)).toBe(typed);
	});

	it('une fonction garde la virgule de l’élève, et se relit', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '2,5x+0,5' }, 'text');

		const latex = fieldLatexOf(atelier.get('f')!, atelier.functionNames);

		expect(latex).toContain('2{,}5');
		expect(latex).not.toMatch(/\d\.\d/);
		sameReading(definitionFromField('function', latex), '2,5x+0,5', 'text');
	});
});

// Lot 4b de la refonte : la carte d'un point n'a plus de vue repliée, son champ
// montre donc ses coordonnées en écriture mathématique — et se relit
describe('le champ d’un point', () => {
	it('(sqrt(2) ; 1,5) tapé dans la console se montre en LaTeX, et se relit', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(sqrt(2) ; 1,5)' }, 'text');

		const latex = fieldLatexOf(atelier.get('A')!, atelier.functionNames);

		expect(latex).toBe('\\left(\\sqrt{2};1{,}5\\right)');
		const back = definitionFromField('point', latex);
		expect(parseDefinition('point', back, 'keyboard', []).error).toBeUndefined();
	});
});
