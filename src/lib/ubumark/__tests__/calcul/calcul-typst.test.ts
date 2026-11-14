/**
 * Bloc ```calcul → Typst : le texte produit, et une compilation RÉELLE par le compilateur
 * typst.ts (celui de la production, en WebAssembly).
 *
 * Phase 0 (chantier `docs/wip/blockly-progress.md`, PR 5, Q4) : PDF = consigne + « À faire sur
 * Chiphre ». Ni le programme de référence, ni celui de départ (la fiche ne dit pas la réponse).
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `tortue-typst`).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { CALCUL_A_FAIRE_SUR_CHIPHRE } from '$lib/ubumark/generators/calcul-typst';
import { CALCUL_UNAVAILABLE } from '$lib/ubumark/types/calcul';

const bloc = (...lines: string[]) => ['```calcul', 'case: 0', ...lines, '```'].join('\n');

const QUESTION = [
	'Écris un programme qui ajoute 2 au nombre choisi, puis multiplie par 4.',
	'',
	bloc('attendu: afficher (nombre + 2) × 4', 'départ: afficher nombre + 2')
].join('\n');

describe('programme de calcul → Typst', () => {
	it('la consigne, puis « À faire sur Chiphre » ; ni la référence ni le départ', () => {
		const source = generateTypst(parseMarkdown(QUESTION));
		expect(source).toContain(CALCUL_A_FAIRE_SUR_CHIPHRE);
		expect(source.indexOf(CALCUL_A_FAIRE_SUR_CHIPHRE)).toBeGreaterThan(
			source.indexOf('multiplie par 4')
		);
		expect(source).not.toContain('afficher');
	});

	it('bloc mal écrit : le cadre neutre, jamais une erreur de compilation', () => {
		const source = generateTypst(parseMarkdown(bloc('essais: 1 ; 2')));
		expect(source).toContain(CALCUL_UNAVAILABLE);
		expect(source).not.toContain(CALCUL_A_FAIRE_SUR_CHIPHRE);
	});

	it('un document avec des blocs ```calcul compile en PDF', async () => {
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
		const source = generateTypst(parseMarkdown([QUESTION, '', bloc('essais: 1')].join('\n')));
		const pdf = await $typst.pdf({
			mainContent: `#show math.equation: set text(font: "Chiphre Math")\n${source}`
		});
		expect(pdf?.length ?? 0).toBeGreaterThan(1000);

		await expect($typst.pdf({ mainContent: '#place(dx: 1cm, rect(width: ' })).rejects.toBeDefined();
		vi.unstubAllGlobals();
	}, 120_000);
});
