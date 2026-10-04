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
