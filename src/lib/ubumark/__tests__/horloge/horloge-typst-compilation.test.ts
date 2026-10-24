/**
 * Bloc ```horloge → Typst : compilation RÉELLE par le compilateur typst.ts
 * (celui de la production, en WebAssembly), pas seulement le texte produit.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `qr-typst-compilation`).
 */
import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

it('un document avec des blocs ```horloge compile en PDF', async () => {
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
				'Quelle heure est-il ?',
				'',
				'```horloge',
				'heure: 9 h 42',
				'cadran: 24',
				'```',
				'',
				'```horloge',
				'heure: 8 h 30 ; 8 h 45 ; 23 h 59 ; 0 h',
				'légendes: Départ ; "Arrivée" ; #x [y] ; $z$',
				'chiffres: quarts',
				'graduations: heures',
				'taille: 2cm',
				'```',
				'',
				'1. Dans une liste :',
				'',
				'   ```horloge',
				'   heure: 3 h',
				'   minutes: cachées',
				'   chiffres: aucun',
				'   graduations: aucune',
				'   taille: 8cm',
				'   ```',
				'',
				'```horloge',
				'heure: 25 h',
				'```'
			].join('\n')
		)
	);
	const pdf = await $typst.pdf({ mainContent: source });
	expect(pdf?.length ?? 0).toBeGreaterThan(1000);

	await expect($typst.pdf({ mainContent: '#place(dx: 1cm, rect(width: ' })).rejects.toBeDefined();
	vi.unstubAllGlobals();
}, 120_000);
