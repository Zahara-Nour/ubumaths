/**
 * Blocs ```barres et ```circulaire — scène pure, partagée par l'écran (SVG) et
 * le PDF (Typst).
 *
 * Spécification validée par David le 2026-10-01 (lot 2).
 */

import { describe, it, expect, vi } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BarScene, type PieScene } from '../../utils/stat-chart-scene';
import * as statistics from '$lib/statistics/describe';
import type { StatChartKind } from '../../types/stat-chart';
import type { ContentLocale } from '$lib/types/locale';

vi.mock('$lib/statistics/describe', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/statistics/describe')>();
	return { ...original, categoryFrequencies: vi.fn(original.categoryFrequencies) };
});

// =============================================================================
// Helpers
// =============================================================================

function sceneOf(kind: StatChartKind, source: string, locale: ContentLocale = 'fr') {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return buildStatChartScene(node.spec, { locale });
}

const bars = (source: string, locale?: ContentLocale) =>
	sceneOf('barres', source, locale) as BarScene;
const pie = (source: string, locale?: ContentLocale) =>
	sceneOf('circulaire', source, locale) as PieScene;

const TRANSPORT = 'Bus = 14\nVélo = 6\nÀ pied = 10';

// =============================================================================
// Barres
// =============================================================================

describe('diagramme en barres', () => {
	it('une barre par catégorie, dans l’ordre, effectif nul compris', () => {
		const scene = bars('A = 3\nB = 0\nC = 5');

		expect(scene.kind).toBe('barres');
		expect(scene.bars.map((b) => [b.label, b.value])).toEqual([
			['A', 3],
			['B', 0],
			['C', 5]
		]);
	});

	it('les barres sont équidistantes et ne se touchent pas', () => {
		const scene = bars('A = 3\nB = 1\nC = 5');

		scene.bars.forEach((bar, i) => {
			expect(bar.left).toBeGreaterThan(i);
			expect(bar.right).toBeLessThan(i + 1);
			expect(bar.right - bar.left).toBeCloseTo(scene.bars[0].right - scene.bars[0].left, 10);
		});
	});

	it('l’axe vertical part de 0 et couvre la plus grande valeur', () => {
		const scene = bars('A = 3\nB = 17');

		expect(scene.ticks[0].value).toBe(0);
		expect(scene.yMax).toBeGreaterThanOrEqual(17);
		expect(scene.ticks[scene.ticks.length - 1].value).toBe(scene.yMax);
	});

	it('graduations régulières', () => {
		const values = bars('A = 3\nB = 17').ticks.map((t) => t.value);
		const step = values[1] - values[0];

		values.forEach((v, i) => expect(v).toBeCloseTo(i * step, 10));
	});

	it('graduations décimales écrites selon la langue du document', () => {
		const fr = bars('A = 1 %\nB = 2 %').ticks.map((t) => t.label);
		const en = bars('A = 1 %\nB = 2 %', 'en').ticks.map((t) => t.label);

		// Le pas exact dépend de `computeGridStep` : on vérifie le séparateur
		expect(fr.some((label) => /^\d+,\d+$/.test(label))).toBe(true);
		expect(en.some((label) => /^\d+\.\d+$/.test(label))).toBe(true);
		expect(fr.join(' ')).not.toContain('.');
	});

	it('titre de l’axe vertical par défaut selon l’unité', () => {
		expect(bars('A = 1').axisTitles.y).toBe('Effectif');
		expect(bars('A = 10 %').axisTitles.y).toBe('Fréquence (%)');
		expect(bars('A = 1').axisTitles.x).toBeNull();
	});

	it('titres d’axes de l’auteur', () => {
		expect(bars('axes: Sport ; Élèves\nA = 1').axisTitles).toEqual({ x: 'Sport', y: 'Élèves' });
	});

	it('valeurs au-dessus des barres, à la française', () => {
		const scene = bars('valeurs: oui\nA = 12,5 %\nB = 3 %');

		expect(scene.showValues).toBe(true);
		expect(scene.bars.map((b) => b.valueLabel)).toEqual(['12,5 %', '3 %']);
	});

	it('incline les noms quand il y a beaucoup de catégories', () => {
		const many = Array.from({ length: 8 }, (_, i) => `C${i} = 1`).join('\n');

		expect(bars('A = 1\nB = 2').rotateLabels).toBe(false);
		expect(bars(many).rotateLabels).toBe(true);
	});

	it('donne la longueur du nom le plus long, pour placer le titre de l’axe dessous', () => {
		expect(bars('Football = 1\nDanse = 2').longestLabel).toBe(8);
	});

	// Revue du lot 2 : « A = 1 ; B = 2 ; C = 3 » graduait en 0,5 un axe « Effectif »
	it('des effectifs ont des graduations entières', () => {
		for (const source of ['A = 1\nB = 2\nC = 3', 'A = 1', 'A = 0\nB = 0']) {
			for (const tick of bars(source).ticks) {
				expect(Number.isInteger(tick.value), `${source} → ${tick.value}`).toBe(true);
			}
		}
	});

	it('série toute nulle : un axe quand même', () => {
		const scene = bars('A = 0\nB = 0');

		expect(scene.yMax).toBeGreaterThan(0);
	});
});

