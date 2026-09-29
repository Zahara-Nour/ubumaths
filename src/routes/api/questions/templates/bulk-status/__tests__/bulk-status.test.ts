/**
 * POST /api/questions/templates/bulk-status — publication par lot
 * ================================================================
 *
 * Les 640 modèles importés sont en brouillon. Publier = repasser chaque modèle
 * dans `checkTemplate` côté serveur (specs vertes, 50 tirages par variation…) ;
 * un modèle qui échoue reste en brouillon, raison en français. Une collision de
 * catégorie est refusée (pas de décalage automatique du niveau).
 *
 * La base est simulée en mémoire, avec des lignes de la forme réelle : le modèle
 * est la question TinyMath #139 relue (`docs/relecture/entiers/139.json`).
 * La RLS échoue en silence : une mise à jour refusée rend zéro ligne, sans
 * erreur — le faux client sait reproduire ce cas (`blockUpdates`).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { POST } from '../+server';

// ============================================================================
// TYPES
// ============================================================================

type Row = Record<string, unknown>;

interface FakeDb {
	question_templates: Row[];
	profiles: Row[];
	/** Simule une RLS qui refuse l'écriture : 0 ligne rendue, pas d'erreur */
	blockUpdates?: boolean;
}

interface FixtureTemplate {
	title: string;
	description?: string;
	shared?: unknown;
	variations: unknown[];
	grades: string[];
	theme: string;
	domain: string;
	subdomain?: string;
	level: number;
	delay?: number;
	testSpecs?: Array<{ answers: string[]; expected: { status: string } }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ID_A = '22222222-2222-4222-8222-222222222222';
const ID_B = '33333333-3333-4333-8333-333333333333';
const ID_PUBLISHED = '44444444-4444-4444-8444-444444444444';

const FIXTURE = (
	JSON.parse(readFileSync(resolve(process.cwd(), 'docs/relecture/entiers/139.json'), 'utf-8')) as {
		template: FixtureTemplate;
	}
).template;

// ============================================================================
// HELPERS
// ============================================================================

/** Ligne `question_templates` telle que la base la rend (snake_case) */
function templateRow(id: string, overrides: Row = {}): Row {
	return {
		id,
		title: FIXTURE.title,
		description: FIXTURE.description ?? null,
		theme: FIXTURE.theme,
		domain: FIXTURE.domain,
		subdomain: FIXTURE.subdomain ?? null,
		level: FIXTURE.level,
		status: 'draft',
		grades: FIXTURE.grades,
		delay: FIXTURE.delay ?? null,
		type: 'fill_in_blanks',
		precision: null,
		shared: FIXTURE.shared ?? null,
		variations: structuredClone(FIXTURE.variations),
		options: null,
		default_display_options: null,
		test_specs: structuredClone(FIXTURE.testSpecs ?? null),
		multiple_answers: null,
		exercise_instruction: null,
		created_at: null,
		updated_at: null,
		created_by: null,
		...overrides
	};
}

/** Même modèle, mais une spec « correct » attend une réponse fausse → spec rouge */
function redSpecRow(id: string): Row {
	const specs = structuredClone(FIXTURE.testSpecs ?? []);
	specs[0].answers = ['81'];
	return templateRow(id, { test_specs: specs });
}

/** Constructeur de requête minimal, à la manière de PostgREST */
function fakeQuery(db: FakeDb, table: 'question_templates' | 'profiles') {
	const filters: Array<(row: Row) => boolean> = [];
	let patch: Row | null = null;
	let single = false;
	let range: [number, number] | null = null;

	function execute() {
		const matching = db[table].filter((row) => filters.every((keep) => keep(row)));
		let data: Row[];
		if (patch) {
			if (db.blockUpdates) {
				data = [];
			} else {
				for (const row of matching) Object.assign(row, patch);
				data = matching.map((row) => ({ ...row }));
			}
		} else {
			data = matching.map((row) => ({ ...row }));
			if (range) data = data.slice(range[0], range[1] + 1);
		}
		if (single) {
			return data.length === 0
				? { data: null, error: { code: 'PGRST116', message: 'no rows' } }
				: { data: data[0], error: null };
		}
		return { data, error: null };
	}

	const builder = {
		select: () => builder,
		update: (values: Row) => {
			patch = values;
			return builder;
		},
		eq: (column: string, value: unknown) => {
			filters.push((row) => row[column] === value);
			return builder;
		},
		neq: (column: string, value: unknown) => {
			filters.push((row) => row[column] !== value);
			return builder;
		},
		in: (column: string, values: unknown[]) => {
			filters.push((row) => values.includes(row[column]));
			return builder;
		},
		is: (column: string, value: unknown) => {
			filters.push((row) => row[column] === value);
			return builder;
		},
		order: () => builder,
		limit: () => builder,
		range: (from: number, to: number) => {
			range = [from, to];
			return builder;
		},
		single: () => {
			single = true;
			return builder;
		},
		// Voulu : un constructeur PostgREST est « thenable », c'est `await` qui l'exécute
		// oxlint-disable-next-line unicorn/no-thenable
		then: (resolveFn: (value: unknown) => unknown, rejectFn?: (reason: unknown) => unknown) =>
			Promise.resolve(execute()).then(resolveFn, rejectFn)
	};
	return builder;
}

function fakeDb(role: string, templates: Row[], options: { blockUpdates?: boolean } = {}): FakeDb {
	return {
		question_templates: templates,
		profiles: [{ id: USER_ID, role }],
		blockUpdates: options.blockUpdates
	};
}

function fakeLocals(db: FakeDb) {
	return {
		safeGetSession: async () => ({ user: { id: USER_ID } }),
		supabase: {
			from: (table: 'question_templates' | 'profiles') => fakeQuery(db, table)
		}
	};
}

async function callBulk(db: FakeDb, body: unknown) {
	const request = new Request('http://localhost/api/questions/templates/bulk-status', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return POST({ request, locals: fakeLocals(db) } as never);
}

function statusOf(db: FakeDb, id: string): unknown {
	return db.question_templates.find((row) => row.id === id)?.status;
}

// ============================================================================
// TESTS
// ============================================================================

describe('POST /api/questions/templates/bulk-status — publier', () => {
	it('publie un modèle qui passe le contrôle complet', async () => {
		const db = fakeDb('admin', [templateRow(ID_A)]);

		const response = await callBulk(db, { ids: [ID_A], status: 'published' });

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.published).toEqual([{ id: ID_A, title: 'Trouver le double' }]);
		expect(body.refused).toEqual([]);
		expect(statusOf(db, ID_A)).toBe('published');
	});

	it('refuse un modèle dont une spec est rouge, avec la raison, et le laisse en brouillon', async () => {
		const db = fakeDb('admin', [redSpecRow(ID_A), templateRow(ID_B, { level: 5 })]);

		const response = await callBulk(db, { ids: [ID_A, ID_B], status: 'published' });

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.published).toEqual([{ id: ID_B, title: 'Trouver le double' }]);
		expect(body.refused).toHaveLength(1);
		expect(body.refused[0].id).toBe(ID_A);
		expect(body.refused[0].reasons.join(' ')).toMatch(/1 spec\(s\) rouge\(s\) sur 5/);
		expect(statusOf(db, ID_A)).toBe('draft');
		expect(statusOf(db, ID_B)).toBe('published');
	});

	it('refuse une collision de catégorie avec un modèle déjà publié (pas de décalage de niveau)', async () => {
		const db = fakeDb('admin', [
			templateRow(ID_PUBLISHED, { status: 'published', title: 'Double (déjà publié)' }),
			templateRow(ID_A)
		]);

		const response = await callBulk(db, { ids: [ID_A], status: 'published' });

		const body = await response.json();
		expect(body.published).toEqual([]);
		expect(body.refused).toHaveLength(1);
		expect(body.refused[0].reasons.join(' ')).toMatch(/catégorie.*Double \(déjà publié\)/);
		expect(statusOf(db, ID_A)).toBe('draft');
		// Le niveau n'a pas été décalé en douce
		expect(db.question_templates.find((row) => row.id === ID_A)?.level).toBe(4);
	});

	it('refuse les modèles de la sélection qui se disputent la même catégorie', async () => {
		const db = fakeDb('admin', [templateRow(ID_A), templateRow(ID_B, { title: 'Double bis' })]);

		const response = await callBulk(db, { ids: [ID_A, ID_B], status: 'published' });

		const body = await response.json();
		expect(body.published).toEqual([]);
		expect(body.refused.map((entry: { id: string }) => entry.id).sort()).toEqual(
			[ID_A, ID_B].sort()
		);
		expect(body.refused[0].reasons.join(' ')).toMatch(/même catégorie/);
		expect(statusOf(db, ID_A)).toBe('draft');
		expect(statusOf(db, ID_B)).toBe('draft');
	});

	it("traite un sous-domaine vide comme absent, comme l'index unique de la base", async () => {
		const db = fakeDb('admin', [
			templateRow(ID_PUBLISHED, { status: 'published', subdomain: null }),
			templateRow(ID_A, { subdomain: '' })
		]);

		const body = await (await callBulk(db, { ids: [ID_A], status: 'published' })).json();

		expect(body.published).toEqual([]);
		expect(body.refused[0].reasons.join(' ')).toMatch(/catégorie/);
	});

	it("signale un identifiant introuvable au lieu de l'ignorer", async () => {
		const db = fakeDb('admin', []);

		const body = await (await callBulk(db, { ids: [ID_A], status: 'published' })).json();

		expect(body.published).toEqual([]);
		expect(body.refused).toEqual([{ id: ID_A, title: '', reasons: ['modèle introuvable'] }]);
	});

	it("rend un échec, pas un succès, quand la RLS refuse l'écriture en silence (0 ligne)", async () => {
		const db = fakeDb('admin', [templateRow(ID_A)], { blockUpdates: true });

		const response = await callBulk(db, { ids: [ID_A], status: 'published' });

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.published).toEqual([]);
		expect(body.refused).toHaveLength(1);
		expect(body.refused[0].id).toBe(ID_A);
		expect(body.refused[0].reasons.join(' ')).toMatch(/pas été enregistrée/);
	});
});

