/**
 * Bloc ```robot → Typst : le texte produit, et une compilation RÉELLE par le compilateur
 * typst.ts (celui de la production, en WebAssembly).
 *
 * Phase 0 (chantier `docs/wip/suite-fleches-progress.md`) : le quadrillage ; à produire,
 * « Écris le code : » et 15 cases vides à remplir à la main.
 *
 * Témoin : un document cassé est refusé, sinon ce test ne prouverait rien.
 * Hors réseau : polices du dépôt, `fetch` en échec (comme `tortue-typst`).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { parseMarkdown } from '#lib/ubumark/index.ts';
import { generateTypst } from '#lib/ubumark/generators/typst-generator.ts';
import { ROBOT_ECRIS_LE_CODE } from '#lib/ubumark/generators/robot-typst.ts';
import { ROBOT_UNAVAILABLE } from '#lib/ubumark/types/robot.ts';

const bloc = (...lines: string[]) => ['```robot', ...lines, '```'].join('\n');

const A_PRODUIRE = bloc(
	'quadrillage: 8 x 5',
	'départ: 2, 1',
	'arrivée: 6, 4',
	'interdites: 4, 1 ; 4, 2',
	'produire: oui',
	'case: 0'
);

/** Cases du quadrillage (un `rect` par case, celui du bord vert en plus) */
const cases = (source: string) =>
	source.match(/rect\(width: [\d.]+cm, height: [\d.]+cm, fill:/g) ?? [];
const casesDuCode = (source: string) => source.match(/dash: "dashed"/g) ?? [];

describe('robot → Typst', () => {
	it('à produire : le quadrillage (8 × 5 cases), puis « Écris le code : » et 15 cases vides', () => {
		const source = generateTypst(parseMarkdown(A_PRODUIRE));
		expect(cases(source)).toHaveLength(40);
		expect(source.match(/fill: luma\(150\)/g)).toHaveLength(2);
		expect(source).toContain('rgb("#2e7d32")');
		expect(source).toContain(ROBOT_ECRIS_LE_CODE);
		expect(casesDuCode(source)).toHaveLength(15);
		expect(source.indexOf(ROBOT_ECRIS_LE_CODE)).toBeGreaterThan(source.lastIndexOf('#place('));
	});

	it('jamais le code juste sur la fiche de l’élève', () => {
		const source = generateTypst(parseMarkdown(A_PRODUIRE));
		expect(source).not.toMatch(/[←↑→↓]/);
	});

	it('sans produire: le quadrillage seul, sans cases du code', () => {
		const source = generateTypst(parseMarkdown(bloc('quadrillage: 4 x 3', 'départ: 1, 1')));
		expect(cases(source)).toHaveLength(12);
		expect(source).not.toContain(ROBOT_ECRIS_LE_CODE);
		expect(casesDuCode(source)).toHaveLength(0);
	});

	it('avance-pivote : le nez du robot, des cases du code plus larges', () => {
		const source = generateTypst(
			parseMarkdown(
				bloc(
					'quadrillage: 8 x 5',
					'codage: avance-pivote',
					'départ: 2, 1, droite',
					'arrivée: 6, 4',
					'produire: oui',
					'case: 0'
				)
			)
		);
		expect(source).toContain('polygon(');
		expect(source).toContain('box(width: 2.6cm');
		expect(casesDuCode(source)).toHaveLength(15);
	});

	it('grand quadrillage : réduit pour tenir dans 8 cm de large', () => {
		const source = generateTypst(parseMarkdown(bloc('quadrillage: 12 x 12', 'départ: 1, 1')));
		const largeur = Number(/#box\(width: ([\d.]+)cm/.exec(source)?.[1]);
		expect(largeur).toBeLessThanOrEqual(8);
	});

	it('bloc mal écrit : le cadre neutre, jamais une erreur de compilation', () => {
		const source = generateTypst(parseMarkdown(bloc('quadrillage: 20 x 5', 'départ: 1, 1')));
		expect(source).toContain(ROBOT_UNAVAILABLE);
		expect(source).not.toContain('#place(');
	});

	it('un document avec des blocs ```robot compile en PDF', async () => {
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
					'Écris le code qui mène le robot sur la case verte.',
					'',
					A_PRODUIRE,
					'',
					bloc(
						'quadrillage: 6 x 6',
						'codage: avance-pivote',
						'départ: 1, 1, haut',
						'arrivée: 6, 6',
						'produire: oui',
						'case: 1'
					),
					'',
					bloc('quadrillage: 12 x 12', 'départ: 12, 12'),
					'',
					// Le corrigé d'une série : le code juste en flèches, dans la police de la fiche
					'Un code juste : **→ → → → ↑ ↑ ↑**'
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
