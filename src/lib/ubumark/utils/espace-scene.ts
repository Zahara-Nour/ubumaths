/**
 * Bloc ```cubes — la scène
 * ========================
 *
 * Calcul pur du dessin (une liste de polygones), partagé par l'écran
 * (`Cubes.svelte`) et le PDF (`espace-typst.ts`) : les deux ne peuvent pas
 * diverger.
 *
 * Repère : origine au coin haut gauche, y vers le BAS (comme en SVG). Une
 * unité = 1 cm, à l'écran comme au PDF : l'arête d'un cube mesure 1 cm.
 *
 * Perspective cavalière : la face de devant est en vraie grandeur ; les
 * fuyantes partent à 45° vers le haut à droite, réduites de moitié. On voit
 * donc le devant, le dessus et la droite des cubes. Une face collée à un cube
 * voisin n'est pas dessinée. Ordre de dessin (du peintre) : du fond vers le
 * devant, puis de gauche à droite, puis de bas en haut.
 *
 * Vues (carrés de 1 cm, sans relief) :
 * - dessus : une case par pile, la rangée du fond en haut ;
 * - face : par colonne, la plus haute pile ;
 * - droite : par rangée, la plus haute pile, le DEVANT à GAUCHE ;
 * - gauche : par rangée, la plus haute pile, le devant à DROITE.
 *
 * Assemblage que l'on peut tourner (`tourner: oui`, chantier `solides-3d`,
 * lot 6, ADR 0045) : `buildEspaceScene(spec, vue)` dessine la perspective vue
 * de là, dans un cadre CARRÉ fixe (le même à chaque angle, la page ne bouge
 * pas), le centre de l'assemblage au milieu. Les cubes restent pleins : seules
 * les faces libres tournées vers l'œil sont dessinées, des plus lointaines aux
 * plus proches. Une face garde sa teinte, comme un objet peint : l'arrière a
 * celle du devant, la gauche celle de la droite, le dessous celle du dessus.
 * À la vue de départ, c'est le dessin fixe, déplacé en bloc.
 *
 * @module ubumark/utils/espace-scene
 */

import type { CubesSpec } from '../types/espace';
import { vueProjection, type EspaceVue, type Point3 } from './espace-vue';

// ============================================================================
// TYPES
// ============================================================================

/** `case` : carré d'une vue ; les autres : faces de la perspective */
export type EspaceFaceKind = 'devant' | 'dessus' | 'cote' | 'case';

export interface EspacePoint {
	x: number;
	y: number;
}

export interface EspacePolygon {
	kind: EspaceFaceKind;
	points: EspacePoint[];
}

