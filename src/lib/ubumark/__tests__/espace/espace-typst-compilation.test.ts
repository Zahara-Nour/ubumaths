/**
 * Bloc ```cubes → Typst : compilation RÉELLE par le compilateur typst.ts
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
import { generateEspaceTypst } from '$lib/ubumark/generators/espace-typst';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';

it('un document avec des blocs ```cubes, ```solide et ```patron compile en PDF', async () => {
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
				'Combien de cubes ?',
				'',
				'```cubes',
				'hauteurs: 2 1 1 / 1 0 1',
				'```',
				'',
				'```cubes',
				'hauteurs: 2 1 1 / 1 0 1',
				'vue: dessus',
				'```',
				'',
				'1. Dans une liste :',
				'',
				'   ```cubes',
				'   hauteurs: 2 2 / 2 2',
				'   vue: droite',
				'   ```',
				'',
				'```cubes',
				'hauteurs: 6 6 6 6 6 6 / 1 1 1 1 1 1',
				'```',
				'',
				'```cubes',
				'hauteurs: 9',
				'```',
				'',
				'```cubes',
				'hauteurs: 2 1 1 / 1 0 1',
				'dessiner: face',
				'```',
				'',
				'```cubes',
				'hauteurs: 2 1 1 / 1 0 1',
				'retrouver: face, droite, gauche',
				'```',
				'',
				// ```solide (lot 3) : tirets, face marquée, noms, cotes, solides ronds
				'```solide',
				'forme: pave 4,5 2 3',
				'sommets: A B C D E F G H',
				'marquer: face EFGH, arete AE, sommet G',
				'cotes: cm',
				'```',
				'',
				'```solide',
				'forme: cylindre 2 5',
				"sommets: O O'",
				'cotes: cm',
				'```',
				'',
				'```solide',
				'forme: cone 2 4',
				'sommets: S O',
				'cotes: oui',
				'```',
				'',
				'```solide',
				'forme: boule 3',
				'```',
				'',
				'- ```solide',
				'  forme: pyramide carree 4 3',
				'  ```',
				'',
				'```solide',
				'forme: sphere 3',
				'```',
				'',
				// ```patron (lot 4) : plis, noms répétés, numéros, face marquée, cotes
				'```patron',
				'solide: pave 4,5 2 3',
				'forme: 7',
				'sommets: A B C D E ? G H',
				'faces: numeros',
				'marquer: face 2, sommet A',
				'cotes: cm',
				'```',
				'',
				'```patron',
				'solide: cylindre 1 3',
				"sommets: O O'",
				'cotes: cm',
				'```',
				'',
				'```patron',
				'solide: pyramide triangle 4 3',
				'tourner: 90',
				'```',
				'',
				'```patron',
				'solide: cone 2 3',
				'```',
				'',
				// Gestes du patron (lot 5)
				'```patron',
				'solide: cube',
				'marquer: face 1',
				'designer: opposee',
				'```',
				'',
				'```patron',
				'solide: cube',
				'forme: 1',
				'completer: 2 5',
				'```'
			].join('\n')
		)
	);
	// Corrigés des gestes (la vue coloriée, les hauteurs écrites)
	const solved = ['dessiner: dessus', 'retrouver: face']
		.map((task) =>
			generateEspaceTypst(parseEspaceContent(`hauteurs: 2 1 1 / 1 0 1\n${task}`), { solved: true })
		)
		.join('\n\n');
	const solvedPatrons = ['marquer: face 1\ndesigner: voisines', 'completer: 5']
		.map((task) =>
			generateEspaceTypst(parseEspaceContent(`solide: cube\n${task}`, 'patron'), { solved: true })
		)
		.join('\n\n');
	const pdf = await $typst.pdf({ mainContent: `${source}\n\n${solved}\n\n${solvedPatrons}` });
	expect(pdf?.length ?? 0).toBeGreaterThan(1000);

	await expect($typst.pdf({ mainContent: '#place(dx: 1cm, rect(width: ' })).rejects.toBeDefined();
	vi.unstubAllGlobals();
}, 120_000);
