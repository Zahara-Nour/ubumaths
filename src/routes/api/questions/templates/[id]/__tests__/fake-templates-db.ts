/**
 * Base simulée pour PUT /api/questions/templates/[id]
 * ===================================================
 *
 * Constructeur de requête minimal à la manière de PostgREST, en mémoire.
 * Ligne de la forme réelle : question TinyMath #139 relue
 * (`data/relecture/entiers/139.json`), variable tirée `a` dans `shared`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PUT } from '../+server';
import { POST } from '../../+server';

export type Row = Record<string, unknown>;

export interface FakeDb {
	question_templates: Row[];
	profiles: Row[];
	updates: Row[];
	inserts: Row[];
}

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const ID = '22222222-2222-4222-8222-222222222222';

export const FIXTURE = (
	JSON.parse(readFileSync(resolve(process.cwd(), 'data/relecture/entiers/139.json'), 'utf-8')) as {
		template: Row & { variations: unknown[] };
	}
).template;

/** Ligne `question_templates` telle que la base la rend (snake_case) */
export function templateRow(): Row {
	return {
		id: ID,
		title: FIXTURE.title,
		description: FIXTURE.description ?? null,
		theme: FIXTURE.theme,
		domain: FIXTURE.domain,
		subdomain: FIXTURE.subdomain ?? null,
		level: FIXTURE.level,
		status: 'draft',
		grades: FIXTURE.grades,
		delay: null,
		type: 'fill_in_blanks',
		precision: null,
		shared: structuredClone(FIXTURE.shared ?? null),
		variations: structuredClone(FIXTURE.variations),
		options: null,
		default_display_options: null,
		test_specs: structuredClone(FIXTURE.testSpecs ?? null),
		multiple_answers: null,
		exercise_instruction: null,
		created_at: '2026-09-28T09:14:03.52+00:00',
		updated_at: '2026-09-28T09:14:03.52+00:00',
		created_by: USER_ID
	};
}

/** Constructeur de requête minimal, à la manière de PostgREST */
function fakeQuery(db: FakeDb, table: 'question_templates' | 'profiles') {
	const filters: Array<(row: Row) => boolean> = [];
	let patch: Row | null = null;
	let inserted: Row | null = null;
	let single: false | 'single' | 'maybe' = false;

	function execute() {
		if (inserted) {
			const row = {
				id: '44444444-4444-4444-8444-444444444444',
				created_at: '2026-10-10T09:00:00+00:00',
				updated_at: '2026-10-10T09:00:00+00:00',
				...inserted
			};
			db.inserts.push(inserted);
			db[table].push(row);
			return single ? { data: { ...row }, error: null } : { data: [{ ...row }], error: null };
		}
		const matching = db[table].filter((row) => filters.every((keep) => keep(row)));
		if (patch) {
			db.updates.push(patch);
			for (const row of matching) Object.assign(row, patch);
		}
		const data = matching.map((row) => ({ ...row }));
		// Comportement réel : `.maybeSingle()` rend { null, null } sur zéro ligne ;
		// seul `.single()` rend l'erreur PGRST116 (HTTP 406)
		if (single === 'maybe') return { data: data[0] ?? null, error: null };
		if (single) {
			return data.length === 0
				? { data: null, error: { code: 'PGRST116', message: 'no rows' } }
				: { data: data[0], error: null };
		}
		return { data, error: null };
	}

	const builder = {
		select: () => builder,
		insert: (values: Row) => {
			inserted = values;
			return builder;
		},
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
		is: (column: string, value: unknown) => {
			filters.push((row) => row[column] === value);
			return builder;
		},
		order: () => builder,
		limit: () => builder,
		single: () => {
			single = 'single';
			return builder;
		},
		maybeSingle: () => {
			single = 'maybe';
			return builder;
		},
		// Voulu : un constructeur PostgREST est « thenable », c'est `await` qui l'exécute
		// oxlint-disable-next-line unicorn/no-thenable
		then: (resolveFn: (value: unknown) => unknown, rejectFn?: (reason: unknown) => unknown) =>
			Promise.resolve(execute()).then(resolveFn, rejectFn)
	};
	return builder;
}

export function fakeDb(): FakeDb {
	return {
		question_templates: [templateRow()],
		profiles: [{ id: USER_ID, role: 'admin' }],
		updates: [],
		inserts: []
	};
}

export async function callPut(db: FakeDb, body: unknown) {
	const request = new Request(`http://localhost/api/questions/templates/${ID}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const locals = {
		safeGetSession: async () => ({ user: { id: USER_ID } }),
		supabase: { from: (table: 'question_templates' | 'profiles') => fakeQuery(db, table) }
	};
	return PUT({ request, locals, params: { id: ID } } as never);
}

export async function callPost(db: FakeDb, body: unknown) {
	const request = new Request('http://localhost/api/questions/templates', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const locals = {
		safeGetSession: async () => ({ user: { id: USER_ID } }),
		supabase: { from: (table: 'question_templates' | 'profiles') => fakeQuery(db, table) }
	};
	return POST({ request, locals } as never);
}
