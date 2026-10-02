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
	submitAttemptSchema,
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
			// Absente : createSeries l'enregistre à null
			expect(result.data.description ?? null).toBeNull();
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
			createSeriesSchema.safeParse({ ...valid, categories: [{ ...ITEM, quantity: 100 }] }).success
		).toBe(false);
		expect(
			createSeriesSchema.safeParse({ ...valid, categories: [{ ...ITEM, delay: 4000 }] }).success
		).toBe(false);
	});

	it('99 questions pour une catégorie (plafond du panier) : enregistrable', () => {
		expect(
			createSeriesSchema.safeParse({ ...valid, categories: [{ ...ITEM, quantity: 99 }] }).success
		).toBe(true);
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
	it('accepte un nouveau titre seul, sans toucher à la description', () => {
		const result = updateSeriesSchema.safeParse({ title: 'Nouveau' });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.description).toBeUndefined();
	});

	it('description vide fournie : effacée (null)', () => {
		const result = updateSeriesSchema.safeParse({ title: 'Nouveau', description: '  ' });
		expect(result.success && result.data.description).toBeNull();
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

describe('submitAttemptSchema (C10)', () => {
	it('accepte cases, choix et temps par question', () => {
		const result = submitAttemptSchema.safeParse({
			answers: [
				{ position: 0, values: ['7', ''], timeSpent: 12 },
				{ position: 1, choices: [0, 2] }
			]
		});
		expect(result.success).toBe(true);
	});

	it('QCM à plusieurs réponses (V5) : plusieurs choix cochés, dans le désordre', () => {
		const result = submitAttemptSchema.safeParse({
			answers: [{ position: 0, choices: [3, 0, 2] }]
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.answers[0].choices).toEqual([3, 0, 2]);
	});

	it('retire tout verdict envoyé par le navigateur', () => {
		const result = submitAttemptSchema.safeParse({
			answers: [
				{
					position: 0,
					values: ['7'],
					latex: ['(x+1)(x+2)'],
					isCorrect: true,
					points: 1,
					status: 'correct'
				}
			],
			timeSpent: 10,
			grade: 20,
			score: 10
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('grade');
			// Durée totale : mesurée par le serveur, jamais lue
			expect(result.data).not.toHaveProperty('timeSpent');
			expect(result.data.answers[0]).not.toHaveProperty('isCorrect');
			expect(result.data.answers[0]).not.toHaveProperty('points');
			// Forme jugée sur la valeur : un LaTeX à part n'est jamais lu (audit)
			expect(result.data.answers[0]).not.toHaveProperty('latex');
		}
	});

	it.each([
		['position négative', { answers: [{ position: -1 }] }],
		['position hors bornes', { answers: [{ position: 500 }] }],
		['deux réponses à la même question', { answers: [{ position: 0 }, { position: 0 }] }],
		['case trop longue', { answers: [{ position: 0, values: ['x'.repeat(2001)] }] }],
		['trop de cases', { answers: [{ position: 0, values: Array(51).fill('1') }] }],
		['indice de QCM hors bornes', { answers: [{ position: 0, choices: [50] }] }],
		['indice de QCM non entier', { answers: [{ position: 0, choices: [0.5] }] }],
		['même choix coché deux fois (V5)', { answers: [{ position: 0, choices: [1, 1] }] }],
		[
			'trop de choix cochés',
			{ answers: [{ position: 0, choices: Array.from({ length: 51 }, (_, i) => i) }] }
		],
		['temps négatif', { answers: [{ position: 0, timeSpent: -1 }] }],
		['temps fabriqué', { answers: [{ position: 0, timeSpent: 86_401 }] }],
		['trop de réponses', { answers: Array.from({ length: 501 }, (_, i) => ({ position: i })) }]
	])('refuse : %s', (_label, body) => {
		expect(submitAttemptSchema.safeParse(body).success).toBe(false);
	});
});

describe('bornes d’une série enregistrée (alignées sur la base et l’envoi)', () => {
	const item = (quantity: number, delay = 20) => ({ ...ITEM, quantity, delay });

	it('durée > 600 s : refusée avec un message clair', () => {
		const result = createSeriesSchema.safeParse({
			title: 'T',
			grade: '6',
			categories: [item(1, 601)]
		});
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues[0].message).toMatch(/600 s au plus/);
	});

	it('plus de 500 questions en tout : refusée, total annoncé', () => {
		const result = createSeriesSchema.safeParse({
			title: 'T',
			grade: '6',
			categories: Array.from({ length: 6 }, () => item(99))
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toMatch(/594 questions/);
			expect(result.error.issues[0].message).toMatch(/500 au plus/);
		}
	});

	it('modification : même borne', () => {
		const result = updateSeriesSchema.safeParse({
			categories: Array.from({ length: 6 }, () => item(99))
		});
		expect(result.success).toBe(false);
	});

	it('500 questions pile, 600 s pile : acceptées', () => {
		expect(
			createSeriesSchema.safeParse({
				title: 'T',
				grade: '6',
				categories: [...Array.from({ length: 5 }, () => item(99, 600)), item(5)]
			}).success
		).toBe(true);
	});
});
