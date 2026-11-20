/**
 * Texte coloré dans la prose, au PDF (ADR 0042, PR 2 du chantier `texte-colore`)
 *
 * `[le cône]{.orange}` : même nom qu'à l'écran, teinte de la variante claire
 * (`NAMED_COLOR_PRINT`, celle des figures au PDF). Une classe inconnue : texte
 * normal, sans crochets ni accolades. Le rendu réel (SVG compilé) vérifie que la
 * teinte arrive bien sur les glyphes, formule comprise.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '#lib/ubumark/index.ts';
import { NAMED_COLOR_PRINT } from '#lib/theme/named-colors.ts';
import { generateTypst, processTableCellContent } from '../typst-generator';

const body = (md: string) =>
	(generateTypst(parseMarkdown(md), { includeSetup: false }).split(
		'// ubumark: fin de l’en-tête'
	)[1] ?? '') as string;

const fill = (hex: string) => `#text(fill: rgb("${hex}"))[`;

describe('texte coloré dans un paragraphe', () => {
	it('`[le cône]{.orange}` : le texte dans la teinte claire de l’orange', () => {
		const out = body('C’est [le cône]{.orange}.');
		expect(out).toContain(`${fill(NAMED_COLOR_PRINT.orange)}le cône];`);
		expect(out).not.toContain('{.orange}');
	});

	it('nom anglais et majuscules : `{.Blue}` → bleu', () => {
		expect(body('[le cône]{.Blue}')).toContain(fill(NAMED_COLOR_PRINT.bleu));
	});

	it('noir et blanc : noir et blanc purs (le papier est blanc)', () => {
		expect(body('[a]{.noir}')).toContain('#text(fill: black)[a];');
		expect(body('[a]{.blanc}')).toContain('#text(fill: white)[a];');
	});

	it('gras dans le passage : gras et coloré', () => {
		const out = body('[**le** cône]{.orange}');
		expect(out).toContain(`${fill(NAMED_COLOR_PRINT.orange)}*le*];`);
		expect(out).toContain(`${fill(NAMED_COLOR_PRINT.orange)} cône];`);
	});

	it('formule dans le passage : la formule est colorée aussi', () => {
		expect(body('[$x^2$]{.vert}')).toMatch(
			new RegExp(`#text\\(fill: rgb\\("${NAMED_COLOR_PRINT.vert}"\\)\\)\\[\\$.*\\$\\];`)
		);
	});

	it('deux couleurs imbriquées : l’intérieure l’emporte', () => {
		const out = body('[le [grand]{.rouge} cône]{.bleu}');
		expect(out).toContain(`${fill(NAMED_COLOR_PRINT.rouge)}grand];`);
		expect(out).toContain(`${fill(NAMED_COLOR_PRINT.bleu)}le ];`);
	});

	it('couleur et détail : la couleur à l’intérieur du surlignage du rappel', () => {
		const out = body('[la règle]{.rappel .vert}');
		expect(out).toMatch(/#highlight\(fill: rgb\("#[0-9a-f]{6}"\)\)\[#text\(fill: rgb\("/);
		expect(out).toContain(`${fill(NAMED_COLOR_PRINT.vert)}la règle];`);
	});

	it('classe inconnue : texte normal, ni crochets ni accolades', () => {
		const out = body('C’est [le cône]{.turquoise}.');
		expect(out).toContain('le cône');
		expect(out).not.toContain('turquoise');
		expect(out).not.toContain('#text(fill');
	});
});

describe('texte coloré dans une cellule de tableau', () => {
	it('`[a]{.orange}` dans une cellule : coloré, sans marquage visible', () => {
		const out = processTableCellContent('Le [cône]{.orange} ici');
		expect(out).toBe(`Le ${fill(NAMED_COLOR_PRINT.orange)}cône]; ici`);
	});

	it('formule dans le passage, et formule à côté', () => {
		const out = processTableCellContent('[$x$ vaut]{.rouge} et $y$');
		expect(out).toBe(`${fill(NAMED_COLOR_PRINT.rouge)}$x$ vaut]; et $y$`);
	});

	it('imbriquées : l’intérieure l’emporte', () => {
		expect(processTableCellContent('[le [grand]{.rouge} cône]{.bleu}')).toBe(
			`${fill(NAMED_COLOR_PRINT.bleu)}le ${fill(NAMED_COLOR_PRINT.rouge)}grand]; cône];`
		);
	});

	it('gras autour du passage, ou dedans : gras et coloré, sans astérisques', () => {
		const orange = fill(NAMED_COLOR_PRINT.orange);
		expect(processTableCellContent('**[a]{.orange}** b')).toBe(`#strong[${orange}a];] b`);
		expect(processTableCellContent('[**a** b]{.orange}')).toBe(`${orange}#strong[a] b];`);
	});

	// Revue : les `**` de deux gras différents étaient appariés (Typst invalide)
	it('deux gras dans la cellule, un marquage dans l’un ou entre eux', () => {
		const orange = fill(NAMED_COLOR_PRINT.orange);
		expect(processTableCellContent('[**a**]{.orange} et **b**')).toBe(
			`${orange}#strong[a]]; et #strong[b]`
		);
		expect(processTableCellContent('**a** [b]{.orange} **c**')).toBe(
			`#strong[a] ${orange}b]; #strong[c]`
		);
		expect(processTableCellContent('**a** et **[b]{.orange}**')).toBe(
			`#strong[a] et #strong[${orange}b];]`
		);
	});

	it('classe inconnue : texte normal', () => {
		expect(processTableCellContent('[a]{.turquoise}')).toBe('a');
	});

	it('crochets sans accolade, intervalle dans une formule : rien ne change', () => {
		expect(processTableCellContent('$[0;1]$')).not.toContain('#text');
		expect(processTableCellContent('[x]')).toBe('[x]');
	});

	it('dans un tableau entier : la cellule est colorée', () => {
		const out = body('| A | B |\n|---|---|\n| [un]{.vert} | deux |');
		expect(out).toContain(`${fill(NAMED_COLOR_PRINT.vert)}un];`);
	});
});

describe('rendu réel : la teinte arrive sur les glyphes', () => {
	it('texte, formule et cellule colorés compilent, dans la teinte attendue', async () => {
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

		const md =
			'C’est [le cône]{.orange}, [**le** pavé]{.bleu} et [$x^2$]{.vert}.\n\n' +
			'| A |\n|---|\n| [cellule]{.rose} |';
		// Police des formules du corrigé (`correction-fonts.ts`) : la seule chargée ici
		const mainContent =
			'#show math.equation: set text(font: "Chiphre Math")\n' + generateTypst(parseMarkdown(md));
		const pdf = await $typst.pdf({ mainContent });
		const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
		const page = await (await getDocument({ data: new Uint8Array(pdf!) }).promise).getPage(1);
		const { fnArray, argsArray } = await page.getOperatorList();
		// Couleurs de remplissage posées sur la page (pdfjs les rend en `#rrggbb`)
		const fills = new Set(
			fnArray.flatMap((fn, i) =>
				fn === OPS.setFillRGBColor ? [String(argsArray[i][0]).toLowerCase()] : []
			)
		);
		for (const name of ['orange', 'bleu', 'vert', 'rose'] as const) {
			expect([...fills], name).toContain(NAMED_COLOR_PRINT[name]);
		}
		// Témoin : le texte coloré se lit sans marquage
		const text = (await page.getTextContent()).items
			.map((item) => ('str' in item ? item.str : ''))
			.join('');
		expect(text).toContain('le cône');
		expect(text).not.toMatch(/\{\.|\]\{/);
	}, 120_000);
});
