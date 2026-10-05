/**
 * Nombres complexes dans une réponse d'élève (points validés par David le 2026-10-05,
 * constatés par sondes sur les cartes de maths expertes).
 *
 * Chaque bloc fige un point : notation `\imaginaryI`, formes algébriques
 * équivalentes, formule d'Euler, argument modulo 2π, ensemble fini de complexes.
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

function verdicts(
	expected: string,
	answers: string[],
	blankOptions: Record<string, unknown> = {}
): Record<string, string> {
	const template = {
		id: 'complexes',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['T_EXP'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [{ statement: '$z=?$', blanks: [{ expectedAnswer: expected, ...blankOptions }] }],
		testSpecs: answers.map((answer) => ({
			answers: [answer],
			expected: { status: 'correct' },
			description: answer,
			variationIndex: 0
		}))
	} as unknown as QuestionTemplate;
	return Object.fromEntries(
		runAllTestSpecs(template).map((r) => [
			r.spec.description,
			r.error && r.actual.status === 'incorrect' && !r.passed && r.error.startsWith('Réponse')
				? `erreur : ${r.error}`
				: r.actual.status
		])
	);
}

describe('\\imaginaryI (MathLive) : même notation que i', () => {
	it('2-3\\imaginaryI juste pour 2-3i, comme \\mathrm{i}', () => {
		expect(verdicts('2-3i', ['2-3\\imaginaryI', '2-3\\mathrm{i}', '2-3i'])).toEqual({
			'2-3\\imaginaryI': 'correct',
			'2-3\\mathrm{i}': 'correct',
			'2-3i': 'correct'
		});
	});

	it('attendue écrite \\imaginaryI : i juste ; valeur fausse reste fausse', () => {
		expect(
			verdicts('1+\\imaginaryI\\sqrt{3}', ['1+i\\sqrt{3}', '1-\\imaginaryI\\sqrt{3}'])
		).toEqual({
			'1+i\\sqrt{3}': 'correct',
			'1-\\imaginaryI\\sqrt{3}': 'incorrect'
		});
	});

	it('\\imaginaryI seul juste pour i', () => {
		expect(verdicts('i', ['\\imaginaryI'])).toEqual({ '\\imaginaryI': 'correct' });
	});
});

describe('forme algébrique : \\frac{a+bi}{d} et \\frac{a}{d}+\\frac{b}{d}i sont une seule forme', () => {
	it('\\frac{1-i}{2} attendu : les écritures séparées sont justes', () => {
		expect(
			verdicts('\\frac{1-i}{2}', [
				'\\frac12-\\frac12i',
				'\\frac{1}{2}-\\frac{i}{2}',
				'\\frac{1}{2}-\\frac{1}{2}i',
				'\\frac{1-i}{2}'
			])
		).toEqual({
			'\\frac12-\\frac12i': 'correct',
			'\\frac{1}{2}-\\frac{i}{2}': 'correct',
			'\\frac{1}{2}-\\frac{1}{2}i': 'correct',
			'\\frac{1-i}{2}': 'correct'
		});
	});

	it('\\frac12-\\frac12i attendu : \\frac{1-i}{2} juste', () => {
		expect(verdicts('\\frac12-\\frac12i', ['\\frac{1-i}{2}'])).toEqual({
			'\\frac{1-i}{2}': 'correct'
		});
	});

	it('racine au numérateur : \\frac{1+i\\sqrt{3}}{2} juste pour \\frac12+\\frac{\\sqrt{3}}{2}i', () => {
		expect(
			verdicts('\\frac{1}{2}+\\frac{\\sqrt{3}}{2}i', [
				'\\frac{1+i\\sqrt{3}}{2}',
				'\\frac{1}{2}+\\frac{i\\sqrt{3}}{2}',
				'\\frac{1}{2}+i\\frac{\\sqrt{3}}{2}'
			])
		).toEqual({
			'\\frac{1+i\\sqrt{3}}{2}': 'correct',
			'\\frac{1}{2}+\\frac{i\\sqrt{3}}{2}': 'correct',
			'\\frac{1}{2}+i\\frac{\\sqrt{3}}{2}': 'correct'
		});
	});

	it('fraction simplifiable perfectible, quotient non calculé de mauvaise forme, valeur fausse fausse', () => {
		expect(
			verdicts('\\frac{1-i}{2}', ['\\frac{2-2i}{4}', '\\frac{1}{1+i}', '\\frac{1+i}{2}'])
		).toEqual({
			'\\frac{2-2i}{4}': 'unoptimal_form',
			'\\frac{1}{1+i}': 'bad_form',
			'\\frac{1+i}{2}': 'incorrect'
		});
	});

	it('hors complexes, rien ne change : \\frac{x}{2}+\\frac12 reste de mauvaise forme pour \\frac{x+1}{2}', () => {
		expect(verdicts('\\frac{x+1}{2}', ['\\frac{x}{2}+\\frac12'])).toEqual({
			'\\frac{x}{2}+\\frac12': 'bad_form'
		});
	});

	it('décimal : comme 0,5 pour \\frac12 (mauvaise forme, juste avec acceptDecimal)', () => {
		expect(verdicts('\\frac12', ['0.5'])).toEqual({ '0.5': 'bad_form' });
		expect(verdicts('\\frac{1-i}{2}', ['0.5-0.5i'])).toEqual({ '0.5-0.5i': 'bad_form' });
		expect(verdicts('\\frac12', ['0.5'], { acceptDecimal: true })).toEqual({ '0.5': 'correct' });
		expect(
			verdicts('\\frac{1-i}{2}', ['0.5-0.5i', '0{,}5-0{,}5i', '-0.5i+0.5'], {
				acceptDecimal: true
			})
		).toEqual({ '0.5-0.5i': 'correct', '0{,}5-0{,}5i': 'correct', '-0.5i+0.5': 'correct' });
	});
});

describe('forme exponentielle : valeur par la formule d’Euler, forme distincte de l’algébrique', () => {
	it('case sans forme exigée : valeur juste, forme différente → mauvaise forme (jamais faux)', () => {
		expect(
			verdicts('1+i\\sqrt{3}', [
				'2e^{i\\frac{\\pi}{3}}',
				'2e^{\\frac{i\\pi}{3}}',
				'2e^{i\\frac{\\pi}{6}}'
			])
		).toEqual({
			'2e^{i\\frac{\\pi}{3}}': 'bad_form',
			'2e^{\\frac{i\\pi}{3}}': 'bad_form',
			'2e^{i\\frac{\\pi}{6}}': 'incorrect'
		});
		expect(verdicts('2e^{i\\frac{\\pi}{3}}', ['1+i\\sqrt{3}'])).toEqual({
			'1+i\\sqrt{3}': 'bad_form'
		});
		expect(verdicts('-1', ['e^{i\\pi}'])).toEqual({ 'e^{i\\pi}': 'bad_form' });
	});

	it('placement de i dans l’exposant : même forme', () => {
		expect(
			verdicts('2e^{i\\frac{\\pi}{3}}', [
				'2e^{\\frac{i\\pi}{3}}',
				'2e^{\\frac{\\pi}{3}i}',
				'2e^{\\frac{\\pi i}{3}}',
				'2\\exponentialE^{\\imaginaryI\\frac{\\pi}{3}}'
			])
		).toEqual({
			'2e^{\\frac{i\\pi}{3}}': 'correct',
			'2e^{\\frac{\\pi}{3}i}': 'correct',
			'2e^{\\frac{\\pi i}{3}}': 'correct',
			'2\\exponentialE^{\\imaginaryI\\frac{\\pi}{3}}': 'correct'
		});
		expect(verdicts('2e^{-i\\frac{\\pi}{4}}', ['2e^{-\\frac{i\\pi}{4}}'])).toEqual({
			'2e^{-\\frac{i\\pi}{4}}': 'correct'
		});
	});

	it('requiredForm « exponentielle » : re^{iθ}, r > 0, argument libre', () => {
		expect(
			verdicts(
				'2e^{i\\frac{\\pi}{3}}',
				[
					'2e^{\\frac{i\\pi}{3}}',
					'2e^{i\\frac{7\\pi}{3}}',
					'2e^{-i\\frac{5\\pi}{3}}',
					'1+i\\sqrt{3}',
					'-2e^{i\\frac{4\\pi}{3}}',
					'2\\left(\\cos\\frac{\\pi}{3}+i\\sin\\frac{\\pi}{3}\\right)',
					'2e^{i\\frac{\\pi}{6}}'
				],
				{ requiredForm: 'exponentielle' }
			)
		).toEqual({
			'2e^{\\frac{i\\pi}{3}}': 'correct',
			'2e^{i\\frac{7\\pi}{3}}': 'correct',
			'2e^{-i\\frac{5\\pi}{3}}': 'correct',
			'1+i\\sqrt{3}': 'bad_form',
			'-2e^{i\\frac{4\\pi}{3}}': 'bad_form',
			'2\\left(\\cos\\frac{\\pi}{3}+i\\sin\\frac{\\pi}{3}\\right)': 'bad_form',
			'2e^{i\\frac{\\pi}{6}}': 'incorrect'
		});
		expect(
			verdicts('e^{i\\frac{\\pi}{2}}', ['e^{i\\frac{\\pi}{2}}', 'i'], {
				requiredForm: 'exponentielle'
			})
		).toEqual({ 'e^{i\\frac{\\pi}{2}}': 'correct', i: 'bad_form' });
	});

	it('requiredForm « algebrique » : a+bi', () => {
		expect(
			verdicts(
				'1+i\\sqrt{3}',
				[
					'1+\\sqrt{3}i',
					'\\sqrt{3}i+1',
					'2e^{i\\frac{\\pi}{3}}',
					'2\\left(\\cos\\frac{\\pi}{3}+i\\sin\\frac{\\pi}{3}\\right)'
				],
				{ requiredForm: 'algebrique' }
			)
		).toEqual({
			'1+\\sqrt{3}i': 'correct',
			'\\sqrt{3}i+1': 'correct',
			'2e^{i\\frac{\\pi}{3}}': 'bad_form',
			'2\\left(\\cos\\frac{\\pi}{3}+i\\sin\\frac{\\pi}{3}\\right)': 'bad_form'
		});
		expect(
			verdicts('\\frac{1-i}{2}', ['\\frac{1-i}{2}', '\\frac12-\\frac12i', '\\frac{1}{1+i}'], {
				requiredForm: 'algebrique'
			})
		).toEqual({
			'\\frac{1-i}{2}': 'correct',
			'\\frac12-\\frac12i': 'correct',
			'\\frac{1}{1+i}': 'bad_form'
		});
	});

	it('exponentielle réelle inchangée', () => {
		expect(verdicts('e^{2}', ['e^{2}', '\\exp(2)'])).toEqual({
			'e^{2}': 'correct',
			'\\exp(2)': 'correct'
		});
	});
});
