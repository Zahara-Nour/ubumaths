/**
 * Réglage de modèle « Espaces dès 4 chiffres » (E2, option C, simplify-carte § 43) :
 * par défaut la règle du BIPM (espace exigée dès 5 chiffres), mais un exercice de
 * numération garde la règle de l'école, espace exigée dès 4 chiffres.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { BuildKind, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function instanceOf(
	expectedAnswer: string,
	options?: QuestionInstance['options'],
	construire?: BuildKind
): QuestionInstance {
	return {
		templateId: 'test-template',
		statement: 'Test question' as ResolvedMarkdown,
		blanks: [{ expectedAnswer, type: 'math', ...(construire && { construire }) }],
		grades: ['6'],
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

/**
 * Case à construire (`construire:`, `placer:`) : la valeur est écrite par le composant
 * (`4635`), jamais tapée par l'élève ; sa forme n'est pas jugée (outils-manquants n° 15).
 */
describe('espaces dès 4 chiffres : une case à construire ne juge que la valeur', () => {
	const ecole = { constraints: { spacesFromFourDigits: true } };

	it('collection construite : 4635 posé par le composant est correct', () => {
		const result = validateAnswer('4635', instanceOf('4635', ecole, 'collection'), '4635');
		expect(result.status).toBe('correct');
		expect(result.constraintViolations ?? []).toEqual([]);
	});

	it('monnaie construite : 1000 € posés sont corrects', () => {
		const result = validateAnswer('1000', instanceOf('1000', ecole, 'monnaie'), '1000');
		expect(result.status).toBe('correct');
	});

	it('droite graduée à placer : 4500 posé est correct', () => {
		expect(validateAnswer('4500', instanceOf('4500', ecole, 'line'), '4500').status).toBe(
			'correct'
		);
	});

	it('par défaut (BIPM) : 30000 posé sur une droite est correct', () => {
		expect(validateAnswer('30000', instanceOf('30000', undefined, 'line'), '30000').status).toBe(
			'correct'
		);
	});

	it('collection construite à une autre valeur : toujours fausse', () => {
		const result = validateAnswer('4001', instanceOf('4100', ecole, 'collection'), '4001');
		expect(result.isCorrect).toBe(false);
	});

	it('deux points placés, sans ordre : 4500 et 7200 sont corrects', () => {
		const line = { type: 'math' as const, construire: 'line' as const };
		const instance: QuestionInstance = {
			...instanceOf('4500'),
			blanks: [
				{ ...line, expectedAnswer: '4500' },
				{ ...line, expectedAnswer: '7200' }
			],
			options: { ...ecole, orderIndependent: true }
		};
		const result = validateAnswer(['7200', '4500'], instance, ['7200', '4500']);
		// Tout juste en ordre libre : pas de statut, aucune remarque
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBeUndefined();
		expect(result.constraintViolations ?? []).toEqual([]);
	});
});
