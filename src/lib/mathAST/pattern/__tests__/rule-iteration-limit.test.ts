/**
 * `applyRules` à la limite d'itérations : une erreur nommée, plus un arbre
 * rendu comme s'il était le résultat.
 *
 * Mesuré sur la suite serveur complète (2026-10-10) : aucune entrée réelle
 * n'atteint la limite. Seul un cycle de règles (bug d'écriture d'un jeu de
 * règles) y mène ; l'erreur cite les règles du cycle.
 */
import { describe, it, expect } from 'vitest';
import { applyRules, createRule, RuleIterationLimitError } from '../rule';
import { P } from '../index';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

const aToB = createRule(P.var('a'), P.var('b'), { name: 'a-vers-b' });
const bToA = createRule(P.var('b'), P.var('a'), { name: 'b-vers-a' });

describe('applyRules : limite d’itérations', () => {
	it('deux règles inverses (a → b, b → a) : RuleIterationLimitError', () => {
		expect(() => applyRules([aToB, bToA], parseLatex('3a'))).toThrow(RuleIterationLimitError);
	});

	it('le message cite les règles du cycle', () => {
		expect(() => applyRules([aToB, bToA], parseLatex('3a'), 10)).toThrow(
			/10 itérations sans point fixe.*a-vers-b → b-vers-a/
		);
	});

	it('point fixe atteint pile au budget : pas d’erreur', () => {
		expect(toLatex(applyRules([aToB], parseLatex('3a'), 1))).toBe('3 b');
	});
});
