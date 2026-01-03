/**
 * Shared UI constants for VIP cards
 * ==================================
 * Centralized styling and labels for VIP card rarity display.
 */

import type { VipCardRarity } from '$lib/types/vip-card';

/**
 * Border and background colors for card containers by rarity
 */
export const RARITY_COLORS: Record<VipCardRarity, string> = {
	common: 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800',
	rare: 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30',
	epic: 'border-purple-400 bg-purple-50 dark:border-purple-500 dark:bg-purple-900/30',
	legendary: 'border-yellow-400 bg-yellow-50 dark:border-yellow-500 dark:bg-yellow-900/30'
};

/**
 * Text colors for rarity badges and labels
 */
export const RARITY_TEXT_COLORS: Record<VipCardRarity, string> = {
	common: 'text-gray-600 dark:text-gray-400',
	rare: 'text-blue-600 dark:text-blue-400',
	epic: 'text-purple-600 dark:text-purple-400',
	legendary: 'text-yellow-600 dark:text-yellow-400'
};

/**
 * Simpler text colors for modal/small contexts
 */
export const RARITY_ACCENT_COLORS: Record<VipCardRarity, string> = {
	common: 'text-gray-500',
	rare: 'text-blue-500',
	epic: 'text-purple-500',
	legendary: 'text-yellow-500'
};

/**
 * French labels for rarity display
 */
export const RARITY_LABELS: Record<VipCardRarity, string> = {
	common: 'Commune',
	rare: 'Rare',
	epic: 'Epique',
	legendary: 'Legendaire'
};

/**
 * Sorting order for rarity (ascending by value)
 */
export const RARITY_ORDER: Record<VipCardRarity, number> = {
	common: 1,
	rare: 2,
	epic: 3,
	legendary: 4
};

/**
 * Filter options for rarity dropdown (includes 'all' option)
 */
export const RARITY_FILTER_OPTIONS = [
	{ value: 'all', label: 'Toutes les raretes' },
	{ value: 'common', label: 'Commune' },
	{ value: 'rare', label: 'Rare' },
	{ value: 'epic', label: 'Epique' },
	{ value: 'legendary', label: 'Legendaire' }
] as const;
