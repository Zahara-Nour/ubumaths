/**
 * MathLive Font Manager
 *
 * Allows switching between different KaTeX font sets (original vs Shantell)
 * by dynamically switching CSS stylesheets.
 *
 * @example
 * ```typescript
 * import { switchMathFonts, MathFontSet } from '$lib/utils/mathlive-fonts';
 *
 * // Switch to handwritten fonts
 * await switchMathFonts('shantell');
 *
 * // Switch back to original KaTeX fonts
 * await switchMathFonts('katex');
 * ```
 */

import { browser } from '$app/environment';

/** Available font sets */
export type MathFontSet = 'katex' | 'shantell';

/** CSS file paths for each font set */
const CSS_FILES: Record<MathFontSet, string> = {
	katex: '/mathlive-fonts-katex.css',
	shantell: '/mathlive-fonts-shantell.css'
};

/** Font directories for each set (used by MathLive) */
const FONT_DIRECTORIES: Record<MathFontSet, string> = {
	katex: '/fonts/katex-original',
	shantell: '/fonts/shantell-katex'
};

/** Currently loaded font set */
let currentFontSet: MathFontSet = 'katex';

/**
 * Switch to a different math font set
 *
 * @param fontSet - The font set to switch to ('katex' or 'shantell')
 * @returns Promise that resolves when fonts are loaded
 */
export async function switchMathFonts(fontSet: MathFontSet): Promise<void> {
	if (!browser) return;

	// Skip if already using this font set
	if (currentFontSet === fontSet) return;

	const cssLink = document.getElementById('mathlive-fonts-css') as HTMLLinkElement | null;
	if (!cssLink) {
		console.warn('MathLive fonts CSS link not found');
		return;
	}

	// Update CSS href
	const newHref = CSS_FILES[fontSet];
	cssLink.href = newHref;

	// Update MathfieldElement.fontsDirectory for any new mathfields
	const { MathfieldElement } = await import('mathlive');
	MathfieldElement.fontsDirectory = FONT_DIRECTORIES[fontSet];

	currentFontSet = fontSet;

	// Wait for fonts to load
	await document.fonts.ready;

	console.log(`Switched to ${fontSet} fonts`);
}

/**
 * Get the currently active font set
 */
export function getCurrentFontSet(): MathFontSet {
	return currentFontSet;
}

/**
 * Initialize fonts with a specific set
 * Should be called once at app startup before any mathfield is created
 */
export async function initMathFonts(fontSet: MathFontSet = 'katex'): Promise<void> {
	if (!browser) return;

	// Set fontsDirectory before any mathfield is created
	const { MathfieldElement } = await import('mathlive');
	MathfieldElement.fontsDirectory = FONT_DIRECTORIES[fontSet];

	// Update CSS if needed
	const cssLink = document.getElementById('mathlive-fonts-css') as HTMLLinkElement | null;
	if (cssLink && fontSet !== 'katex') {
		cssLink.href = CSS_FILES[fontSet];
	}

	currentFontSet = fontSet;
}

/**
 * Preload both font sets for faster switching
 */
export async function preloadAllFonts(): Promise<void> {
	if (!browser) return;

	// Preload the other CSS file
	const otherSet: MathFontSet = currentFontSet === 'katex' ? 'shantell' : 'katex';
	const link = document.createElement('link');
	link.rel = 'prefetch';
	link.href = CSS_FILES[otherSet];
	link.as = 'style';
	document.head.appendChild(link);
}
