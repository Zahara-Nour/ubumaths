import { describe, it, expect } from 'vitest';
import {
	rate,
	formatValue,
	poorRoutes,
	renderReport,
	MIN_SAMPLE,
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
		values: { lcp_ms: lcp }
	});

	it('au rouge ET échantillon suffisant', () => {
		const rows = [row('/lente', MIN_SAMPLE, 5000), row('/rapide', 50, 1000)];
		expect(poorRoutes(rows).map((r) => r.route)).toEqual(['/lente']);
	});

	it('un p75 au rouge sur trop peu de visites ne déclenche rien', () => {
		expect(poorRoutes([row('/rare', MIN_SAMPLE - 1, 10_000)])).toEqual([]);
	});
});

describe('renderReport', () => {
	it('tableau global, alerte et page peu mesurée signalée', () => {
		const report = renderReport({
			days: 28,
			total: 153,
			global: { lcp_ms: 3820, inp_ms: 96 },
			routes: [
				{ route: '/(public)', count: 39, values: { fcp_ms: 3384 } },
				{ route: '/(public)/grapheur', count: 7, values: { cls: 0.456 } }
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
