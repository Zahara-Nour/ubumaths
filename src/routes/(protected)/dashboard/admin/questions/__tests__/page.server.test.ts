/**
 * Page admin des modèles — chargement serveur
 * ===========================================
 *
 * Une seule barre de filtres (haut de page) pour les deux onglets : les
 * brouillons sont filtrés comme les publiés, et « Tout cocher (filtrés) » des
 * publiés porte sur TOUS les filtrés, pas seulement la page de 50 affichée.
 *
 * La base est simulée en mémoire ; le faux constructeur plafonne chaque requête
 * à 1000 lignes, comme PostgREST.
 */
import { describe, it, expect } from 'vitest';
import { load } from '../+page.server';

// ============================================================================
// TYPES
// ============================================================================

type Row = Record<string, unknown>;
type LoadEvent = Parameters<typeof load>[0];
type LoadResult = Exclude<Awaited<ReturnType<typeof load>>, void>;

// ============================================================================
// CONSTANTS
// ============================================================================

const USER_ID = '11111111-1111-4111-8111-111111111111';
const POSTGREST_MAX_ROWS = 1000;

// ============================================================================
// HELPERS
// ============================================================================

function row(index: number, status: string, theme: string, overrides: Row = {}): Row {
	return {
		id: `${status}-${theme}-${String(index).padStart(5, '0')}`,
		status,
		theme,
		domain: 'Additionner',
		subdomain: null,
		level: 1,
		type: 'fill_in_blanks',
		grades: ['CE1'],
		created_at: '2026-09-28T09:14:03.52+00:00',
		updated_at: '2026-09-28T09:14:03.52+00:00',
		...overrides
	};
}

function rows(count: number, status: string, theme: string, overrides: Row = {}): Row[] {
	return Array.from({ length: count }, (_, index) => row(index, status, theme, overrides));
}

/** Constructeur de requête minimal, à la manière de PostgREST (1000 lignes max) */
function fakeQuery(table: Row[]) {
	const filters: Array<(candidate: Row) => boolean> = [];
	let range: [number, number] = [0, POSTGREST_MAX_ROWS - 1];
	let withCount = false;

	function execute() {
		const matching = table.filter((candidate) => filters.every((keep) => keep(candidate)));
		const to = Math.min(range[1], range[0] + POSTGREST_MAX_ROWS - 1);
		return {
			data: matching.slice(range[0], to + 1).map((candidate) => ({ ...candidate })),
			error: null,
			count: withCount ? matching.length : null
		};
	}

	const builder = {
		select: (_columns: string, options?: { count?: string }) => {
			withCount = options?.count === 'exact';
			return builder;
		},
		eq: (column: string, value: unknown) => {
			filters.push((candidate) => candidate[column] === value);
			return builder;
		},
		overlaps: (column: string, values: unknown[]) => {
			filters.push((candidate) =>
				(candidate[column] as unknown[]).some((value) => values.includes(value))
			);
			return builder;
		},
		gte: (column: string, value: number) => {
			filters.push((candidate) => (candidate[column] as number) >= value);
			return builder;
		},
		lte: (column: string, value: number) => {
			filters.push((candidate) => (candidate[column] as number) <= value);
			return builder;
		},
		order: () => builder,
		range: (from: number, to: number) => {
			range = [from, to];
			return builder;
		},
		// Voulu : un constructeur PostgREST est « thenable », c'est `await` qui l'exécute
		// oxlint-disable-next-line unicorn/no-thenable
		then: (resolveFn: (value: unknown) => unknown, rejectFn?: (reason: unknown) => unknown) =>
			Promise.resolve(execute()).then(resolveFn, rejectFn)
	};
	return builder;
}

async function loadPage(table: Row[], query = ''): Promise<LoadResult> {
	const event = {
		url: new URL(`http://localhost/dashboard/admin/questions${query}`),
		locals: {
			user: { id: USER_ID },
			profile: { role: 'admin' },
			supabase: { from: () => fakeQuery(table) }
		}
	} as unknown as LoadEvent;
	return (await load(event)) as LoadResult;
}

// ============================================================================
// TESTS
// ============================================================================

describe('page admin des modèles — filtres communs aux deux onglets', () => {
	it('filtre les brouillons par thème, comme les publiés', async () => {
		const table = [...rows(3, 'draft', 'Entiers'), ...rows(4, 'draft', 'Fractions')];

		const result = await loadPage(table, '?theme=Entiers');

		expect(result.drafts.map((draft) => draft.theme)).toEqual(['Entiers', 'Entiers', 'Entiers']);
	});

	it('filtre les brouillons par niveau scolaire (chevauchement)', async () => {
		const table = [
			...rows(2, 'draft', 'Entiers', { grades: ['CP', 'CE1'] }),
			...rows(5, 'draft', 'Décimaux', { grades: ['6e'] })
		];

		const result = await loadPage(table, '?grades=CE1,CM2');

		expect(result.drafts).toHaveLength(2);
	});

	it('sans filtre, rend tous les brouillons', async () => {
		const table = [...rows(3, 'draft', 'Entiers'), ...rows(4, 'draft', 'Fractions')];

		const result = await loadPage(table);

		expect(result.drafts).toHaveLength(7);
	});

	it('rend les identifiants de TOUS les publiés filtrés, au-delà de la page de 50', async () => {
		const table = [...rows(228, 'published', 'Entiers'), ...rows(10, 'published', 'Fractions')];

		const result = await loadPage(table, '?theme=Entiers');

		expect(result.templates).toHaveLength(50);
		expect(result.total).toBe(228);
		expect(result.publishedIds).toHaveLength(228);
		expect(new Set(result.publishedIds).size).toBe(228);
	});

	it('pagine les identifiants au-delà du plafond de 1000 lignes de PostgREST', async () => {
		const table = rows(2300, 'published', 'Entiers');

		const result = await loadPage(table);

		expect(result.publishedIds).toHaveLength(2300);
		expect(new Set(result.publishedIds).size).toBe(2300);
	});

	it("n'inclut aucun brouillon dans les identifiants publiés", async () => {
		const table = [...rows(5, 'published', 'Entiers'), ...rows(7, 'draft', 'Entiers')];

		const result = await loadPage(table);

		expect(result.publishedIds).toHaveLength(5);
		expect(result.drafts).toHaveLength(7);
	});
});
