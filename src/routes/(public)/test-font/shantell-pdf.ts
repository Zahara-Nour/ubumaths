/**
 * PDF des exercices de démonstration de /test-font, compilés par Typst.
 *
 * La chaîne est celle des fiches (`markdownToTypst`, images chargées puis posées
 * dans le système de fichiers virtuel), mais avec un compilateur Typst À PART :
 * le compilateur partagé de l'application (`$typst`) est un singleton dont les
 * polices sont fixées à sa création. Celui-ci charge en plus Shantell Sans (texte)
 * et Shantell Math (formules, police OpenType MATH construite par
 * tools/shantell-math), sans rien changer aux PDF des fiches.
 */

import { getTypstCompiler } from '$lib/typst/compiler/typst-compiler';
import { fetchExternalImages, urlToVirtualPath } from '$lib/typst/image-loader';
import {
	clearTrackedExternalImages,
	getTrackedExternalImages,
	markdownToTypst
} from '$lib/ubumark/generators/typst-generator';

// Types
export type PdfFontSet = 'shantell' | 'standard';

interface DemoExercise {
	title: string;
	statement_md: string;
	solution_md: string;
}

/** Fournisseur de configuration d'un compilateur typst.ts (polices, paquets…) */
type SnippetProvider = { key: string };

interface TypstSnippetInstance {
	setCompilerInitOptions: (options: { getModule: () => string }) => void;
	use: (...providers: SnippetProvider[]) => void;
	pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
	mapShadow: (path: string, content: Uint8Array) => Promise<void>;
	resetShadow: () => Promise<void>;
}

/** La classe TypstSnippet du bundle typst.ts (chargé par CDN) */
interface TypstSnippetClass {
	new (options: { compiler: unknown }): TypstSnippetInstance;
	/** Construit un compilateur propre à l'instance, avec la même configuration que le global */
	buildLocalCompiler: unknown;
	preloadFontFromUrl: (url: string) => SnippetProvider;
	fetchPackageRegistry: () => SnippetProvider;
}

// Constantes
const TYPST_VERSION = '0.6.1-rc5';
const COMPILER_WASM_URL = `https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@${TYPST_VERSION}/pkg/typst_ts_web_compiler_bg.wasm`;
const SHANTELL_FONT_URLS = [
	'/fonts/shantell-typst/ShantellSans-Light.ttf',
	'/fonts/shantell-typst/ShantellSans-Bold.ttf',
	'/fonts/shantell-typst/ShantellMath.ttf'
];
const STANDARD_TEXT_FONT = '#set text(font: "New Computer Modern"';

// Variables
let shantellSnippet: TypstSnippetInstance | null = null;

// Fonctions

/** Le compilateur dédié, créé au premier PDF et gardé pour les suivants */
async function getShantellSnippet(): Promise<TypstSnippetInstance> {
	if (shantellSnippet) return shantellSnippet;

	// Charge le bundle typst.ts (il expose la classe TypstSnippet)
	await getTypstCompiler();
	const TypstSnippet = (window as unknown as { TypstSnippet: TypstSnippetClass }).TypstSnippet;

	const snippet = new TypstSnippet({ compiler: TypstSnippet.buildLocalCompiler });
	snippet.setCompilerInitOptions({ getModule: () => COMPILER_WASM_URL });
	snippet.use(
		// Nos polices, en plus des polices de texte par défaut de Typst
		...SHANTELL_FONT_URLS.map((path) =>
			TypstSnippet.preloadFontFromUrl(new URL(path, window.location.origin).href)
		),
		// Les paquets @preview (cetz : tableaux de variations, cercle…)
		TypstSnippet.fetchPackageRegistry()
	);
	shantellSnippet = snippet;
	return snippet;
}

/** Le Typst d'un exercice : énoncé puis corrigé, dans la police demandée */
async function exerciseTypst(exercise: DemoExercise, fonts: PdfFontSet): Promise<string> {
	const markdown = [
		`# ${exercise.title}`,
		'',
		exercise.statement_md,
		'',
		'## Corrigé',
		'',
		exercise.solution_md
	]
		.join('\n')
		// Images copiées dans static/test-font : la chaîne PDF ne charge que les adresses complètes
		.replaceAll('](/test-font/', `](${window.location.origin}/test-font/`);
	const typst = await markdownToTypst(markdown, { includeSetup: true, language: 'fr' });
	if (fonts === 'standard') return typst;
	return typst.replace(
		STANDARD_TEXT_FONT,
		'#show math.equation: set text(font: "Shantell Math")\n#set text(font: "Shantell Sans", weight: "light"'
	);
}

/** Compile un exercice en PDF et le fait télécharger */
export async function downloadExercisePdf(
	exercise: DemoExercise,
	fonts: PdfFontSet
): Promise<void> {
	const snippet = await getShantellSnippet();

	clearTrackedExternalImages();
	const typst = await exerciseTypst(exercise, fonts);
	const images = await fetchExternalImages(getTrackedExternalImages(), { timeout: 10000 });
	for (const [url, data] of images) {
		await snippet.mapShadow(urlToVirtualPath(url), data);
	}

	try {
		const pdf = await snippet.pdf({ mainContent: typst });
		const blob = new Blob([pdf as BlobPart], { type: 'application/pdf' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `${exercise.title} (${fonts === 'shantell' ? 'Shantell' : 'standard'}).pdf`;
		link.click();
		// Libéré plus tard : certains navigateurs lisent le lien après le clic
		setTimeout(() => URL.revokeObjectURL(link.href), 10000);
	} finally {
		await snippet.resetShadow();
	}
}
