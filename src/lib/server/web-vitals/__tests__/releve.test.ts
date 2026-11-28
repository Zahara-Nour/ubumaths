/**
 * Relevé des mesures de performance : calcul du 75ᵉ centile par page, jeton, lecture
 * de la table par pages.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Row {
	id: string;
	route: string;
	metric: string;
	value: number;
}

/** Lignes que la « base » contient, rendues par pages de `limit` dans l'ordre des `id` */
let tableRows: Row[] = [];
let failure: { code?: string; message: string } | null = null;
const calls: {
	table: string;
	columns: string;
	since: string;
	until: string;
	after: string | null;
}[] = [];

function query(table: string) {
	const call = { table, columns: '', since: '', until: '', after: null as string | null };
	const builder = {
		select(columns: string) {
			call.columns = columns;
			return builder;
		},
		gte(_column: string, since: string) {
			call.since = since;
			return builder;
		},
		lt(_column: string, until: string) {
			call.until = until;
			return builder;
		},
		gt(_column: string, after: string) {
			call.after = after;
			return builder;
		},
		order() {
			return builder;
		},
		// Dernier maillon de la requête : c'est lui qui rend la page
		limit(max: number): Promise<{ data: Row[] | null; error: typeof failure }> {
			calls.push(call);
			if (failure) return Promise.resolve({ data: null, error: failure });
			// `tableRows` est déjà rangé par identifiant
			const after = call.after;
			const start = after === null ? 0 : tableRows.findIndex((row) => row.id > after);
			const rest = start === -1 ? [] : tableRows.slice(start);
			return Promise.resolve({ data: rest.slice(0, max), error: null });
		}
	};
	return builder;
}

vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({ from: query })
}));

import {
	isReleveToken,
	MAX_RELEVE_ROWS,
	MIN_P75_COUNT,
	percentile75,
	readSamples,
	RELEVE_PAGE_SIZE,
	releveQuerySchema,
	summarize
} from '../releve.ts';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

beforeEach(() => {
	tableRows = [];
	failure = null;
	calls.length = 0;
});

describe('percentile75', () => {
	it('une seule mesure : elle-même', () => {
		expect(percentile75([1200])).toBe(1200);
	});

	it('interpole entre deux mesures, comme percentile_cont de Postgres', () => {
		expect(percentile75([100, 200])).toBe(175);
		expect(percentile75([1, 2, 3, 4, 5])).toBe(4);
	});

	it('ne dépend pas de l’ordre reçu et ne modifie pas le tableau', () => {
		const values = [500, 100, 400, 200, 300];
		expect(percentile75(values)).toBe(400);
		expect(values).toEqual([500, 100, 400, 200, 300]);
	});

	it('aucune mesure : pas de centile', () => {
		expect(percentile75([])).toBeUndefined();
	});
});

describe('summarize', () => {
	const lcp = (route: string, values: number[]) =>
		values.map((value) => ({ route, metric: 'LCP', value }));
	const rows = [
		...lcp('/(public)', [1000, 2000, 3000, 4000, 5000]),
		{ route: '/(public)', metric: 'CLS', value: 0.1234 },
		...lcp('/(public)/automaths', [5000.4])
	];

	it('p75 et nombre de mesures par indicateur, pour tout le site et par page', () => {
		const releve = summarize(rows, 28, false);

		expect(releve.days).toBe(28);
		expect(releve.total).toBe(7);
		expect(releve.truncated).toBe(false);
		// 6 LCP : 1000, 2000, 3000, 4000, 5000, 5000.4 → rang 3,75 → 4750
		expect(releve.global.LCP).toEqual({ count: 6, p75: 4750 });
		expect(releve.global.INP).toBeUndefined();
		expect(releve.routes[0]).toEqual({
			route: '/(public)',
			metrics: { LCP: { count: 5, p75: 4000 }, CLS: { count: 1 } }
		});
	});

	it('CLS arrondi au millième', () => {
		const releve = summarize(
			Array.from({ length: 5 }, () => ({ route: '/(public)', metric: 'CLS', value: 0.1234 })),
			28,
			false
		);
		expect(releve.global.CLS).toEqual({ count: 5, p75: 0.123 });
	});

	it(`moins de ${MIN_P75_COUNT} mesures : leur nombre seulement, pas de p75`, () => {
		const releve = summarize(lcp('/(public)', [1, 2, 3, 4]), 28, false);

		expect(releve.global.LCP).toEqual({ count: 4 });
		expect(releve.routes[0].metrics.LCP).toEqual({ count: 4 });
	});

	it('pages les plus mesurées d’abord', () => {
		const releve = summarize(
			[
				{ route: '/(public)/a', metric: 'LCP', value: 1 },
				{ route: '/(public)/b', metric: 'LCP', value: 1 },
				{ route: '/(public)/b', metric: 'LCP', value: 1 }
			],
			7,
			false
		);
		expect(releve.routes.map((r) => r.route)).toEqual(['/(public)/b', '/(public)/a']);
	});

	it('ne rend que des résultats calculés : aucune valeur brute, aucune date, aucun identifiant', () => {
		const text = JSON.stringify(summarize(rows, 28, false));
		expect(text).not.toContain('5000.4');
		expect(text).not.toContain('0.1234');
		expect(text).not.toContain('created_at');
		expect(text).not.toContain('"id"');
		expect(text).not.toContain('device_type');
	});

	it('écarte un indicateur inconnu et une page non comptée', () => {
		const releve = summarize(
			[
				{ route: '/(public)', metric: 'FID', value: 10 },
				{ route: '/(protected)/dashboard/admin', metric: 'LCP', value: 10 },
				{ route: '/(public)', metric: 'LCP', value: 10 }
			],
			28,
			false
		);
		expect(releve.total).toBe(1);
		expect(releve.routes).toHaveLength(1);
	});

	it('aucune ligne : relevé vide, pas d’erreur', () => {
		expect(summarize([], 28, false)).toEqual({
			days: 28,
			total: 0,
			truncated: false,
			global: {},
			routes: []
		});
	});
});

