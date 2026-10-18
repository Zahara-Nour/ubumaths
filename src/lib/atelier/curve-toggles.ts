/**
 * Atelier — allumer ou éteindre la tangente et l'aire d'une courbe
 *
 * Les deux gestes existent à deux endroits : les cases de « Sur le graphique »
 * (`CurveSettings`) et le menu « Affichage » de la carte d'une fonction (lot 3
 * de `docs/wip/atelier-refonte-interface-phase0.md`). Une seule règle pour les
 * deux : la tangente part du milieu de la fenêtre visible, l'aire couvre sa
 * moitié centrale — comme dans le grapheur.
 *
 * @module atelier/curve-toggles
 */

import type { CurveDisplay } from './types';

/** La fenêtre visible du graphique, en abscisses. */
export interface VisibleRange {
	readonly xMin: number;
	readonly xMax: number;
}

function round(n: number): number {
	return Math.round(n * 100) / 100;
}

/** Le réglage qui allume la tangente (au milieu de la fenêtre) ou l'éteint. */
export function tangentToggle(on: boolean, range: VisibleRange): Partial<CurveDisplay> {
	return { tangentAt: on ? round((range.xMin + range.xMax) / 2) : null };
}

/** Le réglage qui allume l'aire (moitié centrale de la fenêtre) ou l'éteint. */
export function integralToggle(on: boolean, range: VisibleRange): Partial<CurveDisplay> {
	const quarter = (range.xMax - range.xMin) / 4;
	return {
		integral: on ? { from: round(range.xMin + quarter), to: round(range.xMax - quarter) } : null
	};
}
