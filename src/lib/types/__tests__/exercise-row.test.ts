import { describe, expect, it } from 'vitest';
import { asDistributionMode, asExerciseCategory, toExercise } from '../exercise-row';
import type { ExerciseRow } from '../exercise-row';

/**
 * `exercises` garde ses variables, ses variations et ses ressources en `jsonb`,
 * et sa catégorie comme du texte libre. Les étiquettes, elles, ne sont pas une
 * colonne : elles viennent de la table de jonction `exercise_tags`.
 */
const ligne = (surcharge: Partial<ExerciseRow> = {}): ExerciseRow => ({
	id: 'exo-1',
	slug: null,
	title: null,
	source: null,
	topic: null,
	category: 'application',
	distribution_mode: 'per_student',
	is_public: false,
	grades: ['3'],
	generic_functions: null,
	variables: [{ name: 'a', expression: '{{1..10}}' }],
	variations: null,
	shared: null,
	resources: null,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-02T00:00:00Z',
	created_by: 'prof-1',
	...surcharge
});

describe('toExercise', () => {
	it('conserve un exercice complet', () => {
		const exercice = toExercise(ligne(), ['équations']);

		expect(exercice.category).toBe('application');
		expect(exercice.distribution_mode).toBe('per_student');
		expect(exercice.variables).toHaveLength(1);
		expect(exercice.tags).toEqual(['équations']);
	});

	it('ne fige pas une distribution inconnue', () => {
		// `per_student` et `per_group` figent une instance ; `on_demand` en
		// regénère une à chaque tentative. Devant une valeur inconnue, c'est le
		// choix qui n'engage rien.
		expect(toExercise(ligne({ distribution_mode: 'par_binome' })).distribution_mode).toBe(
			'on_demand'
		);
	});

	it('retombe sur automatisme devant une catégorie inconnue', () => {
		expect(toExercise(ligne({ category: 'defi_maison' })).category).toBe('automatisme');
	});

	it('écarte un niveau que l’application ne connaît pas', () => {
		expect(toExercise(ligne({ grades: ['3', 'terminale-euro'] })).grades).toEqual(['3']);
	});

	it('rend les colonnes jsonb non listées comme absentes', () => {
		// Un objet là où le code itère sur un tableau ferait échouer l'affichage
		// au lieu de montrer un exercice sans variation.
		const exercice = toExercise(ligne({ variables: { a: 1 }, variations: { x: 1 } }));

		expect(exercice.variables).toBeUndefined();
		expect(exercice.variations).toBeUndefined();
	});

	it('traduit les absences Postgres en absences TypeScript', () => {
		const exercice = toExercise(ligne());

		expect(exercice.slug).toBeUndefined();
		expect(exercice.title).toBeUndefined();
		expect(exercice.topic).toBeUndefined();
		expect(exercice.generic_functions).toBeUndefined();
	});

	it('sans étiquette fournie, la liste est vide et non absente', () => {
		// L'affichage itère sur `tags` sans garde.
		expect(toExercise(ligne()).tags).toEqual([]);
	});
});

describe('asExerciseCategory / asDistributionMode', () => {
	it('acceptent les valeurs connues', () => {
		expect(asExerciseCategory('tache_complexe')).toBe('tache_complexe');
		expect(asDistributionMode('per_group')).toBe('per_group');
	});
});
