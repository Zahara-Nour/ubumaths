/**
 * Compilateur du Corrigé : Shantell Sans et Chiphre Math
 * ======================================================
 *
 * Le compilateur partagé (`$typst`, `typst-compiler.ts`) est un singleton dont
 * les polices sont fixées à sa création. Le Corrigé a besoin de trois polices de
 * plus (`static/fonts/chiphre-math-typst/`, 870 ko) : un compilateur À PART,
 * construit au premier Corrigé puis gardé, les charge. La fiche et les Réponses
 * ne passent jamais par lui, et ne téléchargent donc rien de plus.
 *
 * `compileTypstDocument` choisit le compilateur d'après le document (règles de
 * `correction-fonts.ts` présentes ou non) et porte le repli : la compilation
 * avec ces polices échoue → le même corrigé, recompilé dans la police standard,
 * l'erreur Typst étant rendue à l'appelant (avertissement) et écrite en console.
 *
 * Sert aussi la page /test-font (PDF de démonstration).
 *
 * @module typst/compiler/correction-fonts-compiler
 */

import { urlToVirtualPath } from '../image-loader';
import {
	CORRECTION_FONT_FILES,
	hasCorrectionFonts,
	withoutCorrectionFonts
} from '../correction-fonts';
import { COMPILER_WASM_URL, RENDERER_WASM_URL, getTypstCompiler } from './typst-compiler';

// ============================================================================
// TYPES
// ============================================================================

/** Fournisseur de configuration d'un compilateur typst.ts (polices, paquets…) */
type SnippetProvider = { key: string };

/** Ce dont la compilation d'un document a besoin, quel que soit le compilateur */
export interface DocumentCompiler {
	pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
	svg: (options: { mainContent: string }) => Promise<string>;
	mapShadow: (path: string, content: Uint8Array) => unknown;
	resetShadow: () => unknown;
}

interface TypstSnippetInstance extends DocumentCompiler {
	setCompilerInitOptions: (options: { getModule: () => string }) => void;
	setRendererInitOptions: (options: { getModule: () => string }) => void;
	use: (...providers: SnippetProvider[]) => void;
}

/** La classe TypstSnippet du bundle typst.ts (chargé par CDN avec le compilateur partagé) */
interface TypstSnippetClass {
	new (options: { compiler: unknown }): TypstSnippetInstance;
	/** Construit un compilateur propre à l'instance */
	buildLocalCompiler: unknown;
	preloadFontFromUrl: (url: string) => SnippetProvider;
	fetchPackageRegistry: () => SnippetProvider;
}

/** Résultat d'une compilation avec repli */
export interface FallbackResult<T> {
	data: T;
	/** Le Typst réellement compilé (sans les règles de police après un repli) */
	typst: string;
	/** Erreur Typst de la compilation avec les polices du Corrigé ; `null` sans repli */
	fallbackError: string | null;
}

/** Un document compilé : PDF, et SVG pour l'aperçu si demandé */
export interface CompiledDocument {
	pdf: Uint8Array;
	svg: string | null;
}

// ============================================================================
// VARIABLES
// ============================================================================

let fontsCompiler: Promise<TypstSnippetInstance> | null = null;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Le compilateur du Corrigé, créé au premier appel et gardé pour les suivants */
export function getCorrectionFontsCompiler(): Promise<DocumentCompiler> {
	// Un échec de construction reste en mémoire jusqu'au rechargement de la page :
	// les Corrigés suivants (un lot entier) passent directement au repli, sans
	// refaire la tentative pour chaque élève
	fontsCompiler ??= buildCorrectionFontsCompiler();
	return fontsCompiler;
}

async function buildCorrectionFontsCompiler(): Promise<TypstSnippetInstance> {
	// Charge le bundle typst.ts : il expose la classe TypstSnippet
	await getTypstCompiler();
	const TypstSnippet = (window as unknown as { TypstSnippet: TypstSnippetClass }).TypstSnippet;

	const snippet = new TypstSnippet({ compiler: TypstSnippet.buildLocalCompiler });
	snippet.setCompilerInitOptions({ getModule: () => COMPILER_WASM_URL });
	// L'aperçu de la page de la fiche affiche le Corrigé en SVG
	snippet.setRendererInitOptions({ getModule: () => RENDERER_WASM_URL });
	snippet.use(
		// Nos polices, en plus des polices de texte par défaut de Typst
		...CORRECTION_FONT_FILES.map((path) =>
			TypstSnippet.preloadFontFromUrl(new URL(path, window.location.origin).href)
		),
		// Les paquets @preview (cetz : tableaux de variations, cercle…)
		TypstSnippet.fetchPackageRegistry()
	);
	return snippet;
}

/** Message lisible d'une erreur de compilation (typst.ts lève parfois une chaîne) */
function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return typeof error === 'string' ? error : JSON.stringify(error);
}

/**
 * Compile un document ; s'il porte les polices du Corrigé et que la compilation
 * échoue, recompile le même document sans elles. Une erreur de la compilation
 * sans polices remonte : jamais de PDF vide.
 *
 * @param compile - compile `typst`, avec le compilateur du Corrigé si `withFonts`
 */
export async function compileWithFontFallback<T>(
	typst: string,
	compile: (typst: string, withFonts: boolean) => Promise<T>
): Promise<FallbackResult<T>> {
	if (!hasCorrectionFonts(typst)) {
		return { data: await compile(typst, false), typst, fallbackError: null };
	}
	try {
		return { data: await compile(typst, true), typst, fallbackError: null };
	} catch (error) {
		const message = errorMessage(error);
		console.error('[Corrigé] Compilation en Shantell Sans / Chiphre Math impossible :', message);
		const plain = withoutCorrectionFonts(typst);
		return { data: await compile(plain, false), typst: plain, fallbackError: message };
	}
}

/**
 * Compile un document Typst en PDF (et en SVG si demandé), avec ses images,
 * dans le bon compilateur et avec le repli du Corrigé.
 *
 * @param options.images - images du document, par adresse d'origine (`fetchExternalImages`)
 * @param options.svg - rendre aussi le SVG (aperçu)
 * @param options.compiler - compilateur partagé déjà chargé par l'appelant ; absent : `getTypstCompiler()`
 */
export async function compileTypstDocument(
	typst: string,
	options: { images?: Map<string, Uint8Array>; svg?: boolean; compiler?: DocumentCompiler } = {}
): Promise<FallbackResult<CompiledDocument>> {
	return compileWithFontFallback(typst, async (source, withFonts) => {
		const compiler: DocumentCompiler = withFonts
			? await getCorrectionFontsCompiler()
			: (options.compiler ?? (await getTypstCompiler()));
		for (const [url, data] of options.images ?? []) {
			await compiler.mapShadow(urlToVirtualPath(url), data);
		}
		try {
			const svg = options.svg ? await compiler.svg({ mainContent: source }) : null;
			const pdf = await compiler.pdf({ mainContent: source });
			return { pdf, svg };
		} finally {
			// Libère le système de fichiers virtuel
			await compiler.resetShadow();
		}
	});
}

/** L'avertissement montré au professeur ou à l'élève après un repli */
export function fallbackWarning(fallbackError: string): string {
	return `Corrigé imprimé dans la police standard : ${fallbackError.slice(0, 200)}`;
}
