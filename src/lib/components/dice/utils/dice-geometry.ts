/**
 * Dice Geometry Utilities
 *
 * Defines geometric data for different dice polyhedrons.
 * Includes vertices, faces, and normals for result detection.
 */

import type { DiceGeometry, DiceType } from '../types';
import type { Vector3Tuple } from 'three';

/**
 * D4 (Tetrahedron) - 4 faces
 */
const d4Geometry: DiceGeometry = {
	faces: 4,
	vertices: [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1],
	indices: [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1],
	faceNormals: [
		[0.577, 0.577, 0.577],
		[-0.577, -0.577, 0.577],
		[-0.577, 0.577, -0.577],
		[0.577, -0.577, -0.577]
	],
	scale: 1.0
};

/**
 * D6 (Cube) - 6 faces
 */
const d6Geometry: DiceGeometry = {
	faces: 6,
	vertices: [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1],
	indices: [
		0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 5, 6, 1, 6, 2, 0, 1, 5, 0, 5, 4, 3, 2,
		6, 3, 6, 7
	],
	faceNormals: [
		[0, 0, -1], // Face 1 (front)
		[0, 0, 1], // Face 6 (back)
		[0, -1, 0], // Face 2 (bottom)
		[0, 1, 0], // Face 5 (top)
		[-1, 0, 0], // Face 3 (left)
		[1, 0, 0] // Face 4 (right)
	],
	scale: 1.0
};

/**
 * D8 (Octahedron) - 8 faces
 */
const d8Geometry: DiceGeometry = {
	faces: 8,
	vertices: [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1],
	indices: [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2],
	faceNormals: [
		[0.577, 0.577, 0.577],
		[0.577, -0.577, 0.577],
		[0.577, -0.577, -0.577],
		[0.577, 0.577, -0.577],
		[-0.577, 0.577, -0.577],
		[-0.577, -0.577, -0.577],
		[-0.577, -0.577, 0.577],
		[-0.577, 0.577, 0.577]
	],
	scale: 1.2
};

/**
 * D10 (Pentagonal Trapezohedron) - 10 faces
 */
const d10Geometry: DiceGeometry = {
	faces: 10,
	vertices: [
		0, 0, 1, 0, 0, -1, -0.894, 0, 0.447, 0.894, 0, 0.447, 0.688, 0.587, 0, -0.688, 0.587, 0, -0.688,
		-0.587, 0, 0.688, -0.587, 0, 0.276, 0.951, 0, -0.276, 0.951, 0, -0.276, -0.951, 0, 0.276,
		-0.951, 0
	],
	indices: [
		0, 2, 8, 0, 8, 3, 0, 3, 9, 0, 9, 2, 1, 6, 10, 1, 10, 7, 1, 7, 11, 1, 11, 6, 8, 2, 5, 9, 3, 4,
		10, 6, 5, 11, 7, 4, 2, 9, 5, 3, 8, 4, 6, 11, 5, 7, 10, 4, 5, 9, 4, 4, 8, 5, 5, 11, 4, 4, 10, 5
	],
	faceNormals: [
		[0, 0.951, 0.309],
		[0.688, 0.587, 0.425],
		[0.951, 0, 0],
		[0.688, -0.587, 0.425],
		[0, -0.951, 0.309],
		[-0.688, -0.587, 0.425],
		[-0.951, 0, 0],
		[-0.688, 0.587, 0.425],
		[0, 0.951, -0.309],
		[0, -0.951, -0.309]
	],
	scale: 1.0
};

/**
 * D12 (Dodecahedron) - 12 faces
 */
const d12Geometry: DiceGeometry = {
	faces: 12,
	vertices: [
		1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, 1, -1, -1, -1, 0, 0.618,
		1.618, 0, 0.618, -1.618, 0, -0.618, 1.618, 0, -0.618, -1.618, 1.618, 0, 0.618, 1.618, 0, -0.618,
		-1.618, 0, 0.618, -1.618, 0, -0.618, 0.618, 1.618, 0, 0.618, -1.618, 0, -0.618, 1.618, 0,
		-0.618, -1.618, 0
	],
	indices: [
		0, 8, 4, 0, 12, 16, 0, 16, 8, 1, 9, 5, 1, 13, 17, 1, 17, 9, 2, 10, 6, 2, 14, 18, 2, 18, 10, 3,
		11, 7, 3, 15, 19, 3, 19, 11, 4, 8, 16, 4, 16, 10, 4, 10, 18, 4, 18, 6, 4, 6, 8, 5, 9, 17, 5, 17,
		11, 5, 11, 19, 5, 19, 7, 5, 7, 9, 0, 4, 6, 0, 6, 2, 0, 2, 12, 1, 5, 7, 1, 7, 3, 1, 3, 13, 8, 6,
		10, 9, 7, 11, 12, 2, 14, 13, 3, 15, 14, 2, 10, 14, 10, 16, 14, 16, 12, 15, 3, 11, 15, 11, 17,
		15, 17, 13, 8, 9, 0, 9, 1, 0, 10, 11, 2, 11, 3, 2, 12, 13, 0, 13, 1, 0, 14, 15, 2, 15, 3, 2, 16,
		17, 8, 17, 9, 8, 18, 19, 10, 19, 11, 10
	],
	faceNormals: [
		[0.577, 0.577, 0.577],
		[0.577, 0.577, -0.577],
		[0.577, -0.577, 0.577],
		[0.577, -0.577, -0.577],
		[-0.577, 0.577, 0.577],
		[-0.577, 0.577, -0.577],
		[-0.577, -0.577, 0.577],
		[-0.577, -0.577, -0.577],
		[0, 0.934, 0.357],
		[0, -0.934, 0.357],
		[0.934, 0, 0.357],
		[-0.934, 0, 0.357]
	],
	scale: 0.8
};

