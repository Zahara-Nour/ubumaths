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

import type { FigureNode, FigureSize } from '../types/figure';
import { buildFigureScene } from '../utils/figure-scene';
import { exportToTypst } from '$lib/geometry-core/rendering/export-typst';
import { FIGURE_TYPST_UNAVAILABLE } from './figure-typst-registry';

/** Largeur du cadre en cm (comme ```courbe) ; une colonne de fiche fait ~8,7 cm. */
const WIDTH_CM: Record<FigureSize, number> = {
	petite: 4.5,
	moyenne: 6.5,
	grande: 7.6
};

export function generateFigureTypst(node: FigureNode): string {
	const { scene } = buildFigureScene(node);
	if (!scene) return FIGURE_TYPST_UNAVAILABLE;

	const v = scene.viewport;
	const unitCm = Math.round((WIDTH_CM[node.header.size] / (v.xMax - v.xMin)) * 1e4) / 1e4;
	const canvas = exportToTypst(scene.figure, scene.viewport, {
		scale: unitCm,
		markScale: 1 / unitCm,
		includeImport: false,
		includeViewportBounds: true,
		annotate: true
	});
	return `#import "@preview/cetz:0.3.0"\n\n#align(center)[\n${canvas}\n]`;
}
