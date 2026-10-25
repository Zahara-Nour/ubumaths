/**
 * Positions des points d'un bloc ```figure-a-completer : un REGISTRE, comme le PDF
 * des figures (`figure-typst-registry.ts`) — décision de David du 2026-10-25.
 * Le juge reste léger ; l'interpréteur de geometry-core n'est chargé que par
 * le module d'inscription (écran de l'élève, correction serveur).
 */
import { describe, it, expect, vi } from 'vitest';

describe('registre des positions', () => {
	it('sans inscription : erreur explicite, jamais « faux »', async () => {
		vi.resetModules();
		const { constructionPositions } = await import('../positions');
		expect(() => constructionPositions('fenetre: 0 ; 10 ; 0 ; 6\n---\nA = point(1, 2)')).toThrow(
			'positions des figures non inscrites'
		);
	});

	it('après inscription : positions des points nommés, langage complet (milieu)', async () => {
		vi.resetModules();
		await import('../positions-setup');
		const { constructionPositions } = await import('../positions');
		const points = constructionPositions(
			[
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A ; M',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)',
				'M = milieu(A, B)'
			].join('\n')
		);
		expect(points.get('A')).toEqual({ x: 1, y: 2 });
		expect(points.get('M')).toEqual({ x: 4, y: 2 });
	});

	it('figure en erreur : erreur de l’auteur, avec le message de la figure', async () => {
		vi.resetModules();
		await import('../positions-setup');
		const { constructionPositions } = await import('../positions');
		expect(() =>
			constructionPositions(
				'fenetre: 0 ; 10 ; 0 ; 6\nverifier: droite_par A ; B\n---\nA = pont(1, 2)'
			)
		).toThrow(/figure/);
	});
});

describe('jugement sans registre', () => {
	it('validateAnswer rend l’erreur dans son message (jamais un verdict silencieux)', async () => {
		vi.resetModules();
		const { validateAnswer } = await import('$lib/utils/answer-validator');
		const result = validateAnswer(['droite(1;2;7;2)'], {
			templateId: 't',
			statement: '',
			grades: ['CP'],
			theme: 'T',
			domain: 'D',
			level: 1,
			blanks: [
				{
					expectedAnswer: 'droite(A;B)',
					type: 'graphical',
					construction: {
						source: 'fenetre: 0 ; 10 ; 0 ; 6\n---\nA = point(1, 2)\nB = point(7, 2)',
						checks: [{ kind: 'droite_par', points: ['A', 'B'], line: 2 }]
					}
				}
			]
		} as unknown as import('$lib/questions/types').QuestionInstance);
		expect(result.isCorrect).toBe(false);
		expect(result.message).toContain('positions des figures non inscrites');
	});
});
