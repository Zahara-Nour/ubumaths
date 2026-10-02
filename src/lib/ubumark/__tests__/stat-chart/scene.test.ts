/**
 * Blocs ```barres et ```circulaire — scène pure, partagée par l'écran (SVG) et
 * le PDF (Typst).
 *
 * Spécification validée par David le 2026-10-01 (lot 2).
 */

import { describe, it, expect, vi } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import {
	buildStatChartScene,
	PIE_MARKER_CM,
	PIE_MARKER_PX,
	PIE_MARKER_RADIUS,
	STAT_CHART_ASPECT_RATIO,
	type BarScene,
	type PieScene
} from '../../utils/stat-chart-scene';
import * as statistics from '$lib/statistics/describe';
import type { StatChartKind } from '../../types/stat-chart';
import { COURBE_PIXEL_WIDTH } from '../../utils/courbe-scene';
import { WIDTH_CM } from '../../generators/courbe-typst';
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

describe('repères numérotés (Q23)', () => {
	it('chaque secteur porte le numéro de sa ligne de légende', () => {
		const scene = pie('A = 0\nB = 2\nC = 2');

		expect(scene.legend.map((l) => l.marker)).toEqual([1, 2, 3]);
		expect(scene.sectors.map((s) => s.marker)).toEqual([2, 3]);
	});

	it('grand secteur : repère à l’intérieur, sans trait', () => {
		const [big] = pie('A = 3\nB = 1').sectors;
		const r = Math.hypot(big.markerPosition.x, big.markerPosition.y);

		expect(r).toBeLessThan(1);
		expect(big.leader).toBeNull();
	});

	it('petit secteur : repère hors du disque, relié par un trait', () => {
		const scene = pie('A = 99\nB = 1');
		const small = scene.sectors[1];
		const r = Math.hypot(small.markerPosition.x, small.markerPosition.y);

		expect(r).toBeGreaterThan(1);
		expect(small.leader).not.toBeNull();
		const [from, to] = small.leader!;
		expect(Math.hypot(from.x, from.y)).toBeCloseTo(1, 5);
		expect(Math.hypot(to.x, to.y)).toBeGreaterThan(1);
	});

	it('le repère est au milieu angulaire de son secteur', () => {
		const [first] = pie('A = 1\nB = 1').sectors;
		// Secteur de 0° à 180° : milieu à 90°, donc à droite (x > 0, y ≈ 0)
		expect(first.markerPosition.x).toBeGreaterThan(0);
		expect(first.markerPosition.y).toBeCloseTo(0, 10);
	});
});

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

	it('couleurs : une palette fixe de 7, dans l’ordre', () => {
		const source = Array.from({ length: 5 }, (_, i) => `C${i} = 1`).join('\n');

		expect(pie(source).sectors.map((s) => s.colorIndex)).toEqual([0, 1, 2, 3, 4]);
	});

	// Q23 : jamais deux couleurs identiques côte à côte, dernier et premier compris
	it.each([8, 9, 12, 15])('%i secteurs : deux voisins n’ont jamais la même couleur', (n) => {
		const source = Array.from({ length: Math.min(n, 12) }, (_, i) => `C${i} = 1`).join('\n');
		const colors = pie(source).sectors.map((s) => s.colorIndex);

		colors.forEach((c, i) =>
			expect(c, `secteur ${i + 1}`).not.toBe(colors[(i + 1) % colors.length])
		);
	});

	it('voisins après un effectif nul : couleurs différentes aussi', () => {
		const lines = ['A = 1', ...Array.from({ length: 6 }, (_, i) => `Z${i} = 0`), 'H = 1', 'I = 1'];
		const colors = pie(lines.join('\n')).sectors.map((s) => s.colorIndex);

		colors.forEach((c, i) => expect(c).not.toBe(colors[(i + 1) % colors.length]));
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
			'Diagramme circulaire : Bus 46,7 %, Vélo 20 %, À pied 33,3 %.'
		);
	});

	// Q24 : jamais une valeur que la légende cache à l'élève voyant
	it('circulaire : la description dit ce que la légende affiche, rien de plus', () => {
		expect(pie(`étiquettes: effectifs\n${TRANSPORT}`).description).toBe(
			'Diagramme circulaire : Bus 14, Vélo 6, À pied 10.'
		);
		expect(pie(`étiquettes: angles\n${TRANSPORT}`).description).toBe(
			'Diagramme circulaire : Bus 168°, Vélo 72°, À pied 120°.'
		);
		const hidden = pie(`étiquettes: aucune\n${TRANSPORT}`).description;
		expect(hidden).toBe('Diagramme circulaire : Bus, Vélo, À pied.');
		expect(hidden).not.toMatch(/\d/);
	});

	it('la description de l’auteur l’emporte', () => {
		expect(bars('description: Peu de danse.\nA = 1').description).toBe('Peu de danse.');
	});
});

// =============================================================================
// Repères extérieurs de petits secteurs voisins (Q54)
// =============================================================================

