/**
 * Au PDF, un paragraphe ne reste pas seul en bas de page quand le bloc qui le
 * suit part sur la page suivante (« 30 pièces en vrac : » en bas de page, son
 * bloc ```monnaie en haut de la suivante, recette de la monnaie, 2026-10-25).
 *
 * Décision de David (2026-10-26) : un paragraphe reste collé (`sticky`) à tout
 * bloc qui le suit, SAUF un autre paragraphe, un titre ou un trait. Au niveau
 * du document comme dans un élément de liste.
 *
 * Le rendu est vérifié avec le compilateur de prod (typst.ts en WebAssembly) :
 * texte de chaque page lu par pdfjs.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '../typst-generator';

const body = (md: string) =>
	generateTypst(parseMarkdown(md), { includeSetup: false }).split(
		'// ubumark: fin de l’en-tête'
	)[1];

/** Le paragraphe `text` est-il enveloppé dans un bloc collé au suivant ? */
function isSticky(typst: string, text: string): boolean {
	return new RegExp(`#block\\(width: 100%, sticky: true\\)\\[\\n${text}\\n\\]`).test(typst);
}

const MONNAIE = '```monnaie\npièces: 30×1\ndisposition: mélangé\n```';

describe('quels blocs emmènent le paragraphe qui les précède', () => {
	it.each([
		['un dessin (monnaie)', MONNAIE],
		['une formule centrée', '$$x^2=4$$'],
		['un tableau', '| a | b |\n|---|---|\n| 1 | 2 |'],
		['une liste', '1. a\n2. b'],
		['une citation', '> cité']
	])('devant %s : collé', (_nom, bloc) => {
		expect(isSticky(body(`INTRO :\n\n${bloc}`), 'INTRO :')).toBe(true);
	});

	it.each([
		['un autre paragraphe', 'SUITE'],
		['un titre', '## Titre'],
		['un trait', '---']
	])('devant %s : pas collé', (_nom, bloc) => {
		expect(body(`INTRO\n\n${bloc}`)).not.toContain('sticky');
	});

	it('dernier paragraphe du document : pas collé', () => {
		expect(body(`${MONNAIE}\n\nFIN`)).not.toContain('sticky');
	});

	it('seul le paragraphe juste avant le bloc est collé', () => {
		const out = body(`AVANT\n\nINTRO :\n\n${MONNAIE}`);
		expect(isSticky(out, 'INTRO :')).toBe(true);
		expect(isSticky(out, 'AVANT')).toBe(false);
	});

	// Premier paragraphe d'un élément : porté par `ubu-item` (`tete`), dans le même
	// bloc collé que le numéro ; sinon le numéro resterait seul sur sa ligne
	it('premier paragraphe d’un élément de liste : collé avec son numéro', () => {
		const out = body(`1. INTRO :\n\n   ${MONNAIE.replaceAll('\n', '\n   ')}`);
		expect(out).toContain('#ubu-item(numbering("1)", 1), w: "1)", tete: [INTRO :])[');
		expect(isSticky(out, 'INTRO :')).toBe(false);
	});

	it('énoncé suivi de ses sous-questions : collé à la première', () => {
		expect(body('1. ÉNONCÉ\n   1. a\n   2. b')).toContain('tete: [ÉNONCÉ]');
	});

	it('paragraphe suivant d’un élément de liste : collé au bloc qui le suit', () => {
		const out = body(`1. AVANT\n\n   INTRO :\n\n   ${MONNAIE.replaceAll('\n', '\n   ')}`);
		expect(out).not.toContain('tete:');
		expect(isSticky(out, 'INTRO :')).toBe(true);
	});

	it('élément d’un seul paragraphe : rien ne change', () => {
		expect(body('1. SEUL\n2. AUTRE')).not.toContain('sticky');
	});
});

describe('rendu réel : le paragraphe change de page avec son bloc', () => {
	/** Texte de chaque page du PDF compilé */
	async function pages(md: string): Promise<string[]> {
		const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
		const pdf = await $typst.pdf({ mainContent: generateTypst(parseMarkdown(md)) });
		const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
		const doc = await getDocument({ data: new Uint8Array(pdf!) }).promise;
		const out: string[] = [];
		for (let i = 1; i <= doc.numPages; i++) {
			const content = await (await doc.getPage(i)).getTextContent();
			out.push(content.items.map((item) => ('str' in item ? item.str : '')).join(''));
		}
		return out;
	}

	/** Page où apparaît `text` pour la première fois */
	const pageOf = (all: string[], text: string) => all.findIndex((page) => page.includes(text));

	it('quelle que soit la hauteur de ce qui précède, INTRO est sur la page du bloc', async () => {
		const wasm = readFileSync(
			resolve('node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
		);
		const fonts = ['ShantellSans-Light.ttf', 'ShantellSans-Bold.ttf', 'ChiphreMath.ttf'].map(
			(f) => new Uint8Array(readFileSync(resolve('static/fonts/chiphre-math-typst', f)))
		);
		vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit dans ce test')));
		const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
		$typst.setCompilerInitOptions({
			getModule: () => wasm,
			beforeBuild: [loadFonts(fonts, { assets: false })]
		});

		// Le bloc ne tient pas en bas de la page 1 pour au moins une hauteur de
		// remplissage : sans correctif, INTRO y reste seul. Au niveau du document,
		// et en premier paragraphe d'un élément de liste (avec son numéro)
		const inList = `1. INTRO :\n\n   ${MONNAIE.replaceAll('\n', '\n   ')}`;
		for (const [where, end] of [
			['document', `INTRO :\n\n${MONNAIE}`],
			['liste', inList]
		]) {
			const separated: number[] = [];
			let changedPage = false;
			for (let lines = 24; lines <= 40; lines += 2) {
				const filler = Array.from({ length: lines }, (_, i) => `Ligne ${i + 1}`).join('\n\n');
				const all = await pages(`${filler}\n\n${end}`);
				const block = pageOf(all, '1 €');
				if (block > 0) changedPage = true;
				if (pageOf(all, 'INTRO') !== block) separated.push(lines);
			}
			// Témoin : le bloc est bien passé à la page suivante dans un des cas
			expect(changedPage, where).toBe(true);
			expect(separated, where).toEqual([]);
		}
	}, 240_000);
});
