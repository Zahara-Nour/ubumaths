/**
 * Loi binomiale, PR (b) : `diagramme:`, `intervalle:`, `seuil:` (Q140) et la
 * simulation de B(n ; p). Spécification validée par David le 2026-10-03.
 *
 * Valeurs de référence (Python, fractions exactes), B(10 ; 0,3) :
 * - intervalle 0,95 : I = [0 ; 6], P(X ∈ I) = 0,9894079216
 *   (P(X < 1) = 0,028 > 0,025 : a reste à 0) ;
 * - plus petit k tel que P(X > k) ⩽ 0,05 : k = 5, P(X > 5) = 0,0473489874 ;
 * - plus petit k tel que P(X ⩽ k) ⩾ 0,9 : k = 5, P(X ⩽ 5) = 0,9526510126 ;
 * - plus grand k tel que P(X ⩽ k) ⩽ 0,1 : k = 0, P(X ⩽ 0) = 0,0282475249.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import {
	buildStatChartScene,
	type LawScene,
	type SimulationScene
} from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';

// =============================================================================
// Helpers
// =============================================================================

const B = 'X ~ B(10 ; 0,3)';

function lawOf(source: string, locale: 'fr' | 'en' = 'fr') {
	const node = parseStatChartContent('loi', source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return buildStatChartScene(node.spec, { locale }) as LawScene;
}

function errorOf(source: string, kind: 'loi' | 'simulation' = 'loi') {
	const node = parseStatChartContent(kind, source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

// =============================================================================
// intervalle:
// =============================================================================

describe('intervalle: — P(X ∈ I) ⩾ 1 − α', () => {
	it('I = [0 ; 6] pour 0,95, puis la règle', () => {
		expect(lawOf(`${B}\nintervalle: 0,95`).indicators).toEqual([
			'I = [0 ; 6] : P(X ∈ I) ≈ 0,989 ⩾ 0,95',
			'a et b choisis pour que P(X < a) ⩽ 0,025 et P(X > b) ⩽ 0,025'
		]);
	});

	it('d’autres niveaux, p = 0, p = 1, n = 1', () => {
		const first = (source: string) => lawOf(source).indicators[0].split(' : ')[0];
		expect(first(`${B}\nintervalle: 0,99`)).toBe('I = [0 ; 7]');
		expect(first(`${B}\nintervalle: 0,5`)).toBe('I = [2 ; 4]');
		expect(first('X ~ B(10 ; 0)\nintervalle: 0,95')).toBe('I = [0 ; 0]');
		expect(first('X ~ B(10 ; 1)\nintervalle: 0,95')).toBe('I = [10 ; 10]');
		expect(first('X ~ B(1 ; 0,5)\nintervalle: 0,95')).toBe('I = [0 ; 1]');
	});

	it('P(X ∈ I) écrit avec au moins les décimales du niveau', () => {
		expect(lawOf(`${B}\narrondi: 2\nintervalle: 0,971`).indicators[0]).toMatch(
			/≈ 0,\d{3} ⩾ 0,971$/
		);
	});

	it('95 % et α = 0,05 : le même intervalle', () => {
		const expected = lawOf(`${B}\nintervalle: 0,95`).indicators;
		expect(lawOf(`${B}\nintervalle: 95 %`).indicators).toEqual(expected);
		expect(lawOf(`${B}\nintervalle: α = 0,05`).indicators).toEqual(expected);
	});

	it('en anglais', () => {
		expect(lawOf(`${B}\nintervalle: 0,95`, 'en').indicators).toEqual([
			'I = [0, 6]: P(X ∈ I) ≈ 0.989 ⩾ 0.95',
			'a and b chosen so that P(X < a) ⩽ 0.025 and P(X > b) ⩽ 0.025'
		]);
	});
});

// =============================================================================
// seuil:
// =============================================================================

describe('seuil: — le plus petit (ou le plus grand) k', () => {
	it('surréservation : plus petit k tel que P(X > k) ⩽ 0,05', () => {
		expect(lawOf(`${B}\nseuil: P(X > k) ⩽ 0,05`).indicators).toEqual([
			'plus petit k tel que P(X > k) ⩽ 0,05 : k = 5 (P(X > 5) ≈ 0,047)'
		]);
	});

	it('une probabilité qui croît avec k : plus petit k pour ⩾, plus grand k pour ⩽', () => {
		expect(lawOf(`${B}\nseuil: P(X ⩽ k) ⩾ 0,9`).indicators).toEqual([
			'plus petit k tel que P(X ⩽ k) ⩾ 0,9 : k = 5 (P(X ⩽ 5) ≈ 0,953)'
		]);
		expect(lawOf(`${B}\nseuil: P(X <= k) <= 0,1`).indicators).toEqual([
			'plus grand k tel que P(X ⩽ k) ⩽ 0,1 : k = 0 (P(X ⩽ 0) ≈ 0,028)'
		]);
	});

	it('les 5 autres combinaisons (valeurs Python)', () => {
		const line = (seuil: string) => lawOf(`${B}\nseuil: ${seuil}`).indicators[0];
		expect(line('P(X ⩾ k) ⩽ 0,05')).toBe(
			'plus petit k tel que P(X ⩾ k) ⩽ 0,05 : k = 6 (P(X ⩾ 6) ≈ 0,047)'
		);
		expect(line('P(X < k) ⩾ 0,9')).toBe(
			'plus petit k tel que P(X < k) ⩾ 0,9 : k = 6 (P(X < 6) ≈ 0,953)'
		);
		expect(line('P(X < k) ⩽ 0,1')).toBe(
			'plus grand k tel que P(X < k) ⩽ 0,1 : k = 1 (P(X < 1) ≈ 0,028)'
		);
		expect(line('P(X > k) ⩾ 0,5')).toBe(
			'plus grand k tel que P(X > k) ⩾ 0,5 : k = 2 (P(X > 2) ≈ 0,617)'
		);
		expect(line('P(X ⩾ k) ⩾ 0,5')).toBe(
			'plus grand k tel que P(X ⩾ k) ⩾ 0,5 : k = 3 (P(X ⩾ 3) ≈ 0,617)'
		);
	});

	it('aucun k ne convient : le dire', () => {
		expect(lawOf(`${B}\nseuil: P(X ⩽ k) ⩽ 0,01`).indicators).toEqual([
			'aucun k de 0 à 10 ne vérifie P(X ⩽ k) ⩽ 0,01'
		]);
	});

	it('en anglais', () => {
		expect(lawOf(`${B}\nseuil: P(X > k) ⩽ 0,05`, 'en').indicators).toEqual([
			'smallest k such that P(X > k) ⩽ 0.05: k = 5 (P(X > 5) ≈ 0.047)'
		]);
	});
});

// =============================================================================
// diagramme:
// =============================================================================

describe('diagramme: — les bâtons de la loi', () => {
	it('un bâton par valeur, hauteur P(X = k), axe « Probabilité »', () => {
		const chart = lawOf(`${B}\ndiagramme: oui`).chart!;
		expect(chart.kind).toBe('barres');
		expect(chart.bars).toHaveLength(11);
		expect(chart.bars[3].value).toBeCloseTo(0.266827932, 9);
		expect(chart.axisTitles.y).toBe('Probabilité');
		// Un axe gradué en décimaux, pas de 0 à 1 (bâtons écrasés, vu sur la fiche)
		expect(chart.yMax).toBeLessThan(0.5);
		expect(chart.ticks.length).toBeGreaterThan(2);
		expect(chart.rotateLabels).toBe(false);
		expect(chart.description).toContain('P(X = 3) ≈ 0,267');
		expect(lawOf(`${B}\ndiagramme: oui`, 'en').chart!.axisTitles.y).toBe('Probability');
	});

	it('avec `intervalle:` : les bâtons de I en couleur, les autres en gris', () => {
		const chart = lawOf(`${B}\ndiagramme: oui\nintervalle: 0,95`).chart!;
		expect(chart.bars.map((b) => (b.highlighted === false ? '.' : 'x')).join('')).toBe(
			'xxxxxxx....'
		);
	});

	it('sans `diagramme:` : pas de figure ; au-delà de 30 valeurs non plus', () => {
		expect(lawOf(B).chart).toBeUndefined();
		expect(lawOf('X ~ B(40 ; 0,5)\ndiagramme: oui').chart).toBeUndefined();
	});

	it('le PDF dessine les mêmes bâtons, les gris en gris', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('loi', `${B}\ndiagramme: oui\nintervalle: 0,95`)
		);
		expect(typst).toContain('cetz.canvas');
		expect(typst.match(/\/\/ barre\n/g)).toHaveLength(11);
		expect(typst.match(/fill: luma\(150\)/g)).toHaveLength(4);
	});
});

// =============================================================================
// Simulation
// =============================================================================

describe('simulation de B(n ; p)', () => {
	it('mode tirages : 0 à n, les probabilités au millième, les effectifs font n', () => {
		const node = parseStatChartContent('simulation', 'X ~ B(10 ; 0,3)\ntirages: 500\ngraine: 7');
		const scene = buildStatChartScene(node.spec!) as SimulationScene;

		expect(scene.rows).toHaveLength(11);
		expect(scene.rows[3].probability).toBe('0,267');
		expect(scene.rows.reduce((s, r) => s + Number(r.count), 0)).toBe(500);
	});

	it('modes moyenne et échantillons', () => {
		for (const mode of ['moyenne', 'échantillons']) {
			const node = parseStatChartContent('simulation', `X ~ B(20 ; 0,5)\nmode: ${mode}`);
			expect(node.spec, JSON.stringify(node.errors)).not.toBeNull();
			expect(() => buildStatChartScene(node.spec!)).not.toThrow();
		}
	});

	it('jusqu’à 30 valeurs (n ⩽ 29), comme le tableau d’une loi', () => {
		expect(parseStatChartContent('simulation', 'X ~ B(29 ; 0,5)').spec).not.toBeNull();
		expect(errorOf('X ~ B(30 ; 0,5)', 'simulation')).toBe(
			'Ligne 1 : B(n ; p) : au plus 30 valeurs pour une simulation (n ⩽ 29)'
		);
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('erreurs situées', () => {
	it('un niveau hors de ]0 ; 1[', () => {
		const message =
			'Ligne 2 : intervalle : un niveau strictement entre 0 et 1 (0,95, 95 % ou α = 0,05)';
		expect(errorOf(`${B}\nintervalle: 1`)).toBe(message);
		expect(errorOf(`${B}\nintervalle: 0`)).toBe(message);
		expect(errorOf(`${B}\nintervalle: beaucoup`)).toBe(message);
		// Un niveau non décimal : 40 décimales sinon (revue)
		expect(errorOf(`${B}\nintervalle: 2/3`)).toBe(message);
	});

	it('α du seuil strictement entre 0 et 1', () => {
		for (const alpha of ['0', '1']) {
			expect(errorOf(`${B}\nseuil: P(X > k) ⩽ ${alpha}`)).toBe(
				'Ligne 2 : seuil : α est un nombre strictement entre 0 et 1'
			);
		}
	});

	it('au-delà de 30 valeurs, l’avertissement dit que le diagramme manque aussi', () => {
		const node = parseStatChartContent('loi', 'X ~ B(40 ; 0,5)\ndiagramme: oui');
		expect(node.warnings[0].message).toMatch(
			/tableau non affiché \(au plus 30\), diagramme non plus/
		);
	});

	it('un seuil mal écrit, ou d’une autre variable', () => {
		expect(errorOf(`${B}\nseuil: X > k`)).toBe('Ligne 2 : seuil : écrire P(X > k) ⩽ 0,05');
		expect(errorOf(`${B}\nseuil: P(Y > k) ⩽ 0,05`)).toBe(
			'Ligne 2 : seuil : « P(Y > k) » parle de Y, la variable est X'
		);
	});

	it('`intervalle:`, `seuil:`, `diagramme:` : seulement avec une loi binomiale', () => {
		expect(errorOf('X = 0 ; 1\nP = 1/2 ; 1/2\nintervalle: 0,95')).toBe(
			'Ligne 3 : intervalle : seulement avec une loi binomiale (X ~ B(n ; p))'
		);
	});
});
