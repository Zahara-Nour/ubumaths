/**
 * `{{eval:sqrt(21/25)}}` : racine exacte écrite comme au tableau
 * ==============================================================
 *
 * Relevé en rédigeant les modèles (docs/pratiques/fiches-exercices.md, « Pièges de l'écriture
 * d'un modèle ») : la forme exacte sortait `\dfrac{1}{5} \sqrt{21}` et `-\dfrac{1}{2} \sqrt{2}`.
 * Utilisée comme réponse attendue, la bonne réponse de l'élève `\frac{\sqrt{21}}{5}` était
 * alors jugée « mauvaise forme ». Attendu : `\dfrac{\sqrt{21}}{5}`, `-\dfrac{\sqrt{2}}{2}`.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import type { Variable } from '$lib/ubumark';
import { evalResultToNumber } from '$lib/mathAST/eval/evaluate-with-modifiers';
import { specVerdicts } from '../../__tests__/spec-verdicts.helper';

function valueOf(expression: string, variables: Variable[] = []): string {
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
	const match = /^\$u\s*=\s*(.*?)\$ ;/.exec(result.instance.statement);
	if (!match) throw new Error(`Énoncé inattendu : ${result.instance.statement}`);
	return match[1].trim();
}

describe('{{eval:…}} : racine exacte sous forme scolaire', () => {
	it.each([
		['sqrt(21/25)', '\\dfrac{\\sqrt{21}}{5}'],
		['-sqrt(2)/2', '-\\dfrac{\\sqrt{2}}{2}'],
		['3/2*sqrt(2)', '\\dfrac{3 \\sqrt{2}}{2}'],
		['sqrt(3)/3', '\\dfrac{\\sqrt{3}}{3}'],
		['\\frac{\\sqrt{21}}{5}', '\\dfrac{\\sqrt{21}}{5}']
	])('%s → %s', (expression, expected) => {
		expect(valueOf(expression)).toBe(expected);
	});

	it.each([
		['sqrt(8)', '2 \\sqrt{2}'],
		['sqrt(16)', '4'],
		['21/25', '\\dfrac{21}{25}'],
		['1+sqrt(2)', '1 + \\sqrt{2}'],
		['1+sqrt(2)/2', '1 + \\dfrac{\\sqrt{2}}{2}'],
		['ln(2)/3', '\\dfrac{1}{3} \\ln\\left( 2 \\right)']
	])('écriture déjà scolaire inchangée : %s → %s', (expression, expected) => {
		expect(valueOf(expression)).toBe(expected);
	});

	it('variables tirées : sqrt(n)/d', () => {
		const variables: Variable[] = [
			{ name: 'n', expression: '21' },
			{ name: 'd', expression: '5' }
		];
		expect(valueOf('sqrt(n)/d', variables)).toBe('\\dfrac{\\sqrt{21}}{5}');
	});

	it('modificateurs ;+ et ;()', () => {
		expect(valueOf('sqrt(2)/2;+')).toBe('+\\dfrac{\\sqrt{2}}{2}');
		expect(valueOf('-sqrt(2)/2;()')).toBe('\\left( -\\dfrac{\\sqrt{2}}{2} \\right)');
	});

	it('garde-fou : la valeur rendue vaut la valeur calculée', () => {
		for (let n = 2; n <= 30; n++) {
			for (let d = 2; d <= 12; d++) {
				const value = valueOf(`sqrt(${n})/${d}`);
				const actual = evalResultToNumber(value);
				expect(Math.abs(actual - Math.sqrt(n) / d), `√${n}/${d} → ${value}`).toBeLessThan(1e-12);
			}
		}
	});
});

describe('réponse attendue {{eval:sqrt(21/25)}} : verdicts', () => {
	it('la forme scolaire est correcte, √(21/25) reste mauvaise forme', () => {
		const verdicts = specVerdicts('$\\sigma=?$', '{{eval:sqrt(21/25)}}', [
			'\\frac{\\sqrt{21}}{5}',
			'\\sqrt{\\frac{21}{25}}'
		]);
		expect(verdicts['\\frac{\\sqrt{21}}{5}'].status).toBe('correct');
		expect(verdicts['\\sqrt{\\frac{21}{25}}'].status).toBe('bad_form');
	});

	it('attendu \\frac{\\sqrt{21}}{5} écrit à la main : mêmes verdicts', () => {
		const verdicts = specVerdicts('$\\sigma=?$', '\\frac{\\sqrt{21}}{5}', [
			'\\frac{\\sqrt{21}}{5}',
			'\\sqrt{\\frac{21}{25}}'
		]);
		expect(verdicts['\\frac{\\sqrt{21}}{5}'].status).toBe('correct');
		expect(verdicts['\\sqrt{\\frac{21}{25}}'].status).toBe('bad_form');
	});
});
