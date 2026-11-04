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

	it('autre refus de contrôle (tags de points) : message de la base repris', () => {
		expect(
			classificationNodeErrorMessage({ code: '23514', message: 'Le point X est posé sur « Y »' })
		).toBe('Le point X est posé sur « Y »');
	});

	it('une autre clé étrangère ou une panne ne sont pas un refus de rangement', () => {
		expect(
			classificationNodeErrorMessage({ code: '23503', message: 'violates "autre_fkey"' })
		).toBeNull();
		expect(classificationNodeErrorMessage({ code: '42501', message: 'denied' })).toBeNull();
	});
});
