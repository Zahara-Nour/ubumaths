/**
 * Bloc ```boite-a-moustaches (chantier `boite-a-moustaches`, palier 1 : affichage)
 *
 * Phase 0 validée par David le 2026-11-01 : `docs/wip/boite-a-moustaches-progress.md`
 * § 3, 4, 8. Une ligne par boîte (`Nom = min ; Q1 ; médiane ; Q3 ; max`), ou une
 * boîte calculée par `describe.ts` (`données:`) — jamais un second calcul de quartile.
 */

import { describe, it, expect } from 'vitest';
import {
	findStatChartBlocks,
	isStatChartBlockStart,
	parseStatChartContent
} from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BoxPlotScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { parseMarkdown } from '$lib/ubumark';
import { describeList } from '$lib/statistics/describe';
import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';

// =============================================================================
// Helpers
// =============================================================================

const KIND = 'boite-a-moustaches';

const NAUTIC = [
	'axe: 25 à 60, de 5 en 5',
	'titre: temps (en s)',
	'Nautic = 28 ; 30 ; 37 ; 45 ; 58',
	'Neptune = 36 ; 37 ; 39 ; 42 ; 46'
].join('\n');

const SERIES = 'données: 3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21';

function specOf(source: string) {
	const node = parseStatChartContent(KIND, source);
	expect(node.errors).toEqual([]);
	return node.spec!;
}

function sceneOf(source: string, locale: 'fr' | 'en' = 'fr'): BoxPlotScene {
	return buildStatChartScene(specOf(source), { locale }) as BoxPlotScene;
}

function errorsOf(source: string): string[] {
	const node = parseStatChartContent(KIND, source);
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message);
}

const count = (text: string, marker: string) => text.split(marker).length - 1;

// =============================================================================
// Analyse
// =============================================================================

describe('```boite-a-moustaches — analyse', () => {
	it('le bloc est reconnu, dans un document aussi', () => {
		expect(isStatChartBlockStart('```boite-a-moustaches')).toBe(KIND);
		const doc = parseMarkdown(`Texte\n\n\`\`\`boite-a-moustaches\n${NAUTIC}\n\`\`\`\n\nSuite`);
		const node = doc.children.find((child) => child.type === 'stat-chart');
		expect(node).toMatchObject({ type: 'stat-chart', kind: KIND, errors: [] });
	});

	it('un bloc non fermé n’avale pas le texte qui suit', () => {
		const lines = ['```boite-a-moustaches', 'A = 1 ; 2 ; 3 ; 4 ; 5', '', 'Une phrase.'];
		expect(findStatChartBlocks(lines)).toEqual([
			{ kind: KIND, startIndex: 0, endIndex: 1, closed: false }
		]);
	});

	it('nominal : deux boîtes nommées, axe écrit, titre de l’axe, valeurs cachées', () => {
		const spec = specOf(NAUTIC);
		expect(spec.kind).toBe(KIND);
		expect(spec.boxPlot).toEqual({
			boxes: [
				{ name: 'Nautic', values: [28, 30, 37, 45, 58], line: 3 },
				{ name: 'Neptune', values: [36, 37, 39, 42, 46], line: 4 }
			],
			axis: { min: 25, max: 60, step: 5 },
			axisTitle: 'temps (en s)',
			showValues: false,
			fromData: false,
			toPlace: null
		});
	});

	it('nom avec espaces, boîte sans nom, décimaux à virgule, nombres négatifs', () => {
		expect(specOf('classe Nautic = 28 ; 30 ; 37 ; 45 ; 58').boxPlot!.boxes[0].name).toBe(
			'classe Nautic'
		);
		expect(specOf('= -2,5 ; 0 ; 1,25 ; 3 ; 7,5').boxPlot!.boxes[0]).toEqual({
			name: null,
			values: [-2.5, 0, 1.25, 3, 7.5],
			line: 1
		});
	});

	it('valeurs égales permises (min = Q1, médiane = Q3…)', () => {
		expect(specOf('A = 2 ; 2 ; 5 ; 5 ; 9').boxPlot!.boxes[0].values).toEqual([2, 2, 5, 5, 9]);
	});

	it('un point-virgule final ne compte pas (comme dans `données:`)', () => {
		expect(specOf('A = 28 ; 30 ; 37 ; 45 ; 58 ;').boxPlot!.boxes[0].values).toEqual([
			28, 30, 37, 45, 58
		]);
	});

	it('`données:` : une boîte sans nom, les cinq valeurs de describe.ts', () => {
		const box = specOf(SERIES).boxPlot!.boxes[0];
		const s = describeList([3, 5, 7, 8, 12, 13, 14, 18, 21])!;
		expect(box.name).toBeNull();
		expect(box.values).toEqual([s.min, s.q1, s.median, s.q3, s.max]);
		// Quartiles du programme, pas ceux des calculatrices (Q1 = 6)
		expect(box.values).toEqual([3, 7, 12, 14, 21]);
		expect(specOf(SERIES).boxPlot!.fromData).toBe(true);
	});

	it('`valeurs: oui`, `description:`, `taille:`', () => {
		const spec = specOf(`${NAUTIC}\nvaleurs: oui\ndescription: Deux classes\ntaille: grande`);
		expect(spec.boxPlot!.showValues).toBe(true);
		expect(spec.description).toBe('Deux classes');
		expect(spec.size).toBe('grande');
	});

	it('axe sans pas : de 1 en 1 ; axe à pas décimal', () => {
		expect(specOf('axe: 0 à 10\nA = 1 ; 2 ; 3 ; 4 ; 5').boxPlot!.axis).toEqual({
			min: 0,
			max: 10,
			step: 1
		});
		expect(
			specOf('axe: 0 à 1, de 0,1 en 0,1\nA = 0,1 ; 0,2 ; 0,3 ; 0,4 ; 0,5').boxPlot!.axis
		).toEqual({ min: 0, max: 1, step: 0.1 });
	});
});