describe('POST /api/questions/templates/bulk-status — repasser en brouillon', () => {
	it('repasse un modèle publié en brouillon, sans contrôle', async () => {
		// Même une spec rouge ne bloque pas le retour en brouillon
		const db = fakeDb('admin', [{ ...redSpecRow(ID_A), status: 'published' }]);

		const response = await callBulk(db, { ids: [ID_A], status: 'draft' });

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.unpublished).toEqual([{ id: ID_A, title: 'Trouver le double' }]);
		expect(body.refused).toEqual([]);
		expect(statusOf(db, ID_A)).toBe('draft');
	});

	it('rend un échec quand la RLS refuse le retour en brouillon en silence', async () => {
		const db = fakeDb('admin', [templateRow(ID_A, { status: 'published' })], {
			blockUpdates: true
		});

		const body = await (await callBulk(db, { ids: [ID_A], status: 'draft' })).json();

		expect(body.unpublished).toEqual([]);
		expect(body.refused[0].reasons.join(' ')).toMatch(/pas été enregistrée/);
	});
});

describe('POST /api/questions/templates/bulk-status — gardes', () => {
	it('refuse un élève (403)', async () => {
		const db = fakeDb('student', [templateRow(ID_A)]);
		await expect(callBulk(db, { ids: [ID_A], status: 'published' })).rejects.toMatchObject({
			status: 403
		});
		expect(statusOf(db, ID_A)).toBe('draft');
	});

	it('refuse un professeur (403) : publier est réservé à l’admin', async () => {
		const db = fakeDb('teacher', [templateRow(ID_A)]);
		await expect(callBulk(db, { ids: [ID_A], status: 'published' })).rejects.toMatchObject({
			status: 403
		});
		expect(statusOf(db, ID_A)).toBe('draft');
	});

	it('rejette plus de 700 identifiants (400)', async () => {
		const db = fakeDb('admin', []);
		const ids = Array.from(
			{ length: 701 },
			(_, index) => `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`
		);
		await expect(callBulk(db, { ids, status: 'published' })).rejects.toMatchObject({
			status: 400
		});
	});

	it('rejette un identifiant qui n’est pas un UUID (400)', async () => {
		const db = fakeDb('admin', []);
		await expect(callBulk(db, { ids: ['139'], status: 'published' })).rejects.toMatchObject({
			status: 400
		});
	});

	it('rejette une liste vide et un statut inconnu (400)', async () => {
		const db = fakeDb('admin', []);
		await expect(callBulk(db, { ids: [], status: 'published' })).rejects.toMatchObject({
			status: 400
		});
		await expect(callBulk(db, { ids: [ID_A], status: 'archived' })).rejects.toMatchObject({
			status: 400
		});
	});
});
