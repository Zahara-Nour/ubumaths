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
 * @module ubumark/utils/espace-scene
 */

import type { EspaceSpec } from '../types/espace';

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

/** La plus haute pile de chaque colonne de la liste (hauteur 0 si vide) */
const maxOf = (values: number[]) => values.reduce((a, b) => Math.max(a, b), 0);

/** Une vue : une colonne de carrés par entrée de `columns`, du bas vers le haut */
function columnsView(columns: number[]): EspacePolygon[] {
	const top = maxOf(columns);
	return columns.flatMap((h, x) => Array.from({ length: h }, (_, z) => square(x, top - 1 - z)));
}

/** Le dessin d'un assemblage, dans sa vue */
export function buildEspaceScene(spec: EspaceSpec): EspaceScene {
	const { heights, view } = spec;
	const cols = heights[0].length;
	switch (view) {
		case 'perspective':
			return frame(perspective(heights));
		case 'dessus':
			return frame(
				heights.flatMap((row, r) => row.flatMap((h, c) => (h > 0 ? [square(c, r)] : [])))
			);
		case 'face':
			return frame(
				columnsView(Array.from({ length: cols }, (_, c) => maxOf(heights.map((row) => row[c]))))
			);
		case 'droite':
			// Le devant (dernière rangée) à gauche
			return frame(columnsView(heights.map((row) => maxOf(row)).reverse()));
		case 'gauche':
			// Le devant à droite
			return frame(columnsView(heights.map((row) => maxOf(row))));
	}
}

/** Nom accessible : la vue seule, JAMAIS le nombre de cubes (ce serait la réponse) */
export function espaceLabel(spec: EspaceSpec): string {
	switch (spec.view) {
		case 'perspective':
			return 'Assemblage de cubes en perspective';
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
