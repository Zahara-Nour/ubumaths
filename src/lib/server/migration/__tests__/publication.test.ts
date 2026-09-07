import { describe, expect, it } from 'vitest';
import { motifDeNonPublication } from '../publication';

/**
 * Le script de publication sélectionnait par PLAGE D'INDEX et critères
 * techniques, sans jamais consulter le suivi. Trois conséquences : les
 * questions écartées en relecture partaient en base comme les autres, celles
 * jamais relues aussi, et relancer le script après une interruption créait un
 * second template pour chaque question déjà publiée.
 */
describe('motifDeNonPublication', () => {
	it('publie une question approuvée et jamais publiée', () => {
		expect(motifDeNonPublication({ reviewStatus: 'approved', newTemplateId: null })).toBeNull();
	});

	it('écarte une question que l’enseignant a rejetée', () => {
		// Sans cette règle, cinq mois de relecture n'avaient aucun effet sur ce
		// qui partait en base.
		expect(motifDeNonPublication({ reviewStatus: 'rejected', newTemplateId: null })).toBe(
			'non-approuvee'
		);
	});

	it('écarte une question pas encore relue', () => {
		expect(motifDeNonPublication({ reviewStatus: 'pending', newTemplateId: null })).toBe(
			'non-approuvee'
		);
	});

	it('écarte une question sans ligne de suivi', () => {
		// Aucune trace = jamais passée en relecture. La publier reviendrait à
		// décider à la place de l'enseignant.
		expect(motifDeNonPublication(undefined)).toBe('jamais-relue');
	});

	it('refuse de republier une question qui a déjà son template', () => {
		expect(
			motifDeNonPublication({
				reviewStatus: 'approved',
				newTemplateId: '11111111-1111-4111-8111-111111111111'
			})
		).toBe('deja-publiee');
	});

	it('la publication antérieure prime sur une re-relecture', () => {
		// Une question publiée puis re-relue ne doit pas repartir en base : le
		// doublon serait invisible côté élève, deux questions identiques.
		expect(
			motifDeNonPublication({
				reviewStatus: 'pending',
				newTemplateId: '11111111-1111-4111-8111-111111111111'
			})
		).toBe('deja-publiee');
	});
});
