/**
 * Bloc ```yohaku → Typst : le texte produit, et une compilation RÉELLE par le compilateur
 * typst.ts (celui de la production, en WebAssembly).
 *
 * La grille encadrée, ses totaux au bout des lignes et sous les colonnes, les cases à remplir
 * vides ; `solution: oui` écrit la solution de l'auteur dans les cases.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `labyrinthe-typst`).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '#lib/ubumark/index.ts';
import { generateTypst } from '#lib/ubumark/generators/typst-generator.ts';
import { YOHAKU_UNAVAILABLE } from '#lib/ubumark/types/yohaku.ts';

const bloc = (...lines: string[]) => ['```yohaku', ...lines, '```'].join('\n');

const CORPS = ['opération: produit', 'ligne: [x+2] | [x+3]', 'ligne: [2x+1] | x+1'];
const QUESTION = bloc(...CORPS, 'case: 0');
const SOLUTION = bloc(...CORPS, 'solution: oui');

const cases = (source: string) => source.match(/stroke: 0\.6pt/g) ?? [];
const formules = (source: string) => source.match(/\$[^$]+\$/g) ?? [];

describe('yohaku → Typst', () => {
	it('question : 4 cases encadrées, 4 totaux, la seule case donnée écrite, le signe ×', () => {
		const source = generateTypst(parseMarkdown(QUESTION));
		expect(cases(source)).toHaveLength(4);
		// 4 totaux + la case donnée (x+1) ; les 3 cases à remplir restent vides
		expect(formules(source)).toHaveLength(5);
		expect(source).toContain('[×]');
		expect(source).toContain('$x^2 + 5 x + 6$');
	});

	it('solution : les 3 cases à remplir sont écrites', () => {
		const source = generateTypst(parseMarkdown(SOLUTION));
		expect(formules(source)).toHaveLength(8);
	});

	it('somme : le signe +', () => {
		const source = generateTypst(
			parseMarkdown(bloc('opération: somme', 'ligne: [x] | 2', 'ligne: 3 | 4'))
		);
		expect(source).toContain('[+]');
	});

	it('bloc mal écrit : le cadre neutre, jamais une erreur de compilation', () => {
		const source = generateTypst(parseMarkdown(bloc('opération: produit')));
		expect(source).toContain(YOHAKU_UNAVAILABLE);
		expect(source).not.toContain('#grid(');
	});

	it('un document avec des blocs ```yohaku compile en PDF', async () => {
		const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
		const wasm = readFileSync(
			resolve('node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
		);
		const fonts = ['ShantellSans-Light.ttf', 'ShantellSans-Bold.ttf', 'ChiphreMath.ttf'].map(
			(f) => new Uint8Array(readFileSync(resolve('static/fonts/chiphre-math-typst', f)))
		);
		vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit dans ce test')));
		$typst.setCompilerInitOptions({
			getModule: () => wasm,
			beforeBuild: [loadFonts(fonts, { assets: false })]
		});
		const source = generateTypst(
			parseMarkdown(
				[
					'Remplis la grille.',
					'',
					QUESTION,
					'',
					SOLUTION,
					'',
					bloc('opération: somme', 'ligne: [3x] | 2', 'ligne: 5 | [x-1]'),
					'',
					bloc('opération: produit', 'ligne: [x] | 2'),
					''
				].join('\n')
			)
		);
		const pdf = await $typst.pdf({
			mainContent: `#show math.equation: set text(font: "Chiphre Math")\n${source}`
		});
		expect(pdf?.length ?? 0).toBeGreaterThan(1000);

		await expect($typst.pdf({ mainContent: '#grid(columns: (1cm, ' })).rejects.toBeDefined();
		vi.unstubAllGlobals();
	}, 120_000);
});
