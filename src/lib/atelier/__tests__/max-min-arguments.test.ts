/**
 * `max`, `min` à plusieurs arguments dans une définition de fonction
 *
 * Défaut relevé en revue le 2026-10-13, plus large que l'affichage : l'élève
 * sépare les arguments par « ; » (règle de la virgule décimale, #973), que
 * Calcul traduisait pour un calcul mais pas pour une DÉFINITION — `f(x) =
 * max(2 ; x)` était rangée, puis `f(1)` répondait « Écriture non reconnue ». Le
 * champ de la carte montrait `\max\left( 2, 5 ; x \right)`, et le lecteur LaTeX
 * ne relisait pas `\max\left(2,x\right)`, la forme qu'écrit MathLive.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { fieldLatexOf, definitionFromField } from '../mathfield';
import { astOf } from '../parse';
import { toLatex } from '$lib/mathAST/latex-generator';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** Ce que Calcul répond à une ligne. */
function answer(s: CalcSession, line: string): string {
	const result = runInput(s, line);
	if (result.kind !== 'calcul') throw new Error(`${line} → ${JSON.stringify(result)}`);
	return result.output;
}

describe('une fonction définie avec max ou min dans Calcul', () => {
	// Calcul répond en valeur exacte (`5/2`)
	it.each([
		['f(x) = max(2 ; x)', 'f(1)', '2'],
		['f(x) = max(2 ; x)', 'f(3)', '3'],
		['f(x) = max(2,5 ; x)', 'f(1)', '5/2'],
		['f(x) = min(x ; 1,5)', 'f(4)', '3/2'],
		['f(x) = max(x;2)+1,5', 'f(0)', '7/2']
	])('%s puis %s répond %s', (definition, call, expected) => {
		const s = session();
		runInput(s, definition);

		expect(answer(s, call)).toBe(expected);
	});
});

/**
 * Revue : la virgule n'est convertie que dans la saisie de l'élève. Le texte que
 * le moteur réécrit (`toCustom` : `max(2,3)`, relu en provenance `'url'`) garde
 * sa virgule séparatrice — sinon `max(a,b)` valait max(1.2).
 */
describe('le texte réécrit par le moteur garde ses séparateurs', () => {
	it.each([
		[['a = 1', 'b = 2', 'f(x) = max(a,b)+x'], 'f(0)', '2'],
		[['g(x) = max(2;3)*x'], 'g(1)', '3'],
		[['f(x) = x^2'], "max(2;3)+f'(0)", '3'],
		[['p = 3', 'g(x) = max(p;2)'], 'g(0)', '3'],
		[['f(x) = gcd(12;18)+x'], 'f(0)', '6']
	])('%j puis %s répond %s', (lines, call, expected) => {
		const s = session();
		for (const line of lines) runInput(s, line);

		expect(answer(s, call)).toBe(expected);
	});

	// Comme sur une ligne de calcul : un seul argument décimal est refusé
	it('f(x) = max(1,2)+x est refusée avec la forme à « ; »', () => {
		const result = runInput(session(), 'f(x) = max(1,2)+x');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toContain('max(1 ; 2)');
	});
});

describe('max et min dans le champ de la carte', () => {
	/** Le champ d'une fonction définie dans Calcul. */
	function field(definition: string): string {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition }, 'text');
		return fieldLatexOf(atelier.get('f')!, atelier.functionNames);
	}

	it('sépare les arguments par « ; » et garde la virgule décimale', () => {
		const latex = field('max(2,5 ; x)');

		expect(latex).toMatch(/2\{,\}5\s*;\s*x/);
		expect(latex).not.toMatch(/\d\s*,\s+\d/);
	});

	it.each(['max(2,5 ; x)', 'min(x ; 1,5)', 'max(min(x ; 2) ; 1)'])(
		'%s se relit après retouche',
		(definition) => {
			const back = definitionFromField('function', field(definition));
			const a = astOf(back, 'keyboard', ['f']);
			const b = astOf(definition, 'text', ['f']);

			expect(a).not.toBeNull();
			expect(b).not.toBeNull();
			expect(toLatex(a!)).toBe(toLatex(b!));
		}
	);

	// Ce que MathLive écrit quand l'élève tape dans la carte
	it.each([
		['\\max\\left(2,x\\right)', 'f(1)', '2'],
		['\\max\\left(2{,}5;x\\right)', 'f(1)', '5/2'],
		['\\min\\left(x;1{,}5\\right)+1', 'f(4)', '5/2']
	])('%s tapé dans la carte : %s répond %s', (definition, call, expected) => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition }, 'keyboard');

		expect(answer(s, call)).toBe(expected);
	});
});
