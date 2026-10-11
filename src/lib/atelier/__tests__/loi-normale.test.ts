/**
 * `.normale Y μ σ` — la loi normale N(μ ; σ²) dans l'atelier (décision de
 * David, 2026-10-09), sur le modèle de `.exponentielle` : le bloc ```loi
 * `Y ~ N(μ ; σ²)`, sa scène sous la ligne, E, V, σ, la courbe de densité et
 * l'aire de la première probabilité. Φ calculée à 1e-7 au moins (pas de table).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '$lib/ubumark/utils/stat-chart-scene';
import { normalCdf, normalProbability } from '$lib/statistics/density';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const law = (input: string, s: CalcSession = session()) => {
	const result = runInput(s, input);
	if (result.kind !== 'commande') throw new Error(`refus : ${JSON.stringify(result)}`);
	return { result, scene: result.chart as LawScene };
};

const refusal = (input: string) => {
	const result = runInput(session(), input);
	expect(result.kind, JSON.stringify(result)).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
};

const block = (source: string) => parseStatChartContent('loi', source);

describe('Φ, la fonction de répartition de N(0 ; 1)', () => {
	it.each([
		[0, 0.5],
		[1.96, 0.9750021048517796],
		[-1, 0.15865525393145707],
		[3, 0.9986501019683699],
		[5, 0.9999997133484282],
		[0.5, 1 - 0.30853753872598694],
		[-2.5, 1 - 0.9937903346742238]
	])('Φ(%s) à 1e-12 près', (z, expected) => {
		expect(Math.abs(normalCdf(z) - expected)).toBeLessThan(1e-12);
	});

	it('la queue garde sa précision RELATIVE : Φ(−6), Φ(−8)', () => {
		expect(normalCdf(-6) / 9.865876450377014e-10).toBeCloseTo(1, 9);
		expect(normalCdf(-8) / 6.22096057427182e-16).toBeCloseTo(1, 9);
	});

	it('P(low ⩽ X ⩽ high) pour N(μ ; σ²), bornes absentes = infinies', () => {
		expect(normalProbability(0, 1, -1.96, 1.96)).toBeCloseTo(0.9500042097035593, 12);
		expect(normalProbability(100, 15, 130, null)).toBeCloseTo(0.02275013194817921, 12);
		expect(normalProbability(0, 1, null, null)).toBe(1);
		expect(normalProbability(0, 1, 2, 1)).toBe(0);
	});
});

describe('le bloc ```loi : Y ~ N(μ ; σ²)', () => {
	it('titre, E, V, σ, probabilités', () => {
		const node = block(
			'Y ~ N(0 ; 1)\nindicateurs: espérance ; variance ; écart type\nprobabilités: P(Y ⩽ 1,96) ; P(-1,96 ⩽ Y ⩽ 1,96) ; P(Y = 1)'
		);
		expect(node.errors).toEqual([]);
		const scene = buildStatChartScene(node.spec!, { locale: 'fr' }) as LawScene;
		expect(scene.accessibleTitle).toBe('Loi de Y : N(0 ; 1)');
		expect(scene.indicators).toEqual([
			'E(Y) = 0',
			'V(Y) = 1',
			'σ(Y) = 1',
			'P(Y ⩽ 1,96) ≈ 0,975',
			'P(−1,96 ⩽ Y ⩽ 1,96) ≈ 0,950',
			'P(Y = 1) = 0 (loi à densité : P(Y = x) = 0)'
		]);
	});

	it('la courbe en cloche et l’aire de la première probabilité', () => {
		const node = block('T ~ N(100 ; 225)\ndiagramme: oui\nprobabilités: P(T > 130)');
		const scene = buildStatChartScene(node.spec!, { locale: 'fr' }) as LawScene;
		const chart = scene.densityChart!;
		expect(chart.xMin).toBeLessThanOrEqual(40);
		expect(chart.xMax).toBeGreaterThanOrEqual(160);
		const top = Math.max(...chart.points.map((p) => p.y));
		expect(top).toBeCloseTo(1 / (15 * Math.sqrt(2 * Math.PI)), 4);
		expect(chart.area).not.toBeNull();
		expect(Math.min(...chart.area!.map((p) => p.x))).toBeCloseTo(130, 6);
	});

	it('σ² nul ou négatif : refusé avec la ligne', () => {
		expect(block('Y ~ N(0 ; 0)').errors[0]?.message).toBe(
			'Ligne 1 : N(μ ; σ²) : σ² est un nombre strictement positif'
		);
		expect(block('Y ~ N(0 ; -1)').errors[0]?.message).toBe(
			'Ligne 1 : N(μ ; σ²) : σ² est un nombre strictement positif'
		);
	});

	it('la loi normale se simule comme les autres lois (D7, 2026-10-11)', () => {
		const node = parseStatChartContent('simulation', 'Y ~ N(0 ; 1)\ntirages: 100');
		expect(node.errors).toEqual([]);
		expect(node.spec).not.toBeNull();
	});
});

describe('.normale Y μ σ', () => {
	it('Y suit N(0 ; 1) : E, V, σ, courbe', () => {
		const { result, scene } = law('.normale Y 0 1');
		expect(result.output).toBe('Y suit N(0 ; 1)');
		expect(scene.indicators).toEqual(['E(Y) = 0', 'V(Y) = 1', 'σ(Y) = 1']);
		expect(scene.densityChart).toBeDefined();
	});

	it('σ est donné, σ² est calculé : .normale T 100 15 → N(100 ; 225)', () => {
		expect(law('.normale T 100 15').result.output).toBe('T suit N(100 ; 225)');
		expect(law('.normale X 2 0,5').result.output).toBe('X suit N(2 ; 0,25)');
		expect(law('.normale X -3 1/3').result.output).toBe('X suit N(−3 ; 1/9)');
	});

	it('les options P(…) de la ligne, aire de la première', () => {
		const { scene } = law('.normale Y 0 1 P(Y ⩽ 1,96) ; P(-1,96 ⩽ Y ⩽ 1,96)');
		expect(scene.indicators).toContain('P(Y ⩽ 1,96) ≈ 0,975');
		expect(scene.indicators).toContain('P(−1,96 ⩽ Y ⩽ 1,96) ≈ 0,950');
		expect(scene.densityChart?.area).not.toBeNull();
	});

	it('loi retenue : P(Y ⩽ 1,96), P(−1,96 ⩽ Y ⩽ 1,96), P(T > 130), P(Y = 1)', () => {
		const s = session();
		law('.normale Y 0 1', s);
		law('.normale T 100 15', s);
		const out = (input: string) => {
			const result = runInput(s, input);
			return result.kind === 'commande' ? result.output : JSON.stringify(result);
		};
		expect(out('P(Y ⩽ 1,96)')).toBe('P(Y ⩽ 1,96) ≈ 0,975');
		expect(out('P(−1,96 ⩽ Y ⩽ 1,96)')).toBe('P(−1,96 ⩽ Y ⩽ 1,96) ≈ 0,950');
		expect(out('P(-1{,}96\\leqslant Y\\leqslant1{,}96)')).toBe('P(−1,96 ⩽ Y ⩽ 1,96) ≈ 0,950');
		expect(out('P(T > 130)')).toBe('P(T > 130) ≈ 0,023');
		expect(out('P(Y = 1)')).toBe('P(Y = 1) = 0 (loi à densité : P(Y = x) = 0)');
	});

	it('la conditionnelle P(T > 130 | T > 100)', () => {
		const { scene } = law('.normale T 100 15 P(T > 130 | T > 100)');
		expect(scene.indicators).toContain('P(T > 130 | T > 100) ≈ 0,046');
	});

	it('erreurs', () => {
		const usage = 'Écris la commande ainsi : .normale Y 0 1';
		expect(refusal('.normale')).toBe(usage);
		expect(refusal('.normale Y 0')).toBe(usage);
		expect(refusal('.normale y 0 1')).toBe('La variable s’écrit en majuscule : .normale Y 0 1');
		expect(refusal('.normale Y 0 0')).toBe('σ est un nombre strictement positif');
		expect(refusal('.normale Y 0 -1')).toBe('σ est un nombre strictement positif');
		expect(refusal('.normale Y 0 1 jusqu’à 3')).toBe('« jusqu’à 3 » : écrire P(Y ⩽ 1,96)');
	});

	it('au catalogue, avec un exemple jouable et un décor vide', () => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === 'normale');
		expect(entry).toBeDefined();
		expect(entry!.exampleSetup).toEqual({});
		const played = runInput(session(), entry!.example!);
		expect(played.kind === 'commande' && played.chart !== undefined).toBe(true);
	});
});
