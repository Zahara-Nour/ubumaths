import { describe, it, expect } from 'vitest';
import { compactQcmChoices } from '../qcm-choices';

describe('compactQcmChoices', () => {
	it('un choix vide avant la bonne réponse ne la décale pas', () => {
		// « b » est la bonne réponse (indice 2) ; le choix vide d'indice 1 disparaît.
		expect(compactQcmChoices(['a', '', 'b', 'c'], [2])).toEqual({
			choices: ['a', 'b', 'c'],
			correct: [1]
		});
	});

	it('plusieurs bonnes réponses recalées', () => {
		expect(compactQcmChoices(['', 'a', ' ', 'b'], [1, 3])).toEqual({
			choices: ['a', 'b'],
			correct: [0, 1]
		});
	});

	it('une bonne réponse cochée sur un choix vide disparaît', () => {
		expect(compactQcmChoices(['a', '', 'b'], [1])).toEqual({ choices: ['a', 'b'], correct: [] });
	});
});
