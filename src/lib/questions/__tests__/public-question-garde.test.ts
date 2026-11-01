/**
 * `toPublicQuestion` refuse d'envoyer un énoncé qui dit encore une réponse
 * ========================================================================
 *
 * Chantier `fuite-enonce` : si un masque casse (il laisse son bloc tel quel), la
 * question ne part pas — erreur visible (surveillance des erreurs) plutôt qu'une
 * fuite silencieuse. Ici le masque est remplacé par l'identité.
 */
import { describe, it, expect, vi } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

vi.mock('../masked-statement', async (importOriginal) => ({
	...(await importOriginal<typeof import('../masked-statement')>()),
	maskGestureAnswers: (statement: string) => statement
}));

const { gestureAnswerLeaks, toPublicQuestion } = await import('../public-question');

// Functions
function generated(statement: string) {
	const result = generateInstance(
		{
			id: 'test-garde',
			title: 'Garde',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(statement) }],
			grades: ['CE1'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('masque cassé : la question ne part pas', () => {
	it('horloge à placer non masquée → erreur qui nomme le bloc', () => {
		const instance = generated('Place 9 h 25.\n\n```horloge\nplacer: 9 h 25\n```');
		expect(() => toPublicQuestion(instance, { position: 0, delaySeconds: 20 })).toThrow(/horloge/);
	});

	it('geste sans réponse à cacher (vue à dessiner) : la question part', () => {
		const instance = generated(
			'Dessine la vue de face.\n\n```cubes\nhauteurs: 2 1 / 1 1\ndessiner: face\n```'
		);
		expect(toPublicQuestion(instance, { position: 0, delaySeconds: 20 }).statement).toContain(
			'dessiner: face'
		);
	});
});

describe('au tirage : gestureAnswerLeaks nomme la question à écarter', () => {
	it('masque cassé : la question est nommée (le tirage l’écarte, la tentative ne se perd pas)', () => {
		const instance = generated('Place 9 h 25.\n\n```horloge\nplacer: 9 h 25\n```');
		expect(gestureAnswerLeaks(instance)).toEqual(['horloge']);
	});

	it('rien à cacher : liste vide', () => {
		const instance = generated(
			'Dessine la vue de face.\n\n```cubes\nhauteurs: 2 1 / 1 1\ndessiner: face\n```'
		);
		expect(gestureAnswerLeaks(instance)).toEqual([]);
	});
});
