/**
 * PUT /api/questions/templates/[id] — publication aussi stricte que par lot
 * =========================================================================
 *
 * Publier un modèle seul (ou modifier un modèle publié) passe le même contrôle
 * que la publication par lot : `checkTemplate` (structure, schéma strict,
 * specs vertes, 50 tirages par variation). Avant, le PUT ne lançait que
 * `validateTemplate` : une question dont un tirage casse atteignait les élèves.
 *
 * Modèle de la forme réelle (#139, « Trouver le double »), cassé de façon que
 * `validateTemplate` ne voie rien : `sqrt(a-8)` n'existe pas pour a < 8, et
 * les specs (a = 40, 100, 13) restent vertes.
 */
import { describe, it, expect } from 'vitest';
import { callPut, fakeDb, type FakeDb } from './fake-templates-db';

const BROKEN_ANSWER = '{{eval:2*a+sqrt(a-8)-sqrt(a-8)}}';

function breakFirstDraw(db: FakeDb) {
	const variations = db.question_templates[0].variations as Array<{
		blanks: Array<{ expectedAnswer: string }>;
	}>;
	variations[0].blanks[0].expectedAnswer = BROKEN_ANSWER;
}

describe('PUT : publication contrôlée par checkTemplate', () => {
	it('brouillon dont des tirages cassent → {status: published} refusé (400), rien écrit', async () => {
		const db = fakeDb();
		breakFirstDraw(db);
		const response = await callPut(db, { status: 'published' });

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors.join(' ')).toMatch(/tirage\(s\) en échec sur 100/);
		expect(db.updates).toEqual([]);
		expect(db.question_templates[0].status).toBe('draft');
	});

	it('brouillon dont une spec est rouge → publication refusée (400)', async () => {
		const db = fakeDb();
		const specs = db.question_templates[0].test_specs as Array<{ answers: string[] }>;
		specs[0].answers = ['81'];
		const response = await callPut(db, { status: 'published' });

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors.join(' ')).toMatch(/spec\(s\) rouge\(s\)/);
		expect(db.updates).toEqual([]);
	});

	it('brouillon sans spec → publication refusée (400)', async () => {
		const db = fakeDb();
		db.question_templates[0].test_specs = null;
		const response = await callPut(db, { status: 'published' });

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors.join(' ')).toMatch(/aucune spec de test/);
	});

	it('modèle PUBLIÉ dont la modification casse un tirage → refusé (400), rien écrit', async () => {
		const db = fakeDb();
		db.question_templates[0].status = 'published';
		const variations = structuredClone(db.question_templates[0].variations) as Array<{
			blanks: Array<{ expectedAnswer: string }>;
		}>;
		variations[0].blanks[0].expectedAnswer = BROKEN_ANSWER;
		const response = await callPut(db, { variations });

		expect(response.status).toBe(400);
		expect(db.updates).toEqual([]);
	});

	it('le même modèle cassé reste enregistrable en BROUILLON', async () => {
		const db = fakeDb();
		const variations = structuredClone(db.question_templates[0].variations) as Array<{
			blanks: Array<{ expectedAnswer: string }>;
		}>;
		variations[0].blanks[0].expectedAnswer = BROKEN_ANSWER;
		const response = await callPut(db, { variations });

		expect(response.status).toBe(200);
		expect(db.updates).toHaveLength(1);
	});
});
