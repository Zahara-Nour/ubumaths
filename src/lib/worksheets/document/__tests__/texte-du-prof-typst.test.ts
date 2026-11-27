/**
 * Texte du prof dans le PDF : imprimé tel qu'écrit (L85, T23)
 * ============================================================
 *
 * Le titre d'une section, sa consigne et la consigne d'un exercice sont écrits
 * par le prof ou l'admin. Compilés pour de vrai par le compilateur de la
 * production (typst.ts, hors réseau) : `//` n'y ouvre pas un commentaire
 * (la fin de la ligne disparaissait), `]` n'y ferme pas le bloc qui l'entoure
 * (le PDF entier échouait, ou la suite du texte sortait du bloc).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createTypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { escapeTypst } from '#lib/ubumark/generators/typst-generator.ts';
import type { InstanceData, WorksheetConfig, WorksheetRow } from '#lib/types/worksheets.ts';

import { renderExercises } from '../render-exercise';
import { documentFromTeacherCopy } from '../teacher-adapter';

// ============================================================================
// Types
// ============================================================================

type Compiler = ReturnType<typeof createTypstCompiler>;

// ============================================================================
// Constantes
// ============================================================================

/** Le texte d'un contenu Typst, tel qu'il s'imprime (mots et espaces) */
const PLAIN = [
	'#let plain(c) = {',
	'  if type(c) == str { c }',
	'  else if c.has("text") { c.text }',
	'  else if c.has("children") { c.children.map(plain).join("") }',
	'  else if c.has("child") { plain(c.child) }',
	'  else if c.has("body") and c.body != none { plain(c.body) }',
	'  else if c == [ ] { " " }',
	'  else { "" }',
	'}'
].join('\n');

const CONFIG = { language: 'fr', show_points: false } as WorksheetConfig;

// ============================================================================
// Fonctions
// ============================================================================

let compiler: Compiler;

beforeAll(async () => {
	const wasm = readFileSync(
		resolve('node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm')
	);
	const fonts = ['ShantellSans-Light.ttf', 'ShantellSans-Bold.ttf', 'ChiphreMath.ttf'].map(
		(f) => new Uint8Array(readFileSync(resolve('static/fonts/chiphre-math-typst', f)))
	);
	// Hors réseau, comme les autres tests qui compilent du Typst
	vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau interdit dans ce test')));
	compiler = createTypstCompiler();
	await compiler.init({
		getModule: () => wasm,
		beforeBuild: [loadFonts(fonts, { assets: false })]
	});
}, 120_000);

/** Compile `body` ; rend ce qu'il imprime (erreurs de compilation : échec du test) */
async function printed(body: string): Promise<string> {
	const source = [PLAIN, '#let c = [', body, ']', '#metadata(plain(c)) <lu>', '#c'].join('\n');
	compiler.addSource('/main.typ', source);
	const values = await compiler.runWithWorld({ mainFilePath: '/main.typ' }, async (world) => {
		const { diagnostics } = await world.compile({ diagnostics: 'full' });
		const errors = (diagnostics ?? []).filter(
			(d: { message: string }) => !d.message.startsWith('unknown font family')
		);
		expect(errors).toEqual([]);
		return world.query({ selector: '<lu>', field: 'value' }) as Promise<string[]>;
	});
	expect(values).toHaveLength(1);
	return values[0].replace(/\s+/g, ' ').trim();
}

/** Une fiche d'un exercice, dans une section, aux textes donnés */
function worksheet(texts: { section: string; sectionInstructions: string; instructions: string }) {
	const instance: InstanceData = {
		exercises: [
			{
				exercise_id: 'ex-1',
				position: 1,
				section_id: 's1',
				parameters: {},
				statement: 'Calcule.',
				solution: '',
				answers: '',
				title: null,
				points: null,
				custom_instructions: texts.instructions,
				generic_functions: null,
				capital_pairs: undefined
			}
		],
		sections: [
			{ id: 's1', title: texts.section, instructions: texts.sectionInstructions, position: 1 }
		]
	};
	const row = {
		id: 'w',
		title: 'Fiche',
		description: null,
		type: 'worksheet',
		config: CONFIG,
		translations: null
	} as unknown as WorksheetRow;
	return documentFromTeacherCopy({ worksheet: row, instance, config: CONFIG });
}

// ============================================================================
// Tests
// ============================================================================

describe('L85 : `//` dans un texte échappé', () => {
	it('une seule barre : le texte s’imprime en entier', async () => {
		expect(await printed(escapeTypst('a / b'))).toBe('a / b');
	});

	it('« a // b » s’imprime en entier (pas de commentaire)', async () => {
		expect(await printed(escapeTypst('a // b'))).toBe('a // b');
	});

	it('« a /* b */ c » s’imprime en entier', async () => {
		expect(await printed(escapeTypst('a /* b */ c'))).toBe('a /* b */ c');
	});
});

describe('T23 : `]` dans le texte du prof d’une fiche', () => {
	it.each(['badge', 'heading'] as const)(
		'« %s » : section, sa consigne et la consigne de l’exercice s’impriment telles quelles',
		async (layout) => {
			const doc = worksheet({
				section: 'Partie ] A',
				sectionInstructions: 'Intervalle ]0 ; 1[',
				instructions: 'Voir [p. 3] puis ] fin // note'
			});
			const out = await printed(renderExercises(doc, 'worksheet', layout));
			expect(out).toContain('Partie ] A');
			expect(out).toContain('Intervalle ]0 ; 1[');
			expect(out).toContain('Voir [p. 3] puis ] fin // note');
		}
	);
});
