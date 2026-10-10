/**
 * Signe : f(x) = 0 que le solveur ne sait pas résoudre
 *
 * Mesuré avant le correctif : un échec de `solve` (« Type d'equation … non
 * supporte ») devenait « aucun zéro ». Le tableau de signes annonçait
 * « Zeros : aucun », et l'échantillonnage — 5 points sur [−100 ; 100] —
 * « confirmait » un signe sur un intervalle qui contenait deux zéros :
 * eˣ − 3x s'annule vers 0,62 et 1,51, il est négatif entre les deux, et
 * l'inéquation eˣ − 3x > 0 était déclarée vraie sur ℝ entier.
 *
 * Même distinction que `.variations` (#852) : une absence de solution n'est
 * démontrée que si le solveur le dit (`conclusive`).
 */

import { describe, it, expect } from 'vitest';
import { analyzeSign } from '../analyze';
import { formatSignAnalysis } from '../format';
import { solveInequality } from '../../solve/inequality';
import { parseCustom } from '../../parser/custom';
import type { RelationNode } from '../../types';

function signs(custom: string): string[] {
	return analyzeSign(parseCustom(custom), { variable: 'x' }).signedIntervals.map((si) => si.sign);
}

function relation(custom: string): RelationNode {
	const node = parseCustom(custom);
	if (node.type !== 'relation') throw new Error(`Relation attendue, reçu ${node.type}`);
	return node;
}

describe('eˣ − 3x : deux zéros que le solveur ne trouve pas', () => {
	it('le résultat dit que f(x) = 0 n’est pas résolue', () => {
		const result = analyzeSign(parseCustom('e^x - 3x'), { variable: 'x' });
		expect(result.zerosUnresolved).toBe(true);
		expect(result.zeros).toHaveLength(0);
	});

	it('aucun signe conclu par échantillonnage', () => {
		expect(signs('e^x - 3x')).toEqual(['unknown']);
	});

	it('le tableau formaté ne dit pas « aucun »', () => {
		const text = formatSignAnalysis(analyzeSign(parseCustom('e^x - 3x'), { variable: 'x' }));
		expect(text).toContain("f(x) = 0 n'a pas pu être résolue");
		expect(text).not.toContain('Zeros : aucun');
	});

	it('eˣ − 3x > 0 : résultat partiel, pas « ℝ entier »', () => {
		const result = solveInequality(relation('e^x - 3x > 0'));
		expect(result.status).toBe('partial');
		expect(result.warnings?.some((w) => w.includes("n'a pas pu être résolue"))).toBe(true);
	});
});

describe('Ce qui ne doit pas bouger : absence de zéro DÉMONTRÉE', () => {
	it.each([
		['e^x + 1', 'positive'],
		['1/x^2', 'positive'],
		['-e^x', 'negative']
	])('%s : signe conclu, sans drapeau', (custom, sign) => {
		const result = analyzeSign(parseCustom(custom), { variable: 'x' });
		expect(result.zerosUnresolved).toBeFalsy();
		expect(result.signedIntervals.every((si) => si.sign === sign)).toBe(true);
	});

	it('x² − 4 : zéros −2 et 2, signes +, −, +', () => {
		expect(signs('x^2 - 4')).toEqual(['positive', 'zero', 'negative', 'zero', 'positive']);
	});

	it('x eˣ : zéro 0, signes −, + (facteur de signe constant)', () => {
		expect(signs('x e^x')).toEqual(['negative', 'zero', 'positive']);
	});
});
