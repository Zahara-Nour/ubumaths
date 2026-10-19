/**
 * Bloc ```qr → Typst : compilation RÉELLE par le compilateur typst.ts
 * (celui de la production, en WebAssembly), pas seulement le texte produit.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 */
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

it('un document avec un bloc ```qr compile en PDF', async () => {
	const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
	const wasm = readFileSync(
		resolve('node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
	);
	$typst.setCompilerInitOptions({ getModule: () => wasm });

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
}, 120_000);
