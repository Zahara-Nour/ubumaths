// Game asset URL helpers
// Author: Claude Code
// Date: 2025-10-15
// Updated: 2025-10-15 - Switched to local static assets

export type AssetCategory = 'monsters' | 'spells' | 'characters' | 'sounds' | 'ui';

/**
 * Base path for local game assets in static folder
 */
const ASSET_BASE = '/game';

/**
 * Generate URL for local game asset
 * @param category - Asset category (monsters, spells, characters, sounds, ui)
 * @param filename - Asset filename with extension
 * @returns Local URL to asset
 */
export function getGameAssetUrl(category: AssetCategory, filename: string): string {
	// Remove leading slash if present
	const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;

	return `${ASSET_BASE}/${category}/${cleanFilename}`;
}

/**
 * Get monster image URL
 * @param imgUrl - Monster image path from database
 * @returns Full URL to monster image
 */
export function getMonsterImageUrl(imgUrl: string): string {
	return getGameAssetUrl('monsters', imgUrl);
}

/**
 * Get monster head icon URL
 * @param imgHeadUrl - Monster head icon path from database
 * @returns Full URL to monster head icon
 */
export function getMonsterHeadUrl(imgHeadUrl: string): string {
	return getGameAssetUrl('monsters', imgHeadUrl);
}

/**
 * Get spell icon URL
 * @param spellNum - Spell number (1-28+)
 * @returns Full URL to spell icon
 *
 * Spell numbering by element:
 * - Fire (feu): 1-7
 * - Water (eau): 8-14
 * - Wind (vent): 15-21
 * - Earth (terre): 22-28
 */
export function getSpellIconUrl(spellNum: number): string {
	// Determine element and use French naming convention
	let element: string;

	if (spellNum >= 1 && spellNum <= 7) {
		element = 'feu';
	} else if (spellNum >= 8 && spellNum <= 14) {
		element = 'eau';
	} else if (spellNum >= 15 && spellNum <= 21) {
		element = 'vent';
	} else if (spellNum >= 22 && spellNum <= 28) {
		element = 'terre';
	} else {
		// Fallback for spells outside known range
		element = 'base';
		spellNum = 0;
	}

	return getGameAssetUrl('spells', `${element}_${spellNum}.png`);
}

/**
 * Get achievement icon URL
 * @param iconUrl - Achievement icon path from database
 * @returns Full URL to achievement icon
 */
export function getAchievementIconUrl(iconUrl: string): string {
	return getGameAssetUrl('ui', iconUrl);
}

/**
 * Get sound effect URL
 * @param soundFile - Sound filename
 * @returns Full URL to sound file
 */
export function getSoundUrl(soundFile: string): string {
	return getGameAssetUrl('sounds', soundFile);
}

/**
 * Preload an image asset
 * @param url - Image URL to preload
 */
export function preloadImage(url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve();
		img.onerror = reject;
		img.src = url;
	});
}

/**
 * Preload multiple images
 * @param urls - Array of image URLs
 */
export async function preloadImages(urls: string[]): Promise<void> {
	await Promise.all(urls.map(preloadImage));
}