// =============================================================================
// Circulaire
// =============================================================================

describe('diagramme circulaire', () => {
	it('les angles font 360°, premier secteur à midi, dans l’ordre écrit', () => {
		const scene = pie(TRANSPORT);

		expect(scene.sectors[0].startAngle).toBe(0);
		expect(scene.sectors[scene.sectors.length - 1].endAngle).toBeCloseTo(360, 10);
		expect(scene.sectors.map((s) => s.label)).toEqual(['Bus', 'Vélo', 'À pied']);
		// 14 / 30 × 360 = 168
		expect(scene.sectors[0].endAngle).toBeCloseTo(168, 10);
		scene.sectors.slice(1).forEach((s, i) => expect(s.startAngle).toBe(scene.sectors[i].endAngle));
	});

	it('tourne dans le sens horaire : le premier secteur commence vers la droite', () => {
		const [first] = pie(TRANSPORT).sectors;
		// Repère mathématique (y vers le haut), centre (0 ; 0), rayon 1
		const second = first.polygon[2];

		expect(second.x).toBeGreaterThan(0);
		expect(second.y).toBeGreaterThan(0);
	});

	it('le contour d’un secteur part du centre', () => {
		const [first] = pie(TRANSPORT).sectors;

		expect(first.polygon[0]).toEqual({ x: 0, y: 0 });
		expect(first.polygon[1].x).toBeCloseTo(0, 10);
		expect(first.polygon[1].y).toBeCloseTo(1, 10);
	});

	it('un effectif nul : pas de secteur, mais une ligne de légende', () => {
		const scene = pie('A = 0\nB = 2\nC = 2');

		expect(scene.sectors.map((s) => s.label)).toEqual(['B', 'C']);
		expect(scene.legend.map((l) => l.label)).toEqual(['A', 'B', 'C']);
	});

	it('une seule catégorie : un disque entier', () => {
		const [only] = pie('Tout = 5').sectors;

		expect(only.startAngle).toBe(0);
		expect(only.endAngle).toBe(360);
		// Pas de rayon tracé du centre vers midi (vu dans le PDF du 2026-10-01)
		expect(only.polygon).not.toContainEqual({ x: 0, y: 0 });
	});

	it('légende en pourcentages par défaut, une décimale, à la française', () => {
		expect(pie(TRANSPORT).legend.map((l) => l.text)).toEqual([
			'Bus — 46,7 %',
			'Vélo — 20 %',
			'À pied — 33,3 %'
		]);
	});

	it('légende en effectifs, en angles au degré, ou sans valeur', () => {
		expect(pie(`étiquettes: effectifs\n${TRANSPORT}`).legend[0].text).toBe('Bus — 14');
		expect(pie(`étiquettes: angles\n${TRANSPORT}`).legend[0].text).toBe('Bus — 168°');
		expect(pie(`étiquettes: aucune\n${TRANSPORT}`).legend[0].text).toBe('Bus');
	});

	it('légende anglaise : point décimal', () => {
		expect(pie(TRANSPORT, 'en').legend[0].text).toBe('Bus — 46.7 %');
	});

	it('pourcentages saisis : la légende les rend tels quels', () => {
		expect(pie('A = 35 %\nB = 65 %').legend[0].text).toBe('A — 35 %');
	});

	it('couleurs : une palette fixe de 7, reprise au-delà', () => {
		const source = Array.from({ length: 9 }, (_, i) => `C${i} = 1`).join('\n');
		const colors = pie(source).legend.map((l) => l.colorIndex);

		expect(colors).toEqual([0, 1, 2, 3, 4, 5, 6, 0, 1]);
	});

	it('les fréquences viennent du module statistique', () => {
		vi.mocked(statistics.categoryFrequencies).mockClear();

		pie(TRANSPORT);

		expect(statistics.categoryFrequencies).toHaveBeenCalledWith([14, 6, 10]);
	});
});

// =============================================================================
// Accessibilité
// =============================================================================

describe('titre et description accessibles', () => {
	it('titre accessible : le genre de diagramme (le titre de l’auteur est dans figcaption)', () => {
		expect(bars('titre: Sports\nA = 1').accessibleTitle).toBe('Diagramme en barres');
		expect(bars('titre: Sports\nA = 1').title).toBe('Sports');
		expect(bars('A = 1').accessibleTitle).toBe('Diagramme en barres');
		expect(pie('A = 1').accessibleTitle).toBe('Diagramme circulaire');
	});

	it('description automatique qui énumère les données', () => {
		expect(bars('Football = 12\nNatation = 8').description).toBe(
			'Diagramme en barres : Football 12, Natation 8.'
		);
		expect(pie(TRANSPORT).description).toBe(
			'Diagramme circulaire : Bus 14 (46,7 %), Vélo 6 (20 %), À pied 10 (33,3 %).'
		);
	});

	it('la description de l’auteur l’emporte', () => {
		expect(bars('description: Peu de danse.\nA = 1').description).toBe('Peu de danse.');
	});
});
