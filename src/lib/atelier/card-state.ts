/**
 * Atelier — ce qu'une carte dit d'elle-même, hors de sa définition
 *
 * Partagé par les cartes d'une ligne (refonte de l'atelier, lots 3 à 4b) :
 * l'état d'un objet qui ne produit rien (« à compléter », « en attente »), et,
 * pour un point ou une courbe de la figure, sa nature, ce que vaut sa
 * construction et les objets qu'elle suit.
 *
 * @module atelier/card-state
 */

import type { Atelier } from './atelier.svelte';
import type { CurveObject, ObjectStatus, PointObject } from './types';
import { curveNatureOf } from './curve-nature';
import { constructionNatureOf, constructionSummaryOf, isConstruction } from './construction';
import { displayName } from './names';

/** Ce que l'élève lit quand l'objet ne peut rien produire, ou `null` s'il est prêt. */
export function stateLabelOf(status: ObjectStatus): string | null {
	switch (status) {
		case 'error':
			return 'erreur';
		case 'pending':
			return 'en attente';
		case 'incomplete':
			return 'à compléter';
		default:
			return null;
	}
}

/**
 * La nature d'un point ou d'une courbe (« point », « droite », « segment »…),
 * et le constat d'une courbe vide (C6) — recalculés, jamais rangés.
 */
export function figureNatureOf(
	atelier: Atelier,
	object: PointObject | CurveObject
): { readonly label: string; readonly note?: string } {
	const construction = constructionNatureOf(object);
	if (object.kind === 'curve') {
		return curveNatureOf(atelier, object.name) ?? { label: construction ?? 'courbe' };
	}
	return { label: construction ?? 'point' };
}

/**
 * Le signe entre le nom et la définition : « d : y = 3x − 2 » pour une courbe
 * par équation (G5), « = » pour un point et pour une construction (L2).
 */
export function figureSeparatorOf(object: PointObject | CurveObject): ':' | '=' {
	return object.kind === 'curve' && !isConstruction(object) ? ':' : '=';
}

/** Ce que vaut une construction (coordonnées, équation, longueur), en LaTeX et en texte. */
export const figureSummaryOf = constructionSummaryOf;

/**
 * Ce que dit l'icône de lien d'une construction : les objets qu'elle suit
 * (`I = milieu(A, B)` suit A et B), ou `null` pour un objet qui ne suit rien.
 */
export function followsOf(atelier: Atelier, object: PointObject | CurveObject): string | null {
	if (!isConstruction(object)) return null;
	// Les objets que la construction cite, dans l'ordre des cartes — ceux dont elle
	// est un dépendant (`dependents`), lus en une fois (chantier perf du 2026-10-19)
	const names = new Set(atelier.citedNames(object.name));
	const cited = atelier.objects
		.filter((o) => o.name !== object.name && names.has(o.name))
		.map((o) => displayName(o.name));
	if (cited.length === 0) return null;
	const list =
		cited.length === 1
			? cited[0]
			: `${cited.slice(0, -1).join(', ')} et ${cited[cited.length - 1]}`;
	const changes = cited.length === 1 ? 'ses changements' : 'leurs changements';
	return `${displayName(object.name)} se construit à partir de ${list}, et suit ${changes}.`;
}
