/**
 * Tests — la numérotation que voit l'élève.
 *
 * Le cas qui compte est celui des fiches à sections : `position` y redémarre à
 * 1 dans chaque section, alors que le numéro affiché continue de croître. Une
 * fiche réelle — « Préparation à l'évaluation sur le calcul intégral » —
 * affiche 20 exercices pour seulement 7 positions distinctes.
 */

import { describe, it, expect } from 'vitest';
import {
	groupExercisesForDisplay,
	orderExercisesForDisplay,
	displayNumberOf,
	exerciseAtDisplayNumber
} from '../exercise-numbering';

const exo = (id: string, section_id: string | null, position: number) => ({
	id,
	section_id,
	position
});
const sec = (id: string, position: number) => ({ id, position });

describe('numérotation des exercices de fiche', () => {
	it('numérote en continu à travers les sections, malgré des positions qui redémarrent', () => {
		// Le cœur du sujet : deux sections, chacune avec des positions 1 et 2.
		const sections = [sec('A', 1), sec('B', 2)];
		const exercises = [exo('a1', 'A', 1), exo('a2', 'A', 2), exo('b1', 'B', 1), exo('b2', 'B', 2)];

		expect(
			orderExercisesForDisplay(exercises, sections).map((e) => [e.exercise.id, e.number])
		).toEqual([
			['a1', 1],
			['a2', 2],
			['b1', 3],
			['b2', 4]
		]);
	});

	it('place les exercices hors section à la FIN, pas à leur position', () => {
		const sections = [sec('A', 1)];
		const exercises = [exo('libre', null, 1), exo('a1', 'A', 1)];

		expect(orderExercisesForDisplay(exercises, sections).map((e) => e.exercise.id)).toEqual([
			'a1',
			'libre'
		]);
	});

	it('respecte l’ordre des sections, pas celui du tableau reçu', () => {
		// Le tri est refait ici : un appelant qui aurait oublié son `order by` ne
		// doit pas produire une numérotation différente.
		const sections = [sec('B', 2), sec('A', 1)];
		const exercises = [exo('b1', 'B', 1), exo('a1', 'A', 1)];

		expect(orderExercisesForDisplay(exercises, sections).map((e) => e.exercise.id)).toEqual([
			'a1',
			'b1'
		]);
	});

	it('trie aussi les exercices à l’intérieur d’une section', () => {
		const exercises = [exo('x', 'A', 3), exo('y', 'A', 1), exo('z', 'A', 2)];

		expect(orderExercisesForDisplay(exercises, [sec('A', 1)]).map((e) => e.exercise.id)).toEqual([
			'y',
			'z',
			'x'
		]);
	});

	it('fonctionne sans aucune section', () => {
		const exercises = [exo('b', null, 2), exo('a', null, 1)];

		expect(orderExercisesForDisplay(exercises, []).map((e) => [e.exercise.id, e.number])).toEqual([
			['a', 1],
			['b', 2]
		]);
	});

	it('groupe pour l’affichage, en-têtes de section comprises', () => {
		const sections = [sec('A', 1), sec('B', 2)];
		const exercises = [exo('a1', 'A', 1), exo('b1', 'B', 1), exo('libre', null, 1)];

		const groups = groupExercisesForDisplay(exercises, sections);

		expect(groups.map((g) => g.section?.id ?? null)).toEqual(['A', 'B', null]);
		expect(groups[2].exercises[0].number).toBe(3);
	});

	it('omet une section vide plutôt que d’afficher un en-tête sans rien dessous', () => {
		const groups = groupExercisesForDisplay([exo('a1', 'A', 1)], [sec('A', 1), sec('VIDE', 2)]);

		expect(groups.map((g) => g.section?.id)).toEqual(['A']);
	});

	it('ne fait pas disparaître un exercice dont la section est inconnue', () => {
		// Section supprimée sans que les exercices soient réaffectés : les perdre
		// silencieusement serait pire que de les mettre à la fin.
		const groups = groupExercisesForDisplay([exo('orphelin', 'DISPARUE', 1)], [sec('A', 1)]);

		expect(groups).toHaveLength(1);
		expect(groups[0].section).toBeNull();
		expect(groups[0].exercises[0].exercise.id).toBe('orphelin');
	});

	it('retrouve le numéro d’un exercice, et l’exercice d’un numéro', () => {
		const sections = [sec('A', 1), sec('B', 2)];
		const exercises = [exo('a1', 'A', 1), exo('b1', 'B', 1), exo('b2', 'B', 2)];

		expect(displayNumberOf(exercises, sections, 'b2')).toBe(3);
		expect(exerciseAtDisplayNumber(exercises, sections, 3)?.id).toBe('b2');

		// Aller-retour : c'est l'invariant dont dépend `[[exos:fiche#3]]`.
		for (const { exercise, number } of orderExercisesForDisplay(exercises, sections)) {
			expect(exerciseAtDisplayNumber(exercises, sections, number)?.id).toBe(exercise.id);
		}
	});

	it('renvoie null pour un numéro hors de la fiche ou absurde', () => {
		const exercises = [exo('a', null, 1)];

		expect(exerciseAtDisplayNumber(exercises, [], 2)).toBeNull();
		expect(exerciseAtDisplayNumber(exercises, [], 0)).toBeNull();
		expect(exerciseAtDisplayNumber(exercises, [], -1)).toBeNull();
		expect(exerciseAtDisplayNumber(exercises, [], 1.5)).toBeNull();
		expect(displayNumberOf(exercises, [], 'inconnu')).toBeNull();
	});

	it('reproduit une fiche réelle : 20 exercices, 10 sections, positions 1..7', () => {
		// « Préparation à l'évaluation sur le calcul intégral », mesurée en prod.
		const sections = Array.from({ length: 10 }, (_, i) => sec(`S${i}`, i + 1));
		const exercises = sections.flatMap((s, i) =>
			Array.from({ length: i < 5 ? 2 : 2 }, (_, j) => exo(`${s.id}-${j}`, s.id, j + 1))
		);

		const ordered = orderExercisesForDisplay(exercises, sections);

		expect(ordered).toHaveLength(20);
		expect(ordered.map((e) => e.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
		// Aucune collision, alors que `position` ne prend que les valeurs 1 et 2.
		expect(new Set(exercises.map((e) => e.position)).size).toBe(2);
	});

	it('conserve l’ordre reçu quand la fiche est tirée au sort', () => {
		// `worksheet_instances.exercise_order` donne un ordre propre à chaque élève.
		// Retrier par `position` annulerait le tirage.
		const sections = [sec('A', 1)];
		const melange = [exo('a3', 'A', 3), exo('a1', 'A', 1), exo('a2', 'A', 2)];

		const ordre = orderExercisesForDisplay(melange, sections, { preserveExerciseOrder: true });

		expect(ordre.map((e) => [e.exercise.id, e.number])).toEqual([
			['a3', 1],
			['a1', 2],
			['a2', 3]
		]);
	});

	it('ne modifie pas les tableaux qu’on lui passe', () => {
		const exercises = [exo('b', null, 2), exo('a', null, 1)];
		const sections = [sec('B', 2), sec('A', 1)];
		orderExercisesForDisplay(exercises, sections);

		expect(exercises.map((e) => e.id)).toEqual(['b', 'a']);
		expect(sections.map((s) => s.id)).toEqual(['B', 'A']);
	});
});
