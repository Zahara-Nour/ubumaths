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

/**
 * Feuille qui SURCHARGE les polices KaTeX par défaut. Le jeu `katex` n'en a pas :
 * ses `@font-face` viennent de `mathlive/static.css`, importé par les composants
 * qui rendent des maths (`$lib/utils/mathlive-styles`). La surcharge est ajoutée
 * en fin de `<head>`, donc déclarée après : à descripteurs égaux, la dernière
 * `@font-face` l'emporte.
 */
const OVERRIDE_CSS: Record<MathFontSet, string | null> = {
	katex: null,
	shantell: '/mathlive-fonts-shantell.css'
};

/** Identifiant du `<link>` de surcharge */
const OVERRIDE_LINK_ID = 'mathlive-fonts-css';

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

	applyOverrideCss(fontSet);

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

	applyOverrideCss(fontSet);

	currentFontSet = fontSet;
}

/**
 * Preload both font sets for faster switching
 */
export async function preloadAllFonts(): Promise<void> {
	if (!browser) return;

	// Seule la surcharge Shantell est un fichier à part ; le jeu KaTeX est déjà là
	const href = OVERRIDE_CSS.shantell;
	if (currentFontSet === 'shantell' || !href) return;
	const link = document.createElement('link');
	link.rel = 'prefetch';
	link.href = href;
	link.as = 'style';
	document.head.appendChild(link);
}

/** Pose ou retire le `<link>` de surcharge des polices selon le jeu choisi */
function applyOverrideCss(fontSet: MathFontSet): void {
	const href = OVERRIDE_CSS[fontSet];
	const existing = document.getElementById(OVERRIDE_LINK_ID) as HTMLLinkElement | null;
	if (!href) {
		existing?.remove();
		return;
	}
	const link = existing ?? document.createElement('link');
	link.id = OVERRIDE_LINK_ID;
	link.rel = 'stylesheet';
	link.href = href;
	if (!existing) document.head.appendChild(link);
}
