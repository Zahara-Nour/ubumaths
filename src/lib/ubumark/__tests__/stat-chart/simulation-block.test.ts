/**
 * Bloc ```simulation, mode `tirages` (v2, lot 3 PR a) : analyse, scène, Typst.
 *
 * Spécification validée par David le 2026-10-02 : la loi s'écrit comme dans
 * ```loi, `tirages:` (100 par défaut, 1 à 10 000) et `graine:` (1 par défaut)
 * fixent les tirages ; même graine, mêmes effectifs, à l'écran et sur le PDF.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type SimulationScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import type { StatChartNode } from '../../types/stat-chart';
import { simulateCounts } from '$lib/statistics/simulation';
import { Fraction } from '$lib/statistics/fraction';
import { createRandomSource } from '$lib/utils/random';

// =============================================================================
// Helpers
// =============================================================================

const DIE = 'X = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6';
const GAME = 'G = -2 ; 0 ; 5\nP = 1/2 ; 3/10 ; 1/5';

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

function sceneOf(source: string, locale: 'fr' | 'en' = 'fr') {
	return buildStatChartScene(specOf(source), { locale }) as SimulationScene;
}

function countsOf(source: string): number[] {
	return sceneOf(source).rows.map((row) => Number(row.count.replace(/\s/g, '')));
}

/** Les effectifs que rend le module statistique pour cette graine */
function expectedCounts(probabilities: string[], values: string[], n: number, seed: number) {
	const outcome = simulateCounts(
		values.map((v) => Fraction.parse(v)!),
		probabilities.map((p) => Fraction.parse(p)!),
		n,
		createRandomSource(seed)
	);
	if (!outcome.ok) throw new Error(outcome.message);
	return [...outcome.value.counts];
}

