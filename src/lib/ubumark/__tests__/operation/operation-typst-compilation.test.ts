/**
 * Bloc ```operation → Typst : compilation RÉELLE par le compilateur typst.ts
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

it('un document avec des blocs ```operation compile en PDF', async () => {
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
				'Pose et calcule.',
				'',
				'```operation',
				'calcul: 56,75 + 234 + 0,8',
				'cases: aucune',
				'```',
				'',
				'```operation',
				'calcul: 1 000 − 998',
				'```',
				'',
				'1. Dans une liste :',
				'',
				'   ```operation',
				'   calcul: 413 - 159',
				'   méthode: cassage',
				'   cases: aucune',
				'   ```',
				'',
				'```operation',
				'calcul: 34,5 - 2,58',
				'cases: aucune',
				'```',
				'',
				'```operation',
				'calcul: 876 × 20,8',
				'cases: aucune',
				'```',
				'',
				'```operation',
				'calcul: 548 × 16',
				'```',
				'',
				'```operation',
				'calcul: 9 456 ÷ 7',
				'```',
				'',
				'```operation',
				'calcul: 785 ÷ 4',
				'quotient: décimal',
				'cases: aucune',
				'```',
				'',
				'```operation',
				'calcul: 148,2 ÷ 5',
				'étapes: restes',
				'cases: aucune',
				'```',
				'',
				'```operation',
				'calcul: 5 ÷ 7',
				'cases: aucune',
				'```',
				'',
				'```operation',
				'calcul: 3 - 5',
				'```'
			].join('\n')
		)
	);
	const pdf = await $typst.pdf({ mainContent: source });
	expect(pdf?.length ?? 0).toBeGreaterThan(1000);

	await expect($typst.pdf({ mainContent: '#place(dx: 1cm, rect(width: ' })).rejects.toBeDefined();
	vi.unstubAllGlobals();
}, 120_000);
