import { describe, it, expect } from 'vitest';
import { classificationNodeErrorMessage } from '../classification-node-error';

describe('classificationNodeErrorMessage', () => {
	it('branche refusée par le trigger : message clair', () => {
		const message = classificationNodeErrorMessage({
			code: '23514',
			message: 'Un contenu se range dans une notion ou une sous-notion, pas dans une branche.'
		});
		expect(message).toBe(
			'Un modèle se range dans une notion ou une sous-notion, pas dans une branche.'
		);
	});

	it('nœud archivé refusé', () => {
		expect(
			classificationNodeErrorMessage({
				code: '23514',
				message: 'Un contenu ne se range pas dans un nœud archivé.'
			})
		).toMatch(/archivé/);
	});

	it('nœud inexistant (clé étrangère) : message clair', () => {
		expect(
			classificationNodeErrorMessage({
				code: '23503',
				message:
					'insert or update on table "question_templates" violates foreign key constraint "question_templates_classification_node_id_fkey"',
				details: 'Key (classification_node_id)=(x) is not present in table "classification_nodes".'
			})
		).toMatch(/n'existe pas/);
	});

	it('refus du trigger des tags de points : message de la base repris', () => {
		// Texte réel de `tags_modeles_points` (20261013120000)
		const message =
			'Le modèle 1 porte le point CM2-12, qui ne serait ni sur « Fractions » ni sur sa notion : retirez d’abord ce tag, ou rangez le modèle sur un nœud compatible.';
		expect(classificationNodeErrorMessage({ code: '23514', message })).toBe(message);
	});

	it('une autre contrainte CHECK n’est pas un refus de rangement (panne, 500)', () => {
		expect(
			classificationNodeErrorMessage({
				code: '23514',
				message:
					'new row for relation "question_templates" violates check constraint "variations_minimum_one"'
			})
		).toBeNull();
	});

	it('une autre clé étrangère ou une panne ne sont pas un refus de rangement', () => {
		expect(
			classificationNodeErrorMessage({ code: '23503', message: 'violates "autre_fkey"' })
		).toBeNull();
		expect(classificationNodeErrorMessage({ code: '42501', message: 'denied' })).toBeNull();
	});
});