describe('repères extérieurs : jamais l’un sur l’autre', () => {
	const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
		Math.hypot(a.x - b.x, a.y - b.y);
	/** Angle d'un point depuis midi, sens horaire, en degrés */
	const clockAngle = (p: { x: number; y: number }) =>
		((Math.atan2(p.x, p.y) * 180) / Math.PI + 360) % 360;
	const outside = (scene: PieScene) => scene.sectors.filter((s) => s.leader !== null);
	const onCircle = (degrees: number, radius: number) => ({
		x: radius * Math.sin((degrees * Math.PI) / 180),
		y: radius * Math.cos((degrees * Math.PI) / 180)
	});

	it('deux secteurs voisins de 2 % : écartés d’au moins un diamètre de repère', () => {
		const [a, b] = outside(pie('A = 2\nB = 2\nC = 96'));

		expect(distance(a.markerPosition, b.markerPosition)).toBeGreaterThanOrEqual(
			2 * PIE_MARKER_RADIUS
		);
	});

	it('chaque trait part du milieu de SON secteur, et finit sur son repère', () => {
		for (const sector of outside(pie('A = 2\nB = 2\nC = 96'))) {
			const middle = (sector.startAngle + sector.endAngle) / 2;
			const leader = sector.leader!;
			expect(leader[0].x).toBeCloseTo(onCircle(middle, 1).x, 9);
			expect(leader[0].y).toBeCloseTo(onCircle(middle, 1).y, 9);
			expect(leader.at(-1)).toEqual(sector.markerPosition);
		}
	});

	/** Distance du centre au segment [p, q] */
	const segmentDistance = (p: { x: number; y: number }, q: { x: number; y: number }) => {
		const [dx, dy] = [q.x - p.x, q.y - p.y];
		const t = Math.max(0, Math.min(1, -(p.x * dx + p.y * dy) / (dx * dx + dy * dy)));
		return Math.hypot(p.x + t * dx, p.y + t * dy);
	};

	// Revue : un trait droit vers un repère très écarté coupait le disque
	it('sept petits secteurs consécutifs : aucun trait n’entre dans le disque', () => {
		const scene = pie('A = 1\nB = 1\nC = 1\nD = 1\nE = 1\nF = 1\nG = 1\nH = 93');
		for (const sector of outside(scene)) {
			const leader = sector.leader!;
			for (let k = 1; k < leader.length; k++) {
				expect(segmentDistance(leader[k - 1], leader[k])).toBeGreaterThanOrEqual(1 - 1e-9);
			}
		}
	});

	it('deux petits secteurs éloignés : aucun ne bouge', () => {
		const scene = pie('A = 2\nB = 48\nC = 2\nD = 48');
		for (const sector of outside(scene)) {
			const middle = (sector.startAngle + sector.endAngle) / 2;
			expect(sector.markerPosition.x).toBeCloseTo(onCircle(middle, 1.2).x, 9);
			expect(sector.markerPosition.y).toBeCloseTo(onCircle(middle, 1.2).y, 9);
		}
	});

	const noOverlap = (scene: PieScene) => {
		const markers = outside(scene).map((s) => s.markerPosition);
		for (let i = 0; i < markers.length; i++) {
			for (let j = i + 1; j < markers.length; j++) {
				expect(distance(markers[i], markers[j]), `${i}-${j}`).toBeGreaterThanOrEqual(
					2 * PIE_MARKER_RADIUS
				);
			}
		}
	};

	it('deux groupes qui se rejoignent une fois étalés : fusionnés, sans chevauchement', () => {
		noOverlap(pie('A = 1\nB = 1\nC = 1\nD = 3\nE = 1\nF = 1\nG = 1\nH = 91'));
	});

	// Revue : un fuzz à 17 repères et plus trouvait des chevauchements à la
	// jonction de midi ; un disque a au plus 12 catégories. Ce fuzz-là porte
	// donc sur de VRAIS blocs : 2 à 12 catégories, beaucoup de petites.
	it('fuzz : 3000 disques réels, ni chevauchement, ni trait dans le disque', () => {
		let seed = 12345;
		const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
		for (let run = 0; run < 3000; run++) {
			const count = 2 + Math.floor(random() * 11);
			const values = Array.from({ length: count }, () =>
				random() < 0.7 ? 1 + Math.floor(random() * 4) : 1 + Math.floor(random() * 100)
			);
			const scene = pie(values.map((v, i) => `S${i + 1} = ${v}`).join('\n'));
			noOverlap(scene);
			for (const sector of outside(scene)) {
				const leader = sector.leader!;
				for (let k = 1; k < leader.length; k++) {
					expect(segmentDistance(leader[k - 1], leader[k])).toBeGreaterThanOrEqual(1 - 1e-9);
				}
			}
		}
	});

	// La constante couvre les DEUX rendus, à chaque taille (revue)
	it('PIE_MARKER_RADIUS majore le repère de l’écran et du PDF, à chaque taille', () => {
		for (const size of ['petite', 'moyenne', 'grande'] as const) {
			const screen = PIE_MARKER_PX / ((COURBE_PIXEL_WIDTH[size] * STAT_CHART_ASPECT_RATIO) / 2);
			const pdf = PIE_MARKER_CM / (WIDTH_CM[size] * 0.3);
			expect(Math.max(screen, pdf), size).toBeLessThanOrEqual(PIE_MARKER_RADIUS);
		}
	});

	it('cinq petits secteurs consécutifs : aucun chevauchement, ordre gardé', () => {
		const markers = outside(pie('A = 1\nB = 1\nC = 1\nD = 1\nE = 1\nF = 95')).map(
			(s) => s.markerPosition
		);

		expect(markers).toHaveLength(5);
		for (let i = 0; i < markers.length; i++) {
			for (let j = i + 1; j < markers.length; j++) {
				expect(distance(markers[i], markers[j])).toBeGreaterThanOrEqual(2 * PIE_MARKER_RADIUS);
			}
		}
		// L'ordre des secteurs, dans le sens horaire autour du groupe
		const angles = markers.map(clockAngle).map((a) => (a > 180 ? a - 360 : a));
		expect([...angles].sort((x, y) => x - y)).toEqual(angles);
	});

	it('petits secteurs de part et d’autre de midi : écartés aussi', () => {
		const markers = outside(pie('A = 1\nB = 98\nC = 1')).map((s) => s.markerPosition);

		expect(distance(markers[0], markers[1])).toBeGreaterThanOrEqual(2 * PIE_MARKER_RADIUS);
	});
});
