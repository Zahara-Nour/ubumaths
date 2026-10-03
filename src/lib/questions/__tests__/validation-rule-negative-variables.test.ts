/**
 * Règles de validation et variables négatives
 * ============================================
 *
 * `{{p}}` était substitué tel quel : avec p = −3, `answer^2 + {{p}}` devenait
 * `answer^2 + -3` et `{{p}}^2` valait −9. Une valeur négative ou une expression
 * est désormais substituée entre parenthèses, pour TOUTES les règles qui
 * résolvent des variables. Cf. docs/wip/regle-negatif-inegalite-progress.md.
 */

import { describe, it, expect } from 'vitest';
import { evaluateRule, type EvaluationContext } from '../validation-rule-evaluator';
import type { ValidationRule } from '../types';

// Helpers

function check(
	rule: ValidationRule,
	variables: EvaluationContext['variables'],
	answer: string
): boolean {
	return evaluateRule(rule, { variables, answer, numericAnswer: Number(answer) }).valid;
}

// Tests

describe('règle custom : contre-exemple à « pour tout x, x² + p ≥ q x »', () => {
	// p = −3, q = 2 : x² − 3 < 2x ⇔ −1 < x < 3
	const rule: ValidationRule = {
		type: 'custom',
		expression: 'answer^2 + {{p}} < {{q}}*answer'
	};
	const variables = { p: -3, q: 2 };

	it.each(['0', '1', '2'])('%s est un vrai contre-exemple : accepté', (answer) => {
		expect(check(rule, variables, answer)).toBe(true);
	});

	it.each(['3', '5', '-1', '-4'])('%s n’est pas un contre-exemple : refusé', (answer) => {
		expect(check(rule, variables, answer)).toBe(false);
	});
});

describe('règle custom : écritures autour d’une variable négative', () => {
	it('{{p}}^2 avec p = −3 vaut 9 (pas −9)', () => {
		const rule: ValidationRule = { type: 'custom', expression: 'answer == {{p}}^2' };
		expect(check(rule, { p: -3 }, '9')).toBe(true);
		expect(check(rule, { p: -3 }, '-9')).toBe(false);
	});

	it('-{{p}} avec p = −3 vaut 3', () => {
		const rule: ValidationRule = { type: 'custom', expression: 'answer == -{{p}}' };
		expect(check(rule, { p: -3 }, '3')).toBe(true);
		expect(check(rule, { p: -3 }, '-3')).toBe(false);
	});

	it('({{p}}) déjà parenthésé par l’auteur : inchangé', () => {
		const rule: ValidationRule = { type: 'custom', expression: 'answer == ({{p}})^2' };
		expect(check(rule, { p: -3 }, '9')).toBe(true);
	});

	it('valeur positive : comportement inchangé', () => {
		const rule: ValidationRule = { type: 'custom', expression: 'answer == {{p}}^2 - {{p}}' };
		expect(check(rule, { p: 3 }, '6')).toBe(true);
	});

	it('variable expression (texte) : substituée comme un bloc', () => {
		const rule: ValidationRule = { type: 'custom', expression: 'answer == {{e}}*2' };
		expect(check(rule, { e: '1+2' }, '6')).toBe(true);
		expect(check(rule, { e: '1+2' }, '5')).toBe(false);
	});
});

describe('toutes les règles qui résolvent des variables', () => {
	it('divisor : dividende {{p}}^2 + 1 avec p = −3 vaut 10', () => {
		const rule: ValidationRule = { type: 'divisor', dividend: '{{p}}^2 + 1' };
		expect(check(rule, { p: -3 }, '5')).toBe(true);
		expect(check(rule, { p: -3 }, '4')).toBe(false);
	});

	it('multiple : base {{p}}^2 - 1 avec p = −3 vaut 8', () => {
		const rule: ValidationRule = { type: 'multiple', base: '{{p}}^2 - 1' };
		expect(check(rule, { p: -3 }, '16')).toBe(true);
		expect(check(rule, { p: -3 }, '10')).toBe(false);
	});

	it('range : [-{{p}} ; {{p}}^2] avec p = −3 vaut [3 ; 9]', () => {
		const rule: ValidationRule = { type: 'range', min: '-{{p}}', max: '{{p}}^2' };
		expect(check(rule, { p: -3 }, '5')).toBe(true);
		expect(check(rule, { p: -3 }, '0')).toBe(false);
		expect(check(rule, { p: -3 }, '10')).toBe(false);
	});

	it('equation_root : x^2 = {{p}}^2 avec p = −3 a pour racines ±3', () => {
		const rule: ValidationRule = { type: 'equation_root', equation: 'x^2 = {{p}}^2' };
		expect(check(rule, { p: -3 }, '3')).toBe(true);
		expect(check(rule, { p: -3 }, '-3')).toBe(true);
		expect(check(rule, { p: -3 }, '2')).toBe(false);
	});

	it('equation_root : x - {{p}} = 0 avec p = −3 a pour racine −3', () => {
		const rule: ValidationRule = { type: 'equation_root', equation: 'x - {{p}} = 0' };
		expect(check(rule, { p: -3 }, '-3')).toBe(true);
		expect(check(rule, { p: -3 }, '3')).toBe(false);
	});

	it('equivalent : {{p}}^2 avec p = −3 vaut 9', () => {
		const rule: ValidationRule = { type: 'equivalent', expression: '{{p}}^2' };
		expect(check(rule, { p: -3 }, '9')).toBe(true);
		expect(check(rule, { p: -3 }, '-9')).toBe(false);
	});
});
