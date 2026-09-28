/**
 * Durée composée dans une case à unité, de bout en bout (lot 3, décisions du 2026-09-28)
 * ======================================================================================
 *
 * Saisies EXACTES reçues du vrai clavier (MathLive 0.110.0) : `2\,h\,15\,\min`…
 * Juste / perfectible / mauvaise forme / faux, et l'unité imposée.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import { runTestSpec } from '$lib/questions/test-spec-runner';
import type { InstanceBlank, QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-composite-duration',
		statement: 'Durée ?' as ResolvedMarkdown,
		blanks,
		grades: ['6e'],
		theme: 'Grandeurs',
		domain: 'Durées',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function check(answer: string, expected: string, required?: string) {
	const blank: InstanceBlank = {
		expectedAnswer: expected,
		type: 'math',
		unit: required ? { expected: true, required } : { expected: true }
	};
	return validateAnswer([answer], createInstance([blank]), [answer]);
}

describe('case à unité — durée composée', () => {
	it.each([
		['2\\,h\\,15\\,\\min', '135\\unit{min}'],
		['2\\,h\\,15\\,\\min', '2.25[h]'],
		['2\\,h\\,15\\,\\min', '8100\\unit{s}'],
		['2h15\\min', '135\\unit{min}'],
		['1\\,h\\,5\\,\\min\\,30\\,s', '3930\\unit{s}'],
		['2\\,\\min\\,30\\,s', '150\\unit{s}']
	])('%s pour %s : juste', (answer, expected) => {
		const result = check(answer, expected);
		expect(result.isCorrect).toBe(true);
		expect(result.status ?? 'correct').toBe('correct');
	});

	it('2 h 75 min : perfectible', () => {
		const result = check('2\\,h\\,75\\,\\min', '195\\unit{min}');
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('unoptimal_form');
		expect(result.feedback).toBe('Écris plutôt 3 h 15 min.');
	});

	it('1 min 75 s : perfectible', () => {
		const result = check('1\\,\\min\\,75\\,s', '135\\unit{s}');
		expect(result.status).toBe('unoptimal_form');
	});

	it('2 h 15 : perfectible, « Précise l’unité : 2 h 15 min. »', () => {
		const result = check('2\\,h\\,15', '135\\unit{min}');
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('unoptimal_form');
		expect(result.feedback).toBe("Précise l'unité : 2 h 15 min.");
	});

	it.each([
		['2\\,h\\,15\\,mn', '135\\unit{min}'],
		['15\\,mn', '15\\unit{min}']
	])('%s : mauvaise forme, « L’abréviation de minute est min. »', (answer, expected) => {
		const result = check(answer, expected);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe("L'abréviation de minute est min.");
	});

	it.each([
		['15\\,\\min\\,2\\,h', '135\\unit{min}'],
		['2\\,h\\,3\\,h', '5\\unit{h}']
	])('%s : mauvaise forme (désordre / répétition)', (answer, expected) => {
		const result = check(answer, expected);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
	});

	it('2 h 20 min pour 135 min : faux', () => {
		const result = check('2\\,h\\,20\\,\\min', '135\\unit{min}');
		expect(result.isCorrect).toBe(false);
		// Réponse fausse : pas de statut de forme (runTestSpec la lit « incorrect »)
		expect(result.status ?? 'incorrect').toBe('incorrect');
	});

	it('2 h 15 kg : refusé (grandeur incompatible)', () => {
		const result = check('2\\,h\\,15\\,kg', '135\\unit{min}');
		expect(result.isCorrect).toBe(false);
		// Réponse fausse : pas de statut de forme (runTestSpec la lit « incorrect »)
		expect(result.status ?? 'incorrect').toBe('incorrect');
		expect(result.feedback).toContain('ne mesure pas la bonne grandeur');
	});

	it('unité imposée min : 2 h 15 min refusé comme 2,25 h', () => {
		const composite = check('2\\,h\\,15\\,\\min', '135\\unit{min}', 'min');
		const simple = check('2{,}25\\,h', '135\\unit{min}', 'min');
		expect(composite.isCorrect).toBe(false);
		expect(composite.status).toBe(simple.status);
		expect(composite.feedback).toBe(simple.feedback);
		expect(composite.feedback).toBe('Donne ta réponse en min.');
	});

	it.each([
		['3\\,h', '180\\unit{min}'],
		['45\\,\\min', '45\\unit{min}'],
		['2,5\\,h', '150\\unit{min}']
	])('durée simple %s : inchangée', (answer, expected) => {
		expect(check(answer, expected).isCorrect).toBe(true);
	});

	// Virgule ailleurs qu'au dernier terme : refus inchangé, mais le message disait
	// « Unité inconnue : h 15 min. » alors que l'unité n'y est pour rien (2026-09-28).
	it.each([
		['2,5\\,h\\,15\\,\\min', '165\\unit{min}', '2 h 45 min'],
		['2{,}5\\,h\\,15\\,\\min', '135\\unit{min}', '2 h 45 min'],
		['1,5\\,\\min\\,30\\,s', '120\\unit{s}', '2 min']
	])('%s : refusé, message sur la virgule (%s → %s)', (answer, expected, writing) => {
		const result = check(answer, expected);
		expect(result.isCorrect).toBe(false);
		expect(result.status ?? 'incorrect').toBe('incorrect');
		expect(result.feedback).toBe(
			`Seule la dernière unité peut avoir une virgule : écris ${writing}.`
		);
	});

	it('virgule au dernier terme : inchangé (2 h 15,5 min juste)', () => {
		expect(check('2\\,h\\,15{,}5\\,\\min', '135.5\\unit{min}').isCorrect).toBe(true);
	});
});

describe('runTestSpec — gabarit de durée', () => {
	const template = {
		title: 'Durée',
		variations: [
			{
				statement: 'Durée ? $?$',
				variables: [
					{ name: 'a', expression: '1..4' },
					{ name: 'b', expression: '1..59' }
				],
				blanks: [{ expectedAnswer: '{{eval:a[h]+b[min]}}', unit: { expected: true } }]
			}
		],
		grades: ['6'],
		theme: 'Grandeurs',
		domain: 'Durées',
		level: 1
	} as unknown as QuestionTemplate;

	it.each([
		['2\\,h\\,15\\,\\min', 'correct', []],
		['2h15\\min', 'correct', []],
		['2\\,h\\,75\\,\\min', 'incorrect', []],
		['2\\,h\\,15', 'unoptimal_form', ['form']],
		['2\\,h\\,15\\,mn', 'bad_form', ['form']],
		['2\\,h\\,20\\,\\min', 'incorrect', []],
		['135\\,\\min', 'correct', []]
	] as const)('%s → %s', (answer, status, constraintViolations) => {
		const result = runTestSpec(template, {
			variables: { a: '2', b: '15' },
			answers: [answer],
			expected: { status, constraintViolations: [...constraintViolations] }
		});
		expect(result.error).toBeUndefined();
		expect(result.actual.status).toBe(status);
		expect(result.passed).toBe(true);
	});
});