export interface EspaceScene {
	/** Dimensions du dessin, en unités (cm), marge non comprise */
	width: number;
	height: number;
	/** Dans l'ordre où il faut les dessiner */
	polygons: EspacePolygon[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Taille réelle d'une unité de la scène, en cm (l'arête d'un cube) */
export const ESPACE_CM_PER_UNIT = 1;

/** Marge autour du dessin pour que le trait ne soit pas rogné, en unités */
export const ESPACE_MARGIN = 0.05;

/** Épaisseur des traits, en unités */
export const ESPACE_STROKE = 0.03;

/** Déport des fuyantes pour une profondeur de 1 : 0,5 × arête, à 45° */
const DEPTH_SHIFT = 0.5 * Math.SQRT1_2;

/** Assemblage tourné : en deçà, une face est vue par la tranche et n'est pas dessinée */
const CUBES_EDGE_ON = 1e-9;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Ramène le dessin au coin haut gauche (le repère de départ a y vers le haut) */
function frame(polygons: EspacePolygon[]): EspaceScene {
	const xs = polygons.flatMap((p) => p.points.map((pt) => pt.x));
	const ys = polygons.flatMap((p) => p.points.map((pt) => pt.y));
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	return {
		width: maxX - minX,
		height: maxY - minY,
		polygons: polygons.map((p) => ({
			kind: p.kind,
			points: p.points.map((pt) => ({ x: pt.x - minX, y: pt.y - minY }))
		}))
	};
}

/** Carré de 1 × 1 dont le coin haut gauche est (x, y) */
function square(x: number, y: number): EspacePolygon {
	return {
		kind: 'case',
		points: [
			{ x, y },
			{ x: x + 1, y },
			{ x: x + 1, y: y + 1 },
			{ x, y: y + 1 }
		]
	};
}

/** La perspective cavalière de l'assemblage */
function perspective(heights: number[][]): EspacePolygon[] {
	const rows = heights.length;
	const cols = heights[0].length;
	/** Hauteur de la pile à la rangée `r` (0 = fond), colonne `c` ; 0 hors de l'assemblage */
	const stack = (r: number, c: number) => heights[r]?.[c] ?? 0;
	// Repère de calcul : x vers la droite, y vers le HAUT, profondeur 0 = devant
	const at = (x: number, z: number, depth: number): EspacePoint => ({
		x: x + depth * DEPTH_SHIFT,
		y: -(z + depth * DEPTH_SHIFT)
	});
	const polygons: EspacePolygon[] = [];
	// Du fond (rangée 0) vers le devant, de gauche à droite, de bas en haut
	for (let r = 0; r < rows; r++) {
		const depth = rows - 1 - r;
		for (let c = 0; c < cols; c++) {
			for (let z = 0; z < stack(r, c); z++) {
				// Devant : collé s'il y a un cube juste devant
				if (stack(r + 1, c) <= z) {
					polygons.push({
						kind: 'devant',
						points: [
							at(c, z, depth),
							at(c + 1, z, depth),
							at(c + 1, z + 1, depth),
							at(c, z + 1, depth)
						]
					});
				}
				// Dessus : collé s'il y a un cube juste au-dessus
				if (stack(r, c) <= z + 1) {
					polygons.push({
						kind: 'dessus',
						points: [
							at(c, z + 1, depth),
							at(c + 1, z + 1, depth),
							at(c + 1, z + 1, depth + 1),
							at(c, z + 1, depth + 1)
						]
					});
				}
				// Droite : collé s'il y a un cube juste à droite
				if (stack(r, c + 1) <= z) {
					polygons.push({
						kind: 'cote',
						points: [
							at(c + 1, z, depth),
							at(c + 1, z, depth + 1),
							at(c + 1, z + 1, depth + 1),
							at(c + 1, z + 1, depth)
						]
					});
				}
			}
		}
	}
	return polygons;
}

/** Une face d'un assemblage tourné */
export interface CubesFace {
	kind: Exclude<EspaceFaceKind, 'case'>;
	/** Ses quatre coins tournés (repère du moteur de vue : y vers le HAUT, z vers le fond) */
	corners: Point3[];
	/** Les mêmes, projetés (y vers le HAUT) */
	points: EspacePoint[];
}

/** Le centre de l'assemblage (repère du moteur de vue), autour duquel il tourne */
function cubesPivot(heights: number[][]): Point3 {
	const top = Math.max(...heights.flat());
	return { x: heights[0].length / 2, y: top / 2, z: heights.length / 2 };
}

/**
 * Les faces à dessiner d'un assemblage vu de `vue`, dans l'ordre du peintre.
 *
 * Repère : x = colonne, y = niveau, z = profondeur (0 = devant de la dernière
 * rangée). Une face est dessinée si elle est libre (pas de cube collé) et
 * tournée vers l'œil. Ordre : sur chaque axe, du plus loin de l'œil au plus
 * près — un cube ne peut en cacher un autre que s'il n'est plus loin sur aucun
 * des trois axes, donc il est dessiné après lui. À la vue de départ : du fond
 * vers le devant, de gauche à droite, de bas en haut, comme le dessin fixe.
 */
export function cubesFaces(heights: number[][], vue: EspaceVue): CubesFace[] {
	const rows = heights.length;
	const cols = heights[0].length;
	const top = Math.max(...heights.flat());
	const pivot = cubesPivot(heights);
	const view = vueProjection(vue, pivot);
	/** Y a-t-il un cube dans la case (colonne, niveau, profondeur) ? */
	const filled = (x: number, y: number, depth: number) =>
		y >= 0 && (heights[rows - 1 - depth]?.[x] ?? 0) > y;

	// De quel côté est l'œil sur chaque axe : sa direction ramenée dans le repère de
	// l'assemblage (la rotation garde les angles)
	const origin = view.rotate(pivot);
	const toward = (axis: Point3) => {
		const turned = view.rotate({ x: pivot.x + axis.x, y: pivot.y + axis.y, z: pivot.z + axis.z });
		return (
			(turned.x - origin.x) * view.toEye.x +
			(turned.y - origin.y) * view.toEye.y +
			(turned.z - origin.z) * view.toEye.z
		);
	};
	const eye = {
		x: toward({ x: 1, y: 0, z: 0 }),
		y: toward({ x: 0, y: 1, z: 0 }),
		z: toward({ x: 0, y: 0, z: 1 })
	};
	/** Les cases d'un axe, de la plus loin de l'œil à la plus proche */
	const farToNear = (count: number, side: number) =>
		Array.from({ length: count }, (_, i) => (side >= 0 ? i : count - 1 - i));
	/** Le côté d'un cube tourné vers l'œil sur un axe (0 ou 1) ; null : vu par la tranche */
	const seenSide = (side: number) => (side > CUBES_EDGE_ON ? 1 : side < -CUBES_EDGE_ON ? 0 : null);
	const xSide = seenSide(eye.x);
	const ySide = seenSide(eye.y);
	const zSide = seenSide(eye.z);

	const faces: CubesFace[] = [];
	const push = (kind: CubesFace['kind'], square: Point3[]) =>
		faces.push({ kind, corners: square.map(view.rotate), points: square.map(view.project) });
	for (const z of farToNear(rows, eye.z)) {
		for (const x of farToNear(cols, eye.x)) {
			for (const y of farToNear(top, eye.y)) {
				if (!filled(x, y, z)) continue;
				// Devant (z) ou arrière (z + 1)
				if (zSide !== null && !filled(x, y, z + (zSide === 1 ? 1 : -1))) {
					push('devant', [
						{ x, y, z: z + zSide },
						{ x: x + 1, y, z: z + zSide },
						{ x: x + 1, y: y + 1, z: z + zSide },
						{ x, y: y + 1, z: z + zSide }
					]);
				}
				// Dessus (y + 1) ou dessous (y)
				if (ySide !== null && !filled(x, y + (ySide === 1 ? 1 : -1), z)) {
					push('dessus', [
						{ x, y: y + ySide, z },
						{ x: x + 1, y: y + ySide, z },
						{ x: x + 1, y: y + ySide, z: z + 1 },
						{ x, y: y + ySide, z: z + 1 }
					]);
				}
				// Droite (x + 1) ou gauche (x)
				if (xSide !== null && !filled(x + (xSide === 1 ? 1 : -1), y, z)) {
					push('cote', [
						{ x: x + xSide, y, z },
						{ x: x + xSide, y, z: z + 1 },
						{ x: x + xSide, y: y + 1, z: z + 1 },
						{ x: x + xSide, y: y + 1, z }
					]);
				}
			}
		}
	}
	return faces;
}

/** L'assemblage vu de `vue`, dans son cadre carré fixe */
function turnedPerspective(heights: number[][], vue: EspaceVue): EspaceScene {
	const pivot = cubesPivot(heights);
	const centre = vueProjection(vue, pivot).project(pivot);
	// Aucun point ne sort du cadre, à aucun angle ni pendant le passage de la cavalière à la
	// vue droite : un point à la distance d du centre se dessine au plus à d × √(1 + déport²)
	const half = Math.hypot(pivot.x, pivot.y, pivot.z) * Math.hypot(1, DEPTH_SHIFT);
	return {
		width: 2 * half,
		height: 2 * half,
		polygons: cubesFaces(heights, vue).map((face) => ({
			kind: face.kind,
			points: face.points.map((p) => ({ x: p.x - centre.x + half, y: centre.y - p.y + half }))
		}))
	};
}

/** La plus haute pile de chaque colonne de la liste (hauteur 0 si vide) */
const maxOf = (values: number[]) => values.reduce((a, b) => Math.max(a, b), 0);

/**
 * Hauteur de chaque colonne d'une vue de côté, de gauche à droite : face = par
 * colonne ; droite = par rangée, le devant à gauche ; gauche = le devant à droite.
 * Seule source du sens des vues : le dessin ET le juge des gestes (`cubes-gestes.ts`).
 */
export function sideColumns(heights: number[][], view: 'face' | 'droite' | 'gauche'): number[] {
	switch (view) {
		case 'face':
			return heights[0].map((_, c) => maxOf(heights.map((row) => row[c])));
		case 'droite':
			// Le devant (dernière rangée) à gauche
			return heights.map((row) => maxOf(row)).reverse();
		case 'gauche':
			// Le devant à droite
			return heights.map((row) => maxOf(row));
	}
}

/** Une vue : une colonne de carrés par entrée de `columns`, du bas vers le haut */
function columnsView(columns: number[]): EspacePolygon[] {
	const top = maxOf(columns);
	return columns.flatMap((h, x) => Array.from({ length: h }, (_, z) => square(x, top - 1 - z)));
}

/**
 * Le dessin d'un assemblage, dans sa vue. `vue` (perspective seulement) :
 * assemblage que l'on peut tourner, vu de là, dans son cadre fixe ; absente :
 * le dessin fixe.
 */
export function buildEspaceScene(spec: CubesSpec, vue?: EspaceVue): EspaceScene {
	const { heights, view } = spec;
	switch (view) {
		case 'perspective':
			return vue === undefined ? frame(perspective(heights)) : turnedPerspective(heights, vue);
		case 'dessus':
			return frame(
				heights.flatMap((row, r) => row.flatMap((h, c) => (h > 0 ? [square(c, r)] : [])))
			);
		case 'face':
		case 'droite':
		case 'gauche':
			return frame(columnsView(sideColumns(heights, view)));
	}
}

/** Nom accessible : la vue seule, JAMAIS le nombre de cubes (ce serait la réponse) */
export function espaceLabel(spec: CubesSpec): string {
	switch (spec.view) {
		case 'perspective':
			return spec.rotate
				? 'Assemblage de cubes en perspective, figure que l’on peut tourner'
				: 'Assemblage de cubes en perspective';
		case 'dessus':
			return 'Vue de dessus d’un assemblage de cubes';
		case 'face':
			return 'Vue de face d’un assemblage de cubes';
		case 'droite':
			return 'Vue de droite d’un assemblage de cubes';
		case 'gauche':
			return 'Vue de gauche d’un assemblage de cubes';
	}
}
