/**
 * Tests — sélection d'exercices `#3,5-7` dans une référence de fiche.
 *
 * Ces fonctions lisent ce que le professeur a TAPÉ À LA MAIN, pas une donnée
 * validée : la tolérance aux fautes de frappe fait partie du contrat.
 */

import { describe, it, expect } from 'vitest';
import {
	parseExerciseSelection,
	formatExerciseSelection,
	describeExerciseSelection
} from '../exercise-selection';

describe('parseExerciseSelection', () => {
	it('lit un numéro seul', () => {
		expect(parseExerciseSelection('3')).toEqual([3]);
	});

	it('lit une liste', () => {
		expect(parseExerciseSelection('3,4,7')).toEqual([3, 4, 7]);
	});

	it('lit une plage, bornes incluses', () => {
		expect(parseExerciseSelection('3-8')).toEqual([3, 4, 5, 6, 7, 8]);
	});

	it('mélange listes et plages', () => {
		expect(parseExerciseSelection('3,5-8,11')).toEqual([3, 5, 6, 7, 8, 11]);
	});

	it('dédoublonne et trie', () => {
		expect(parseExerciseSelection('7,3,3,5-6,6')).toEqual([3, 5, 6, 7]);
	});

	it('remet une plage inversée à l’endroit', () => {
		// `7-3` est une faute de frappe, pas une intention.
		expect(parseExerciseSelection('7-3')).toEqual([3, 4, 5, 6, 7]);
	});

	it('ignore une sélection absente', () => {
		expect(parseExerciseSelection(null)).toEqual([]);
		expect(parseExerciseSelection('')).toEqual([]);
	});

	it('rend une sélection incompréhensible équivalente à AUCUNE', () => {
		// Conséquence voulue : la référence désigne alors la fiche entière, ce qui
		// est le comportement le moins surprenant. Elle ne doit surtout pas
		// désigner « zéro exercice », qui perdrait les points sans le dire.
		for (const invalide of ['abc', '3;4', '3..5', '-3', '3-', ',3', '3,,4']) {
			expect(parseExerciseSelection(invalide), invalide).toEqual([]);
		}
	});

	it('rejette zéro : la numérotation commence à 1', () => {
		expect(parseExerciseSelection('0')).toEqual([]);
		expect(parseExerciseSelection('0-2')).toEqual([1, 2]);
	});

	it('rejette les valeurs déraisonnables', () => {
		// La syntaxe n'accepte que trois chiffres : un nombre plus long rend TOUTE
		// la sélection incompréhensible, donc équivalente à aucune. C'est plus
		// prudent que de deviner ce qu'on a voulu écrire.
		expect(parseExerciseSelection('1000')).toEqual([]);
		expect(parseExerciseSelection('998-1500')).toEqual([]);
		expect(parseExerciseSelection('998-999')).toEqual([998, 999]);
	});
});

describe('formatExerciseSelection', () => {
	it('regroupe les suites de trois ou plus', () => {
		expect(formatExerciseSelection([3, 4, 5, 7])).toBe('3-5,7');
	});

	it('ne regroupe PAS une paire', () => {
		// `3-4` n'est pas plus court que `3,4`, et se lit moins bien.
		expect(formatExerciseSelection([3, 4])).toBe('3,4');
	});

	it('fait l’aller-retour avec la lecture', () => {
		for (const forme of ['3', '3,4', '3-5,7', '1-3,8,10-12']) {
			expect(formatExerciseSelection(parseExerciseSelection(forme))).toBe(forme);
		}
	});

	it('renvoie une chaîne vide pour rien', () => {
		expect(formatExerciseSelection([])).toBe('');
	});
});

describe('describeExerciseSelection', () => {
	it('écrit un libellé lisible', () => {
		expect(describeExerciseSelection([3])).toBe('ex. 3');
		expect(describeExerciseSelection([3, 4])).toBe('ex. 3 et 4');
		expect(describeExerciseSelection([3, 5, 6, 7])).toBe('ex. 3 et 5 à 7');
		expect(describeExerciseSelection([1, 2, 3, 8, 9])).toBe('ex. 1 à 3, 8 et 9');
	});

	it('ne dit rien quand il n’y a rien', () => {
		expect(describeExerciseSelection([])).toBe('');
	});
});
