/**
 * PDF des exercices de démonstration de /test-font, compilés par Typst.
 *
 * La chaîne est celle des fiches (`markdownToTypst`, images chargées puis posées
 * dans le système de fichiers virtuel), avec le compilateur du Corrigé des fiches
 * (`correction-fonts-compiler.ts`), qui charge en plus Shantell Sans (texte) et
 * Chiphre Math (formules, police OpenType MATH construite par tools/chiphre-math).
 */

import { getCorrectionFontsCompiler } from '$lib/typst/compiler/correction-fonts-compiler';
import { withCorrectionFonts } from '$lib/typst/correction-fonts';
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

// Fonctions

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
	// Les mêmes règles que le Corrigé des fiches
	return fonts === 'standard' ? typst : withCorrectionFonts(typst);
}

/** Compile un exercice en PDF et le fait télécharger */
export async function downloadExercisePdf(
	exercise: DemoExercise,
	fonts: PdfFontSet
): Promise<void> {
	// Le compilateur du Corrigé des fiches : il charge Shantell Sans et Chiphre Math
	const snippet = await getCorrectionFontsCompiler();

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
