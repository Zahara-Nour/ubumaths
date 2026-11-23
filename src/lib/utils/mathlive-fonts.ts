/**
 * MathLive Font Manager
 *
 * Allows switching between different KaTeX font sets (original, Shantell, Luciole)
 * by dynamically switching CSS stylesheets.
 *
 * @example
 * ```typescript
 * import { switchMathFonts, MathFontSet } from '#lib/utils/mathlive-fonts.ts';
 *
 * // Switch to handwritten fonts
 * await switchMathFonts('shantell');
 *
 * // Switch back to original KaTeX fonts
 * await switchMathFonts('katex');
 * ```
 */

import { browser } from '$app/env';

/** Available font sets */
export type MathFontSet = 'katex' | 'shantell' | 'luciole';

/**
 * Feuille qui SURCHARGE les polices KaTeX par défaut. Le jeu `katex` n'en a pas :
 * ses `@font-face` viennent de `mathlive/static.css`, importé par les composants
 * qui rendent des maths (`#lib/utils/mathlive-styles.ts`). La surcharge est ajoutée
 * en fin de `<head>`, donc déclarée après : à descripteurs égaux, la dernière
 * `@font-face` l'emporte.
 */
const OVERRIDE_CSS: Record<MathFontSet, string | null> = {
	katex: null,
	shantell: '/mathlive-fonts-shantell.css',
	luciole: '/mathlive-fonts-luciole.css'
};

/** Identifiant du `<link>` de surcharge */
const OVERRIDE_LINK_ID = 'mathlive-fonts-css';

/** Font directories for each set (used by MathLive) */
const FONT_DIRECTORIES: Record<MathFontSet, string> = {
	katex: '/fonts/katex-original',
	shantell: '/fonts/chiphre-math',
	luciole: '/fonts/luciole-math'
};

/**
 * Barres de fraction et de racine à l'épaisseur du trait des lettres du jeu, bouts
 * arrondis. MathLive trace ces barres en CSS (pas dans la police) : sans ces règles,
 * elles font 0,04 em, bien plus fines que les lettres de Chiphre Math ou de Luciole.
 *
 * Elles grandissent vers le bas (le haut reste celui de MathLive, que le cadre du champ
 * couperait). Chiphre Math seulement, geste de la main : la barre de racine dépasse un
 * peu l'expression et se referme par un petit trait, qui part du même haut. MathLive a
 * déjà une règle `.ML__sqrt-line:after` (marge de -0,1 em) : le petit trait l'annule.
 */
const MATHLIVE_STROKE = '0.04em';
const SQRT_OVERHANG = '0.15em';
const SQRT_TICK = '0.22em';

/**
 * Épaisseur des barres par jeu. Luciole : 0,1 em (`FractionRuleThickness` de
 * Luciole-Math), écrit 0,09 em parce que ses formules sont grossies de 1/0,9.
 */
const STROKE: Record<MathFontSet, string | null> = {
	katex: null,
	shantell: '0.068em',
	luciole: '0.09em'
};

/**
 * Luciole : ses glyphes sont réduits à 0,9 dans les polices du jeu
 * (`tools/chiphre-math/src/build_luciole_katex.py`, GLYPH_SCALE) et les formules
 * grossies d'autant ici. Les lettres retrouvent leur taille, et les écarts que MathLive
 * calcule avec les hauteurs de KaTeX grandissent avec elles : sinon, Luciole étant ~10 %
 * plus haute que KaTeX, ses lettres touchaient la barre de racine.
 */
const LUCIOLE_FONT_SIZE = `.ML__latex { font-size: ${(100 / 0.9).toFixed(2)}%; }`;

/** Règles CSS propres au jeu : barres, et taille des formules pour Luciole */
function fontSetRules(fontSet: MathFontSet): string[] {
	const stroke = STROKE[fontSet];
	if (!stroke) return [];
	// Luciole : barre de racine posée au haut du signe, sans la remontée de 0,04 em de
	// MathLive ; sinon elle passait au-dessus du coin de la grande racine empilée (marche)
	const sqrtMargin = fontSet === 'luciole' ? '0' : `-${MATHLIVE_STROKE}`;
	const rules = [
		`.ML__frac-line:after { min-height: ${stroke} !important; margin-top: -${MATHLIVE_STROKE} !important; border-radius: ${stroke}; }`,
		`.ML__sqrt-line { height: ${stroke} !important; }`,
		`.ML__sqrt-line:before { min-height: ${stroke} !important; margin-top: ${sqrtMargin} !important; border-radius: ${stroke}; }`
	];
	if (fontSet === 'luciole') return [...rules, LUCIOLE_FONT_SIZE];
	if (fontSet !== 'shantell') return rules;
	return [
		...rules,
		`.ML__sqrt-sign + .ML__vlist-t { margin-right: ${SQRT_OVERHANG} !important; }`,
		`.ML__sqrt-line { position: relative; width: calc(100% + ${SQRT_OVERHANG}) !important; }`,
		`.ML__sqrt-line:after { content: ''; position: absolute; right: 0; top: -${MATHLIVE_STROKE}; margin-top: 0 !important; border: none; width: ${stroke}; height: ${SQRT_TICK}; background: currentColor; border-radius: ${stroke}; }`
	];
}

