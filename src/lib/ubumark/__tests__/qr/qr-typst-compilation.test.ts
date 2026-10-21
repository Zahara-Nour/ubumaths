/**
 * Bloc ```qr → Typst : compilation RÉELLE par le compilateur typst.ts
 * (celui de la production, en WebAssembly), pas seulement le texte produit.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 *
 * Hors réseau : par défaut, typst.ts télécharge ses polices depuis un CDN (échec
 * intermittent en CI, #1571). Le test charge celles du dépôt et `fetch` échoue.
 */
import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

it('un document avec un bloc ```qr compile en PDF', async () => {
	const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
	const wasm = readFileSync(
		resolve('node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
	);
	const fonts = ['ShantellSans-Light.ttf', 'ShantellSans-Bold.ttf', 'ChiphreMath.ttf'].map(
		(f) => new Uint8Array(readFileSync(resolve('static/fonts/chiphre-math-typst', f)))
	);
	vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit dans ce test')));
	// `assets: false` : aucune police par défaut téléchargée
	$typst.setCompilerInitOptions({
		getModule: () => wasm,
		beforeBuild: [loadFonts(fonts, { assets: false })]
	});

	const source = generateTypst(
		parseMarkdown(
			[
				'Avant',
				'',
				'```qr',
				'/glossaire',
				'légende: Le "glossaire" #x [y] $z$',
				'taille: 2,5cm',
				'```',
				'',
				'1. Dans une liste :',
				'',
				'   ```qr',
				'   https://fr.wikipedia.org/wiki/Pythagore',
				'   ```',
				'',
				'```qr',
				'javascript:alert(1)',
				'```'
			].join('\n')
		)
	);
	const pdf = await $typst.pdf({ mainContent: source });
	expect(pdf?.length ?? 0).toBeGreaterThan(1000);

	await expect($typst.pdf({ mainContent: '#place(dx: 1cm, rect(width: ' })).rejects.toBeDefined();
	vi.unstubAllGlobals();
}, 120_000);
