import { describe, expect, it } from 'vitest';
import { caesarEncrypt } from '../caesar';
import { attempt } from '../outcome';

describe('attempt', () => {
	it('rend le texte et les étapes quand tout va bien', () => {
		expect(attempt(() => caesarEncrypt('A', 1))).toEqual({
			ok: true,
			text: 'B',
			steps: [{ input: 'A', output: 'B', detail: '0 + 1 = 1' }]
		});
	});

	it('une erreur de saisie devient un message', () => {
		expect(attempt(() => caesarEncrypt('A', 0.5))).toEqual({
			ok: false,
			message: 'Le décalage doit être un nombre entier.'
		});
	});

	it('un bug remonte', () => {
		expect(() =>
			attempt(() => {
				throw new TypeError('bug');
			})
		).toThrow(TypeError);
	});
});
