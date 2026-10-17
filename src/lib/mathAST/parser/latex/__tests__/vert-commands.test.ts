/**
 * Valeur absolue écrite `\vert`, `\lvert … \rvert`, `\left\vert … \right\vert`
 * ============================================================================
 *
 * La touche « valeur absolue » du clavier virtuel de MathLive insère
 * `\left\vert#0\right\vert`, et MathLive renvoie la réponse telle quelle :
 * `\left\vert2x+1\right\vert` (mesuré dans Chromium, `getValue()`, MathLive
 * 0.111.1). La touche `\vert` seule renvoie `\vert x\vert`. Le parseur ne
 * connaissait aucune de ces commandes : la réponse de l'élève était refusée.
 *
 * Règle : `\vert`, `\lvert`, `\rvert` se lisent comme la barre `|`, partout
 * (barres nues, et après `\left` / `\right`). Restent hors de cette lecture :
 * `\mid` (divisibilité, « tel que ») et `\Vert`, `\|` (norme).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../index';
import { toLatex } from '../../../latex-generator';
import { solve } from '../../../solve/solve';
import { evaluateNodeToApproximatedNumber } from '../../../eval/evaluate';

describe('même arbre que la forme avec la barre |', () => {
	it.each([
		['\\vert x\\vert', '|x|'],
		['\\lvert x\\rvert', '|x|'],
		['\\left\\vert x\\right\\vert', '\\left|x\\right|'],
		['\\left\\lvert x\\right\\rvert', '\\left|x\\right|'],
		// Forme exacte rendue par MathLive (pas d'espace avant le chiffre)
		['\\left\\vert2x+1\\right\\vert', '\\left|2x+1\\right|'],
		['3\\left\\vert 2x-1\\right\\vert', '3\\left|2x-1\\right|'],
		// Règle des barres nues (#1252) : un facteur collé ouvre une valeur absolue
		['2\\vert x\\vert', '2|x|'],
		['-3\\lvert x+1\\rvert', '-3|x+1|'],
		['\\vert x\\vert\\vert y\\vert', '|x||y|'],
		['\\ln\\lvert 2x\\rvert', '\\ln|2x|'],
		['\\vert 2x+1\\vert=5', '|2x+1|=5']
	])('%s ≡ %s', (vert, bar) => {
		expect(parseLatex(vert)).toEqual(parseLatex(bar));
	});
});

describe('aller-retour toLatex', () => {
	it.each([
		'\\vert x\\vert',
		'\\left\\vert2x+1\\right\\vert',
		'2\\vert x\\vert',
		'\\left\\lvert 3x\\right\\rvert'
	])('%s se relit à l’identique', (latex) => {
		const once = toLatex(parseLatex(latex));
		expect(toLatex(parseLatex(once))).toBe(once);
	});

	it('la sortie est la forme \\left| … \\right|', () => {
		const output = toLatex(parseLatex('\\left\\vert2x+1\\right\\vert'));
		expect(output).toBe(toLatex(parseLatex('\\left|2x+1\\right|')));
		expect(output).toMatch(/^\\left\| .* \\right\|$/);
	});
});

describe('hors de cette lecture : \\mid, \\Vert, \\|', () => {
	it.each(['a\\mid b', '\\Vert x\\Vert', '\\|x\\|', '\\left\\Vert x\\right\\Vert'])(
		'%s reste refusé',
		(latex) => {
			expect(() => parseLatex(latex)).toThrow();
		}
	);

	it('\\vertx (commande inconnue) n’est pas lue comme \\vert x', () => {
		expect(() => parseLatex('\\vertx')).toThrow();
	});

	it('barre fermante oubliée : erreur, jamais un produit', () => {
		expect(() => parseLatex('2\\vert x')).toThrow(/close absolute value/);
	});
});

describe('bout de chaîne : solve', () => {
	it.each([
		'\\left\\vert 2x+1\\right\\vert=5',
		'\\left\\vert2x+1\\right\\vert=5',
		'\\vert 2x+1\\vert=5'
	])('%s → {−3 ; 2}', (latex) => {
		const node = parseLatex(latex);
		if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
		const result = solve(node, { variable: 'x' });
		expect(result.error, latex).toBeUndefined();
		const values = result.solutions
			.map((s) => evaluateNodeToApproximatedNumber(s.value))
			.sort((a, b) => a - b);
		expect(values).toHaveLength(2);
		expect(values[0]).toBeCloseTo(-3, 10);
		expect(values[1]).toBeCloseTo(2, 10);
	});
});
