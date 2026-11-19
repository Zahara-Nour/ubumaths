/**
 * Le titre de la fiche au pied de chaque page (styles « Fiche élève » et
 * « 2 colonnes - paysage ») : feuilles imprimées mélangées, on retrouve la
 * fiche de chacune. Titre à gauche, numéro de page au centre.
 *
 * Le niveau de la fiche (David, 2026-11-19) : nom complet sous le titre en
 * page 1, forme courte après le titre au bas de chaque page ; plusieurs
 * niveaux du plus petit au plus grand, séparés par « · » ; aucun → rien.
 * Fiche en anglais : pas de niveau (aucun nom anglais des niveaux).
 *
 * Rendu vérifié avec le compilateur de prod (typst.ts en WebAssembly) : texte
 * de la page 2, qui n'a pas d'en-tête, lu par pdfjs.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { WorksheetGenerator } from '../worksheet-generator';
import { DEFAULT_TEMPLATE_IDS } from '../../templates/default-templates';
import type { InstanceData, WorksheetRow } from '#lib/types/worksheets.ts';

const TITLE = 'FICHETITRE';

/** Assez d'exercices pour remplir deux pages */
const INSTANCE: InstanceData = {
	exercises: Array.from({ length: 40 }, (_, i) => ({
		exercise_id: `ex-${i}`,
		title: null,
		position: i + 1,
		parameters: {},
		statement: 'Un énoncé assez long pour occuper de la place sur la page. '.repeat(4),
		solution: ''
	}))
};

function sheet(
	styleId: string | null,
	grades: string[] = [],
	language: 'fr' | 'en' = 'fr'
): string {
	const worksheet = {
		id: 'w',
		title: TITLE,
		description: null,
		type: 'worksheet',
		config: { language },
		grades,
		style_id: styleId,
		estimated_duration_minutes: null,
		total_points: null
	} as unknown as WorksheetRow;
	return new WorksheetGenerator({ language }, undefined, { mode: 'worksheet' }).generate({
		worksheet,
		instance: INSTANCE
	}).typstContent;
}

/** Texte de chaque page du PDF compilé */
async function pages(typst: string): Promise<string[]> {
	const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
	const pdf = await $typst.pdf({ mainContent: typst });
	const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
	const doc = await getDocument({ data: new Uint8Array(pdf!) }).promise;
	const out: string[] = [];
	for (let i = 1; i <= doc.numPages; i++) {
		const content = await (await doc.getPage(i)).getTextContent();
		out.push(content.items.map((item) => ('str' in item ? item.str : '')).join(''));
	}
	return out;
}

describe('titre de la fiche au pied de page', () => {
	beforeAll(async () => {
		const wasm = readFileSync(
			resolve('node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
		);
		const fonts = ['ShantellSans-Light.ttf', 'ShantellSans-Bold.ttf', 'ChiphreMath.ttf'].map(
			(f) => new Uint8Array(readFileSync(resolve('static/fonts/chiphre-math-typst', f)))
		);
		vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit dans ce test')));
		const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
		$typst.setCompilerInitOptions({
			getModule: () => wasm,
			beforeBuild: [loadFonts(fonts, { assets: false })]
		});
	});

	it.each([
		['Fiche élève', null],
		['2 colonnes - paysage', DEFAULT_TEMPLATE_IDS.studentStyleLandscape]
	])(
		'style « %s » : le titre sur chaque page',
		async (_nom, styleId) => {
			const all = await pages(sheet(styleId));
			expect(all.length).toBeGreaterThanOrEqual(2);
			for (const [index, page] of all.entries()) {
				expect(page, `page ${index + 1}`).toContain(TITLE);
				expect(page, `page ${index + 1}`).toContain(`${index + 1} / ${all.length}`);
			}
		},
		60_000
	);

	it('niveau : nom complet sous le titre en page 1, forme courte au bas de chaque page', async () => {
		const all = await pages(sheet(null, ['1_SPE']));
		expect(all[0]).toContain('1ère spécialité maths');
		for (const [index, page] of all.entries()) {
			expect(page, `page ${index + 1}`).toContain(`${TITLE} · 1ère Spé`);
		}
	}, 60_000);

	it('deux niveaux : du plus petit au plus grand', () => {
		const typst = sheet(null, ['1_SPE', '2']);
		expect(typst).toContain('2nde · 1ère spécialité maths');
		expect(typst).toContain('2nde · 1ère Spé');
	});

	it('aucun niveau, ou fiche en anglais : rien', () => {
		for (const typst of [sheet(null, []), sheet(null, ['1_SPE'], 'en')]) {
			expect(typst).not.toContain('Spé');
			expect(typst).not.toContain(`${TITLE} ·`);
		}
	});
});
