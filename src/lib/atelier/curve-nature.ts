/**
 * Atelier — la nature d'une courbe, telle que sa carte la dit
 *
 * « droite », « cercle »… (géométrie v2, lot 1, C1 et C2) et le constat d'une
 * courbe vide (C6 : on ne valide pas, on constate). La classification est
 * celle de `courbe()` (`geometry/curve-nature.ts`) : une seule règle pour la
 * figure et pour la carte.
 *
 * ⚠️ RECALCULÉE à chaque lecture, jamais rangée : elle suit les valeurs que
 * l'équation cite (`x² + y² = a²` est un point pour a = 0).
 *
 * @module atelier/curve-nature
 */

import type { Atelier } from './atelier.svelte';
import { curveNatureOf as natureOfEquation } from '$lib/geometry-core/geometry/curve-nature';
import type { CurveNature } from '$lib/geometry-core/geometry/curve-nature';
import { substitutedAstOf } from './engine';

// =============================================================================
// Types
// =============================================================================

/** Ce que la carte affiche : l'étiquette de type, et un constat éventuel. */
export interface CurveNatureReading {
	readonly label: string;
	readonly note?: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** C6, mot pour mot. */
export const EMPTY_CURVE = 'Aucun point ne vérifie cette équation.';

/** Une conique réduite à un point (x² + y² = 0). */
export const SINGLE_POINT_CURVE = 'Un seul point vérifie cette équation.';

const LABELS: Record<CurveNature, CurveNatureReading> = {
	line: { label: 'droite' },
	circle: { label: 'cercle' },
	ellipse: { label: 'ellipse' },
	parabola: { label: 'parabole' },
	hyperbola: { label: 'hyperbole' },
	lines: { label: 'deux droites' },
	point: { label: 'point', note: SINGLE_POINT_CURVE },
	empty: { label: 'courbe', note: EMPTY_CURVE },
	curve: { label: 'courbe' }
};

// =============================================================================
// Fonctions
// =============================================================================

/**
 * La nature de la courbe `name`, toutes les valeurs citées remplacées, ou
 * `null` si elle n'en a pas (pas une courbe, en attente, en erreur).
 */
export function curveNatureOf(atelier: Atelier, name: string): CurveNatureReading | null {
	const object = atelier.get(name);
	if (object?.kind !== 'curve' || object.status !== 'ok') return null;
	const substituted = substitutedAstOf(atelier, name);
	if (!substituted.ok) return null;
	const nature = natureOfEquation(substituted.ast);
	return nature === null ? null : LABELS[nature];
}
