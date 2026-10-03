/**
 * Bloc ```figure → Typst : point d'entrée LÉGER du générateur
 * ===========================================================
 *
 * `typst-generator.ts` est réexporté par le baril `$lib/ubumark`, importé par
 * le rendu Markdown de TOUTES les pages. S'il importait `figure-typst.ts`
 * (interpréteur du DSL de geometry-core), rollup rangerait ce code — atteignable
 * statiquement — dans le chunk des pages Markdown (mesuré le 2026-10-01 :
 * ~630 Ko non minifiés, dont les 200 Ko de `builtins.ts`).
 *
 * Le générateur passe donc par ce registre : le rendu réel est inscrit par
 * `figure-typst-setup.ts`, importé (effet de bord voulu) par les modules qui
 * PRODUISENT les PDF (fiches, corrigés, carnets, exercices). Sans inscription,
 * le bloc devient le cadre neutre « Figure indisponible » — jamais une erreur
 * de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/figure-typst-registry
 */

import type { FigureNode } from '../types/figure';

export const FIGURE_TYPST_UNAVAILABLE =
	'#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[Figure indisponible]';

export interface FigureTypstOptions {
	/** Langue du document : séparateur décimal des graduations */
	language?: string;
}

type FigureTypstRenderer = (node: FigureNode, options?: FigureTypstOptions) => string;

let renderer: FigureTypstRenderer | null = null;

/** Inscrire le rendu réel (appelé par `figure-typst-setup.ts`). */
export function registerFigureTypstRenderer(fn: FigureTypstRenderer): void {
	renderer = fn;
}

/** Typst d'un bloc ```figure ; cadre neutre si aucun rendu n'est inscrit. */
export function renderFigureTypst(node: FigureNode, options: FigureTypstOptions = {}): string {
	return renderer ? renderer(node, options) : FIGURE_TYPST_UNAVAILABLE;
}
