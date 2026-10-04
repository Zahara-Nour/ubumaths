/**
 * Bloc ```simulation : les lois de maths complémentaires (manche 14, PR b).
 *
 * Spécification validée par David le 2026-10-04 (`docs/wip/simulation-lois-progress.md`) :
 * `X ~ G(p)`, `X ~ U(a ; b)`, `X ~ U([a ; b])`, `X ~ E(λ)` dans ```simulation.
 * - `tirages`, G : k = 1 à 10 puis « 11 ou plus » (P(X ⩾ 11) = (1 − p)^10 exacte) ;
 * - `tirages`, U discrète : une ligne par valeur, au plus 30 ;
 * - `tirages`, lois à densité : histogramme EN DENSITÉ, 10 classes (`classes: N`),
 *   courbe de densité superposée, résumé « n tirages ; moyenne observée ≈ … » ;
 * - `moyenne`, `échantillons` : les quatre lois.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import {
	buildStatChartScene,
	type HistogramScene,
	type LawScene,
	type MeanScene,
	type SimulationScene
} from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { Fraction } from '$lib/statistics/fraction';
import {
	exponentialSampler,
	geometricSampler,
	simulateDraws,
	uniformSampler,
	type LawSampler
} from '$lib/statistics/simulation';
import { createRandomSource } from '$lib/utils/random';

// =============================================================================
// Helpers
// =============================================================================

function specOf(source: string) {
	const node = parseStatChartContent('simulation', source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string) {
	const node = parseStatChartContent('simulation', source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

function sceneOf<T>(source: string, locale: 'fr' | 'en' = 'fr'): T {
	return buildStatChartScene(specOf(source), { locale }) as T;
}

const number = (text: string) => Number(text.replace(/[\s\u00a0,]/g, ''));

function countsOf(source: string): number[] {
	return sceneOf<SimulationScene>(source).rows.map((row) => number(row.count));
}

/** Les tirages du module statistique pour cette graine */
function drawsOf(sampler: LawSampler, n: number, seed: number): number[] {
	const outcome = simulateDraws(sampler, n, createRandomSource(seed));
	if (!outcome.ok) throw new Error(outcome.message);
	return [...outcome.value];
}

