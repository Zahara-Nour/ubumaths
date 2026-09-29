/**
 * updateQuestionTemplateSchema — pas de statut injecté
 * ====================================================
 *
 * Avec Zod 4, `.partial()` applique le `.default('published')` du schéma de
 * création : un PUT sans statut publiait le modèle.
 */
import { describe, it, expect } from 'vitest';
import {
	createQuestionTemplateSchema,
	updateQuestionTemplateSchema
} from '$lib/server/validation/questions';

describe('updateQuestionTemplateSchema', () => {
	it('corps sans statut → aucune clé `status` dans la sortie', () => {
		const parsed = updateQuestionTemplateSchema.parse({ title: 'Le double' });
		expect(parsed).toEqual({ title: 'Le double' });
		expect(Object.hasOwn(parsed, 'status')).toBe(false);
	});

	it('statut explicite → conservé', () => {
		expect(updateQuestionTemplateSchema.parse({ status: 'draft' }).status).toBe('draft');
	});

	it('statut invalide → refusé', () => {
		expect(updateQuestionTemplateSchema.safeParse({ status: 'archived' }).success).toBe(false);
	});

	it('création : le défaut « published » reste appliqué', () => {
		const parsed = createQuestionTemplateSchema.parse({
			title: 'T',
			grades: ['CE1'],
			theme: 'Entiers',
			domain: 'Multiplier',
			level: 1
		});
		expect(parsed.status).toBe('published');
	});
});
