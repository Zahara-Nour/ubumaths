/**
 * Chiphre sur les PDF des styles « Fiche élève » et « 2 colonnes - paysage »
 * (David, 2026-11-19) :
 *   - page 1 : QR code vers https://www.chiph.re dans l'en-tête, à droite du
 *     titre, « chiph.re » dessous ; le bas de page n'en parle pas ;
 *   - pages suivantes : gidouille + « chiph.re » à droite du bas de page ;
 *   - bas de page de toutes les pages : titre à gauche, numéro « n / N » au
 *     centre (David, 2026-11-19, second retour).
 * Sur tous les PDF : fiche, réponses, corrigé.
 *
 * Rendu vérifié avec le compilateur de prod (typst.ts en WebAssembly) : texte
 * de chaque page lu par pdfjs.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { WorksheetGenerator } from '../worksheet-generator';
import { DEFAULT_TEMPLATE_IDS } from '../../templates/default-templates';
import type { InstanceData, WorksheetRow } from '#lib/types/worksheets.ts';

const SITE = 'chiph.re';
const LONG = 'Un texte assez long pour occuper de la place sur la page. '.repeat(4);

/** Assez d'exercices (et de corrigés) pour remplir deux pages */
const INSTANCE: InstanceData = {
	exercises: Array.from({ length: 40 }, (_, i) => ({
		exercise_id: `ex-${i}`,
		title: null,
		position: i + 1,
		parameters: {},
		statement: LONG,
		solution: LONG
	}))
};

type Mode = 'worksheet' | 'answers' | 'correction';

function sheet(styleId: string | null, mode: Mode): string {
	const worksheet = {
		id: 'w',
		title: 'Fiche test',
		description: null,
		type: 'worksheet',
		config: {},
		style_id: styleId,
		estimated_duration_minutes: null,
		total_points: null
	} as unknown as WorksheetRow;
	return new WorksheetGenerator({}, undefined, { mode }).generate({
		worksheet,
		instance: INSTANCE
	}).typstContent;
}

/** Un morceau de texte d'une page, avec son abscisse en part de la largeur (0 à 1) */
interface Piece {
	str: string;
	x: number;
	/** Largeur, en part de la largeur de la page */
	w: number;
}

/** Morceaux de texte de chaque page du PDF compilé */
async function pieces(typst: string): Promise<Piece[][]> {
	const { $typst } = await import('@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs');
	const pdf = await $typst.pdf({ mainContent: typst });
	const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
	const doc = await getDocument({ data: new Uint8Array(pdf!) }).promise;
	const out: Piece[][] = [];
	for (let i = 1; i <= doc.numPages; i++) {
		const page = await doc.getPage(i);
		const width = page.getViewport({ scale: 1 }).width;
		const content = await page.getTextContent();
		out.push(
			content.items.flatMap((item) =>
				'str' in item
					? [{ str: item.str, x: item.transform[4] / width, w: item.width / width }]
					: []
			)
		);
	}
	return out;
}

const text = (page: Piece[]) => page.map((piece) => piece.str).join('');

/** Abscisse du morceau qui contient `part` */
function xOf(page: Piece[], part: string): number {
	const piece = page.find((p) => p.str.includes(part));
	if (!piece) throw new Error(`« ${part} » introuvable`);
	return piece.x;
}

const count = (text: string, part: string) => text.split(part).length - 1;

const STYLES = [
	['Fiche élève', null],
	['2 colonnes - paysage', DEFAULT_TEMPLATE_IDS.studentStyleLandscape]
] as const;

const CASES = STYLES.flatMap(([name, id]) =>
	(['worksheet', 'answers', 'correction'] as const).map((mode) => [name, mode, id] as const)
);

describe('Chiphre sur le PDF', () => {
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

	it.each(CASES)('« %s », %s : un QR vers le site, en tête de la page 1', (_name, mode, id) => {
		const typst = sheet(id, mode);
		expect(count(typst, 'QR code vers https://www.chiph.re')).toBe(1);
		expect(typst).toContain('format: "svg"');
		// La gidouille devant « chiph.re », au bas des pages suivantes
		expect(count(typst, '<title>Gidouille</title>')).toBe(1);
	});

	it.each(CASES)(
		'« %s », %s : « chiph.re » sous le QR en page 1, en bas des pages suivantes',
		async (_name, mode, id) => {
			const all = await pieces(sheet(id, mode));
			expect(all.length).toBeGreaterThanOrEqual(2);
			// Page 1 : la légende du QR seule, pas de rappel en bas de page
			expect(count(text(all[0]), SITE), 'page 1').toBe(1);
			for (const [index, page] of all.entries()) {
				const where = `page ${index + 1}`;
				// Numéro au centre, sur toutes les pages
				const number = xOf(page, `${index + 1} / ${all.length}`);
				expect(number, where).toBeGreaterThan(0.4);
				expect(number, where).toBeLessThan(0.55);
				if (index === 0) continue;
				expect(count(text(page), SITE), where).toBe(1);
				expect(text(page), where).toContain('Fiche test');
				// « chiph.re » à droite
				expect(xOf(page, SITE), where).toBeGreaterThan(0.8);
			}
		},
		60_000
	);

	it.each(STYLES)(
		'« %s » : le titre centré sur la page, QR à droite (David, 2026-11-19)',
		async (_name, id) => {
			const [first] = await pieces(sheet(id, 'worksheet'));
			const title = first.find((p) => p.str.includes('Fiche test'));
			if (!title) throw new Error('titre introuvable');
			expect(title.x + title.w / 2).toBeGreaterThan(0.49);
			expect(title.x + title.w / 2).toBeLessThan(0.51);
		},
		60_000
	);
});
