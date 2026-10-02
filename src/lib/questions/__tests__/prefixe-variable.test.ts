/**
 * Préfixe « x = » recopié dans une case (décision de David du 2026-10-02)
 *
 * L'énoncé finit par « $x=?$ » ; l'élève recopie le `x=` : `x=\frac32`. Quand
 * l'attendu est une VALEUR et que le membre de gauche est une variable SEULE
 * (une lettre, indice permis), la réponse est jugée sur le membre de droite,
 * comme `S=` l'est déjà pour un ensemble (intervals/interval-answer.ts).
 */
import { describe, it, expect } from 'vitest';
import { specVerdicts } from './spec-verdicts.helper';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

function statuses(statement: string, expected: string, answers: string[]) {
	return Object.fromEntries(
		Object.entries(specVerdicts(statement, expected, answers)).map(([a, v]) => [a, v.status])
	);
}

describe('préfixe « variable = » devant une valeur', () => {
	it('x=\\frac32 juste quand on attend 3/2 (avec ou sans espaces)', () => {
		expect(statuses('$x=?$', '\\frac{3}{2}', ['x=\\frac32', 'x = \\frac{3}{2}'])).toEqual({
			'x=\\frac32': 'correct',
			'x = \\frac{3}{2}': 'correct'
		});
	});

	it('x=\\frac64 : même verdict que \\frac64 seul', () => {
		const verdicts = specVerdicts('$x=?$', '\\frac{3}{2}', ['x=\\frac64', '\\frac64']);
		expect(verdicts['x=\\frac64']).toEqual(verdicts['\\frac64']);
		expect(verdicts['x=\\frac64']).toEqual({
			status: 'unoptimal_form',
			violations: ['reducedFractions']
		});
	});

	it('une valeur fausse reste fausse : x=2 pour 3/2', () => {
		expect(statuses('$x=?$', '\\frac{3}{2}', ['x=2'])).toEqual({ 'x=2': 'incorrect' });
	});

	it('variable indicée : u_n=3n+1 et u_{n}=3n+1 justes pour 3n+1', () => {
		expect(statuses('$u_n=?$', '3n+1', ['u_n=3n+1', 'u_{n}=3n+1', 'u_n=3n+2'])).toEqual({
			'u_n=3n+1': 'correct',
			'u_{n}=3n+1': 'correct',
			'u_n=3n+2': 'incorrect'
		});
	});

	it("membre de gauche qui n'est pas une variable seule : 2x=3 inchangé", () => {
		expect(statuses('$x=?$', '\\frac{3}{2}', ['2x=3'])).toEqual({ '2x=3': 'incorrect' });
	});

	it('attendu lui-même équation (y=x+1) : inchangé', () => {
		expect(statuses('$?$', 'y=x+1', ['y=x+1', 'x+1', 'x=y-1'])).toEqual({
			'y=x+1': 'correct',
			'x+1': 'incorrect',
			'x=y-1': 'incorrect'
		});
	});
});

describe('cases en ordre libre (deux solutions)', () => {
	it("x_1=3 et x_2=-1 justes, dans un ordre ou dans l'autre", () => {
		const template = {
			id: 'prefixe-ordre-libre',
			type: 'fill_in_blanks',
			title: 't',
			grades: ['1_SPE'],
			theme: 'T',
			domain: 'D',
			level: 1,
			delay: 20,
			status: 'draft',
			options: { orderIndependent: true },
			variations: [
				{
					statement: '$x_1=?$ et $x_2=?$',
					blanks: [{ expectedAnswer: '-1' }, { expectedAnswer: '3' }]
				}
			],
			testSpecs: [
				[['x_1=3', 'x_2=-1'], 'correct'],
				[['x_1=-1', '3'], 'correct'],
				[['x_1=3', 'x_2=1'], 'incorrect']
			].map(([answers, status]) => ({
				answers,
				expected: { status },
				description: (answers as string[]).join(' ; '),
				variationIndex: 0
			}))
		} as unknown as QuestionTemplate;
		const results = runAllTestSpecs(template);
		expect(results.map((r) => [r.spec.description, r.actual?.status])).toEqual([
			['x_1=3 ; x_2=-1', 'correct'],
			['x_1=-1 ; 3', 'correct'],
			['x_1=3 ; x_2=1', 'incorrect']
		]);
	});
});
