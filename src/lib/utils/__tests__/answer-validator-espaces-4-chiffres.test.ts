/**
 * Réglage de modèle « Espaces dès 4 chiffres » (E2, option C, simplify-carte § 43) :
 * par défaut la règle du BIPM (espace exigée dès 5 chiffres), mais un exercice de
 * numération garde la règle de l'école, espace exigée dès 4 chiffres.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function instanceOf(
	expectedAnswer: string,
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'test-template',
		statement: 'Test question' as ResolvedMarkdown,
		blanks: [{ expectedAnswer, type: 'math' }],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		options
	};
}

describe('espaces de groupement selon le réglage du modèle', () => {
	it('par défaut (BIPM) : 7900 sans espace est correct', () => {
		const result = validateAnswer('7900', instanceOf('7900'), '7900');
		expect(result.status).toBe('correct');
	});

	it('par défaut (BIPM) : 30000 sans espace reçoit une remarque', () => {
		const result = validateAnswer('30000', instanceOf('30000'), '30000');
		expect(result.status).toBe('unoptimal_form');
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['spaces']);
	});

	it('espaces dès 4 chiffres : 7900 reçoit une remarque', () => {
		const instance = instanceOf('7900', { constraints: { spacesFromFourDigits: true } });
		const result = validateAnswer('7900', instance, '7900');
		expect(result.status).toBe('unoptimal_form');
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['spaces']);
	});

	it('espaces dès 4 chiffres : 7 900 est correct', () => {
		const instance = instanceOf('7900', { constraints: { spacesFromFourDigits: true } });
		expect(validateAnswer('7\\,900', instance, '7\\,900').status).toBe('correct');
	});

	it('espaces dès 4 chiffres, contrainte désactivée : rien n’est remarqué', () => {
		const instance = instanceOf('7900', {
			constraints: { spaces: 'off', spacesFromFourDigits: true }
		});
		expect(validateAnswer('7900', instance, '7900').status).toBe('correct');
	});
});
