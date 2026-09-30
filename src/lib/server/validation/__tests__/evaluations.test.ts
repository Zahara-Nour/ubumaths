/**
 * Séries et évaluations : schémas (B11, B13).
 */
import { describe, it, expect } from 'vitest';
import {
	assignEvaluationSchema,
	classIdsFieldSchema,
	createEvaluationFormSchema,
	createSeriesSchema,
	evaluationSettingsSchema,
	updateSeriesSchema
} from '../evaluations';

const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};
const SERIES_ID = '5b1f6a2e-3c4d-4e8f-9a0b-1c2d3e4f5a6b';
const CLASS_ID = '6c2a7b3f-4d5e-4f90-8b1c-2d3e4f5a6b7c';

describe('createSeriesSchema (B11)', () => {
	const valid = { title: '  Tables de 7  ', grade: '6', categories: [ITEM] };

	it('accepte un panier et nettoie le titre', () => {
		const result = createSeriesSchema.safeParse(valid);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe('Tables de 7');
			expect(result.data.description).toBeNull();
		}
	});

	it('titre : 1 à 200 caractères après nettoyage', () => {
		expect(createSeriesSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
		expect(createSeriesSchema.safeParse({ ...valid, title: 'x'.repeat(200) }).success).toBe(true);
		expect(createSeriesSchema.safeParse({ ...valid, title: 'x'.repeat(201) }).success).toBe(false);
		expect(createSeriesSchema.safeParse({ ...valid, title: undefined }).success).toBe(false);
	});

	it('catégories : 1 à 50, quantités et durées bornées', () => {
		expect(createSeriesSchema.safeParse({ ...valid, categories: [] }).success).toBe(false);
		expect(
			createSeriesSchema.safeParse({ ...valid, categories: Array(51).fill(ITEM) }).success
		).toBe(false);
		expect(
			createSeriesSchema.safeParse({ ...valid, categories: [{ ...ITEM, quantity: 51 }] }).success
		).toBe(false);
		expect(
			createSeriesSchema.safeParse({ ...valid, categories: [{ ...ITEM, delay: 4000 }] }).success
		).toBe(false);
	});

	it('niveau inconnu : refusé', () => {
		expect(createSeriesSchema.safeParse({ ...valid, grade: '7eme' }).success).toBe(false);
	});

	it('messages en français', () => {
		const result = createSeriesSchema.safeParse({ ...valid, title: '' });
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues[0].message).toBe('Titre requis');
	});
});

describe('updateSeriesSchema', () => {
	it('refuse une modification vide', () => {
		expect(updateSeriesSchema.safeParse({}).success).toBe(false);
	});
	it('accepte un nouveau titre seul', () => {
		expect(updateSeriesSchema.safeParse({ title: 'Nouveau' }).success).toBe(true);
	});
});

describe('evaluationSettingsSchema (B13, Q30)', () => {
	it('Course aux nombres : temps obligatoire, converti en secondes', () => {
		const result = evaluationSettingsSchema.safeParse({ form: 'course', time_limit_minutes: 7 });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.time_limit).toBe(420);
	});

	it('Course aux nombres sans temps : 400 en français', () => {
		const result = evaluationSettingsSchema.safeParse({ form: 'course' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Une Course aux nombres demande un temps limite');
		}
	});

	it('Course aux nombres : 1 à 60 minutes', () => {
		expect(
			evaluationSettingsSchema.safeParse({ form: 'course', time_limit_minutes: 1 }).success
		).toBe(true);
		expect(
			evaluationSettingsSchema.safeParse({ form: 'course', time_limit_minutes: 60 }).success
		).toBe(true);
		for (const minutes of [0, 61, 7.5]) {
			expect(
				evaluationSettingsSchema.safeParse({ form: 'course', time_limit_minutes: minutes }).success
			).toBe(false);
		}
	});

	it('Entraînement : aucun temps limite', () => {
		const ok = evaluationSettingsSchema.safeParse({ form: 'interactive' });
		expect(ok.success).toBe(true);
		if (ok.success) expect(ok.data.time_limit).toBeNull();

		const ko = evaluationSettingsSchema.safeParse({ form: 'interactive', time_limit_minutes: 5 });
		expect(ko.success).toBe(false);
		if (!ko.success)
			expect(ko.error.issues[0].message).toBe("Un Entraînement n'a pas de temps limite");
	});

	it('forme inconnue (flash) : refusée', () => {
		expect(evaluationSettingsSchema.safeParse({ form: 'flash' }).success).toBe(false);
	});

	it('tentatives 1 à 10, date limite ISO', () => {
		expect(
			evaluationSettingsSchema.safeParse({ form: 'interactive', max_attempts: 11 }).success
		).toBe(false);
		expect(
			evaluationSettingsSchema.safeParse({ form: 'interactive', deadline: '2026-10-01T10:00' })
				.success
		).toBe(false);
		expect(
			evaluationSettingsSchema.safeParse({
				form: 'interactive',
				deadline: '2026-10-01T10:00:00.000Z',
				max_attempts: 3
			}).success
		).toBe(true);
	});
});

describe('createEvaluationFormSchema', () => {
	it('relit les réglages sérialisés d’un formulaire', () => {
		const result = createEvaluationFormSchema.safeParse({
			series_id: SERIES_ID,
			settings: JSON.stringify({ form: 'course', time_limit_minutes: 10 }),
			status: 'published'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.settings).toMatchObject({ form: 'course', time_limit: 600 });
			expect(result.data.status).toBe('published');
		}
	});

	it('brouillon par défaut', () => {
		const result = createEvaluationFormSchema.safeParse({
			series_id: SERIES_ID,
			settings: JSON.stringify({ form: 'interactive' })
		});
		expect(result.success && result.data.status).toBe('draft');
	});

	it('réglages illisibles ou série invalide : refusés', () => {
		expect(
			createEvaluationFormSchema.safeParse({ series_id: SERIES_ID, settings: '{oups' }).success
		).toBe(false);
		expect(
			createEvaluationFormSchema.safeParse({
				series_id: 'pas-un-uuid',
				settings: JSON.stringify({ form: 'interactive' })
			}).success
		).toBe(false);
	});
});

describe('assignations', () => {
	it('au moins une classe ou un élève', () => {
		expect(assignEvaluationSchema.safeParse({}).success).toBe(false);
		expect(assignEvaluationSchema.safeParse({ class_ids: [CLASS_ID] }).success).toBe(true);
	});

	it('classIdsFieldSchema relit la liste sérialisée', () => {
		expect(classIdsFieldSchema.safeParse(JSON.stringify([CLASS_ID])).success).toBe(true);
		expect(classIdsFieldSchema.safeParse('[]').success).toBe(false);
		expect(classIdsFieldSchema.safeParse('pas du json').success).toBe(false);
	});
});
