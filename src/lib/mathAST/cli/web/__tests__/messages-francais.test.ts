/**
 * Les messages d'erreur de la console de Calcul, en français (2026-10-12, « ok continue ») :
 * les parseurs répondaient « Unexpected token: EOF », « Unknown command: \foo »… La traduction
 * se fait à la sortie de la console (les parseurs et leurs tests gardent leurs messages).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

const ENGLISH =
	/\b(Unexpected|Expected|Unknown|Missing|Invalid|Cannot|Empty|Failed|Could not|Division by|Indeterminate|Consecutive|Parse error|Error \[)/;

function run(input: string) {
	return new WebReplEngine().execute(input);
}

describe('les erreurs de lecture courantes, en français', () => {
	it.each([
		['2+', /incomplète/],
		['sin(', /incomplète/],
		['(2+3', /Il manque « \) »/],
		['2+3)', /« \) » inattendu/],
		['2*/3', /« \/ » inattendu/],
		['2++3', /Deux signes à la suite/],
		['\\frac{1}', /dénominateur/],
		['\\foo', /Commande inconnue : \\foo/],
		['.unknown', /Commande inconnue : \.unknown/],
		['g(2)', /Fonction inconnue : g/],
		['1/0', /Division par zéro/],
		['\\left(2', /\\right/],
		['\\text{abc}', /« abc »/],
		['@zz{2}', /Couleur inconnue : zz/],
		['5[zz]', /Unité inconnue : zz/],
		['\\binom{2}', /\\binom/],
		['\\lim_{x} x', /\\to/],
		['log_(2)', /indice/],
		['\\begin{foo}', /Environnement inconnu : foo/],
		["f'(2)", /f'/]
	])('%s', (input, expected) => {
		const line = run(input);

		expect(line.success).toBe(false);
		expect(line.output).toMatch(expected);
		expect(line.output).not.toMatch(ENGLISH);
		expect(line.error?.message ?? '').not.toMatch(ENGLISH);
	});

	it('/cas : le HTML aussi', () => {
		const html = run('2+3)').outputHtml ?? '';

		expect(html).not.toMatch(ENGLISH);
	});

	it('un message inconnu de la table : une formule française, jamais l’anglais', () => {
		const line = run('| 2 || 3 |');

		expect(line.success).toBe(false);
		expect(line.output).not.toMatch(ENGLISH);
	});

	it('une réussite n’est pas touchée', () => {
		expect(run('2+3').output).toBe('5');
	});
});