/** Feuille du document qui porte les règles du jeu hors des champs */
let documentRulesSheet: CSSStyleSheet | null = null;

/** Règles du jeu posées, par feuille, pour pouvoir les retirer */
const insertedRules = new Map<CSSStyleSheet, CSSRule[]>();

/** Currently loaded font set */
let currentFontSet: MathFontSet = 'katex';

/**
 * Switch to a different math font set
 *
 * @param fontSet - The font set to switch to ('katex', 'shantell' or 'luciole')
 * @returns Promise that resolves when fonts are loaded
 */
export async function switchMathFonts(fontSet: MathFontSet): Promise<void> {
	if (!browser) return;

	// Skip if already using this font set
	if (currentFontSet === fontSet) return;

	// Jeu noté AVANT l'import de MathLive : deux bascules rapprochées (allumer puis éteindre
	// la lecture facilitée pendant le premier import) ne doivent pas finir sur la première
	currentFontSet = fontSet;
	applyOverrideCss(fontSet);

	// Update MathfieldElement.fontsDirectory for any new mathfields
	const { MathfieldElement } = await import('mathlive');
	// Une bascule plus récente a pris la main pendant l'import : elle posera son jeu
	if (currentFontSet !== fontSet) return;
	MathfieldElement.fontsDirectory = FONT_DIRECTORIES[fontSet];
	applyFontSetRules(fontSet);

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
	applyFontSetRules(fontSet);

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
	keepOverrideLast();
}

/** Garde de `keepOverrideLast`, posée une fois */
let headObserver: MutationObserver | null = null;

/**
 * La surcharge doit rester la DERNIÈRE feuille du `<head>` : les `@font-face` KaTeX de
 * `mathlive/static.css` arrivent avec le chunk des pages qui ont des maths
 * (`mathlive-styles.ts`). Jeu choisi sur une page sans maths (réglage « Lecture
 * facilitée » au démarrage), puis navigation côté client vers un exercice : Vite ajoute
 * cette feuille après la surcharge, qui perdrait (à descripteurs égaux, la dernière
 * `@font-face` l'emporte). Chaque ajout au `<head>` remet donc la surcharge en dernier.
 */
function keepOverrideLast(): void {
	if (headObserver) return;
	headObserver = new MutationObserver(() => {
		const link = document.getElementById(OVERRIDE_LINK_ID);
		if (link && link.parentNode === document.head && document.head.lastElementChild !== link) {
			document.head.appendChild(link);
		}
	});
	headObserver.observe(document.head, { childList: true });
}

/**
 * Pose ou retire les règles du jeu (`fontSetRules`). Les champs MathLive (`math-field`,
 * `math-span`) partagent une feuille de style, adoptée par chaque shadow DOM : une règle
 * ajoutée à celle-ci vaut pour tous les champs, présents et futurs. Les formules rendues
 * hors champ lisent les styles du document : les règles y sont posées aussi.
 */
function applyFontSetRules(fontSet: MathFontSet): void {
	if (!documentRulesSheet) {
		documentRulesSheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, documentRulesSheet];
	}
	const shared = document.createElement('math-span').shadowRoot?.adoptedStyleSheets[0];
	const sheets = shared ? [shared, documentRulesSheet] : [documentRulesSheet];
	for (const sheet of sheets) {
		// Retrait des règles déjà posées, puis ajout de celles du jeu
		for (const rule of insertedRules.get(sheet) ?? []) {
			const index = Array.from(sheet.cssRules).indexOf(rule);
			if (index >= 0) sheet.deleteRule(index);
		}
		insertedRules.delete(sheet);
		const rules = fontSetRules(fontSet);
		if (rules.length === 0) continue;
		const inserted = rules.map(
			(rule) => sheet.cssRules[sheet.insertRule(rule, sheet.cssRules.length)]
		);
		insertedRules.set(sheet, inserted);
	}
}
