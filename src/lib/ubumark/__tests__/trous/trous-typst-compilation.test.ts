/**
 * Bloc ```trous → Typst : compilation RÉELLE par le compilateur typst.ts
 * (celui de la production, en WebAssembly), et le texte produit.
 *
 * Phase 0 (chantier `docs/wip/trous-etiquettes-progress.md`) : la réserve encadrée
 * au-dessus, chaque trou en pointillés, numéroté (le corrigé d'une série d'automatismes
 * renvoie au numéro). Jamais la réponse.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `associer-typst-compilation`).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

const INSTANCE = [
	'Complète.',
	'',
	'```trous',
	'case: 0',
	'Une suite définie par $u_{n+1} = u_n + r$ est [], de raison [].',
	'**Une** suite « cité » #x est [] ; > 0.',
	'étiquettes: géométrique ; $r$ ; arithmétique ; *croissante* ; "q"',
	'```'
].join('\n');

describe('texte à trous → Typst', () => {
	it('la réserve encadrée, puis le texte aux trous numérotés en pointillés', () => {
		const source = generateTypst(parseMarkdown(INSTANCE));
		// Réserve : les étiquettes dans l'ordre affiché, encadrées
		const reserve = source.indexOf('géométrique');
		expect(reserve).toBeGreaterThan(-1);
		expect(source.indexOf('arithmétique')).toBeGreaterThan(reserve);
		// Trous : trois, numérotés 1 à 3, en pointillés
		expect(source.match(/trous-trou\(\d\)/g)).toEqual([
			'trous-trou(1)',
			'trous-trou(2)',
			'trous-trou(3)'
		]);
		expect(source).toContain('repeat');
		// Le texte, ses espaces gardés autour des trous
		expect(source).toMatch(/est trous-trou\(1\)|est #trous-trou\(1\)/);
	});

	it('bloc mal écrit : rien', () => {
		const source = generateTypst(parseMarkdown(['```trous', 'A [x].', '```'].join('\n')));
		expect(source).not.toContain('trous-trou');
	});

	it('un document avec des blocs ```trous compile en PDF', async () => {
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
					INSTANCE,
					'',
					'```trous',
					'$2$ est [pair], $7$ est [impair] et $[0 ; 1]$ est [un intervalle].',
					'intrus: premier ; - 1.',
					'```'
				].join('\n')
			)
		);
		const pdf = await $typst.pdf({
			mainContent: `#show math.equation: set text(font: "Chiphre Math")\n${source}`
		});
		expect(pdf?.length ?? 0).toBeGreaterThan(1000);

		await expect($typst.pdf({ mainContent: '#place(dx: 1cm, rect(width: ' })).rejects.toBeDefined();
		vi.unstubAllGlobals();
	}, 120_000);
});
