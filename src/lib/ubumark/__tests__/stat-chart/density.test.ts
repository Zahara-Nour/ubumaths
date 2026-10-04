/**
 * Lois à densité dans le bloc ```loi (maths complémentaires, manche 13, PR b) :
 * `X ~ U([a ; b])` et `X ~ E(λ)`. Pas de tableau : probabilités, indicateurs,
 * fonction de répartition, courbe de densité et aire hachurée.
 *
 * Spécification validée par David le 2026-10-04. Valeurs de référence (Python) :
 * U([0 ; 10]) P(2 ⩽ X ⩽ 5) = 3/10 ; E 5 ; V 25/3 ≈ 8,33 ; σ ≈ 2,89.
 * E(0,5) : P(X ⩽ 2) ≈ 0,632 ; P(X ⩾ 4) ≈ 0,135 ; P(1 ⩽ X ⩽ 3) ≈ 0,383 ;
 * P(X > 5 | X > 2) ≈ 0,223 ; E 2 ; V 4 ; σ 2 ; quantile 99 % ≈ 9,21.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import {
	exponentialMoments,
	exponentialProbability,
	uniformDensityMoments,
	uniformDensityProbability
} from '$lib/statistics/density';
import { Fraction } from '$lib/statistics/fraction';

// =============================================================================
// Helpers
// =============================================================================

const U = 'X ~ U([0 ; 10])';
const E = 'X ~ E(0,5)';

function nodeOf(source: string) {
	return parseStatChartContent('loi', source);
}

function lawOf(source: string, locale: 'fr' | 'en' = 'fr') {
	const node = nodeOf(source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return buildStatChartScene(node.spec, { locale }) as LawScene;
}

function errorOf(source: string) {
	const node = nodeOf(source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

const f = (num: bigint, den = 1n) => new Fraction(num, den);

// =============================================================================
// Module statistique
// =============================================================================

describe('density — calculs', () => {
	it('uniforme : longueur / (b − a), exacte, bornée au support', () => {
		const p = uniformDensityProbability(f(0n), f(10n), f(2n), f(5n));
		expect(p.equals(f(3n, 10n))).toBe(true);
		expect(uniformDensityProbability(f(0n), f(10n), f(-3n), null).equals(Fraction.ONE)).toBe(true);
		expect(uniformDensityProbability(f(0n), f(10n), f(12n), null).equals(Fraction.ZERO)).toBe(true);
		const m = uniformDensityMoments(f(0n), f(10n));
		expect(m.expectation.equals(f(5n))).toBe(true);
		expect(m.variance.equals(f(25n, 3n))).toBe(true);
	});

	it('exponentielle : 1 − e^(−λx), e^(−λx), entre deux bornes', () => {
		expect(exponentialProbability(0.5, null, 2)).toBeCloseTo(0.632, 3);
		expect(exponentialProbability(0.5, 4, null)).toBeCloseTo(0.135, 3);
		expect(exponentialProbability(0.5, 1, 3)).toBeCloseTo(0.383, 3);
		expect(exponentialProbability(0.5, -2, null)).toBe(1);
		const m = exponentialMoments(f(1n, 2n));
		expect(m.expectation.equals(f(2n))).toBe(true);
		expect(m.variance.equals(f(4n))).toBe(true);
	});
});

// =============================================================================
// Loi uniforme à densité
// =============================================================================

describe('X ~ U([a ; b])', () => {
	it('le titre, pas de tableau, E par défaut', () => {
		const scene = lawOf(U);
		expect(scene.accessibleTitle).toBe('Loi de X : loi uniforme sur [0 ; 10]');
		expect(lawOf(U, 'en').accessibleTitle).toBe(
			'Distribution of X: uniform distribution on [0, 10]'
		);
		expect(scene.tableHidden).toBe(true);
		expect(scene.indicators).toEqual(['E(X) = 5']);
	});

	it('V, σ sur demande ; `indicateurs: aucun`', () => {
		expect(lawOf(`${U}\nindicateurs: variance ; écart type`).indicators).toEqual([
			'V(X) = 25/3 ≈ 8,33',
			'σ(X) ≈ 2,89'
		]);
		expect(lawOf(`${U}\nindicateurs: aucun`).indicators).toEqual([]);
	});

	it('probabilités exactes ; < et ⩽ donnent la même valeur ; P(X = x) = 0 avec la mention', () => {
		const scene = lawOf(
			`${U}\nindicateurs: aucun\nprobabilités: P(2 ⩽ X ⩽ 5) ; P(2 < X < 5) ; P(X > 7,5) ; P(X = 3)`
		);
		expect(scene.indicators).toEqual([
			'P(2 ⩽ X ⩽ 5) = 3/10 = 0,3',
			'P(2 < X < 5) = 3/10 = 0,3',
			'P(X > 7,5) = 1/4 = 0,25',
			'P(X = 3) = 0 (loi à densité : P(X = x) = 0)'
		]);
		expect(lawOf('X ~ U([0 ; 3])\nindicateurs: aucun\nprobabilités: P(X ⩽ 1)').indicators).toEqual([
			'P(X ⩽ 1) = 1/3 ≈ 0,333'
		]);
	});

	it('hors du support : 0 et un avertissement (borne écrite)', () => {
		const node = nodeOf(`${U}\nprobabilités: P(X ⩾ 12) ; P(X ⩽ 3)`);
		expect(node.warnings.map((w) => w.message)).toEqual([
			'Ligne 2 : probabilités : « P(X ⩾ 12) » : X prend ses valeurs dans [0 ; 10]'
		]);
		expect(lawOf(`${U}\nprobabilités: P(X ⩾ 12)`).indicators[1]).toBe('P(X ⩾ 12) = 0');
	});

	it('`répartition: oui`', () => {
		expect(lawOf(`${U}\nindicateurs: aucun\nrépartition: oui`).indicators).toEqual([
			'F(x) = x/10 pour x ∈ [0 ; 10] ; 0 avant, 1 après'
		]);
		expect(lawOf('X ~ U([2 ; 5])\nindicateurs: aucun\nrepartition: oui').indicators).toEqual([
			'F(x) = (x − 2)/3 pour x ∈ [2 ; 5] ; 0 avant, 1 après'
		]);
	});

	it('diagramme : le palier 1/(b − a), l’aire de la première probabilité', () => {
		const chart = lawOf(`${U}\ndiagramme: oui\nprobabilités: P(2 ⩽ X ⩽ 5)`).densityChart!;
		expect(chart.kind).toBe('densite');
		expect(chart.xMax).toBeGreaterThan(10);
		expect(chart.yMax).toBeGreaterThanOrEqual(0.1);
		expect(chart.points.some((p) => p.x === 0 && p.y === 0.1)).toBe(true);
		const xs = chart.area!.map((p) => p.x);
		expect([Math.min(...xs), Math.max(...xs)]).toEqual([2, 5]);
		expect(chart.axisTitles.y).toBe('Densité');
	});
});

// =============================================================================
// Loi exponentielle
// =============================================================================

describe('X ~ E(λ)', () => {
	it('le titre ; E par défaut ; V et σ', () => {
		expect(lawOf(E).accessibleTitle).toBe('Loi de X : E(0,5)');
		expect(lawOf(E, 'en').accessibleTitle).toBe('Distribution of X: Exp(0.5)');
		expect(lawOf(E).indicators).toEqual(['E(X) = 2']);
		expect(lawOf(`${E}\nindicateurs: espérance ; variance ; écart type`).indicators).toEqual([
			'E(X) = 2',
			'V(X) = 4',
			'σ(X) = 2'
		]);
	});

	it('la forme exacte puis la valeur approchée', () => {
		const scene = lawOf(
			`${E}\nindicateurs: aucun\nprobabilités: P(X ⩽ 2) ; P(X ⩾ 4) ; P(1 ⩽ X ⩽ 3) ; P(X > 5 | X > 2) ; P(X < 2)`
		);
		expect(scene.indicators).toEqual([
			'P(X ⩽ 2) = 1 − e^(−0,5 × 2) = 1 − e^(−1) ≈ 0,632',
			'P(X ⩾ 4) = e^(−0,5 × 4) = e^(−2) ≈ 0,135',
			'P(1 ⩽ X ⩽ 3) = e^(−0,5 × 1) − e^(−0,5 × 3) = e^(−0,5) − e^(−1,5) ≈ 0,383',
			'P(X > 5 | X > 2) = e^(−0,5 × (5 − 2)) = e^(−1,5) ≈ 0,223',
			'P(X < 2) = 1 − e^(−0,5 × 2) = 1 − e^(−1) ≈ 0,632'
		]);
	});

	it('en anglais : le point décimal', () => {
		expect(lawOf(`${E}\nindicateurs: aucun\nprobabilités: P(X ⩽ 2)`, 'en').indicators).toEqual([
			'P(X ⩽ 2) = 1 − e^(−0.5 × 2) = 1 − e^(−1) ≈ 0.632'
		]);
	});

	it('borne négative : 0 et l’avertissement « à partir de 0 »', () => {
		const node = nodeOf(`${E}\nprobabilités: P(X ⩽ -1)`);
		expect(node.warnings[0].message).toBe(
			'Ligne 2 : probabilités : « P(X ⩽ -1) » : X prend ses valeurs à partir de 0'
		);
		expect(lawOf(`${E}\nprobabilités: P(X ⩽ -1)`).indicators[1]).toBe('P(X ⩽ -1) = 0');
	});

	it('`répartition: oui`', () => {
		expect(lawOf(`${E}\nindicateurs: aucun\nrépartition: oui`).indicators).toEqual([
			'F(x) = 1 − e^(−0,5x) pour x ⩾ 0'
		]);
		expect(lawOf(`${E}\nindicateurs: aucun\nrépartition: oui`, 'en').indicators).toEqual([
			'F(x) = 1 − e^(−0.5x) for x ⩾ 0'
		]);
	});

	it('diagramme : coupé à un joli arrondi de ln(100)/λ, aire hachurée', () => {
		const chart = lawOf(`${E}\ndiagramme: oui\nprobabilités: P(X ⩽ 2)`).densityChart!;
		expect(chart.xMin).toBe(0);
		expect(chart.xMax).toBe(10);
		expect(chart.points.length).toBeGreaterThanOrEqual(50);
		expect(chart.yMax).toBeGreaterThanOrEqual(0.5);
		const xs = chart.area!.map((p) => p.x);
		expect([Math.min(...xs), Math.max(...xs)]).toEqual([0, 2]);
		expect(lawOf(`${E}\ndiagramme: oui`, 'en').densityChart!.axisTitles.y).toBe('Density');
		expect(lawOf(`${E}\ndiagramme: oui`).densityChart!.area).toBeNull();
	});

	it('`aire:` choisit la probabilité ; une conditionnelle hachure {X > a}', () => {
		const chosen = lawOf(
			`${E}\ndiagramme: oui\nprobabilités: P(X ⩽ 2)\naire: P(X ⩾ 4)`
		).densityChart!;
		expect(Math.min(...chosen.area!.map((p) => p.x))).toBe(4);
		expect(Math.max(...chosen.area!.map((p) => p.x))).toBe(10);
		const conditional = lawOf(`${E}\ndiagramme: oui\nprobabilités: P(X > 5 | X > 2)`).densityChart!;
		expect(Math.min(...conditional.area!.map((p) => p.x))).toBe(5);
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('lois à densité — Typst', () => {
	it('le titre, les lignes, la courbe et les hachures', () => {
		const typst = generateStatChartTypst(
			nodeOf(`${E}\ndiagramme: oui\nprobabilités: P(X ⩽ 2)`)
		).replace(/\u00a0/g, ' ');
		expect(typst).toContain('Loi de X : E(0,5)');
		expect(typst).toContain('1 − e^(−1) ≈ 0,632');
		expect(typst).toContain('tiling');
		expect(typst).toContain('Densité');
		expect(typst).not.toContain('#table(');
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('lois à densité — erreurs situées', () => {
	it('U([5 ; 2]), E(0), E(−1)', () => {
		expect(errorOf('X ~ U([5 ; 2])')).toBe(
			'Ligne 1 : U([a ; b]) : les bornes dans l’ordre (a < b)'
		);
		const lambda = 'Ligne 1 : E(λ) : λ est un nombre strictement positif';
		expect(errorOf('X ~ E(0)')).toBe(lambda);
		expect(errorOf('X ~ E(-1)')).toBe(lambda);
	});

	it('options sans objet : intervalle, seuil, masquer, jusqu’à', () => {
		expect(errorOf(`${E}\nintervalle: 0,95`)).toBe(
			'Ligne 2 : intervalle : option réservée à la loi binomiale'
		);
		expect(errorOf(`${U}\nmasquer: 3`)).toBe(
			'Ligne 2 : masquer : pas de tableau pour une loi à densité'
		);
		expect(errorOf(`${E}\njusqu'à: 5`)).toBe(
			"Ligne 2 : jusqu'à : seulement avec une loi géométrique (X ~ G(p))"
		);
	});

	it('`aire:` sans diagramme, ou mal écrite ; `répartition:` sans loi à densité', () => {
		expect(errorOf(`${E}\naire: P(X ⩽ 2)`)).toBe('Ligne 2 : aire : seulement avec diagramme: oui');
		expect(errorOf(`${E}\ndiagramme: oui\naire: X ⩽ 2`)).toBe(
			'Ligne 3 : aire : écrire P(X ⩽ 2), P(1 ⩽ X ⩽ 3) ou P(X > a | X > b)'
		);
		expect(errorOf('X ~ G(0,2)\nrépartition: oui')).toBe(
			'Ligne 2 : répartition : seulement avec une loi à densité (X ~ U([a ; b]) ou E(λ))'
		);
	});
});
