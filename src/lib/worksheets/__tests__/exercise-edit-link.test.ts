/**
 * Lien « Modifier l'exercice » depuis une fiche, et retour à la fiche (2026-09-25)
 *
 * Décision de David : même onglet ; la page de l'exercice propose « Retour à la
 * fiche » quand on vient d'une fiche. Le paramètre `fiche` vient de l'URL :
 * seul un UUID est accepté (sinon, pas de bouton de retour).
 */
import { describe, it, expect } from 'vitest';
import { exerciseEditHref, worksheetReturnHref } from '../exercise-edit-link';

const FICHE = '808e2eee-162a-4493-81f6-8a945c81db3c';
const EXO = '02a099dd-ff75-4a75-835b-056cd3565f8f';

describe('exerciseEditHref', () => {
	it('page d’édition de l’exercice, avec la fiche d’origine', () => {
		expect(exerciseEditHref(EXO, FICHE)).toBe(
			`/dashboard/teacher/contenu/exercices/${EXO}?fiche=${FICHE}`
		);
	});
});

describe('worksheetReturnHref', () => {
	it('fiche valide → lien vers l’édition de la fiche', () => {
		expect(worksheetReturnHref(new URLSearchParams(`fiche=${FICHE}&variation=guided`))).toBe(
			`/dashboard/teacher/contenu/worksheets/${FICHE}`
		);
	});

	it.each([
		['absent', ''],
		['vide', 'fiche='],
		['pas un UUID', 'fiche=abc'],
		['chemin injecté', 'fiche=../../admin'],
		['URL externe', 'fiche=https://exemple.com']
	])('%s → pas de retour', (_cas, query) => {
		expect(worksheetReturnHref(new URLSearchParams(query))).toBeNull();
	});
});
