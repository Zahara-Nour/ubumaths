/**
 * Bloc ```labyrinthe → Typst : le texte produit, et une compilation RÉELLE par le compilateur
 * typst.ts (celui de la production, en WebAssembly).
 *
 * Phase 0 (`docs/wip/labyrinthe-progress.md`) : la grille, l'entrée et les sorties ; l'élève
 * trace au crayon ; le corrigé imprimé (`solution: oui`) teinte le bon chemin.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `robot-typst`).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '#lib/ubumark/index.ts';
import { generateTypst } from '#lib/ubumark/generators/typst-generator.ts';
import { parseLabyrintheContent } from '#lib/ubumark/parser/labyrinthe-parser.ts';
import { LABYRINTHE_UNAVAILABLE } from '#lib/ubumark/types/labyrinthe.ts';

const bloc = (...lines: string[]) => ['```labyrinthe', ...lines, '```'].join('\n');
const corps = (source: string) => source.split('\n').slice(1, -1).join('\n');

const A_PARCOURIR = bloc(
	'grille: 6 x 4',
	'règle: premier',
	'parcourir: oui',
	'graine: 5',
	'case: 0'
);
const SOLUTION = bloc('grille: 6 x 4', 'règle: premier', 'solution: oui', 'graine: 5');

const cases = (source: string) => source.match(/box\(width: [\d.]+cm, height: /g) ?? [];
const teintees = (source: string) => source.match(/fill: rgb\("#b7e1bd"\)/g) ?? [];

describe('labyrinthe → Typst', () => {
	it('à parcourir : 24 cases, l’entrée, 4 sorties, aucun chemin teinté', () => {
		const source = generateTypst(parseMarkdown(A_PARCOURIR));
		expect(cases(source)).toHaveLength(24);
		expect(source.match(/→/g)).toHaveLength(1);
		expect(source.match(/text\(size: 7pt\)\[\d\]/g)).toHaveLength(4);
		expect(teintees(source)).toHaveLength(0);
	});

	it('solution : les cases du bon chemin teintées, même grille que la question', () => {
		const source = generateTypst(parseMarkdown(SOLUTION));
		const spec = parseLabyrintheContent(corps(SOLUTION)).spec!;
		expect(teintees(source)).toHaveLength(spec.chemin.length);
		const nombres = spec.nombres.flat();
		const question = generateTypst(parseMarkdown(A_PARCOURIR));
		for (const n of nombres) expect(question).toContain(`[${n}]`);
	});

	it('7 colonnes de grands nombres : tient dans 8,5 cm, texte réduit', () => {
		const source = generateTypst(
			parseMarkdown(bloc('grille: 7 x 3', 'règle: chiffre des dizaines de mille = 4'))
		);
		const largeur = Number(/box\(width: ([\d.]+)cm/.exec(source)?.[1]);
		expect(7 * largeur + 1.2).toBeLessThanOrEqual(8.5 + 1e-9);
		expect(Number(/#set text\(size: ([\d.]+)pt\)/.exec(source)?.[1])).toBeLessThan(9);
	});

	it('bloc mal écrit : le cadre neutre, jamais une erreur de compilation', () => {
		const source = generateTypst(parseMarkdown(bloc('grille: 20 x 5', 'règle: premier')));
		expect(source).toContain(LABYRINTHE_UNAVAILABLE);
		expect(source).not.toContain('#grid(');
	});

	it('un document avec des blocs ```labyrinthe compile en PDF', async () => {
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
					'Trouve la sortie en ne passant que par des nombres premiers.',
					'',
					A_PARCOURIR,
					'',
					SOLUTION,
					'',
					bloc('grille: 7 x 7', 'règle: chiffre des dix-millièmes = 0', 'solution: oui'),
					'',
					bloc('grille: 5 x 5', 'règle: chiffre des unités de mille = 3'),
					'',
					'**Sortie 2 : 73 → 89 → 97**'
				].join('\n')
			)
		);
		const pdf = await $typst.pdf({
			mainContent: `#show math.equation: set text(font: "Chiphre Math")\n${source}`
		});
		expect(pdf?.length ?? 0).toBeGreaterThan(1000);

		await expect($typst.pdf({ mainContent: '#grid(columns: (1cm, ' })).rejects.toBeDefined();
		vi.unstubAllGlobals();
	}, 120_000);
});
