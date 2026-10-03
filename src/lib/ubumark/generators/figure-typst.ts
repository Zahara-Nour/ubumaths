/**
 * Bloc ```figure → Typst (cetz 0.3.0)
 * ===================================
 *
 * Dessine la MÊME scène que l'écran (`buildFigureScene`) avec l'exporteur de
 * geometry-core (`exportToTypst`, aligné sur cetz 0.3.0 comme les blocs
 * `courbe`, `trig`, `line`). Chaque élément est précédé d'un repère
 * `// element <id>` : les tests vérifient que l'écran et le PDF montrent les
 * mêmes objets.
 *
 * ⚠️ En production, le PDF est compilé dans le navigateur par typst.ts
 * 0.6.1-rc5 : une seule erreur fait échouer TOUTE la fiche. D'où :
 * - noms et textes d'auteur en CHAÎNES Typst (jamais en mode math) ;
 * - bloc en erreur → cadre neutre « Figure indisponible », sans cetz.
 *
 * Repère ISOTROPE : une unité vaut `largeur / (xmax − xmin)` cm ; les tailles
 * fixes (points, codages, angles) sont compensées (`markScale`) pour garder la
 * même taille sur la page quelle que soit la fenêtre.
 *
 * @module ubumark/generators/figure-typst
 */

import type { FigureNode, FigureWindow } from '../types/figure';
import { FIGURE_WIDTH_CM } from '../types/figure';
import { buildFigureScene, type FigureFrame } from '../utils/figure-scene';
import { exportToTypst } from '$lib/geometry-core/rendering/export-typst';
import { FIGURE_TYPST_UNAVAILABLE, type FigureTypstOptions } from './figure-typst-registry';

/**
 * Mesures du repère sur la page, en cm : celles de `courbe-typst.ts` (traits
 * 0,6 pt, graduations ± 0,06 cm, étiquettes 6,5 pt à 0,1 cm de l'axe, grille
 * 0,3 pt gris clair). La pointe de flèche est un triangle plein (pas une
 * `mark` cetz, que l'échelle du repère agrandirait ou réduirait).
 */
const FRAME_CM = {
	axisOvershoot: 0.15,
	arrowTip: 0.27,
	arrowBase: 0.12,
	arrowHalfWidth: 0.07,
	tickHalf: 0.06,
	labelGap: 0.1
} as const;

function num(n: number): string {
	const s = (Math.round(n * 1000) / 1000).toString();
	return s === '-0' ? '0' : s;
}

/** Lignes cetz du repère (sous les objets), en unités du repère ; `cm` : 1 cm en unités. */
function frameToTypst(frame: FigureFrame, w: FigureWindow, cm: number): string[] {
	const p = (x: number, y: number) => `(${num(x)}, ${num(y)})`;
	const out: string[] = [];
	if (frame.grid) {
		out.push('  // grille');
		for (const x of frame.grid.xs) {
			out.push(`  line(${p(x, w.yMin)}, ${p(x, w.yMax)}, stroke: 0.3pt + luma(205))`);
		}
		for (const y of frame.grid.ys) {
			out.push(`  line(${p(w.xMin, y)}, ${p(w.xMax, y)}, stroke: 0.3pt + luma(205))`);
		}
	}
	const axes = frame.axes;
	if (!axes) return out;
	const ax = axes.xAxisY;
	const ay = axes.yAxisX;
	const f = FRAME_CM;
	out.push('  // axes');
	out.push(`  line(${p(w.xMin, ax)}, ${p(w.xMax + f.axisOvershoot * cm, ax)}, stroke: 0.6pt)`);
	out.push(`  line(${p(ay, w.yMin)}, ${p(ay, w.yMax + f.axisOvershoot * cm)}, stroke: 0.6pt)`);
	const xBase = w.xMax + f.arrowBase * cm;
	const yBase = w.yMax + f.arrowBase * cm;
	const half = f.arrowHalfWidth * cm;
	out.push(
		`  line(${p(w.xMax + f.arrowTip * cm, ax)}, ${p(xBase, ax + half)}, ${p(xBase, ax - half)}, close: true, fill: black, stroke: none)`
	);
	out.push(
		`  line(${p(ay, w.yMax + f.arrowTip * cm)}, ${p(ay - half, yBase)}, ${p(ay + half, yBase)}, close: true, fill: black, stroke: none)`
	);
	const tick = f.tickHalf * cm;
	const gap = f.labelGap * cm;
	if (axes.ticks.x.length + axes.ticks.y.length > 0) out.push('  // graduations');
	for (const t of axes.ticks.x) {
		out.push(`  line(${p(t.value, ax - tick)}, ${p(t.value, ax + tick)}, stroke: 0.5pt)`);
		if (t.label !== null) {
			out.push(
				`  content(${p(t.value, ax - gap)}, anchor: "north", text(size: 6.5pt)[${t.label}])`
			);
		}
	}
	for (const t of axes.ticks.y) {
		out.push(`  line(${p(ay - tick, t.value)}, ${p(ay + tick, t.value)}, stroke: 0.5pt)`);
		if (t.label !== null) {
			out.push(`  content(${p(ay - gap, t.value)}, anchor: "east", text(size: 6.5pt)[${t.label}])`);
		}
	}
	if (axes.originLabel) {
		out.push(`  content(${p(ay - gap, ax - gap)}, anchor: "north-east", text(size: 6.5pt)[O])`);
	}
	return out;
}

export function generateFigureTypst(node: FigureNode, options: FigureTypstOptions = {}): string {
	const { scene } = buildFigureScene(node, {
		locale: options.language === 'en' ? 'en' : 'fr'
	});
	if (!scene) return FIGURE_TYPST_UNAVAILABLE;

	const v = scene.viewport;
	const unitCm = Math.round((FIGURE_WIDTH_CM[node.header.size] / (v.xMax - v.xMin)) * 1e4) / 1e4;
	const canvas = exportToTypst(scene.figure, scene.viewport, {
		...(scene.frame ? { underlay: frameToTypst(scene.frame, v, 1 / unitCm) } : {}),
		scale: unitCm,
		markScale: 1 / unitCm,
		includeImport: false,
		includeViewportBounds: true,
		annotate: true
	});
	return `#import "@preview/cetz:0.3.0"\n\n#align(center)[\n${canvas}\n]`;
}
