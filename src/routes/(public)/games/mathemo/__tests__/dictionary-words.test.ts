import { describe, it, expect } from 'vitest';
import MATH_DICTIONARY from '$lib/data/math-dictionary-fr';
import { GRADE_CODES } from '$lib/types/grades';
import { allWordsNormalized, getWordsForLevel } from '../dictionary-words';
import { GRADE_LABELS, MATHEMO_GRADES } from '../types';

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

	// La 1re générale et la 1re techno ne voient pas les mots de 1re spé, sauf ceux
	// que leur programme nomme aussi
	it('propose les trois filières de 1re dans le choix du niveau', () => {
		expect(MATHEMO_GRADES).toEqual(expect.arrayContaining(['1_GEN', '1_SPE', '1_TECHNO']));
		for (const grade of MATHEMO_GRADES) expect(GRADE_LABELS[grade]).toBeTruthy();
	});

	it('fait deviner aux autres filières de 1re les mots partagés avec elles', () => {
		expect(getWordsForLevel('1_GEN')).toContain('seuil');
		expect(getWordsForLevel('1_TECHNO')).toContain('derivee');
		expect(getWordsForLevel('1_GEN')).not.toContain('derivee');
	});

	it('garde les mots d’un seul mot, sans accents, une seule fois', () => {
		const words = getWordsForLevel('2');
		expect(words).toContain('carre');
		expect(words).toContain('evenement');
		// « base » a trois sens (puissance, solide, vecteurs) mais ne sort qu'une fois
		expect(words.filter((w) => w === 'base')).toHaveLength(1);
	});
});
