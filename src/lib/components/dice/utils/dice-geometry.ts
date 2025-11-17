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
	scale: 1.0,
	inradius: 0.333 // Distance from center to face = 1/3 for regular tetrahedron
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
	scale: 1.0,
	inradius: 1.0 // Distance from center to face = 1 for cube (half the side length)
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
	scale: 1.2,
	inradius: 0.577 // Distance from center to face = 1/sqrt(3) for regular octahedron
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
	scale: 1.0,
	inradius: 0.85 // Approximate inradius for pentagonal trapezohedron
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
	scale: 0.8,
	inradius: 1.113 // Inradius for regular dodecahedron (≈ 1.113 times edge length)
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
	scale: 0.7,
	inradius: 0.756 // Inradius for regular icosahedron
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
 * @returns The actual dice value showing on top
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

	// Return the actual dice value for this face
	return getFaceValue(type, topFaceIndex);
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
 * Face index to dice value mappings
 * Maps the geometry face index (from raycasting or normal detection) to the actual dice value
 */
const faceValueMappings: Record<DiceType, Record<number, number>> = {
	// D4: Simple 1-4 mapping
	d4: {
		0: 1,
		1: 2,
		2: 3,
		3: 4
	},

	// D6: Opposite faces sum to 7 (1↔6, 2↔5, 3↔4)
	d6: {
		0: 1, // Front
		1: 6, // Back
		2: 2, // Bottom
		3: 5, // Top
		4: 3, // Left
		5: 4 // Right
	},

	// D8: Sequential numbering (1-8)
	d8: {
		0: 1,
		1: 2,
		2: 3,
		3: 4,
		4: 5,
		5: 6,
		6: 7,
		7: 8
	},

	// D10: Standard D10 uses 0-9
	d10: {
		0: 1,
		1: 2,
		2: 3,
		3: 4,
		4: 5,
		5: 6,
		6: 7,
		7: 8,
		8: 9,
		9: 0
	},

	// D12: Sequential numbering (1-12)
	d12: {
		0: 1,
		1: 2,
		2: 3,
		3: 4,
		4: 5,
		5: 6,
		6: 7,
		7: 8,
		8: 9,
		9: 10,
		10: 11,
		11: 12
	},

	// D20: Standard icosahedron mapping (opposite faces sum to 21)
	d20: {
		0: 17,
		1: 3,
		2: 7,
		3: 1,
		4: 19,
		5: 16,
		6: 10,
		7: 15,
		8: 13,
		9: 9,
		10: 8,
		11: 12,
		12: 5,
		13: 11,
		14: 6,
		15: 20,
		16: 2,
		17: 18,
		18: 4,
		19: 14
	}
};

/**
 * Get the dice value for a given face index
 *
 * @param type - Dice type
 * @param faceIndex - Index of the face (0-based)
 * @returns The actual dice value for that face
 */
export function getFaceValue(type: DiceType, faceIndex: number): number {
	const mapping = faceValueMappings[type];
	return mapping[faceIndex] ?? 1;
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

/**
 * Calculate face center position and rotation for placing numbers
 *
 * @param faceNormal - Normal vector of the face
 * @param scale - Scale factor of the die
 * @param inradius - Distance from center to face for the unscaled geometry
 * @param offset - Distance to offset text from face surface (default: 0.05)
 * @returns Object with position and rotation for the text
 */
export function getFaceTransform(
	faceNormal: Vector3Tuple,
	scale: number,
	inradius: number,
	offset: number = 0.05
): {
	position: Vector3Tuple;
	rotation: Vector3Tuple;
} {
	const [nx, ny, nz] = faceNormal;

	// Position: Place text at the face surface + offset
	// The face is at distance (scale * inradius) from the center
	// We add a small offset in the normal direction to prevent z-fighting
	const faceDistance = scale * inradius + offset;
	const position: Vector3Tuple = [nx * faceDistance, ny * faceDistance, nz * faceDistance];

	// Rotation: align text perpendicular to face
	// We need to create a rotation that aligns [0, 0, 1] (text forward) with the face normal

	// Create an orthonormal basis for the face
	// Normal is already given, we need to find tangent and bitangent

	// Choose an arbitrary "up" vector that's not parallel to the normal
	let up: Vector3Tuple = [0, 1, 0];
	const dotUp = Math.abs(nx * up[0] + ny * up[1] + nz * up[2]);

	// If normal is too close to [0,1,0], use [1,0,0] as up
	if (dotUp > 0.99) {
		up = [1, 0, 0];
	}

	// Calculate tangent = cross(normal, up)
	const tx = ny * up[2] - nz * up[1];
	const ty = nz * up[0] - nx * up[2];
	const tz = nx * up[1] - ny * up[0];

	// Normalize tangent
	const tlen = Math.sqrt(tx * tx + ty * ty + tz * tz);
	const tangent: Vector3Tuple = [tx / tlen, ty / tlen, tz / tlen];

	// Calculate bitangent = cross(normal, tangent)
	const bx = ny * tangent[2] - nz * tangent[1];
	const by = nz * tangent[0] - nx * tangent[2];
	const bz = nx * tangent[1] - ny * tangent[0];

	// Now we have a rotation matrix:
	// [ tangent[0], bitangent[0], normal[0] ]
	// [ tangent[1], bitangent[1], normal[1] ]
	// [ tangent[2], bitangent[2], normal[2] ]

	// Convert rotation matrix to Euler angles (ZYX order)
	// This is the standard rotation matrix to Euler conversion
	let rotationX: number;
	let rotationY: number;
	let rotationZ: number;

	// Using the rotation matrix where columns are [tangent, bitangent, normal]
	const m11 = tangent[0], m12 = bx, m13 = nx;
	const m21 = tangent[1], m22 = by, m23 = ny;
	const m31 = tangent[2], m32 = bz, m33 = nz;

	// Extract Euler angles from rotation matrix
	if (Math.abs(m13) < 0.99999) {
		rotationY = Math.asin(m13);
		rotationX = Math.atan2(-m23, m33);
		rotationZ = Math.atan2(-m12, m11);
	} else {
		// Gimbal lock case
		rotationY = m13 > 0 ? Math.PI / 2 : -Math.PI / 2;
		rotationX = 0;
		rotationZ = Math.atan2(m21, m22);
	}

	const rotation: Vector3Tuple = [rotationX, rotationY, rotationZ];

	return { position, rotation };
}
