/**
 * Bloc ```associer → Typst : compilation RÉELLE par le compilateur typst.ts
 * (celui de la production, en WebAssembly), pas seulement le texte produit.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `horloge-typst-compilation`).
 */
import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

it('un document avec des blocs ```associer compile en PDF', async () => {
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
				'Associe chaque suite à sa nature.',
				'',
				'```associer',
				'case: 0',
				'- $u_{n+1} = u_n + 3$ ->',
				'- $u_{n+1} = 2u_n$ ->',
				'- $u_n = 5 + 2n$ ->',
				'- -> géométrique',
				"- -> ni l'une ni l'autre [#x]",
				'- -> *arithmétique*',
				'```',
				'',
				'```associer',
				'- a -> 1',
				'- b -> 2',
				'- -> 3',
				'- -> 4',
				'```'
			].join('\n')
		)
	);
	expect(source).toContain('2.5cm');
	// Police des formules, posée par le gabarit des fiches (`correction-fonts.ts`)
	const pdf = await $typst.pdf({
		mainContent: `#show math.equation: set text(font: "Chiphre Math")\n${source}`
	});
	expect(pdf?.length ?? 0).toBeGreaterThan(1000);

	await expect($typst.pdf({ mainContent: '#place(dx: 1cm, rect(width: ' })).rejects.toBeDefined();
	vi.unstubAllGlobals();
}, 120_000);