/** Cases de données du `#table(` Typst, dans l'ordre (en-têtes exclus) */
function typstCells(typst: string): string[] {
	const table = typst.slice(typst.indexOf('#table('));
	return [...table.matchAll(/^ {2}\[#"((?:[^"\\]|\\.)*)"\]/gm)].map((m) => m[1]);
}

// =============================================================================
// Analyse
// =============================================================================

describe('simulation — analyse', () => {
	it('par défaut : mode tirages, 100 tirages, graine 1', () => {
		const simulation = specOf(DIE).simulation!;

		expect(simulation.mode).toBe('tirages');
		expect(simulation.draws).toBe(100);
		expect(simulation.seed).toBe(1);
		expect(simulation.variable).toBe('X');
		expect(simulation.values).toEqual(['1', '2', '3', '4', '5', '6']);
		expect(simulation.probabilities).toEqual(['1/6', '1/6', '1/6', '1/6', '1/6', '1/6']);
	});

	it('tirages, graine, mode et variable renommée ; « 10 000 » avec espace', () => {
		const simulation = specOf(`${GAME}\nmode: tirages\ntirages: 10 000\ngraine: 42`).simulation!;

		expect(simulation.variable).toBe('G');
		expect(simulation.draws).toBe(10000);
		expect(simulation.seed).toBe(42);
	});

	it('la graine 0 est permise', () => {
		expect(specOf(`${DIE}\ngraine: 0`).simulation!.seed).toBe(0);
	});
});

// =============================================================================
// Scène
// =============================================================================

describe('simulation — scène', () => {
	it('une ligne par valeur ; les effectifs font n', () => {
		const scene = sceneOf(`${DIE}\ntirages: 600\ngraine: 42`);

		expect(scene.rows.map((row) => row.value)).toEqual(['1', '2', '3', '4', '5', '6']);
		expect(countsOf(`${DIE}\ntirages: 600\ngraine: 42`).reduce((a, b) => a + b, 0)).toBe(600);
	});

	it('les effectifs sont ceux du module statistique pour cette graine', () => {
		const die = ['1', '2', '3', '4', '5', '6'];
		expect(countsOf(`${DIE}\ntirages: 600\ngraine: 42`)).toEqual(
			expectedCounts(Array(6).fill('1/6'), die, 600, 42)
		);
		expect(countsOf(DIE)).toEqual(expectedCounts(Array(6).fill('1/6'), die, 100, 1));
	});

	it('même graine, mêmes tirages ; autre graine, autres tirages', () => {
		const a = countsOf(`${DIE}\ntirages: 600\ngraine: 42`);

		expect(countsOf(`${DIE}\ntirages: 600\ngraine: 42`)).toEqual(a);
		expect(countsOf(`${DIE}\ntirages: 600\ngraine: 43`)).not.toEqual(a);
	});

	it('fréquence observée au millième, virgule ; probabilité telle qu’écrite', () => {
		const scene = sceneOf(`${GAME}\ntirages: 600\ngraine: 42`);
		const counts = scene.rows.map((row) => Number(row.count));

		scene.rows.forEach((row, i) => {
			expect(row.frequency).toBe((counts[i] / 600).toFixed(3).replace('.', ','));
		});
		expect(scene.rows.map((row) => row.probability)).toEqual(['1/2', '3/10', '1/5']);
		// Vrai signe moins, comme dans le tableau d'une loi
		expect(scene.rows[0].value).toBe('−2');
	});

	it('arrondi au millième juste sur un demi : 3 sur 80 = 0,0375 → 0,038', () => {
		// Graine choisie pour que la valeur 1 sorte 3 fois sur 80
		const seed = Array.from({ length: 2000 }, (_, i) => i).find(
			(g) => countsOf(`X = 1 ; 2\nP = 1/20 ; 19/20\ntirages: 80\ngraine: ${g}`)[0] === 3
		);
		expect(seed, 'aucune graine ne donne 3 sur 80').toBeDefined();
		const scene = sceneOf(`X = 1 ; 2\nP = 1/20 ; 19/20\ntirages: 80\ngraine: ${seed}`);

		expect(scene.rows[0].count).toBe('3');
		expect(scene.rows[0].frequency).toBe('0,038');
		expect(scene.rows[1].frequency).toBe('0,963');
	});

	it('une probabilité nulle ne sort jamais ; valeurs décimales selon la langue', () => {
		const source = 'X = 0,5 ; 1 ; 2\nP = 0 ; 1/2 ; 1/2\ntirages: 1000';

		expect(countsOf(source)[0]).toBe(0);
		expect(sceneOf(source).rows[0].value).toBe('0,5');
		expect(sceneOf(source, 'en').rows[0].value).toBe('0.5');
		expect(sceneOf(source, 'en').rows[0].frequency).toBe('0.000');
	});

	it('10 000 tirages : groupés dans la légende et les effectifs, et ils font 10 000', () => {
		const scene = sceneOf(`${GAME}\ntirages: 10 000`);

		expect(scene.caption).toBe('Simulation de 10\u00a0000 tirages (graine 1)');
		expect(countsOf(`${GAME}\ntirages: 10 000`).reduce((a, b) => a + b, 0)).toBe(10000);
		expect(scene.rows.some((row) => /^\d\u00a0\d{3}$/.test(row.count))).toBe(true);
		expect(sceneOf(`${GAME}\ntirages: 10 000`, 'en').caption).toBe(
			'Simulation of 10,000 draws (seed 1)'
		);
	});

	it('légende : nombre de tirages et graine, selon la langue', () => {
		expect(sceneOf(`${DIE}\ntirages: 600\ngraine: 42`).caption).toBe(
			'Simulation de 600 tirages (graine 42)'
		);
		expect(sceneOf(`${DIE}\ntirages: 1`).caption).toBe('Simulation de 1 tirage (graine 1)');
		expect(sceneOf(`${DIE}\ntirages: 600\ngraine: 42`, 'en').caption).toBe(
			'Simulation of 600 draws (seed 42)'
		);
		expect(sceneOf(`${GAME}\ntirages: 600`, 'en').rows[0].frequency).toMatch(/^0\.\d{3}$/);
	});

	it('le titre de l’auteur est gardé', () => {
		expect(sceneOf(`${DIE}\ntitre: Cent lancers`).title).toBe('Cent lancers');
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('simulation — Typst : les mêmes nombres qu’à l’écran', () => {
	it('chaque effectif, fréquence et probabilité, et la légende', () => {
		const source = `${GAME}\ntirages: 600\ngraine: 42`;
		const typst = generateStatChartTypst(parseStatChartContent('simulation', source));
		const scene = sceneOf(source);

		expect(typst).toContain('Simulation de 600 tirages (graine 42)');
		expect(typstCells(typst)).toEqual(
			scene.rows.flatMap((r) => [r.value, r.count, r.frequency, r.probability])
		);
		expect(typst).not.toContain('Figure indisponible');
	});

	it('document anglais : point décimal et en-têtes anglais', () => {
		const source = `${GAME}\ntirages: 600\ngraine: 42`;
		const typst = generateStatChartTypst(parseStatChartContent('simulation', source), {
			language: 'en'
		});

		expect(typst).toContain('Simulation of 600 draws (seed 42)');
		expect(typst).toContain('Observed relative frequency');
		expect(typstCells(typst)).toEqual(
			sceneOf(source, 'en').rows.flatMap((r) => [r.value, r.count, r.frequency, r.probability])
		);
	});

	it('bloc en erreur : le cadre neutre', () => {
		expect(generateStatChartTypst(parseStatChartContent('simulation', 'X = 1'))).toContain(
			'Figure indisponible'
		);
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('simulation — erreurs situées', () => {
	it('les erreurs d’une loi, avec les mêmes messages que ```loi', () => {
		const same = (source: string) =>
			expect(errorOf(source)).toBe(parseStatChartContent('loi', source).errors[0].message);

		same('X = 1 ; 2');
		same('X = 1 ; 2\nP = 1/2 ; 1/3');
		same('X = 1 ; 1\nP = 1/2 ; 1/2');
		same('X = 1 ; 2 ; 3\nP = 1/2 ; 1/2');
		same('X = 1 ; 2\nP = -1/2 ; 3/2');
	});

	it('une probabilité « ? » ne se simule pas', () => {
		expect(errorOf('X = 0 ; 1\nP = 1/2 ; ?')).toMatch(/Ligne 2 : .*toutes les probabilités/);
	});

	it('tirages : un entier entre 1 et 10 000', () => {
		for (const bad of ['0', '10001', '2,5', 'beaucoup', '-3']) {
			expect(errorOf(`${DIE}\ntirages: ${bad}`)).toBe(
				'Ligne 3 : tirages : un entier entre 1 et 10 000'
			);
		}
	});

	it('graine : un entier positif ou nul', () => {
		for (const bad of ['-1', '1,5', 'abc', '1234567890']) {
			expect(errorOf(`${DIE}\ngraine: ${bad}`)).toMatch(/^Ligne 3 : graine : /);
		}
	});

	it('mode inconnu, option inconnue, option d’un autre bloc', () => {
		expect(errorOf(`${DIE}\nmode: lancers`)).toMatch(/^Ligne 3 : mode « lancers » inconnu/);
		expect(errorOf(`${DIE}\ncouleurs: rouge`)).toMatch(/^Ligne 3 : option « couleurs » inconnue/);
		expect(errorOf(`${DIE}\nmasquer: 1`)).toMatch(/ne s'applique pas aux simulations/);
		expect(errorOf(`${DIE}\nindicateurs: espérance`)).toMatch(/ne s'applique pas aux simulations/);
	});

	it('les options des simulations ne s’appliquent pas aux autres blocs', () => {
		expect(parseStatChartContent('loi', `${DIE}\ntirages: 10`).errors[0].message).toMatch(
			/ne s'applique pas aux lois/
		);
		// Une coquille ne propose que les options de CE bloc
		const law = parseStatChartContent('loi', `${DIE}\nindicateur: espérance`).errors[0].message;
		expect(law).toContain('indicateurs');
		expect(law).not.toContain('tirages');
		expect(errorOf(`${DIE}\ntirage: beaucoup`)).toBe(
			'Ligne 3 : option « tirage » inconnue (options : titre, taille, mode, tirages, graine, échantillons)'
		);
	});
});

// =============================================================================
// Document
// =============================================================================

describe('simulation — dans un document', () => {
	const charts = (children: BlockNode[]) =>
		children.filter((c): c is StatChartNode => c.type === 'stat-chart');

	it('au premier niveau et en retrait sous un item de liste', () => {
		const block = ['```simulation', ...DIE.split('\n'), 'tirages: 50', '```'];
		const top = parseMarkdown(['Avant.', '', ...block, '', 'Après.'].join('\n'));
		const list = parseMarkdown(
			['1. Lancer :', '', ...block.map((l) => `   ${l}`), '2. Suite.'].join('\n')
		).children[0] as ListNode;

		expect(charts(top.children).map((c) => c.kind)).toEqual(['simulation']);
		expect(charts(list.items[0].children as BlockNode[]).map((c) => c.kind)).toEqual([
			'simulation'
		]);
	});
});
