/**
 * Pourcentages (lot Proportionnalité, décisions de David du 2026-09-27) :
 * `20%` est un nœud `percentage` — ni `20 × %`, ni une fraction déguisée.
 */
import { describe, expect, it } from 'vitest';
import { MathAST } from '../factory';
import { isPercentage } from '../guards';
import { parseLatex } from '../parser';
import { parseCustom } from '../parser/custom';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { evaluate } from '../eval';
import { areEquivalent } from '../equivalence';
import { tidy } from '../tidy';
import { simplify } from '../simplify';
import { mapNode } from '../transforms';

const twenty = MathAST.percentage(MathAST.number('20'));

describe('pourcentage — lecture', () => {
	it.each([
		['20%', '20'],
		['12.5%', '12.5']
	])('syntaxe maison %s', (input, value) => {
		expect(parseCustom(input)).toEqual(MathAST.percentage(MathAST.number(value)));
	});

	it.each([
		['20\\%', '20'],
		['20\\,\\%', '20'],
		['20 \\%', '20'],
		['12.5\\%', '12.5'],
		['12{,}5\\%', '12.5']
	])('LaTeX %s', (input, value) => {
		const node = parseLatex(input);
		expect(isPercentage(node)).toBe(true);
		expect(evaluate(node, { mode: 'decimal' })).toMatchObject({
			status: 'value',
			value: Number(value) / 100
		});
	});

	it('le pourcentage lie plus fort que le produit : 10%*50', () => {
		expect(parseCustom('10%*50')).toEqual(
			MathAST.multiply(MathAST.percentage(MathAST.number('10')), MathAST.number('50'), 'cross')
		);
	});

	it.each(['%', '%5'])('syntaxe maison %s → erreur de lecture', (input) => {
		expect(() => parseCustom(input)).toThrow();
	});

	it.each(['\\%', '\\%5'])('LaTeX %s → erreur de lecture', (input) => {
		expect(() => parseLatex(input)).toThrow();
	});
});

describe('pourcentage — écriture', () => {
	it('LaTeX avec espace fine', () => {
		expect(toLatex(twenty)).toBe('20\\,\\%');
	});

	it('syntaxe maison', () => {
		expect(toCustom(twenty)).toBe('20%');
	});

	it('aller-retour maison et LaTeX', () => {
		expect(parseCustom(toCustom(twenty))).toEqual(twenty);
		expect(parseLatex(toLatex(twenty))).toEqual(twenty);
	});

	it('une somme en pourcentage garde ses parenthèses', () => {
		const node = MathAST.percentage(MathAST.add(MathAST.variable('a'), MathAST.number('5')));
		expect(toCustom(node)).toBe('(a+5)%');
	});
});

describe('pourcentage — valeur', () => {
	it('20 % vaut 0,2', () => {
		expect(evaluate(twenty, { mode: 'decimal' })).toMatchObject({ status: 'value', value: 0.2 });
	});

	it('10 % de 50 vaut 5', () => {
		expect(evaluate(parseCustom('10%*50'), { mode: 'decimal' })).toMatchObject({
			status: 'value',
			value: 5
		});
	});

	it.each(['0.2', '1/5', '20%'])('20 pour cent ≡ %s', (other) => {
		expect(areEquivalent(twenty, parseCustom(other))).toBe(true);
	});

	it('20 % ≢ 20 et ≢ 2 %', () => {
		expect(areEquivalent(twenty, parseCustom('20'))).toBe(false);
		expect(areEquivalent(twenty, parseCustom('2%'))).toBe(false);
	});

	it('12,5 % ≡ 1/8 (exact)', () => {
		expect(areEquivalent(parseCustom('12.5%'), parseCustom('1/8'))).toBe(true);
	});
});

describe('pourcentage — transformations', () => {
	it('tidy laisse un pourcentage tel quel', () => {
		expect(tidy(twenty)).toEqual(twenty);
	});

	it('simplify laisse un pourcentage tel quel', () => {
		expect(simplify(twenty).result).toEqual(twenty);
	});

	it('mapNode descend dans l’opérande', () => {
		const node = MathAST.percentage(MathAST.variable('a'));
		const mapped = mapNode(node, (n) => (n.type === 'variable' ? MathAST.number('30') : n));
		expect(mapped).toEqual(MathAST.percentage(MathAST.number('30')));
	});
});
