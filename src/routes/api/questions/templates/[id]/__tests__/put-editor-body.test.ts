/**
 * PUT depuis l'éditeur : un champ vidé doit être vidé en base
 * ===========================================================
 *
 * `QuestionTemplateForm` met à `undefined` un champ vide (description vide,
 * aucune option…) et `JSON.stringify` retire la clé. Avec la sémantique PATCH,
 * une clé absente GARDE la valeur : l'éditeur envoie donc ces champs à `null`
 * via `toTemplatePutBody`, et la route les vide comme avant.
 */
import { describe, it, expect } from 'vitest';
import { toTemplatePutBody } from '$lib/questions/template-put-body';
import { templateMarkdown } from '$lib/ubumark/types/template';
import { callPut, fakeDb, FIXTURE } from './fake-templates-db';

describe('toTemplatePutBody', () => {
	it('champ vidable absent → null ; champ présent → inchangé', () => {
		const body = toTemplatePutBody({
			title: 'T',
			variations: [{ statement: templateMarkdown('x') }],
			grades: ['CE1'],
			theme: 'Entiers',
			domain: 'Multiplier',
			level: 1,
			status: 'draft',
			delay: 15
		});
		expect(body).toEqual({
			title: 'T',
			variations: [{ statement: 'x' }],
			grades: ['CE1'],
			theme: 'Entiers',
			domain: 'Multiplier',
			level: 1,
			status: 'draft',
			delay: 15,
			description: null,
			shared: null,
			defaultDisplayOptions: null,
			exerciseInstruction: null,
			options: null,
			subdomain: null,
			multipleAnswers: null,
			testSpecs: null
		});
	});
});

describe("PUT depuis l'éditeur", () => {
	it('description effacée dans le formulaire → description null en base', async () => {
		const db = fakeDb();
		const response = await callPut(
			db,
			JSON.parse(
				JSON.stringify(
					toTemplatePutBody({
						title: FIXTURE.title as string,
						description: undefined,
						shared: FIXTURE.shared as never,
						variations: FIXTURE.variations as never,
						grades: FIXTURE.grades as never,
						theme: FIXTURE.theme as string,
						domain: FIXTURE.domain as string,
						subdomain: FIXTURE.subdomain as string,
						level: FIXTURE.level as number,
						status: 'draft'
					})
				)
			)
		);

		expect(response.status).toBe(200);
		expect(db.question_templates[0].description).toBeNull();
		expect(db.updates[0]).toMatchObject({ description: null, options: null, test_specs: null });
	});
});

// Question de cours (Q110 b) : le marqueur passe la validation Zod de la route
// et est enregistré tel quel dans `options`.
describe("PUT depuis l'éditeur : question de cours", () => {
	it('options.courseQuestion coché → enregistré en base', async () => {
		const db = fakeDb();
		const response = await callPut(
			db,
			JSON.parse(
				JSON.stringify(
					toTemplatePutBody({
						title: FIXTURE.title as string,
						shared: FIXTURE.shared as never,
						variations: FIXTURE.variations as never,
						grades: FIXTURE.grades as never,
						theme: FIXTURE.theme as string,
						domain: FIXTURE.domain as string,
						subdomain: FIXTURE.subdomain as string,
						level: FIXTURE.level as number,
						status: 'draft',
						options: { courseQuestion: true }
					})
				)
			)
		);

		expect(response.status).toBe(200);
		expect(db.question_templates[0].options).toEqual({ courseQuestion: true });
	});
});
