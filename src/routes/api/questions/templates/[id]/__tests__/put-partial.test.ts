/**
 * PUT /api/questions/templates/[id] — mise à jour partielle (sémantique PATCH)
 * ===========================================================================
 *
 * Une clé absente du corps garde la valeur en base ; une clé présente (même
 * `null`) la remplace. Les contrôles de publication portent sur le modèle
 * FUSIONNÉ (base ⊕ corps), pas sur le seul corps.
 */
import { describe, it, expect } from 'vitest';
import { callPut, fakeDb, FIXTURE, ID, templateRow, type Row } from './fake-templates-db';

/**
 * Ligne dont le type enregistré n'est PAS celui que recalculerait la route
 * (`course_card` sans le marqueur) : un type réécrit à tort se verrait.
 */
function staleTypeRow(): Row {
	return { ...templateRow(), type: 'course_card' };
}

async function statusOf(promise: Promise<Response>): Promise<number | undefined> {
	return promise
		.then((response) => response.status)
		.catch((err: { status?: number }) => err.status);
}

describe('PUT partiel : les champs absents sont conservés', () => {
	it('{title} sur un brouillon → reste brouillon, seul `title` est écrit', async () => {
		const db = fakeDb();
		const before = { ...db.question_templates[0] };
		const response = await callPut(db, { title: 'Le double' });

		expect(response.status).toBe(200);
		expect(db.updates).toEqual([{ title: 'Le double' }]);
		expect(db.question_templates[0]).toEqual({ ...before, title: 'Le double' });
	});

	it('{description} → le type enregistré n’est pas réécrit', async () => {
		const db = fakeDb();
		db.question_templates = [staleTypeRow()];
		const response = await callPut(db, { description: 'Autre description' });

		expect(response.status).toBe(200);
		expect(db.updates).toEqual([{ description: 'Autre description' }]);
		expect(db.question_templates[0].type).toBe('course_card');
	});

	it('{title, status: draft} → seuls title et status écrits (rien remis à null)', async () => {
		const db = fakeDb();
		const response = await callPut(db, { title: 'Le double', status: 'draft' });

		expect(response.status).toBe(200);
		expect(db.updates).toEqual([{ title: 'Le double', status: 'draft' }]);
		expect(db.question_templates[0].description).toBe(FIXTURE.description);
	});

	it('{description, status: draft} → type non réécrit', async () => {
		const db = fakeDb();
		db.question_templates = [staleTypeRow()];
		const response = await callPut(db, { description: 'Autre', status: 'draft' });

		expect(response.status).toBe(200);
		expect(db.question_templates[0].type).toBe('course_card');
	});

	it('clé présente à null → la colonne est vidée', async () => {
		const db = fakeDb();
		const response = await callPut(db, { description: null });

		expect(response.status).toBe(200);
		expect(db.updates).toEqual([{ description: null }]);
	});
});

describe('PUT partiel : publication contrôlée sur le modèle fusionné', () => {
	it('{status: published} seul sur un brouillon complet → publié', async () => {
		const db = fakeDb();
		const response = await callPut(db, { status: 'published' });

		expect(response.status).toBe(200);
		expect(db.updates).toEqual([{ status: 'published' }]);
		expect(db.question_templates[0].status).toBe('published');
	});

	it('{status: published} sur un brouillon sans niveau scolaire → 400, rien écrit', async () => {
		const db = fakeDb();
		db.question_templates[0].grades = [];
		const response = await callPut(db, { status: 'published' });

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors).toContain('Missing required field: grades');
		expect(db.updates).toEqual([]);
	});

	it('{title} sur un modèle publié → contrôles sur le fusionné, lui-même exclu du doublon', async () => {
		const db = fakeDb();
		db.question_templates[0].status = 'published';
		const response = await callPut(db, { title: 'Le double' });

		expect(response.status).toBe(200);
		expect(db.updates).toEqual([{ title: 'Le double' }]);
	});

	it('{status: published} alors qu’un AUTRE publié occupe la catégorie → 400', async () => {
		const db = fakeDb();
		db.question_templates.push({
			...templateRow(),
			id: '33333333-3333-4333-8333-333333333333',
			status: 'published'
		});
		const response = await callPut(db, { status: 'published' });

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors.join(' ')).toMatch(/Cette catégorie existe déjà/);
		expect(db.updates).toEqual([]);
	});
});

describe('PUT partiel : hypothèses et absence', () => {
	it('{options: hypothèse sur `a` tirée} sans statut → 400, rien écrit', async () => {
		const db = fakeDb();
		const response = await callPut(db, { options: { answerAssumptions: { a: 'positive' } } });

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.errors.join(' ')).toMatch(/« a » est une variable tirée/);
		expect(db.updates).toEqual([]);
	});

	it('modèle absent → 404, rien écrit', async () => {
		const db = fakeDb();
		db.question_templates = [];
		expect(await statusOf(callPut(db, { title: 'Le double' }))).toBe(404);
		expect(db.updates).toEqual([]);
	});

	it('corps vide → 400, rien écrit', async () => {
		const db = fakeDb();
		expect(await statusOf(callPut(db, {}))).toBe(400);
		expect(db.updates).toEqual([]);
	});
});

describe("PUT complet (éditeur) : objet d'écriture inchangé", () => {
	it('toutes les clés présentes → même objet que l’ancienne route', async () => {
		const db = fakeDb();
		const payload = {
			title: FIXTURE.title,
			description: FIXTURE.description,
			shared: FIXTURE.shared,
			defaultDisplayOptions: null,
			variations: FIXTURE.variations,
			exerciseInstruction: null,
			options: null,
			grades: FIXTURE.grades,
			theme: FIXTURE.theme,
			domain: FIXTURE.domain,
			subdomain: FIXTURE.subdomain,
			level: FIXTURE.level,
			status: 'draft',
			delay: FIXTURE.delay,
			testSpecs: FIXTURE.testSpecs
		};
		const response = await callPut(db, payload);

		expect(response.status).toBe(200);
		// Objet qu'écrivait la route avant le correctif, expression par expression
		expect(db.updates).toEqual([
			{
				type: 'fill_in_blanks',
				title: FIXTURE.title,
				description: FIXTURE.description,
				shared: FIXTURE.shared,
				default_display_options: null,
				variations: FIXTURE.variations,
				exercise_instruction: null,
				options: null,
				grades: FIXTURE.grades,
				theme: FIXTURE.theme,
				domain: FIXTURE.domain,
				subdomain: FIXTURE.subdomain,
				level: FIXTURE.level,
				status: 'draft',
				delay: FIXTURE.delay,
				test_specs: FIXTURE.testSpecs
			}
		]);
		expect(db.question_templates[0].id).toBe(ID);
	});
});
