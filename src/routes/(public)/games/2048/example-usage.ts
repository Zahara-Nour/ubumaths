/**
 * Example usage of the 2048 game logic
 * This file demonstrates how to use the core game functions
 */

import { initializeBoard, move, isGameWon, isGameOver } from './game-logic';
import { getPowerNotation, getMergeMessage } from './game-utils';
import type { GameState, Direction } from './types';

/**
 * Example: Playing a simple game
 */
export function exampleGameFlow(): void {
	// 1. Initialize the game
	let gameState: GameState = initializeBoard();
	console.log('Initial game state:', {
		score: gameState.score,
		tileCount: gameState.board.flat().filter((t) => t !== null).length
	});

	// 2. Make some moves
	const moves: Direction[] = ['left', 'up', 'right', 'down'];

	for (const direction of moves) {
		if (!gameState.gameOver) {
			const previousScore = gameState.score;
			gameState = move(gameState, direction);

			if (gameState.score > previousScore) {
				const scoreGain = gameState.score - previousScore;
				console.log(`Moved ${direction}: +${scoreGain} points (total: ${gameState.score})`);
			}

			// Check win condition
			if (isGameWon(gameState.board)) {
				console.log('🎉 You won! Reached 2048!');
				break;
			}

			// Check loss condition
			if (isGameOver(gameState.board)) {
				console.log('Game Over! Final score:', gameState.score);
				break;
			}
		}
	}
}

/**
 * Example: Educational features
 */
export function exampleEducationalFeatures(): void {
	console.log('Power Notations:');
	console.log('2 =', getPowerNotation(2)); // 2¹
	console.log('4 =', getPowerNotation(4)); // 2²
	console.log('64 =', getPowerNotation(64)); // 2⁶
	console.log('2048 =', getPowerNotation(2048)); // 2¹¹

	console.log('\nMerge Messages:');
	console.log(getMergeMessage(4)); // 2 + 2 = 4 (2²) ✓
	console.log(getMergeMessage(128)); // 64 + 64 = 128 (2⁷) ✓
	console.log(getMergeMessage(2048)); // 1024 + 1024 = 2048 (2¹¹) 🎉 VICTOIRE!
}

/**
 * Example: Reactive game state for Svelte
 */
export function createReactiveGame() {
	// In a Svelte component, you would use $state:
	// let gameState = $state<GameState>(initializeBoard());

	// Handle keyboard input
	const handleKeyDown = (event: KeyboardEvent) => {
		let direction: Direction | null = null;

		switch (event.key) {
			case 'ArrowLeft':
				direction = 'left';
				break;
			case 'ArrowRight':
				direction = 'right';
				break;
			case 'ArrowUp':
				direction = 'up';
				break;
			case 'ArrowDown':
				direction = 'down';
				break;
		}

		if (direction) {
			// In real component:
			// gameState = move(gameState, direction);
			console.log(`Would move ${direction}`);
		}
	};

	return { handleKeyDown };
}

/**
 * Example: Display tile information
 */
export function displayTileInfo(value: number): string {
	const power = Math.log2(value);
	const notation = getPowerNotation(value);

	return `Tile ${value} = ${notation} (power: ${power})`;
}

/**
 * Example: Get color class for tile (for UI)
 */
export function getTileColorClass(value: number): string {
	// These would be defined in your Tailwind config
	const colorMap: Record<number, string> = {
		2: 'bg-amber-100 text-gray-800',
		4: 'bg-amber-200 text-gray-800',
		8: 'bg-orange-300 text-white',
		16: 'bg-orange-400 text-white',
		32: 'bg-orange-500 text-white',
		64: 'bg-red-400 text-white',
		128: 'bg-red-500 text-white',
		256: 'bg-red-600 text-white',
		512: 'bg-yellow-400 text-white',
		1024: 'bg-yellow-500 text-white',
		2048: 'bg-yellow-600 text-white'
	};

	return colorMap[value] || 'bg-gray-800 text-white';
}
