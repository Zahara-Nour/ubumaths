/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine questions
 * (validation des réponses d'élève).
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› V137`.
 *
 * Sonde : `validateAnswer`, le chemin d'une réponse d'élève à une case `math`.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '#lib/utils/answer-validator.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';

/** Le statut d'une réponse à une case `math` d'attendu `expected`. */
function statusOf(expected: string, answer: string): string {
	const instance: QuestionInstance = {
		templateId: 'ecart-questions',
		statement: 'Résoudre' as ResolvedMarkdown,
		blanks: [{ expectedAnswer: expected, type: 'math' }],
		grades: ['T_TECHNO'],
		level: 1,
		generatedAt: '2026-11-26T00:00:00.000Z'
	};
	const result = validateAnswer([answer], instance, [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

describe('V137 — puissance rationnelle écrite sur une autre base', () => {
	// Témoin : la même valeur, quand le moteur sait la réduire (8^(1/3) = 2), est
	// reconnue (bonne valeur, forme refusée par l'attendu en puissance).
	it('témoin : 2 pour 8^(1/3) est reconnu comme la bonne valeur', () => {
		expect(statusOf('8^{\\frac{1}{3}}', '2')).toBe('bad_form');
	});

	// Aujourd'hui : « incorrect » pour les quatre (x⁴ = 4, x⁴ = 9, x⁶ = 8).
	for (const [expected, answer] of [
		['4^{\\frac{1}{4}}', '2^{\\frac{1}{2}}'],
		['4^{\\frac{1}{4}}', '\\sqrt{2}'],
		['9^{\\frac{1}{4}}', '3^{\\frac{1}{2}}'],
		['8^{\\frac{1}{6}}', '2^{\\frac{1}{2}}']
	] as const) {
		it(`${answer} pour ${expected} n'est pas compté faux`, () => {
			expect(statusOf(expected, answer)).not.toBe('incorrect');
		});
	}
});
