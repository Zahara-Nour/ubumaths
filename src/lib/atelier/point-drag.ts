/**
 * Atelier — glisser un point à la souris (géométrie, lot 3, PR 1)
 *
 * Phase 0 : `docs/archive/wip/atelier-geometrie-lot3-phase0.md`, M1, M2, M7. L'atelier
 * tient la position pendant le geste (M1 a) : chaque mouvement réécrit la
 * DÉFINITION du point, comme l'élève l'aurait tapée, et tout se recalcule.
 *
 * Ce qui se glisse (M2) :
 * - un point par coordonnées NOMBRES (`A = (1 ; 2)`) : ses coordonnées sont
 *   réécrites, aimantées aux entiers quand on passe près, sinon au dixième —
 *   ou au pixel près, sans aimantation, en déplacement fluide
 *   (`point-drag-mode.ts`) ;
 * - un `point_sur` à position écrite (`point_sur(s ; 0,3)`) : sa position est
 *   réécrite, lue sur son support (paramètre d'un segment, angle d'un cercle,
 *   abscisse d'une courbe), comme son curseur.
 *
 * Le reste (point construit, coordonnées qui citent une valeur) ne se glisse
 * pas : la phrase de refus dit quoi déplacer à la place.
 *
 * @module atelier/point-drag
 */

import type { Atelier } from './atelier.svelte';
import { constantOf } from './constant';
import { isConstruction, positionSliderFor, positionTextOf } from './construction';
import { GeometryFailure, pointOn, type Support } from './construction-intersect';
import { geoFromNumber } from '$lib/geometry-core/compute/geo-arithmetic';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { displayName } from './names';
import { pointCoordinatesOf } from './parse';

// =============================================================================
// Types
// =============================================================================

/** Comment un point se glisse : ses coordonnées, sa position sur un objet, ou pas du tout. */
export type DragHold =
	| { readonly kind: 'coordinates' }
	| { readonly kind: 'position' }
	| { readonly kind: 'refused'; readonly message: string };

// =============================================================================
// Fonctions
// =============================================================================

/** Ce que le glisser du point `name` réécrirait, ou pourquoi il ne se glisse pas. */
export function dragHoldOf(atelier: Atelier, name: string): DragHold {
	const object = atelier.get(name);
	const shown = displayName(name);
	if (object === undefined || object.kind !== 'point') {
		return { kind: 'refused', message: `« ${shown} » ne se glisse pas : on déplace ses points.` };
	}
	if (isConstruction(object)) {
		if (positionSliderFor(atelier, name) !== null) return { kind: 'position' };
		if (object.definition.trim().startsWith('point_sur')) {
			return {
				kind: 'refused',
				message:
					positionTextOf(atelier, name) === null
						? `« ${shown} » n’a pas de position écrite : écris-en une (point_sur(… ; 0,5)) pour le glisser.`
						: `La position de « ${shown} » cite une valeur : glisse son curseur.`
			};
		}
		return {
			kind: 'refused',
			message: `« ${shown} » est construit : déplace les points dont il dépend.`
		};
	}
	const coordinates = pointCoordinatesOf(object.definition);
	const provenance = object.provenance;
	if (
		coordinates !== null &&
		coordinates.every((c) => constantOf(c, provenance, atelier.functionNames) !== null)
	) {
		return { kind: 'coordinates' };
	}
	return {
		kind: 'refused',
		message: `Les coordonnées de « ${shown} » citent une valeur : glisse son curseur.`
	};
}

/**
 * Le couple écrit pour un point glissé en (x ; y) : chaque coordonnée aimantée à
 * l'entier le plus proche s'il est à moins de `snap`, sinon arrondie au dixième ;
 * virgule décimale, jamais « -0 ». Avec `fluidPixel` (déplacement fluide, la
 * taille d'un pixel en unités) : aucune aimantation, arrondie au pixel près.
 */
export function draggedCoordinates(
	x: number,
	y: number,
	snap: number,
	fluidPixel: number | null = null
): string {
	return `(${writtenCoordinate(x, snap, fluidPixel)} ; ${writtenCoordinate(y, snap, fluidPixel)})`;
}

function writtenCoordinate(value: number, snap: number, fluidPixel: number | null): string {
	let kept: number;
	if (fluidPixel !== null && fluidPixel > 0) {
		kept = Number(value.toFixed(fluidDecimals(fluidPixel)));
	} else {
		const nearest = Math.round(value);
		kept = Math.abs(value - nearest) <= snap ? nearest : Number(value.toFixed(1));
	}
	return String(kept === 0 ? 0 : kept).replace('.', ',');
}

/** Au plus six décimales, même très zoomé : au-delà, l'écriture ne se lit plus. */
const MAX_FLUID_DECIMALS = 6;

/**
 * Le moins de décimales qui garde l'écart d'arrondi sous un pixel : 2 à
 * 40 pixels par unité (pixel = 0,025), 3 à 500, 1 à 10.
 */
function fluidDecimals(pixel: number): number {
	const decimals = Math.ceil(Math.log10(1 / (2 * pixel)));
	return Math.min(MAX_FLUID_DECIMALS, Math.max(0, decimals));
}

/** Au-delà, le pas ne s'affine plus : trois décimales de plus que le curseur. */
const EXTRA_DECIMALS = 3;

/**
 * La position `exact` arrondie au moins de décimales possible, en partant de
 * `first` (celles du curseur), pour que le point retombe à moins de `tolerance`
 * de là où `exact` le pose ; `tolerance` nulle : `first` décimales.
 */
export function positionWithin(
	support: Support,
	exact: number,
	first: number,
	tolerance: number
): number {
	const target = placedAt(support, exact);
	let value = Number(exact.toFixed(first));
	for (let decimals = first; decimals <= first + EXTRA_DECIMALS; decimals++) {
		value = Number(exact.toFixed(decimals));
		if (target === null || tolerance <= 0) break;
		const placed = placedAt(support, value);
		if (placed !== null && Math.hypot(placed[0] - target[0], placed[1] - target[1]) <= tolerance) {
			break;
		}
	}
	return value;
}

/** Le point de position `value` sur le support, en nombres, ou `null` (hors domaine). */
function placedAt(support: Support, value: number): [number, number] | null {
	try {
		const p = pointOn(support, geoFromNumber(value), null, '');
		return [geoToNumber(p.x), geoToNumber(p.y)];
	} catch (error) {
		if (error instanceof GeometryFailure) return null;
		throw error;
	}
}

/**
 * La position, sur son support, du point le plus proche de (x ; y) : le
 * paramètre t de la ligne (0 en `from`, 1 en `to`), l'angle en degrés d'un
 * cercle dans [0 ; 360[, l'abscisse d'une courbe y = f(x). `null` sur une
 * conique (pas de `point_sur` dessus) ou un support réduit à un point.
 */
export function positionAt(support: Support, x: number, y: number): number | null {
	switch (support.type) {
		case 'line': {
			const ax = geoToNumber(support.from.x);
			const ay = geoToNumber(support.from.y);
			const dx = geoToNumber(support.to.x) - ax;
			const dy = geoToNumber(support.to.y) - ay;
			const length2 = dx * dx + dy * dy;
			if (!(length2 > 0)) return null;
			return ((x - ax) * dx + (y - ay) * dy) / length2;
		}
		case 'circle': {
			const cx = geoToNumber(support.center.x);
			const cy = geoToNumber(support.center.y);
			if (x === cx && y === cy) return null;
			const degrees = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
			return degrees < 0 ? degrees + 360 : degrees;
		}
		case 'graph':
			return x;
		case 'conic':
			return null;
	}
}
