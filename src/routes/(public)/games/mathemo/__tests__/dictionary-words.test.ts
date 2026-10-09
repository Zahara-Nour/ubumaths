import { describe, it, expect } from 'vitest';
import MATH_DICTIONARY from '$lib/data/math-dictionary-fr';
import { GRADE_CODES } from '$lib/types/grades';
import { allWordsNormalized, getWordsForLevel } from '../dictionary-words';

describe('Mathémo : mots tirés du dictionnaire', () => {
	// Le clavier du jeu n'a que les lettres de a à z : « demi-droite » était
	// tiré au sort, et aucun joueur ne pouvait le trouver
	it('ne tire au sort que des mots tapables au clavier du jeu', () => {
		// Le dictionnaire contient bien des mots à trait d'union, sinon le test ne prouve rien
		const hyphenated = MATH_DICTIONARY.filter((t) => !t.term.includes(' ') && t.term.includes('-'));
		expect(hyphenated.map((t) => t.term)).toContain('demi-droite');
		const untypable: string[] = [];
		for (const grade of GRADE_CODES) {
			for (const word of getWordsForLevel(grade)) {
				if (!/^[a-z]+$/.test(word)) untypable.push(`${grade} : ${word}`);
			}
		}
		expect(untypable).toEqual([]);
		expect([...allWordsNormalized].filter((w) => !/^[a-z]+$/.test(w))).toEqual([]);
	});

	it('garde les mots d’un seul mot, sans accents, une seule fois', () => {
		const words = getWordsForLevel('2');
		expect(words).toContain('carre');
		expect(words).toContain('evenement');
		// « base » a trois sens (puissance, solide, vecteurs) mais ne sort qu'une fois
		expect(words.filter((w) => w === 'base')).toHaveLength(1);
	});
});
