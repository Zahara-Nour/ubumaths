/**
 * Dice Texture Generator
 *
 * Generates textures with numbers for dice faces using Canvas 2D.
 * Each dice type gets a single texture with all face numbers.
 */

import * as THREE from 'three';
import type { DiceType, DiceStyleConfig } from '../types';

/**
 * Create a canvas texture with a number
 */
function createNumberCanvas(
	number: string,
	size: number,
	baseColor: string,
	numberColor: string
): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;

	// Fill background with base color
	ctx.fillStyle = baseColor;
	ctx.fillRect(0, 0, size, size);

	// Draw number
	ctx.fillStyle = numberColor;
	ctx.font = `bold ${size * 0.6}px Arial`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(number, size / 2, size / 2);

	return canvas;
}

/**
 * Create a texture atlas for a dice type
 * Returns a THREE.Texture with all face numbers arranged in a grid
 */
export function createDiceTexture(
	diceType: DiceType,
	style: DiceStyleConfig,
	faceNumbers: number[]
): THREE.Texture {
	// Texture resolution per face
	const faceSize = 256;

	// Calculate grid size (square grid that fits all faces)
	const numFaces = faceNumbers.length;
	const gridSize = Math.ceil(Math.sqrt(numFaces));

	const canvasSize = gridSize * faceSize;
	const canvas = document.createElement('canvas');
	canvas.width = canvasSize;
	canvas.height = canvasSize;
	const ctx = canvas.getContext('2d')!;

	// Fill with base color
	ctx.fillStyle = style.baseColor;
	ctx.fillRect(0, 0, canvasSize, canvasSize);

	// Draw each number in the grid
	faceNumbers.forEach((num, index) => {
		const col = index % gridSize;
		const row = Math.floor(index / gridSize);
		const x = col * faceSize;
		const y = row * faceSize;

		// Draw number
		ctx.fillStyle = style.numberColor;
		ctx.font = `bold ${faceSize * 0.6}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(num), x + faceSize / 2, y + faceSize / 2);
	});

	// Create THREE.js texture
	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;

	return texture;
}

/**
 * Get UV coordinates for a face in the texture atlas
 */
export function getFaceUVs(
	faceIndex: number,
	totalFaces: number
): number[] {
	const gridSize = Math.ceil(Math.sqrt(totalFaces));
	const col = faceIndex % gridSize;
	const row = Math.floor(faceIndex / gridSize);

	const uMin = col / gridSize;
	const vMin = row / gridSize;
	const uMax = (col + 1) / gridSize;
	const vMax = (row + 1) / gridSize;

	// Return UVs for a quad (2 triangles)
	// Each face needs 4 UV coordinates (one per vertex)
	return [
		uMin, vMax, // bottom-left
		uMax, vMax, // bottom-right
		uMax, vMin, // top-right
		uMin, vMin  // top-left
	];
}
