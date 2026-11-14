/**
 * Bloc ```tortue → Typst : le texte produit, et une compilation RÉELLE par le compilateur
 * typst.ts (celui de la production, en WebAssembly).
 *
 * Phase 0 (chantier `docs/wip/blockly-progress.md`, PR 4) : consigne + figure modèle +
 * « À faire sur Chiphre ». Sans `montrer: oui`, aucune figure (elle dirait la réponse).
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `trous-typst-compilation`).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { TORTUE_A_FAIRE_SUR_CHIPHRE } from '$lib/ubumark/generators/tortue-typst';
import { TORTUE_UNAVAILABLE } from '$lib/ubumark/types/tortue';

const bloc = (...lines: string[]) => ['```tortue', 'case: 0', ...lines, '```'].join('\n');

const CARRE_MONTRE = bloc('attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]', 'montrer: oui');

/** Traits noirs de la figure (les lignes du quadrillage sont grises) */
const traitsNoirs = (source: string) => source.match(/stroke: \(paint: black/g) ?? [];

describe('programme tortue → Typst', () => {
	it('montrer: oui : la figure (4 côtés) sur un quadrillage recadré, puis « À faire sur Chiphre »', () => {
		const source = generateTypst(parseMarkdown(CARRE_MONTRE));
		expect(traitsNoirs(source)).toHaveLength(4);
		// Carré de 3 sous le départ, un carreau de marge : x de -1 à 4, y de -4 à 1 → 6 + 6 lignes
		expect(source.match(/luma\(200\)/g)).toHaveLength(12);
		expect(source).toContain(TORTUE_A_FAIRE_SUR_CHIPHRE);
		expect(source.indexOf(TORTUE_A_FAIRE_SUR_CHIPHRE)).toBeGreaterThan(source.indexOf('line('));
	});

	it('sans montrer: aucune figure, le cadre seul (jamais la réponse)', () => {
		const source = generateTypst(
			parseMarkdown(bloc('attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]'))
		);
		expect(source).toContain(TORTUE_A_FAIRE_SUR_CHIPHRE);
		expect(source).not.toContain('line(');
		expect(source).not.toContain('avancer');
	});

	it('énoncé masqué d’une évaluation (attendu: ?, figure:) : la figure de figure:, jamais le programme', () => {
		const source = generateTypst(
			parseMarkdown(bloc('attendu: ?', 'montrer: oui', 'figure: 0 0 2 0 ; 2 0 2 2'))
		);
		expect(traitsNoirs(source)).toHaveLength(2);
		expect(source).toContain(TORTUE_A_FAIRE_SUR_CHIPHRE);
	});

	it('figure très haute : réduite à 14 cm de haut, sans quadrillage au-delà de 40 carreaux', () => {
		const source = generateTypst(parseMarkdown(bloc('attendu: avancer 100', 'montrer: oui')));
		expect(source).not.toContain('luma(200)');
		const hauteurs = [...source.matchAll(/height: ([\d.]+)cm/g)].map((m) => Number(m[1]));
		expect(Math.max(...hauteurs)).toBeLessThanOrEqual(14);
	});

	it('bloc mal écrit : le cadre neutre, jamais une erreur de compilation', () => {
		const source = generateTypst(parseMarkdown(bloc('montrer: oui')));
		expect(source).toContain(TORTUE_UNAVAILABLE);
		expect(source).not.toContain(TORTUE_A_FAIRE_SUR_CHIPHRE);
	});

	it('un document avec des blocs ```tortue compile en PDF', async () => {
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
					'Fais tracer ce carré à la tortue.',
					'',
					CARRE_MONTRE,
					'',
					// Triangle : coordonnées irrationnelles ; grande figure : réduite à la page
					bloc('attendu: répéter 3 [ avancer 4 ; tourner à gauche 120 ]', 'montrer: oui'),
					'',
					bloc('attendu: avancer 9 ; tourner à gauche 90 ; avancer 9', 'montrer: oui'),
					'',
					bloc('attendu: avancer 2')
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