/**
 * D20 (Icosahedron) - 20 faces
 */
const d20Geometry: DiceGeometry = {
	faces: 20,
	vertices: [
		0, 1, 1.618, 0, 1, -1.618, 0, -1, 1.618, 0, -1, -1.618, 1, 1.618, 0, 1, -1.618, 0, -1, 1.618, 0,
		-1, -1.618, 0, 1.618, 0, 1, 1.618, 0, -1, -1.618, 0, 1, -1.618, 0, -1
	],
	indices: [
		0, 8, 4, 0, 4, 6, 0, 6, 2, 0, 2, 8, 1, 5, 10, 1, 10, 3, 1, 3, 11, 1, 11, 5, 2, 6, 9, 2, 9, 11,
		2, 11, 3, 2, 3, 8, 3, 10, 7, 3, 7, 8, 4, 8, 7, 4, 7, 9, 4, 9, 6, 5, 11, 9, 5, 9, 7, 5, 7, 10
	],
	faceNormals: [
		[0, 0.526, 0.851],
		[-0.809, 0.326, 0.491],
		[-0.5, -0.326, 0.803],
		[0.5, -0.326, 0.803],
		[0.809, 0.326, 0.491],
		[0, 0.526, -0.851],
		[-0.809, 0.326, -0.491],
		[-0.5, -0.326, -0.803],
		[0.5, -0.326, -0.803],
		[0.809, 0.326, -0.491],
		[0.934, 0, 0.357],
		[0.577, 0.577, 0.577],
		[0, 0.934, 0.357],
		[-0.577, 0.577, 0.577],
		[-0.934, 0, 0.357],
		[-0.577, -0.577, 0.577],
		[0, -0.934, 0.357],
		[0.577, -0.577, 0.577],
		[0, -0.934, -0.357],
		[0, 0.934, -0.357]
	],
	scale: 0.7
};

/**
 * Geometry lookup by dice type
 */
const geometries: Record<DiceType, DiceGeometry> = {
	d4: d4Geometry,
	d6: d6Geometry,
	d8: d8Geometry,
	d10: d10Geometry,
	d12: d12Geometry,
	d20: d20Geometry
};

/**
 * Get geometry data for a specific dice type
 *
 * @param type - Dice type (d4, d6, etc.)
 * @returns Geometry data including vertices, indices, and normals
 */
export function getDiceGeometry(type: DiceType): DiceGeometry {
	return geometries[type];
}

/**
 * Detect which face is on top based on die rotation
 *
 * @param type - Dice type
 * @param upVector - The "up" direction in world space [x, y, z]
 * @returns Face number (1 to max faces)
 */
export function detectTopFace(type: DiceType, upVector: Vector3Tuple): number {
	const geometry = getDiceGeometry(type);
	const [x, y, z] = upVector;

	// Normalize the up vector
	const length = Math.sqrt(x * x + y * y + z * z);
	const normalizedUp: Vector3Tuple = [x / length, y / length, z / length];

	// Find the face normal that best matches the up direction
	let maxDot = -Infinity;
	let topFaceIndex = 0;

	geometry.faceNormals.forEach((normal, index) => {
		const dot =
			normal[0] * normalizedUp[0] + normal[1] * normalizedUp[1] + normal[2] * normalizedUp[2];

		if (dot > maxDot) {
			maxDot = dot;
			topFaceIndex = index;
		}
	});

	// Return face number (1-indexed)
	return topFaceIndex + 1;
}

/**
 * Get the maximum face value for a dice type
 *
 * @param type - Dice type
 * @returns Maximum face value
 */
export function getMaxFaceValue(type: DiceType): number {
	return getDiceGeometry(type).faces;
}

/**
 * Get all dice types
 */
export const allDiceTypes: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

/**
 * Get human-readable name for dice type
 *
 * @param type - Dice type
 * @returns Display name
 */
export function getDiceDisplayName(type: DiceType): string {
	const names: Record<DiceType, string> = {
		d4: 'D4 (Tétraèdre)',
		d6: 'D6 (Cube)',
		d8: 'D8 (Octaèdre)',
		d10: 'D10 (Trapèzoèdre)',
		d12: 'D12 (Dodécaèdre)',
		d20: 'D20 (Icosaèdre)'
	};
	return names[type];
}
