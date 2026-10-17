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
	shantell: '/fonts/chiphre-math'
};

/**
 * Barres de fraction et de racine à l'épaisseur du trait des lettres de Chiphre Math,
 * bouts arrondis ; la barre de racine dépasse un peu l'expression et se referme par un
 * petit trait. MathLive trace ces barres en CSS (pas dans la police) : sans ces règles,
 * elles font 0,04 em, bien plus fines que les lettres.
 *
 * Elles grandissent vers le bas (le haut reste celui de MathLive, que le cadre du champ
 * couperait) ; la barre et le petit trait partent du même haut. MathLive a déjà une
 * règle `.ML__sqrt-line:after` (marge de -0,1 em) : le petit trait l'annule.
 */
const STROKE = '0.068em';
const MATHLIVE_STROKE = '0.04em';
const SQRT_OVERHANG = '0.15em';
const SQRT_TICK = '0.22em';
const STROKE_RULES = [
	`.ML__frac-line:after { min-height: ${STROKE} !important; margin-top: -${MATHLIVE_STROKE} !important; border-radius: ${STROKE}; }`,
	`.ML__sqrt-sign + .ML__vlist-t { margin-right: ${SQRT_OVERHANG} !important; }`,
	`.ML__sqrt-line { position: relative; height: ${STROKE} !important; width: calc(100% + ${SQRT_OVERHANG}) !important; }`,
	`.ML__sqrt-line:before { min-height: ${STROKE} !important; margin-top: -${MATHLIVE_STROKE} !important; border-radius: ${STROKE}; }`,
	`.ML__sqrt-line:after { content: ''; position: absolute; right: 0; top: -${MATHLIVE_STROKE}; margin-top: 0 !important; border: none; width: ${STROKE}; height: ${SQRT_TICK}; background: currentColor; border-radius: ${STROKE}; }`
];

/** Feuille du document qui porte les règles des barres hors des champs */
let documentStrokeSheet: CSSStyleSheet | null = null;

/** Règles des barres posées, par feuille, pour pouvoir les retirer */
const insertedStrokeRules = new Map<CSSStyleSheet, CSSRule[]>();

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
	applyStrokeRules(fontSet);

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
	applyStrokeRules(fontSet);

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

/**
 * Pose ou retire les règles des barres (STROKE_RULES). Les champs MathLive (`math-field`,
 * `math-span`) partagent une feuille de style, adoptée par chaque shadow DOM : une règle
 * ajoutée à celle-ci vaut pour tous les champs, présents et futurs. Les formules rendues
 * hors champ lisent les styles du document : les règles y sont posées aussi.
 */
function applyStrokeRules(fontSet: MathFontSet): void {
	if (!documentStrokeSheet) {
		documentStrokeSheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, documentStrokeSheet];
	}
	const shared = document.createElement('math-span').shadowRoot?.adoptedStyleSheets[0];
	const sheets = shared ? [shared, documentStrokeSheet] : [documentStrokeSheet];
	for (const sheet of sheets) {
		// Retrait des règles déjà posées, puis ajout si Chiphre Math
		for (const rule of insertedStrokeRules.get(sheet) ?? []) {
			const index = Array.from(sheet.cssRules).indexOf(rule);
			if (index >= 0) sheet.deleteRule(index);
		}
		insertedStrokeRules.delete(sheet);
		if (fontSet !== 'shantell') continue;
		const inserted = STROKE_RULES.map(
			(rule) => sheet.cssRules[sheet.insertRule(rule, sheet.cssRules.length)]
		);
		insertedStrokeRules.set(sheet, inserted);
	}
}
