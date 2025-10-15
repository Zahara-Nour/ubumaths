// Game asset URL helpers
// Author: Claude Code
// Date: 2025-10-15

import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export type AssetCategory = 'monsters' | 'spells' | 'characters' | 'sounds' | 'ui';

/**
 * Generate URL for game asset in Supabase Storage
 * @param category - Asset category (monsters, spells, characters, sounds, ui)
 * @param filename - Asset filename with extension
 * @returns Full URL to asset
 */
export function getGameAssetUrl(category: AssetCategory, filename: string): string {
	// Remove leading slash if present
	const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;

	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-assets/${category}/${cleanFilename}`;
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
 * @param spellNum - Spell number
 * @returns Full URL to spell icon
 */
export function getSpellIconUrl(spellNum: number): string {
	return getGameAssetUrl('spells', `spell_${spellNum}.png`);
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