describe('isReleveToken', () => {
	const token = 'a'.repeat(40);

	it('accepte « Bearer <jeton> »', () => {
		expect(isReleveToken(`Bearer ${token}`, token)).toBe(true);
		expect(isReleveToken(`bearer ${token}`, token)).toBe(true);
	});

	it.each([
		['en-tête absent', null],
		['jeton faux', `Bearer ${'b'.repeat(40)}`],
		['jeton plus court', `Bearer ${token.slice(0, 39)}`],
		['jeton plus long', `Bearer ${token}a`],
		['sans « Bearer »', token],
		['jeton vide', 'Bearer ']
	])('refuse : %s', (_cas, header) => {
		expect(isReleveToken(header, token)).toBe(false);
	});
});

describe('releveQuerySchema', () => {
	it('28 jours par défaut', () => {
		expect(releveQuerySchema.parse({})).toEqual({ days: 28 });
	});

	it('lit le nombre de jours de l’adresse', () => {
		expect(releveQuerySchema.parse({ days: '7' })).toEqual({ days: 7 });
	});

	it.each(['0', '91', '1.5', 'abc', '-3', ''])('refuse days=%s', (days) => {
		expect(releveQuerySchema.safeParse({ days }).success).toBe(false);
	});
});

describe('readSamples', () => {
	const now = new Date('2026-11-22T10:30:00Z');

	it('lit des jours entiers, sans la journée en cours, sans date, dans l’ordre des identifiants', async () => {
		tableRows = [{ id: id(1), route: '/(public)', metric: 'LCP', value: 1200 }];

		const result = await readSamples(28, now);

		expect(result).toEqual({
			rows: [{ route: '/(public)', metric: 'LCP', value: 1200 }],
			truncated: false
		});
		expect(calls[0]).toMatchObject({
			table: 'web_vital_samples',
			columns: 'id, route, metric, value',
			since: '2026-10-25T00:00:00.000Z',
			until: '2026-11-22T00:00:00.000Z',
			after: null
		});
	});

	it('lit page après page, chaque page reprenant après le dernier identifiant lu', async () => {
		tableRows = Array.from({ length: RELEVE_PAGE_SIZE + 3 }, (_, i) => ({
			id: id(i + 1),
			route: '/(public)',
			metric: 'LCP',
			value: i
		}));

		const result = await readSamples(28, now);

		expect('rows' in result && result.rows).toHaveLength(RELEVE_PAGE_SIZE + 3);
		expect(calls).toHaveLength(2);
		expect(calls[1].after).toBe(id(RELEVE_PAGE_SIZE));
		// Aucune ligne lue deux fois, aucune sautée
		expect('rows' in result && result.rows.map((row) => row.value)).toEqual(
			Array.from({ length: RELEVE_PAGE_SIZE + 3 }, (_, i) => i)
		);
	});

	it('s’arrête au plafond de lignes et le dit', async () => {
		tableRows = Array.from({ length: MAX_RELEVE_ROWS + RELEVE_PAGE_SIZE }, (_, i) => ({
			id: id(i + 1),
			route: '/(public)',
			metric: 'LCP',
			value: 1
		}));

		const result = await readSamples(28, now);

		expect('rows' in result && result.rows).toHaveLength(MAX_RELEVE_ROWS);
		expect('rows' in result && result.truncated).toBe(true);
	});

	it('exactement le plafond de lignes : tout est lu, rien n’est tronqué', async () => {
		tableRows = Array.from({ length: MAX_RELEVE_ROWS }, (_, i) => ({
			id: id(i + 1),
			route: '/(public)',
			metric: 'LCP',
			value: 1
		}));

		const result = await readSamples(28, now);

		expect('rows' in result && result.rows).toHaveLength(MAX_RELEVE_ROWS);
		expect('rows' in result && result.truncated).toBe(false);
	});

	it('erreur de la base : rendue, aucun relevé partiel', async () => {
		failure = { code: '42501', message: 'permission denied' };

		expect(await readSamples(28, now)).toEqual({
			error: { code: '42501', message: 'permission denied' }
		});
	});
});
