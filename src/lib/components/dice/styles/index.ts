/**
 * Dice Style Presets
 *
 * Pre-configured visual styles for dice.
 * Each style defines colors, materials, and visual properties.
 */

import type { DiceStyleConfig } from '../types';

/**
 * Classic style - Traditional white dice with black numbers
 */
export const classicStyle: DiceStyleConfig = {
	baseColor: '#ffffff',
	numberColor: '#000000',
	metalness: 0.1,
	roughness: 0.6,
	emissive: '#000000',
	emissiveIntensity: 0
};

/**
 * Neon style - Glowing futuristic dice
 */
export const neonStyle: DiceStyleConfig = {
	baseColor: '#1a1a2e',
	numberColor: '#00ff88',
	metalness: 0.8,
	roughness: 0.2,
	emissive: '#00ff88',
	emissiveIntensity: 0.5
};

/**
 * Wood style - Natural wood texture appearance
 */
export const woodStyle: DiceStyleConfig = {
	baseColor: '#8b4513',
	numberColor: '#ffd700',
	metalness: 0.0,
	roughness: 0.9,
	emissive: '#000000',
	emissiveIntensity: 0
};

/**
 * Get style configuration by name
 *
 * @param styleName - Name of the style preset
 * @returns Style configuration object
 */
export function getStyleConfig(styleName: 'classic' | 'neon' | 'wood'): DiceStyleConfig {
	switch (styleName) {
		case 'classic':
			return classicStyle;
		case 'neon':
			return neonStyle;
		case 'wood':
			return woodStyle;
		default:
			return classicStyle;
	}
}

/**
 * All available style presets
 */
export const diceStyles = {
	classic: classicStyle,
	neon: neonStyle,
	wood: woodStyle
} as const;

/**
 * Style names for UI selection
 */
export const styleNames = [
	{ value: 'classic', label: 'Classique' },
	{ value: 'neon', label: 'Néon' },
	{ value: 'wood', label: 'Bois' }
] as const;
