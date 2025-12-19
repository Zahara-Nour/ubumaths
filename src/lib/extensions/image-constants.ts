/**
 * Shared constants for image rendering
 * ====================================
 *
 * Used by both image-extension.ts (TipTap) and ImageNodeView.svelte (UI).
 *
 * @module extensions/image-constants
 */

/**
 * Size class to CSS width mapping
 */
export const SIZE_CLASS_STYLES: Record<string, { width: string; maxWidth: string }> = {
	inline: { width: '1.5em', maxWidth: '1.5em' },
	small: { width: '25%', maxWidth: '300px' },
	medium: { width: '50%', maxWidth: '600px' },
	large: { width: '75%', maxWidth: '900px' },
	full: { width: '100%', maxWidth: '1200px' }
};

/**
 * Valid size class values
 */
export const SIZE_CLASSES = ['inline', 'small', 'medium', 'large', 'full'] as const;
export type SizeClass = (typeof SIZE_CLASSES)[number];

/**
 * Valid alignment values
 */
export const ALIGNMENTS = ['left', 'center', 'right'] as const;
export type Alignment = (typeof ALIGNMENTS)[number];
