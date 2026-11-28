/**
 * Bloc ```engrenages → Typst : le texte produit, et une compilation RÉELLE par le compilateur
 * typst.ts (celui de la production, en WebAssembly).
 *
 * Phase 0 (`docs/wip/outil-engrenages-progress.md`) : dans le PDF, la figure est à l'arrêt.
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `labyrinthe-typst`).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '#lib/ubumark/index.ts';
import { generateTypst } from '#lib/ubumark/generators/typst-generator.ts';
import { ENGRENAGES_UNAVAILABLE } from '#lib/ubumark/types/engrenages.ts';

const bloc = (...lines: string[]) => ['```engrenages', ...lines, '```'].join('\n');

describe('engrenages → Typst', () => {
	it('une image vectorielle à la largeur demandée, avec ses légendes', () => {
		const source = generateTypst(
			parseMarkdown(bloc('roues: 12 ; 18', 'légendes: Petite ; Grande', 'taille: 7cm'))
		);
		expect(source).toContain('format: "svg"');
		expect(source).toContain('width: 7cm');
		expect(source).toContain('Petite');
		expect(source).toContain('Grande');
		expect(source).not.toContain(ENGRENAGES_UNAVAILABLE);
	});

	it('petite figure : les légendes restent dans la largeur de la figure', () => {
		const source = generateTypst(parseMarkdown(bloc('roues: 6 ; 6', 'taille: 4cm')));
		const places = [...source.matchAll(/dx: (-?[\d.]+)cm, dy: [\d.]+cm, box\(width: ([\d.]+)cm/g)];
		expect(places).toHaveLength(2);
		for (const [, dx, width] of places) {
			expect(Number(dx)).toBeGreaterThanOrEqual(0);
			expect(Number(dx) + Number(width)).toBeLessThanOrEqual(4 + 1e-9);
		}
	});

	it('bloc mal écrit : le cadre neutre, jamais une erreur de compilation', () => {
		const source = generateTypst(parseMarkdown(bloc('roues: 12')));
		expect(source).toContain(ENGRENAGES_UNAVAILABLE);
		expect(source).not.toContain('format: "svg"');
	});

	it('un document avec des blocs ```engrenages compile en PDF', async () => {
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
					'Deux roues dentées s’engrènent.',
					'',
					bloc('roues: 12 ; 18'),
					'',
					bloc('roues: 60 ; 6 ; 59', 'légendes: L’"une" ; \\autre ; #trois', 'taille: 16cm'),
					'',
					bloc('roues: 3 ; 4')
				].join('\n')
			)
		);
		const pdf = await $typst.pdf({
			mainContent: `#show math.equation: set text(font: "Chiphre Math")\n${source}`
		});
		expect(pdf?.length).toBeGreaterThan(1000);
		await expect($typst.pdf({ mainContent: `${source}\n#broken(` })).rejects.toBeTruthy();
		vi.unstubAllGlobals();
	}, 60_000);
});
