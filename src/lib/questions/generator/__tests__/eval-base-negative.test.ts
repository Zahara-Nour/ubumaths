/**
 * `{{eval:a*(b)^n}}` avec b négatif et une lettre libre n
 * =======================================================
 *
 * Défaut de production : avec a = 3, b = -2 et n déclarée `n|n`, l'énoncé affichait
 * `3 \times \left( -2^n \right)`, qui se lit 3 × (−(2ⁿ)) — une autre valeur que
 * 3 × (−2)ⁿ. tidy retire le délimiteur de `(b)` et les générateurs n'écrivaient pas
 * les parenthèses d'une base négative.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import type { Variable } from '$lib/ubumark';

function statementOf(expression: string, variables: Variable[]): string {
	const template = {
		id: 't',
		title: 't',
		status: 'draft',
		grades: ['1_SPE'],
		theme: 'T',
		domain: 'D',
		level: 1,
		variations: [
			{
				statement: `$u={{eval:${expression}}}$ ; $?$`,
				variables,
				blanks: [{ expectedAnswer: '1' }]
			}
		]
	} as QuestionTemplate;
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance.statement;
}

const vars = (a: string, b: string, letter = 'n'): Variable[] => [
	{ name: 'a', expression: a },
	{ name: 'b', expression: b },
	{ name: letter, expression: `${letter}|${letter}` }
];

describe('{{eval:…}} : base négative et exposant littéral', () => {
	it.each(['x', 'n'])('a*(b)^%s avec a = 3, b = -2', (letter) => {
		const statement = statementOf(`a*(b)^${letter}`, vars('3', '-2', letter));
		expect(statement).toContain(`\\left( -2 \\right)^${letter}`);
		expect(statement).not.toContain(`-2^${letter}`);
	});

	it('(b)^n sans coefficient', () => {
		expect(statementOf('(b)^n', vars('3', '-2'))).toContain('\\left( -2 \\right)^n');
	});

	it('a*(b)^n avec a négatif', () => {
		const statement = statementOf('a*(b)^n', vars('-3', '-2'));
		expect(statement).toContain('\\left( -2 \\right)^n');
		expect(statement).not.toContain('-2^n');
	});

	it('exposant composé (b)^{n+1}', () => {
		expect(statementOf('(b)^{n+1}', vars('3', '-2'))).toContain('\\left( -2 \\right)^{n + 1}');
	});

	it.each(['-0.5', '-1/4'])('base négative non entière b = %s', (b) => {
		const statement = statementOf('(b)^n', vars('3', b));
		expect(statement).toMatch(/\\left\( -\\dfrac\{1\}\{\d\} \\right\)\^n/);
	});

	it('-(2)^n reste -2^n', () => {
		expect(statementOf('-(2)^n', vars('3', '-2'))).toContain('-2^n');
	});

	it('exposant numérique inchangé : a*(b)^2 → 12', () => {
		expect(statementOf('a*(b)^2', vars('3', '-2'))).toContain('u = 12');
	});
});
