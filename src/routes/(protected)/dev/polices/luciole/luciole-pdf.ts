/**
 * PDF d'essai de /dev/polices/luciole : les exercices de démonstration compilés
 * par Typst avec Luciole (texte) et Luciole Math (formules).
 *
 * Luciole Math est une police de maths OpenType : Typst la lit telle quelle,
 * sans rien construire (contrairement à l'écran, où MathLive veut des polices
 * découpées à la KaTeX). Le compilateur est un compilateur à part
 * (`createFontsCompiler`) : le Corrigé des fiches n'est pas touché.
 *
 * Polices : paquet CTAN `luciole` (Luciole-Math 0.76), `static/fonts/luciole/`.
 */

import { createFontsCompiler } from '#lib/typst/compiler/correction-fonts-compiler.ts';
import { withCorrectionFonts } from '#lib/typst/correction-fonts.ts';
import { fetchExternalImages, urlToVirtualPath } from '#lib/typst/image-loader.ts';
import {
	clearTrackedExternalImages,
	getTrackedExternalImages,
	markdownToTypst
} from '#lib/ubumark/generators/typst-generator.ts';

// Types
export type LucioleVariant = 'luciole' | 'standard';

interface DemoExercise {
	title: string;
	statement_md: string;
	solution_md: string;
}

type Compiler = Awaited<ReturnType<typeof createFontsCompiler>>;

// Constantes

const LUCIOLE_FONT_FILES = [
	'/fonts/luciole/Luciole-Regular.ttf',
	'/fonts/luciole/Luciole-Bold.ttf',
	'/fonts/luciole/Luciole-Italic.ttf',
	'/fonts/luciole/Luciole-BoldItalic.ttf',
	'/fonts/luciole/Luciole-Math.otf'
] as const;

/** Texte en Luciole, interligne plus grand ; formules en Luciole Math */
const LUCIOLE_RULES = `// <polices-du-corrige>
#set text(font: "Luciole")
#set par(leading: 0.9em)
#show math.equation: set text(font: "Luciole Math")
// </polices-du-corrige>`;

// Variables

let compiler: Promise<Compiler> | null = null;

// Fonctions

/** Le Typst d'un exercice : énoncé puis corrigé */
async function exerciseTypst(exercise: DemoExercise, variant: LucioleVariant): Promise<string> {
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
	return variant === 'standard' ? typst : withCorrectionFonts(typst, LUCIOLE_RULES);
}

/** Compile un exercice en PDF et le fait télécharger */
export async function downloadLuciolePdf(
	exercise: DemoExercise,
	variant: LucioleVariant
): Promise<void> {
	compiler ??= createFontsCompiler(LUCIOLE_FONT_FILES);
	const snippet = await compiler;

	clearTrackedExternalImages();
	const typst = await exerciseTypst(exercise, variant);
	const images = await fetchExternalImages(getTrackedExternalImages(), { timeout: 10000 });
	for (const [url, data] of images) {
		await snippet.mapShadow(urlToVirtualPath(url), data);
	}

	try {
		const pdf = await snippet.pdf({ mainContent: typst });
		const blob = new Blob([pdf as BlobPart], { type: 'application/pdf' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `${exercise.title} (${variant === 'luciole' ? 'Luciole' : 'standard'}).pdf`;
		link.click();
		// Libéré plus tard : certains navigateurs lisent le lien après le clic
		setTimeout(() => URL.revokeObjectURL(link.href), 10000);
	} finally {
		await snippet.resetShadow();
	}
}
