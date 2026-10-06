import { describe, expect, it } from 'vitest';
import { applyGuesses, guessConflicts } from '../solver';

describe('applyGuesses (substitution manuelle)', () => {
	it('remplace les lettres devinées et marque les autres', () => {
		expect(applyGuesses('XAX !', { X: 'E' })).toEqual([
			{ char: 'E', guessed: true },
			{ char: 'A', guessed: false },
			{ char: 'E', guessed: true },
			{ char: ' ', guessed: false },
			{ char: '!', guessed: false }
		]);
	});

	it('normalise le texte chiffré', () => {
		expect(applyGuesses('é', {}).map((c) => c.char)).toEqual(['E']);
	});
});

describe('guessConflicts', () => {
	it('signale une lettre claire proposée pour deux lettres chiffrées', () => {
		expect(guessConflicts({ X: 'E', Q: 'E', A: 'S' })).toEqual(['E']);
	});

	it('aucun conflit → liste vide', () => {
		expect(guessConflicts({ X: 'E', Q: 'S' })).toEqual([]);
	});
});