/** Cases de données du `#table(` Typst, dans l'ordre (en-têtes exclus) */
function typstCells(typst: string): string[] {
	const table = typst.slice(typst.indexOf('#table('));
	return [...table.matchAll(/^ {2}\[#"((?:[^"\\]|\\.)*)"\]/gm)].map((m) => m[1]);
}

/** Somme des aires des rectangles d'un histogramme */
const areaOf = (scene: HistogramScene) =>
	scene.rects.reduce((sum, rect) => sum + rect.height * (rect.upper - rect.lower), 0);

// =============================================================================
// Analyse
// =============================================================================

describe('simulation des lois nommées — analyse', () => {
	it('G(p) : valeurs 1 à 10 par défaut, `jusqu’à:` change la coupure', () => {
		const simulation = specOf('X ~ G(0,2)').simulation!;
		expect(simulation.named).toEqual({ family: 'geometric', p: '0,2', upTo: 10 });
		expect(simulation.values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
		expect(specOf("X ~ G(0,2)\njusqu'à: 5").simulation!.named).toEqual({
			family: 'geometric',
			p: '0,2',
			upTo: 5
		});
	});

	it('U(a ; b) : une valeur par entier ; au plus 30 valeurs à tirer', () => {
		const simulation = specOf('D ~ U(1 ; 6)').simulation!;
		expect(simulation.variable).toBe('D');
		expect(simulation.named).toEqual({ family: 'uniform', a: 1, b: 6 });
		expect(simulation.values).toEqual(['1', '2', '3', '4', '5', '6']);
		expect(specOf('X ~ U(1 ; 30)').simulation!.values).toHaveLength(30);
		expect(errorOf('X ~ U(1 ; 31)')).toBe('Ligne 1 : U(a ; b) : au plus 30 valeurs à tirer');
		expect(errorOf('X ~ U(1 ; 5000)')).toBe('Ligne 1 : U(a ; b) : au plus 30 valeurs à tirer');
	});

	it('lois à densité : 10 classes par défaut, `classes: N` de 2 à 50', () => {
		expect(specOf('X ~ U([0 ; 10])').simulation!.named).toEqual({
			family: 'uniform-density',
			a: '0',
			b: '10',
			classes: 10
		});
		expect(specOf('T ~ E(0,5)\nclasses: 20').simulation!.named).toEqual({
			family: 'exponential',
			lambda: '0,5',
			classes: 20
		});
		expect(specOf('T ~ E(0,5)\nclasses: 2').simulation!.named).toMatchObject({ classes: 2 });
		expect(specOf('T ~ E(0,5)\nclasses: 50').simulation!.named).toMatchObject({ classes: 50 });
	});

	it('`classes:` : un NOMBRE de classes, pas des bornes', () => {
		expect(errorOf('X ~ E(1)\nclasses: 0 ; 5 ; 10')).toMatch(
			/^Ligne 2 : classes : .*un nombre de classes/
		);
		expect(errorOf('X ~ E(1)\nclasses: 1')).toMatch(/^Ligne 2 : classes : .*un nombre de classes/);
		expect(errorOf('X ~ E(1)\nclasses: 51')).toMatch(/^Ligne 2 : classes : .*un nombre de classes/);
	});

	it('`classes:` : seulement une loi à densité en mode tirages', () => {
		expect(errorOf('X ~ G(0,2)\nclasses: 5')).toMatch(/^Ligne 2 : classes : seulement/);
		expect(errorOf('X = 1 ; 2\nP = 1/2 ; 1/2\nclasses: 5')).toMatch(
			/^Ligne 3 : classes : seulement/
		);
		expect(errorOf('X ~ E(1)\nmode: moyenne\nclasses: 5')).toMatch(
			/^Ligne 3 : classes : seulement/
		);
	});

	it('`jusqu’à:` : seulement une loi géométrique', () => {
		expect(errorOf("X ~ E(1)\njusqu'à: 5")).toMatch(
			/^Ligne 2 : jusqu'à : seulement avec une loi géométrique/
		);
	});

	it('les erreurs de la loi : les mêmes messages que ```loi', () => {
		expect(errorOf('X ~ G(1,5)')).toBe(
			'Ligne 1 : G(p) : p est un nombre strictement positif, au plus 1'
		);
		expect(errorOf('X ~ U(6 ; 1)')).toBe('Ligne 1 : U(a ; b) : les bornes dans l’ordre (a < b)');
		expect(errorOf('X ~ U([5 ; 1])')).toBe(
			'Ligne 1 : U([a ; b]) : les bornes dans l’ordre (a < b)'
		);
		expect(errorOf('X ~ E(0)')).toBe('Ligne 1 : E(λ) : λ est un nombre strictement positif');
	});

	it('seuil:, intervalle:, probabilités: restent refusés dans une simulation', () => {
		expect(errorOf('X ~ G(0,2)\nseuil: P(X ⩽ k) ⩾ 0,5')).toMatch(
			/ne s'applique pas aux simulations/
		);
		expect(errorOf('X ~ E(1)\nintervalle: 95 %')).toMatch(/ne s'applique pas aux simulations/);
		expect(errorOf('X ~ U(1 ; 6)\nprobabilités: P(X = 1)')).toMatch(
			/ne s'applique pas aux simulations/
		);
	});

	it('la loi nommée seule : pas de ligne « X = »', () => {
		expect(parseStatChartContent('simulation', 'X ~ G(0,2)\nX = 1 ; 2').spec).toBeNull();
	});
});

// =============================================================================
// Mode tirages : lois discrètes
// =============================================================================

describe('simulation de G(p), mode tirages', () => {
	it('k = 1 à 10 puis « 11 ou plus » ; effectifs de somme n', () => {
		const scene = sceneOf<SimulationScene>('X ~ G(0,2)\ntirages: 500\ngraine: 3');
		expect(scene.rows.map((row) => row.value)).toEqual([
			...['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
			'11 ou plus'
		]);
		expect(countsOf('X ~ G(0,2)\ntirages: 500\ngraine: 3').reduce((a, b) => a + b, 0)).toBe(500);
	});

	it('les effectifs sont ceux des tirages du module statistique (même graine)', () => {
		const draws = drawsOf(geometricSampler(Fraction.parse('0,2')!), 500, 3);
		const expected = [
			...Array.from({ length: 10 }, (_, i) => draws.filter((x) => x === i + 1).length),
			draws.filter((x) => x >= 11).length
		];
		expect(countsOf('X ~ G(0,2)\ntirages: 500\ngraine: 3')).toEqual(expected);
	});

	it('probabilités exactes arrondies au millième ; « 11 ou plus » : (1 − p)^10', () => {
		const rows = sceneOf<SimulationScene>('X ~ G(0,2)').rows;
		expect(rows[0].probability).toBe('0,2');
		expect(rows[1].probability).toBe('0,16');
		// 0,8^10 = 0,1073741824
		expect(rows[10].probability).toBe('0,107');
	});

	it('`jusqu’à: 5` : « 6 ou plus », P(X ⩾ 6) = 0,8^5 = 0,32768', () => {
		const rows = sceneOf<SimulationScene>("X ~ G(0,2)\njusqu'à: 5").rows;
		expect(rows).toHaveLength(6);
		expect(rows[5].value).toBe('6 ou plus');
		expect(rows[5].probability).toBe('0,328');
	});

	it('même graine, mêmes effectifs ; autre graine, autres effectifs', () => {
		const a = countsOf('X ~ G(0,3)\ntirages: 300\ngraine: 8');
		expect(countsOf('X ~ G(0,3)\ntirages: 300\ngraine: 8')).toEqual(a);
		expect(countsOf('X ~ G(0,3)\ntirages: 300\ngraine: 9')).not.toEqual(a);
	});

	it('G(1) : tout dans la valeur 1', () => {
		expect(countsOf('X ~ G(1)\ntirages: 50')).toEqual([50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
	});

	it('anglais : « 11 or more », point décimal', () => {
		const rows = sceneOf<SimulationScene>('X ~ G(0,2)', 'en').rows;
		expect(rows[10].value).toBe('11 or more');
		expect(rows[10].probability).toBe('0.107');
	});
});

describe('simulation de U(a ; b), mode tirages', () => {
	it('une ligne par valeur, effectifs du module, somme n, probabilité 1/N au millième', () => {
		const scene = sceneOf<SimulationScene>('X ~ U(−2 ; 3)\ntirages: 600\ngraine: 11');
		expect(scene.rows.map((row) => row.value)).toEqual(['−2', '−1', '0', '1', '2', '3']);
		expect(scene.rows.every((row) => row.probability === '0,167')).toBe(true);
		const draws = drawsOf(uniformSampler(-2, 3), 600, 11);
		const counts = countsOf('X ~ U(−2 ; 3)\ntirages: 600\ngraine: 11');
		expect(counts).toEqual([-2, -1, 0, 1, 2, 3].map((k) => draws.filter((x) => x === k).length));
		expect(counts.reduce((a, b) => a + b, 0)).toBe(600);
	});
});

// =============================================================================
// Mode tirages : lois à densité
// =============================================================================

describe('simulation d’une loi à densité, mode tirages : histogramme en densité', () => {
	const EXP = 'X ~ E(0,5)\ntirages: 1000\ngraine: 4';

	it('E(0,5) : 10 classes égales de [0 ; 10] (ln(100)/λ ≈ 9,2 arrondi), aire totale 1', () => {
		const scene = sceneOf<HistogramScene>(EXP);
		expect(scene.kind).toBe('histogramme');
		expect(scene.rects).toHaveLength(10);
		expect(scene.rects.map((r) => [r.lower, r.upper])).toEqual(
			Array.from({ length: 10 }, (_, i) => [i, i + 1])
		);
		expect(areaOf(scene)).toBeCloseTo(1, 12);
	});

	it('hauteur = fréquence / amplitude ; la dernière classe prend tout ce qui dépasse', () => {
		const scene = sceneOf<HistogramScene>(EXP);
		const draws = drawsOf(exponentialSampler(Fraction.parse('0,5')!), 1000, 4);
		const inClass = (i: number) =>
			draws.filter((x) => (i === 9 ? x >= 9 : x >= i && x < i + 1)).length;
		scene.rects.forEach((rect, i) => expect(rect.height).toBeCloseTo(inClass(i) / 1000, 12));
		expect(draws.some((x) => x > 10)).toBe(true);
		expect(scene.rects[9].label).toBe('[9 ; +∞[');
	});

	it('la courbe de densité superposée : la même que le bloc ```loi, même couleur', () => {
		const scene = sceneOf<HistogramScene>(EXP);
		const law = parseStatChartContent('loi', 'X ~ E(0,5)\ndiagramme: oui');
		const curve = (buildStatChartScene(law.spec!) as LawScene).densityChart!;
		expect(scene.densityCurve?.points).toEqual(curve.points);
		expect(scene.densityCurve?.color).toBe(curve.color);
		expect(scene.xMin).toBe(curve.xMin);
		expect(scene.xMax).toBe(curve.xMax);
		// L'axe couvre les rectangles ET le haut de la courbe (λ = 0,5)
		expect(scene.yMax).toBeGreaterThanOrEqual(Math.max(0.5, ...scene.rects.map((r) => r.height)));
		expect(scene.axisTitles.y).toBe('Densité');
	});

	it('résumé, mention de la dernière classe, puis la graine', () => {
		const scene = sceneOf<HistogramScene>(EXP);
		const draws = drawsOf(exponentialSampler(Fraction.parse('0,5')!), 1000, 4);
		const mean = draws.reduce((a, b) => a + b, 0) / 1000;
		const shown = (Math.round(mean * 1000) / 1000).toString().replace('.', ',');
		const beyond = draws.filter((x) => x > 10).length;
		expect(scene.indicators).toEqual([
			`1\u00a0000 tirages ; moyenne observée ≈ ${shown} (E(X) = 2)`,
			`la dernière classe compte aussi les tirages au-delà de 10 (ici ${beyond})`,
			'graine 4'
		]);
	});

	it('U([2 ; 10]) : 10 classes de [2 ; 10], dernière fermée, pas de mention', () => {
		const scene = sceneOf<HistogramScene>('X ~ U([2 ; 10])\ntirages: 800');
		expect(scene.rects.map((r) => r.lower)).toEqual([2, 2.8, 3.6, 4.4, 5.2, 6, 6.8, 7.6, 8.4, 9.2]);
		expect(scene.rects[9].upper).toBe(10);
		expect(scene.rects[9].label).toBe('[9,2 ; 10]');
		expect(areaOf(scene)).toBeCloseTo(1, 12);
		expect(scene.indicators).toHaveLength(2);
		expect(scene.indicators[0]).toMatch(/^800 tirages ; moyenne observée ≈ \d,\d+ \(E\(X\) = 6\)$/);
		expect(scene.densityCurve?.points.some((p) => p.y === 1 / 8)).toBe(true);
	});

	it('`classes: 20` : 20 classes, aire totale 1', () => {
		const scene = sceneOf<HistogramScene>('X ~ E(2)\nclasses: 20\ntirages: 500');
		expect(scene.rects).toHaveLength(20);
		expect(areaOf(scene)).toBeCloseTo(1, 12);
	});

	it('même graine, mêmes hauteurs ; autre graine, autres hauteurs', () => {
		const heights = (seed: number) =>
			sceneOf<HistogramScene>(`X ~ E(1)\ntirages: 300\ngraine: ${seed}`).rects.map((r) => r.height);
		expect(heights(5)).toEqual(heights(5));
		expect(heights(5)).not.toEqual(heights(6));
	});

	it('anglais : axe « Density », résumé et mention en anglais, point décimal', () => {
		const scene = sceneOf<HistogramScene>(EXP, 'en');
		expect(scene.axisTitles.y).toBe('Density');
		expect(scene.indicators[0]).toMatch(/^1,000 draws; observed mean ≈ \d\.\d+ \(E\(X\) = 2\)$/);
		expect(scene.indicators[1]).toMatch(
			/^the last class also counts the draws beyond 10 \(here \d+\)$/
		);
		expect(scene.indicators[2]).toBe('seed 4');
	});
});

// =============================================================================
// Modes moyenne et échantillons
// =============================================================================

describe('modes moyenne et échantillons pour les quatre lois', () => {
	it.each([
		['X ~ G(0,2)', 5],
		['X ~ U(1 ; 6)', 3.5],
		['X ~ U([0 ; 10])', 5],
		['X ~ E(0,5)', 2]
	])('%s : moyenne selon n, droite E(X)', (law, expectation) => {
		const scene = sceneOf<MeanScene>(`${law}\nmode: moyenne\ntirages: 2000`);
		expect(scene.kind).toBe('moyenne-selon-n');
		expect(scene.reference.value).toBe(expectation);
	});

	it.each(['X ~ G(0,2)', 'X ~ U(1 ; 6)', 'X ~ U([0 ; 10])', 'X ~ E(0,5)'])(
		'%s : histogramme des moyennes, classes de μ ± 2σ/√n en couleur',
		(law) => {
			const scene = sceneOf<HistogramScene>(
				`${law}\nmode: échantillons\néchantillons: 100\ntaille: 50`
			);
			expect(scene.kind).toBe('histogramme');
			expect(scene.rects.reduce((sum, r) => sum + r.height, 0)).toBe(100);
			expect(scene.rects.some((r) => r.highlighted === true)).toBe(true);
		}
	);
});

// =============================================================================
// Typst : les mêmes nombres qu'à l'écran
// =============================================================================

describe('simulation des lois nommées — Typst', () => {
	it('G : chaque ligne du tableau, « 11 ou plus » compris', () => {
		const source = 'X ~ G(0,2)\ntirages: 200\ngraine: 2';
		const scene = sceneOf<SimulationScene>(source);
		const cells = typstCells(generateStatChartTypst(parseStatChartContent('simulation', source)));
		for (const row of scene.rows) {
			expect(cells).toEqual(
				expect.arrayContaining([row.value, row.count, row.frequency, row.probability])
			);
		}
		expect(cells).toContain('11 ou plus');
	});

	it('densité : un rectangle par classe, la courbe, l’axe « Densité », le résumé et la graine', () => {
		const source = 'X ~ E(0,5)\ntirages: 1000\ngraine: 4';
		const scene = sceneOf<HistogramScene>(source);
		const typst = generateStatChartTypst(parseStatChartContent('simulation', source));
		expect(typst.match(/^ {2}rect\(/gm)).toHaveLength(10);
		expect(typst).toContain('// courbe de densité');
		expect(typst).toContain('Densité');
		expect(typst).toContain('graine 4');
		expect(typst).toContain('moyenne observée');
		// Entre parenthèses, les espaces deviennent insécables (`indicatorsBlock`)
		expect(typst).toContain(`ici\u00a0${scene.indicators[1].match(/ici (\d+)/)![1]}`);
	});

	it('anglais : « 11 or more », « Density »', () => {
		const g = generateStatChartTypst(parseStatChartContent('simulation', 'X ~ G(0,2)'), {
			language: 'en'
		});
		expect(typstCells(g)).toContain('11 or more');
		const e = generateStatChartTypst(parseStatChartContent('simulation', 'X ~ E(1)'), {
			language: 'en'
		});
		expect(e).toContain('Density');
		expect(e).toContain('observed mean');
	});
});
