/**
 * Loi uniforme discrète `X ~ U(a ; b)` et loi de Bernoulli `B(1 ; p)` dans le
 * bloc ```loi (maths complémentaires, manche 13, PR a).
 *
 * Spécification validée par David le 2026-10-04. Valeurs de référence :
 * U(1 ; 6) : E 3,5, V 35/12 ≈ 2,917, σ 1,708 ; U(0 ; 9) : E 4,5, V 8,25 ;
 * B(1 ; 0,3) : V 0,21, σ 0,458.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { uniformMoments } from '$lib/statistics/uniform';
import { Fraction } from '$lib/statistics/fraction';

// =============================================================================
// Helpers
// =============================================================================

const U = 'X ~ U(1 ; 6)';

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

// =============================================================================
// Module statistique
// =============================================================================

describe('uniform — moments exacts', () => {
	it('E = (a + b)/2, V = (N² − 1)/12', () => {
		const dice = uniformMoments(1, 6);
		expect(dice.expectation.equals(new Fraction(7n, 2n))).toBe(true);
		expect(dice.variance.equals(new Fraction(35n, 12n))).toBe(true);
		expect(dice.deviation).toBeCloseTo(1.708, 3);
		expect(uniformMoments(0, 9).variance.equals(new Fraction(33n, 4n))).toBe(true);
	});
});

// =============================================================================
// Bloc
// =============================================================================

describe('X ~ U(a ; b) — le tableau de la loi', () => {
	it('les valeurs a à b, la même probabilité', () => {
		const scene = lawOf(U);
		expect(scene.values).toEqual(['1', '2', '3', '4', '5', '6']);
		expect(scene.probabilities.map((p) => p.text)).toEqual(Array(6).fill('0,167'));
		expect(lawOf('X ~ U(0 ; 9)').probabilities[0].text).toBe('0,1');
	});

	it('bornes négatives : vrai signe moins ; « suit » ; notation anglaise U(1, 6)', () => {
		expect(lawOf('X ~ U(-2 ; 2)').values).toEqual(['−2', '−1', '0', '1', '2']);
		expect(lawOf('D suit U(1 ; 6)').variable).toBe('D');
		expect(lawOf('X ~ U(1, 6)').values).toHaveLength(6);
	});

	it('le titre dit la loi', () => {
		expect(lawOf(U).accessibleTitle).toBe('Loi de X : loi uniforme sur {1, …, 6}');
		expect(lawOf(U, 'en').accessibleTitle).toBe(
			'Distribution of X: uniform distribution on {1, …, 6}'
		);
	});

	it('E par défaut ; V et σ sur demande', () => {
		expect(lawOf(U).indicators).toEqual(['E(X) = 7/2 = 3,5']);
		expect(lawOf(`${U}\nindicateurs: variance ; écart type`).indicators).toEqual([
			'V(X) = 35/12 ≈ 2,92',
			'σ(X) ≈ 1,71'
		]);
		expect(lawOf('X ~ U(0 ; 9)\nindicateurs: espérance ; variance').indicators).toEqual([
			'E(X) = 9/2 = 4,5',
			'V(X) = 33/4 = 8,25'
		]);
	});

	it('`probabilités:` et `masquer:`', () => {
		const scene = lawOf(`${U}\nmasquer: 6\nprobabilités: P(X ⩾ 5) ; P(2 < X ⩽ 4)`);
		expect(scene.probabilities[5].hidden).toBe(true);
		expect(scene.indicators.slice(1)).toEqual(['P(X ⩾ 5) ≈ 0,333', 'P(2 < X ⩽ 4) ≈ 0,333']);
	});

	it('`diagramme: oui` : un bâton par valeur', () => {
		expect(lawOf(`${U}\ndiagramme: oui`).chart?.bars).toHaveLength(6);
	});

	it('au-delà de 30 valeurs : pas de tableau, un avertissement ; 1 000 valeurs au plus', () => {
		const node = nodeOf('X ~ U(1 ; 100)\nprobabilités: P(X ⩽ 25)');
		expect(node.warnings[0].message).toMatch(/100 valeurs : tableau non affiché \(au plus 30\)/);
		const scene = lawOf('X ~ U(1 ; 100)\nprobabilités: P(X ⩽ 25)');
		expect(scene.tableHidden).toBe(true);
		expect(scene.indicators).toEqual(['E(X) = 101/2 = 50,5', 'P(X ⩽ 25) = 0,25']);
		expect(lawOf('X ~ U(1 ; 1000)').indicators).toHaveLength(1);
	});
});

describe('X ~ U(a ; b) — Typst', () => {
	it('les mêmes cases et le même titre qu’à l’écran', () => {
		const typst = generateStatChartTypst(nodeOf(U)).replace(/\u00a0/g, ' ');
		for (const p of lawOf(U).probabilities) expect(typst).toContain(`[#"${p.text}"]`);
		expect(typst).toContain('Loi de X : loi uniforme sur {1, …, 6}');
	});
});

describe('X ~ U(a ; b) — erreurs situées', () => {
	it('bornes entières, a < b, au plus 1 000 valeurs', () => {
		expect(errorOf('X ~ U(1,5 ; 6)')).toBe('Ligne 1 : U(a ; b) : a et b sont des entiers');
		expect(errorOf('X ~ U(6 ; 1)')).toBe('Ligne 1 : U(a ; b) : les bornes dans l’ordre (a < b)');
		expect(errorOf('X ~ U(3 ; 3)')).toBe('Ligne 1 : U(a ; b) : a et b distincts (a < b)');
		expect(errorOf('X ~ U(1 ; 1001)')).toBe('Ligne 1 : U(a ; b) : au plus 1 000 valeurs');
	});

	it('U([a ; b]) : la loi à densité, pas la loi discrète', () => {
		const scene = lawOf('X ~ U([0 ; 1])');
		expect(scene.accessibleTitle).toBe('Loi de X : loi uniforme sur [0 ; 1]');
		expect(scene.tableHidden).toBe(true);
	});

	it('`intervalle:` réservé à la loi binomiale', () => {
		expect(errorOf(`${U}\nintervalle: 0,95`)).toBe(
			'Ligne 2 : intervalle : option réservée à la loi binomiale'
		);
	});
});

// =============================================================================
// Bernoulli
// =============================================================================

describe('B(1 ; p) — loi de Bernoulli', () => {
	it('le titre le dit ; le reste ne change pas', () => {
		const scene = lawOf('X ~ B(1 ; 0,3)\nindicateurs: variance ; écart type');
		expect(scene.accessibleTitle).toBe('Loi de X : B(1 ; 0,3) (loi de Bernoulli)');
		expect(lawOf('X ~ B(1 ; 0,3)', 'en').accessibleTitle).toBe(
			'Distribution of X: B(1, 0.3) (Bernoulli distribution)'
		);
		expect(scene.indicators).toEqual(['V(X) = 0,21', 'σ(X) ≈ 0,46']);
		expect(lawOf('X ~ B(2 ; 0,3)').accessibleTitle).toBe('Loi de X : B(2 ; 0,3)');
	});
});

// =============================================================================
// Q158 — borne hors des valeurs de U(a ; b)
// =============================================================================

describe('X ~ U(a ; b) — Q158 : un événement hors de [a ; b] avertit', () => {
	const warningsOf = (queries: string) =>
		nodeOf(`${U}\nprobabilités: ${queries}`).warnings.map((w) => w.message);

	it('P(X = 7), P(X ⩽ 0), P(X > 6) : avertissement, la probabilité reste calculée', () => {
		expect(warningsOf('P(X = 7)')).toEqual([
			'Ligne 2 : probabilités : « P(X = 7) » : X prend ses valeurs de 1 à 6'
		]);
		expect(warningsOf('P(X ⩽ 0)')).toHaveLength(1);
		expect(warningsOf('P(X > 6)')).toHaveLength(1);
		expect(warningsOf('P(7 ⩽ X ⩽ 9)')).toHaveLength(1);
		expect(lawOf(`${U}\nprobabilités: P(X = 7)`).indicators[1]).toBe('P(X = 7) = 0');
	});

	it('borne dedans, intervalle qui chevauche, intervalle vide entre deux valeurs : rien', () => {
		expect(warningsOf('P(X = 3) ; P(X ⩾ 0) ; P(5 ⩽ X ⩽ 9) ; P(X = 2,5) ; P(2 < X < 3)')).toEqual(
			[]
		);
	});
});

// =============================================================================
// Q159 — `indicateurs: aucun`
// =============================================================================

describe('Q159 — `indicateurs: aucun`', () => {
	it('G et U : cache l’espérance par défaut ; B : aucune ligne', () => {
		expect(lawOf('X ~ G(0,2)\nindicateurs: aucun').indicators).toEqual([]);
		expect(lawOf(`${U}\nindicateurs: aucun`).indicators).toEqual([]);
		expect(lawOf('X ~ B(10 ; 0,3)\nindicateurs: aucun').indicators).toEqual([]);
	});

	it('les probabilités demandées restent', () => {
		expect(lawOf(`${U}\nindicateurs: aucun\nprobabilités: P(X ⩽ 3)`).indicators).toEqual([
			'P(X ⩽ 3) = 0,5'
		]);
	});

	it('une loi écrite à la main : accepté, rien affiché', () => {
		expect(lawOf('X = 0 ; 1\nP = 1/2 ; 1/2\nindicateurs: aucun').indicators).toEqual([]);
	});

	it('Typst : pas d’espérance non plus', () => {
		const typst = generateStatChartTypst(nodeOf(`${U}\nindicateurs: aucun`));
		expect(typst).toContain('#table(');
		expect(typst).not.toContain('E(X)');
		expect(generateStatChartTypst(nodeOf(U))).toContain('E(X)');
	});

	it('« aucun » s’écrit seul', () => {
		expect(errorOf(`${U}\nindicateurs: aucun ; variance`)).toBe(
			'Ligne 2 : indicateurs : « aucun » s’écrit seul'
		);
	});
});
