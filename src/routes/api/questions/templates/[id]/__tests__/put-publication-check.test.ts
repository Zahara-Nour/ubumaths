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
import { callPost, callPut, fakeDb, FIXTURE, templateRow, type FakeDb } from './fake-templates-db';

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

/** Corps de création : le #139 complet, tel que l'éditeur l'envoie (camelCase) */
function createBody(status: 'draft' | 'published') {
	const { status: _status, ...template } = structuredClone(FIXTURE);
	return { ...template, status };
}

describe('POST : créer directement publié passe le même contrôle', () => {
	it('modèle complet créé publié → 201', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const response = await callPost(db, createBody('published'));

		expect(response.status).toBe(201);
		expect(db.inserts).toHaveLength(1);
	});

	it('modèle dont des tirages cassent, créé publié → 400, rien inséré', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const body = createBody('published');
		(body.variations[0] as { blanks: Array<{ expectedAnswer: string }> }).blanks[0].expectedAnswer =
			BROKEN_ANSWER;
		const response = await callPost(db, body);

		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.errors.join(' ')).toMatch(/tirage\(s\) en échec sur 100/);
		expect(db.inserts).toEqual([]);
	});

	it('le même modèle cassé reste créable en brouillon', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const body = createBody('draft');
		(body.variations[0] as { blanks: Array<{ expectedAnswer: string }> }).blanks[0].expectedAnswer =
			BROKEN_ANSWER;
		const response = await callPost(db, body);

		expect(response.status).toBe(201);
	});
});

const NODE_ID = '55555555-5555-4555-8555-555555555555';

// Plus aucun contrôle « catégorie occupée » (ADR 0035) : un modèle est rangé dans
// l'arbre des notions, où plusieurs modèles cohabitent.
describe('POST : rangement dans l’arbre, plus de catégorie', () => {
	it('créer publié alors qu’un publié porte le même niveau → 201', async () => {
		const db = fakeDb();
		db.question_templates = [{ ...templateRow(), status: 'published' }];
		const response = await callPost(db, createBody('published'));

		expect(response.status).toBe(201);
		expect(db.inserts).toHaveLength(1);
	});

	// Un onglet de l'éditeur ouvert avant la mise en prod envoie encore l'ancien quadruplet
	it('ancien quadruplet d’un vieil onglet : accepté puis ignoré (jamais écrit)', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const response = await callPost(db, {
			...createBody('draft'),
			theme: 'Ancien thème',
			domain: 'Ancien domaine',
			subdomain: 'Ancien sous-domaine'
		});

		expect(response.status).toBe(201);
		expect(db.inserts[0]).not.toHaveProperty('theme');
		expect(db.inserts[0]).not.toHaveProperty('domain');
		expect(db.inserts[0]).not.toHaveProperty('subdomain');
	});

	it('écrit classification_node_id', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const response = await callPost(db, {
			...createBody('draft'),
			classification_node_id: NODE_ID
		});

		expect(response.status).toBe(201);
		expect(db.inserts[0].classification_node_id).toBe(NODE_ID);
	});

	it('nœud non rangeable (branche) → 400 en français, jamais 500', async () => {
		const db = fakeDb();
		db.question_templates = [];
		db.nodeError = {
			code: '23514',
			message: 'Un contenu se range dans une notion ou une sous-notion, pas dans une branche.'
		};
		const response = await callPost(db, {
			...createBody('draft'),
			classification_node_id: NODE_ID
		});

		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.success).toBe(false);
		expect(json.errors.join(' ')).toMatch(/pas dans une branche/);
	});

	it('identifiant de nœud qui n’est pas un UUID → 400', async () => {
		const db = fakeDb();
		db.question_templates = [];
		const response = await callPost(db, { ...createBody('draft'), classification_node_id: 'abc' });

		expect(response.status).toBe(400);
		expect(db.inserts).toEqual([]);
	});
});

describe('PUT : rangement dans l’arbre', () => {
	it('publier un modèle dont un autre publié partage thème/domaine/niveau → 200', async () => {
		const db = fakeDb();
		db.question_templates.push({
			...templateRow(),
			id: '66666666-6666-4666-8666-666666666666',
			status: 'published'
		});
		const response = await callPut(db, { status: 'published' });

		expect(response.status).toBe(200);
	});

	it('écrit classification_node_id, et le vide avec null', async () => {
		const db = fakeDb();
		expect((await callPut(db, { classification_node_id: NODE_ID })).status).toBe(200);
		expect(db.updates[0]).toEqual({ classification_node_id: NODE_ID });
		expect((await callPut(db, { classification_node_id: null })).status).toBe(200);
		expect(db.updates[1]).toEqual({ classification_node_id: null });
	});

	it('ancien quadruplet d’un vieil onglet : ignoré, jamais écrit', async () => {
		const db = fakeDb();
		const response = await callPut(db, {
			level: 3,
			theme: 'Ancien thème',
			domain: 'Ancien domaine',
			subdomain: 'Ancien sous-domaine'
		});

		expect(response.status).toBe(200);
		expect(db.updates).toEqual([{ level: 3 }]);
	});

	it('seul l’ancien quadruplet envoyé : rien à mettre à jour → 400', async () => {
		const db = fakeDb();
		const response = await callPut(db, { theme: 'Autre' });

		expect(response.status).toBe(400);
	});

	it('nœud non rangeable (branche) → 400 en français, jamais 500', async () => {
		const db = fakeDb();
		db.nodeError = {
			code: '23514',
			message: 'Un contenu se range dans une notion ou une sous-notion, pas dans une branche.'
		};
		const response = await callPut(db, { classification_node_id: NODE_ID });

		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.errors.join(' ')).toMatch(/pas dans une branche/);
	});

	it('nœud inexistant (clé étrangère) → 400', async () => {
		const db = fakeDb();
		db.nodeError = {
			code: '23503',
			message: 'violates foreign key constraint "question_templates_classification_node_id_fkey"'
		};
		const response = await callPut(db, { classification_node_id: NODE_ID });

		expect(response.status).toBe(400);
	});
});
