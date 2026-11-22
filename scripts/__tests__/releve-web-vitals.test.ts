import { describe, it, expect } from 'vitest';
import {
	rate,
	formatValue,
	poorRoutes,
	renderReport,
	MIN_SAMPLE,
	releveSchema,
	toReportInput,
	type RouteRow
} from '../releve-web-vitals';

describe('rate — seuils de Google au 75ᵉ centile', () => {
	it('bornes incluses côté « bon » et côté « à améliorer »', () => {
		expect(rate('lcp_ms', 2500)).toBe('good');
		expect(rate('lcp_ms', 2501)).toBe('needs-improvement');
		expect(rate('lcp_ms', 4000)).toBe('needs-improvement');
		expect(rate('lcp_ms', 4001)).toBe('poor');
	});

	it('CLS sans unité', () => {
		expect(rate('cls', 0.046)).toBe('good');
		expect(rate('cls', 0.2)).toBe('needs-improvement');
		expect(rate('cls', 0.456)).toBe('poor');
	});
});

describe('formatValue', () => {
	it('millisecondes sous la seconde, secondes à virgule au-delà, CLS à 3 décimales', () => {
		expect(formatValue('inp_ms', 96)).toBe('96 ms');
		expect(formatValue('lcp_ms', 3820)).toBe('3,8 s');
		expect(formatValue('cls', 0.046)).toBe('0,046');
	});
});

describe('poorRoutes — les pages à regarder', () => {
	const row = (route: string, count: number, lcp: number): RouteRow => ({
		route,
		count,
		values: { lcp_ms: lcp },
		counts: { lcp_ms: count }
	});

	it('au rouge ET échantillon suffisant', () => {
		const rows = [row('/lente', MIN_SAMPLE, 5000), row('/rapide', 50, 1000)];
		expect(poorRoutes(rows).map((r) => r.route)).toEqual(['/lente']);
	});

	it('un p75 au rouge sur trop peu de visites ne déclenche rien', () => {
		expect(poorRoutes([row('/rare', MIN_SAMPLE - 1, 10_000)])).toEqual([]);
	});

	it('page très visitée, mais indicateur au rouge mesuré trois fois : rien', () => {
		const page: RouteRow = {
			route: '/visitee',
			count: 80,
			values: { lcp_ms: 1000, inp_ms: 900 },
			counts: { lcp_ms: 80, inp_ms: 3 }
		};
		expect(poorRoutes([page])).toEqual([]);
	});
});

describe('renderReport', () => {
	it('tableau global, alerte et page peu mesurée signalée', () => {
		const report = renderReport({
			days: 28,
			total: 153,
			global: { lcp_ms: 3820, inp_ms: 96 },
			routes: [
				{ route: '/(public)', count: 39, values: { fcp_ms: 3384 }, counts: { fcp_ms: 39 } },
				{ route: '/(public)/grapheur', count: 7, values: { cls: 0.456 }, counts: { cls: 7 } }
			]
		});
		expect(report).toContain('**153 mesures**');
		expect(report).toContain('| LCP | 🟠 3,8 s |');
		expect(report).toContain('- `/(public)` (39 mesures)');
		expect(report).toContain('| `/(public)/grapheur` | 7 ⚠️ |');
		// Indicateur absent : tiret, pas de « undefined »
		expect(report).toContain('| CLS | — |');
		expect(report).not.toContain('undefined');
	});

	it('aucune page au rouge : le dit explicitement', () => {
		const report = renderReport({ days: 28, total: 10, global: {}, routes: [] });
		expect(report).toContain('Aucune page au rouge');
	});
});

describe('renderReport — limites', () => {
	it('ne montre que les 20 pages les plus mesurées', () => {
		const routes: RouteRow[] = Array.from({ length: 25 }, (_, i) => ({
			route: `/page-${i}`,
			count: 100 - i,
			values: { lcp_ms: 1000 },
			counts: { lcp_ms: 100 - i }
		}));
		const report = renderReport({ days: 28, total: 2000, global: {}, routes });
		expect(report).toContain('| `/page-19` |');
		expect(report).not.toContain('| `/page-20` |');
	});

	it('lecture arrêtée au plafond : le relevé dit qu’il porte sur un échantillon', () => {
		const report = renderReport({
			days: 28,
			total: 100_000,
			global: {},
			routes: [],
			truncated: true
		});
		expect(report).toContain('échantillon');
	});
});

describe('toReportInput — réponse de GET /api/web-vitals/releve', () => {
	const releve = {
		days: 28,
		total: 133,
		truncated: false,
		global: { LCP: { p75: 2100, count: 60 }, CLS: { p75: 0.02, count: 40 } },
		routes: [
			{ route: '/(public)/grapheur', metrics: { CLS: { p75: 0.3, count: 12 } } },
			{
				route: '/(public)',
				metrics: { LCP: { p75: 4200, count: 50 }, INP: { p75: 120, count: 9 } }
			}
		]
	};

	it('p75 et nombre de mesures par indicateur ; pages les plus mesurées d’abord', () => {
		const input = toReportInput(releveSchema.parse(releve));

		expect(input.global).toEqual({ lcp_ms: 2100, cls: 0.02 });
		expect(input.routes).toEqual([
			{
				route: '/(public)',
				count: 50,
				values: { lcp_ms: 4200, inp_ms: 120 },
				counts: { lcp_ms: 50, inp_ms: 9 }
			},
			{ route: '/(public)/grapheur', count: 12, values: { cls: 0.3 }, counts: { cls: 12 } }
		]);
		expect(poorRoutes(input.routes).map((r) => r.route)).toEqual([
			'/(public)',
			'/(public)/grapheur'
		]);
	});

	it('indicateur peu mesuré, rendu sans p75 : compté, case vide', () => {
		const input = toReportInput(
			releveSchema.parse({
				...releve,
				routes: [{ route: '/(public)', metrics: { LCP: { count: 3 } } }]
			})
		);
		expect(input.routes).toEqual([
			{ route: '/(public)', count: 3, values: {}, counts: { lcp_ms: 3 } }
		]);
	});

	it.each([
		['page d’erreur à la place du relevé', { message: 'Jeton invalide' }],
		['p75 qui n’est pas un nombre', { ...releve, global: { LCP: { p75: '2100', count: 60 } } }],
		['pages absentes', { ...releve, routes: undefined }],
		[
			'page dont le nom casserait le tableau',
			{ ...releve, routes: [{ route: '/a` | <b>', metrics: {} }] }
		]
	])('refuse : %s', (_cas, body) => {
		expect(releveSchema.safeParse(body).success).toBe(false);
	});
});