describe('```boite-a-moustaches — refus situés', () => {
	it('pas exactement cinq valeurs', () => {
		const [message] = errorsOf('A = 1 ; 2 ; 3 ; 4');
		expect(message).toContain('Ligne 1');
		expect(message).toContain('4 valeurs');
		expect(message).toContain('minimum ; Q1 ; médiane ; Q3 ; maximum');
		expect(errorsOf('A = 1 ; 2 ; 3 ; 4 ; 5 ; 6')[0]).toContain('6 valeurs');
	});

	it('une valeur qui n’est pas un nombre, ou vide', () => {
		expect(errorsOf('A = 1 ; 2 ; abc ; 4 ; 5')[0]).toContain('« abc » n’est pas un nombre');
		expect(errorsOf('A = 1 ; 2 ; ; 4 ; 5')[0]).toContain('valeur vide');
	});

	it('valeurs dans le désordre : la paire fautive est nommée', () => {
		const [message] = errorsOf('Nautic = 28 ; 37 ; 30 ; 45 ; 58');
		expect(message).toContain('Ligne 1');
		expect(message).toContain('désordre');
		expect(message).toContain('Q1 (37)');
		expect(message).toContain('médiane (30)');
	});

	it('valeur hors de l’axe donné', () => {
		const [message] = errorsOf('axe: 25 à 50, de 5 en 5\nA = 28 ; 30 ; 37 ; 45 ; 58');
		expect(message).toContain('Ligne 2');
		expect(message).toContain('58');
		expect(message).toContain('hors de l’axe');
	});

	it('deux boîtes du même nom (sans tenir compte de la casse), deux boîtes sans nom', () => {
		const [same] = errorsOf('A = 1 ; 2 ; 3 ; 4 ; 5\na = 1 ; 2 ; 3 ; 4 ; 5');
		expect(same).toContain('Ligne 2');
		expect(same).toContain('« a »');
		expect(errorsOf('= 1 ; 2 ; 3 ; 4 ; 5\n= 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain('sans nom');
	});

	it('`données:` avec des lignes de boîtes', () => {
		expect(errorsOf(`${SERIES}\nA = 1 ; 2 ; 3 ; 4 ; 5`)[0]).toContain('pas les deux');
	});

	it('aucune boîte', () => {
		const [message] = errorsOf('titre: temps');
		expect(message).toContain('aucune boîte');
	});

	it('plus de 4 boîtes', () => {
		const five = ['A', 'B', 'C', 'D', 'E'].map((n) => `${n} = 1 ; 2 ; 3 ; 4 ; 5`).join('\n');
		expect(errorsOf(five)[0]).toContain('au plus 4 boîtes');
	});

	it('plus de 40 graduations', () => {
		expect(errorsOf('axe: 0 à 100\nA = 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain('au plus 40 graduations');
	});

	it('axe mal écrit, à l’envers, ou qui ne tombe pas juste', () => {
		expect(errorsOf('axe: de 0 à 10\nA = 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain('axe');
		expect(errorsOf('axe: 10 à 0\nA = 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain('axe');
		expect(errorsOf('axe: 0 à 10, de 3 en 3\nA = 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain('pas');
	});

	it('série `données:` de plus de 500 valeurs', () => {
		const many = Array.from({ length: 501 }, (_, i) => String(i)).join(' ; ');
		expect(errorsOf(`données: ${many}`)[0]).toContain('au plus 500 valeurs');
	});

	it('`données:` qui n’est pas une série de nombres', () => {
		expect(errorsOf('données: 3 ; bus ; 7')[0]).toContain('« bus »');
	});

	it('option inconnue, option répétée', () => {
		expect(errorsOf('couleur: rouge\nA = 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain(
			'option « couleur » inconnue'
		);
		expect(errorsOf('titre: a\ntitre: b\nA = 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain('déjà donnée');
	});

	it('une ligne qui n’est ni une boîte ni une option', () => {
		expect(errorsOf('A = 1 ; 2 ; 3 ; 4 ; 5\nn’importe quoi')[0]).toContain('Ligne 2');
	});
});

// =============================================================================
// Scène
// =============================================================================

describe('```boite-a-moustaches — scène', () => {
	it('axe écrit : bornes et graduations de 5 en 5, titre d’axe', () => {
		const scene = sceneOf(NAUTIC);
		expect(scene.kind).toBe(KIND);
		expect(scene.xMin).toBe(25);
		expect(scene.xMax).toBe(60);
		expect(scene.xTicks.map((t) => t.value)).toEqual([25, 30, 35, 40, 45, 50, 55, 60]);
		expect(scene.axisTitle).toBe('temps (en s)');
		expect(scene.boxes.map((b) => b.name)).toEqual(['Nautic', 'Neptune']);
		expect(scene.boxes[0].values).toEqual([28, 30, 37, 45, 58]);
		expect(scene.showValues).toBe(false);
		expect(scene.indicators).toEqual([]);
	});

	it('axe calculé : rond, contient min et max, ne part pas forcément de 0', () => {
		const scene = sceneOf('A = 1012 ; 1020 ; 1031 ; 1040 ; 1057');
		expect(scene.xMin).toBeLessThanOrEqual(1012);
		expect(scene.xMax).toBeGreaterThanOrEqual(1057);
		expect(scene.xMin).toBeGreaterThan(0);
		const step = scene.xTicks[1].value - scene.xTicks[0].value;
		// Pas 1, 2 ou 5 × 10^k ; bornes multiples du pas
		expect([1, 2, 5, 10, 20, 50]).toContain(step);
		expect(scene.xMin % step).toBe(0);
		expect(scene.xMax % step).toBe(0);
		expect(scene.xTicks[0].value).toBe(scene.xMin);
		expect(scene.xTicks.at(-1)!.value).toBe(scene.xMax);
	});

	it('axe calculé d’une série `données:` positive', () => {
		const scene = sceneOf(SERIES);
		expect(scene.xMin).toBeLessThanOrEqual(3);
		expect(scene.xMin).toBeGreaterThanOrEqual(0);
		expect(scene.xMax).toBeGreaterThanOrEqual(21);
	});

	it('description accessible : une phrase par boîte', () => {
		expect(sceneOf(NAUTIC).description).toBe(
			'Boîte Nautic : minimum 28, premier quartile 30, médiane 37, troisième quartile 45, maximum 58. ' +
				'Boîte Neptune : minimum 36, premier quartile 37, médiane 39, troisième quartile 42, maximum 46.'
		);
		expect(sceneOf('= 1,5 ; 2 ; 3 ; 4 ; 5').description).toBe(
			'Boîte à moustaches : minimum 1,5, premier quartile 2, médiane 3, troisième quartile 4, maximum 5.'
		);
		expect(sceneOf(`${NAUTIC}\ndescription: Deux classes`).description).toBe('Deux classes');
	});

	it('description en anglais', () => {
		expect(sceneOf('A = 1,5 ; 2 ; 3 ; 4 ; 5', 'en').description).toBe(
			'Box A: minimum 1.5, lower quartile 2, median 3, upper quartile 4, maximum 5.'
		);
	});

	it('`valeurs: oui` : cinq étiquettes, une seule rangée quand elles ont la place', () => {
		const scene = sceneOf(`${NAUTIC}\nvaleurs: oui`);
		expect(scene.showValues).toBe(true);
		expect(scene.boxes[0].labels).toEqual(['28', '30', '37', '45', '58']);
		expect(scene.boxes[0].valueRows).toEqual([0, 0, 0, 0, 0]);
		// Neptune : 36 et 37 sont à 11 px l'un de l'autre, 37 descend d'une rangée
		expect(scene.boxes[1].valueRows).toEqual([0, 1, 0, 0, 0]);
	});

	it('valeurs proches : étiquettes réparties sur plusieurs rangées, sans chevauchement', () => {
		const scene = sceneOf('axe: 0 à 100, de 10 en 10\nvaleurs: oui\nA = 10 ; 10,5 ; 11 ; 60 ; 90');
		const box = scene.boxes[0];
		expect(new Set(box.valueRows).size).toBeGreaterThan(1);
		// Sur une même rangée, deux étiquettes sont séparées d'au moins leurs demi-largeurs
		const px = scene.pixelSize.width / (scene.xMax - scene.xMin);
		for (let i = 0; i < 5; i++) {
			for (let j = i + 1; j < 5; j++) {
				if (box.valueRows[i] !== box.valueRows[j]) continue;
				const gap = Math.abs(box.values[j] - box.values[i]) * px;
				const needed = ((box.labels[i].length + box.labels[j].length) / 2) * 7;
				expect(gap, `${box.labels[i]} / ${box.labels[j]}`).toBeGreaterThanOrEqual(needed);
			}
		}
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('```boite-a-moustaches — Typst', () => {
	it('deux boîtes, deux médianes, quatre moustaches, les noms en chaîne échappée', () => {
		const typst = generateStatChartTypst(parseStatChartContent(KIND, NAUTIC));
		expect(typst).toContain('cetz.canvas');
		expect(count(typst, '// boîte')).toBe(2);
		expect(count(typst, '// médiane')).toBe(2);
		expect(count(typst, '// moustache')).toBe(4);
		expect(typst).toContain('"Nautic"');
		expect(typst).toContain('"Neptune"');
		expect(typst).toContain('"temps (en s)"');
		// Une graduation par pas : 8 de 25 à 60
		expect(count(typst, '// graduation')).toBe(8);
		expect(count(typst, '// valeur')).toBe(0);
	});

	it('`valeurs: oui` : cinq valeurs par boîte', () => {
		const typst = generateStatChartTypst(parseStatChartContent(KIND, `${NAUTIC}\nvaleurs: oui`));
		expect(count(typst, '// valeur')).toBe(10);
	});

	it('un texte d’auteur n’est jamais interprété comme du balisage', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent(KIND, 'titre: #set "x"\n$A* = 1 ; 2 ; 3 ; 4 ; 5')
		);
		expect(typst).toContain('"#set \\"x\\""');
		expect(typst).toContain('"$A*"');
	});

	it('bloc en erreur : cadre neutre, sans cetz', () => {
		const typst = generateStatChartTypst(parseStatChartContent(KIND, 'A = 1 ; 2'));
		expect(typst).not.toContain('cetz');
		expect(typst).toContain('Figure indisponible');
	});
});

// =============================================================================
// Éditeur riche
// =============================================================================

describe('```boite-a-moustaches — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `boite-a-moustaches` avec son texte', () => {
		const json = markdownToTipTap(`\`\`\`boite-a-moustaches\n${NAUTIC}\n\`\`\``);
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: KIND },
			content: [{ type: 'text', text: NAUTIC }]
		});
	});

	it('repart identique, bloc en erreur compris', () => {
		for (const body of [NAUTIC, SERIES, 'A = 1 ; 2']) {
			const md = `\`\`\`boite-a-moustaches\n${body}\n\`\`\``;
			expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
		}
	});
});
