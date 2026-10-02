/**
 * Bloc ```simulation, modes `moyenne` et `échantillons` (v2, lot 3 PR b).
 *
 * Spécification validée par David le 2026-10-02 :
 *  - `moyenne` : la moyenne des tirages selon leur nombre, et la droite E(X)
 *    en pointillés ; `tirages:` comme en mode `tirages` (au plus 10 000) ;
 *  - `échantillons` : `échantillons:` (N) et `taille:` (n), N × n ≤ 100 000 ;
 *    histogramme des moyennes, classes dans μ ± 2σ/√n en couleur, et la
 *    phrase « k échantillons sur N ont une moyenne dans … » ;
 *  - la graine écrite sous la figure ; l'écran et le PDF dessinent la même.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import {
	buildStatChartScene,
	type HistogramScene,
	type MeanScene
} from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { simulateRunningMean, simulateSamples } from '$lib/statistics/simulation';
import { Fraction } from '$lib/statistics/fraction';
import { createRandomSource } from '$lib/utils/random';

// =============================================================================
// Helpers
// =============================================================================

const DIE = 'X = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6';
const DIE_LAW = {
	values: [1, 2, 3, 4, 5, 6].map((v) => new Fraction(BigInt(v), 1n)),
	probabilities: Array.from({ length: 6 }, () => new Fraction(1n, 6n))
};

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

const meanScene = (source: string, locale: 'fr' | 'en' = 'fr') =>
	buildStatChartScene(specOf(source), { locale }) as MeanScene;
const samplesScene = (source: string, locale: 'fr' | 'en' = 'fr') =>
	buildStatChartScene(specOf(source), { locale }) as HistogramScene;

// =============================================================================
// Analyse
// =============================================================================

describe('modes — analyse', () => {
	it('moyenne : 100 tirages par défaut, `tirages:` comme en mode tirages', () => {
		expect(specOf(`${DIE}\nmode: moyenne`).simulation).toMatchObject({
			mode: 'moyenne',
			draws: 100,
			seed: 1
		});
		expect(specOf(`${DIE}\nmode: moyenne\ntirages: 10 000`).simulation!.draws).toBe(10000);
	});

	it('échantillons : 100 échantillons de taille 100 par défaut ; options lues', () => {
		expect(specOf(`${DIE}\nmode: échantillons`).simulation).toMatchObject({
			mode: 'échantillons',
			samples: 100,
			sampleSize: 100
		});
		expect(
			specOf(`${DIE}\nmode: echantillons\néchantillons: 200\ntaille: 50`).simulation
		).toMatchObject({ samples: 200, sampleSize: 50 });
	});

	it('l’ordre des options est libre : le mode peut venir après', () => {
		expect(specOf(`${DIE}\ntaille: 30\nmode: échantillons`).simulation!.sampleSize).toBe(30);
	});
});

describe('modes — erreurs situées', () => {
	it('échantillons × taille : au plus 100 000 tirages', () => {
		expect(errorOf(`${DIE}\nmode: échantillons\néchantillons: 1000\ntaille: 200`)).toBe(
			'Ligne 5 : échantillons × taille : au plus 100 000 tirages (ici 200 000)'
		);
	});

	it('échantillons et taille : des entiers entre 1 et 1 000', () => {
		expect(errorOf(`${DIE}\nmode: échantillons\néchantillons: 0`)).toBe(
			'Ligne 4 : échantillons : un entier entre 1 et 1 000'
		);
		expect(errorOf(`${DIE}\nmode: échantillons\ntaille: 1001`)).toBe(
			'Ligne 4 : taille : un entier entre 1 et 1 000'
		);
	});

	it('tirages : pas en mode échantillons', () => {
		expect(errorOf(`${DIE}\ntirages: 50\nmode: échantillons`)).toBe(
			'Ligne 3 : tirages : pas en mode échantillons (écrire échantillons: et taille:)'
		);
	});

	it('échantillons et taille : seulement en mode échantillons', () => {
		expect(errorOf(`${DIE}\ntaille: 30`)).toBe('Ligne 3 : taille : seulement en mode échantillons');
		expect(errorOf(`${DIE}\nmode: moyenne\néchantillons: 30`)).toBe(
			'Ligne 4 : échantillons : seulement en mode échantillons'
		);
	});

	it('taille reste la taille de la figure pour les autres blocs', () => {
		expect(parseStatChartContent('barres', 'A = 1\ntaille: grande').spec?.size).toBe('grande');
	});
});

// =============================================================================
// Scène
// =============================================================================

describe('mode moyenne — scène', () => {
	it('la courbe des moyennes du module statistique, et la droite E(X) = 7/2', () => {
		const scene = meanScene(`${DIE}\nmode: moyenne\ntirages: 600\ngraine: 42`);
		const outcome = simulateRunningMean(
			DIE_LAW.values,
			DIE_LAW.probabilities,
			600,
			createRandomSource(42)
		);
		if (!outcome.ok) throw new Error(outcome.message);

		expect(scene.kind).toBe('moyenne-selon-n');
		expect(scene.reference.value).toBe(3.5);
		expect(scene.points.at(-1)).toEqual({ x: 600, y: outcome.value.means[599] });
	});

	it('sous la figure : la dernière moyenne, l’espérance, puis la graine', () => {
		const scene = meanScene(`${DIE}\nmode: moyenne\ntirages: 600\ngraine: 42`);

		expect(scene.indicators[0]).toMatch(
			/^moyenne des 600 tirages : \d,\d{1,3} ; espérance E\(X\) = 7\/2$/
		);
		expect(scene.indicators[1]).toBe('graine 42');
	});

	it('titre de l’auteur ; textes anglais dans un document anglais', () => {
		const scene = meanScene(`${DIE}\nmode: moyenne\ntitre: Lancers`, 'en');

		expect(scene.title).toBe('Lancers');
		expect(scene.axisTitles).toEqual({ x: 'Number of draws', y: 'Mean' });
		expect(scene.indicators[0]).toMatch(
			/^mean of the 100 draws: \d\.\d{1,3}; expectation E\(X\) = 7\/2$/
		);
		expect(scene.indicators[1]).toBe('seed 1');
		// Milliers à l'anglaise sur l'axe des tirages
		const many = meanScene(`${DIE}\nmode: moyenne\ntirages: 2000`, 'en');
		expect(many.xTicks.map((t) => t.label)).toContain('1,000');
	});
});

describe('mode échantillons — scène', () => {
	const SOURCE = `${DIE}\nmode: échantillons\néchantillons: 200\ntaille: 50\ngraine: 42`;

	it('l’histogramme des moyennes : 200 au total, classes de μ ± 2σ/√n en couleur', () => {
		const scene = samplesScene(SOURCE);

		expect(scene.kind).toBe('histogramme');
		expect(scene.rects.reduce((total, r) => total + r.height, 0)).toBe(200);
		expect(scene.rects.some((r) => r.highlighted === true)).toBe(true);
	});

	it('la phrase compte les échantillons du module statistique, puis la graine', () => {
		const outcome = simulateSamples(
			DIE_LAW.values,
			DIE_LAW.probabilities,
			200,
			50,
			createRandomSource(42)
		);
		if (!outcome.ok) throw new Error(outcome.message);
		const scene = samplesScene(SOURCE);

		expect(scene.indicators[0]).toMatch(/^μ = 7\/2 ; σ ≈ 1,708 ; 2σ\/√n ≈ 0,483$/);
		expect(scene.indicators[1]).toBe(
			`${outcome.value.within} échantillons sur 200 ont une moyenne dans [μ − 2σ/√n ; μ + 2σ/√n]`
		);
		expect(scene.indicators[2]).toBe('graine 42');
	});

	it('un seul échantillon : au singulier', () => {
		expect(samplesScene(`${DIE}\nmode: échantillons\néchantillons: 1`).indicators[1]).toMatch(
			/^[01] échantillon sur 1 a une moyenne dans/
		);
	});

	it('bornes des classes au millième : l’axe reste lisible', () => {
		const scene = samplesScene(SOURCE);

		for (const tick of scene.xTicks) expect(tick.label).toMatch(/^\d+(,\d{1,3})?$/);
		expect(scene.rects.every((r) => /^[[\]][\d,]+ ; [\d,]+[[\]]$/.test(r.label))).toBe(true);
	});

	it('document anglais : point décimal, textes anglais', () => {
		const scene = samplesScene(SOURCE, 'en');

		expect(scene.indicators[0]).toBe('μ = 7/2; σ ≈ 1.708; 2σ/√n ≈ 0.483');
		expect(scene.indicators[1]).toMatch(
			/^\d+ samples out of 200 have a mean in \[μ − 2σ\/√n ; μ \+ 2σ\/√n\]$/
		);
		expect(scene.axisTitles).toEqual({ x: 'Sample mean', y: 'Count' });
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('modes — Typst', () => {
	it('moyenne : la courbe, la droite en pointillés, la graine', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('simulation', `${DIE}\nmode: moyenne\ngraine: 42`)
		);

		expect(typst).toContain('dash: "dashed"');
		expect(typst).toContain('graine 42');
		expect(typst).not.toContain('Figure indisponible');
	});

	it('échantillons : les classes hors de μ ± 2σ/√n en gris, comme à l’écran', () => {
		const source = `${DIE}\nmode: échantillons\néchantillons: 200\ntaille: 50\ngraine: 42`;
		const scene = samplesScene(source);
		const typst = generateStatChartTypst(parseStatChartContent('simulation', source));
		const fills = [...typst.matchAll(/rect\([^\n]*fill: ([^,]+),/g)].map((m) => m[1]);

		expect(fills).toHaveLength(scene.rects.length);
		scene.rects.forEach((rect, i) => {
			expect(fills[i] === 'luma(150)', `classe ${rect.label}`).toBe(rect.highlighted === false);
		});
		expect(typst).toContain('échantillons sur 200');
	});

	it('un histogramme ordinaire reste d’une seule couleur', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('histogramme', '[0 ; 10[ = 4\n[10 ; 20[ = 6')
		);

		expect(typst).not.toContain('luma(150)');
	});
});
