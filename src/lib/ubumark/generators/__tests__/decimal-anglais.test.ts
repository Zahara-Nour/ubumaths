/**
 * Point décimal dans les documents en anglais (2026-09-25)
 *
 * Décision de David : un document en anglais écrit ses décimaux avec un point
 * (« 0.3 »), le français garde la virgule (« 0,3 »). Les grands nombres restent
 * groupés par une espace fine dans les deux langues (« 12 500 », « 3.141 59 »).
 * Avant : `toFrenchDecimal` s'appliquait quelle que soit la langue, et les
 * fiches anglaises affichaient « 0,8 ».
 *
 * C'est la langue du DOCUMENT qui décide : un exercice non traduit, affiché
 * dans une fiche anglaise, prend aussi le point.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { toLocaleDecimal, toFrenchDecimal } from '$lib/utils/french-math';
import { generateTypst, processTableCellContent } from '../typst-generator';
import { WorksheetGenerator } from '$lib/typst/generators/worksheet-generator';
import type { WorksheetConfig, WorksheetRow, InstanceData } from '$lib/types/worksheets';

const typst = (md: string, language?: string) =>
	(generateTypst(parseMarkdown(md), { includeSetup: false, language }).split(
		'// ubumark: fin de l’en-tête'
	)[1] ?? '') as string;

describe('toLocaleDecimal', () => {
	it('anglais : point décimal, espaces fines de groupement', () => {
		expect(toLocaleDecimal('x = 0.3', 'en')).toBe('x = 0.3');
		expect(toLocaleDecimal('1234.5678', 'en')).toBe('1\\,234.567\\,8');
		expect(toLocaleDecimal('12500', 'en')).toBe('12\\,500');
	});

	it('français : inchangé (virgule)', () => {
		expect(toLocaleDecimal('x = 0.3', 'fr')).toBe('x = 0{,}3');
		expect(toLocaleDecimal('1234.5678', 'fr')).toBe(toFrenchDecimal('1234.5678'));
	});

	it('virgule LaTeX écrite par l’auteur : respectée, même en anglais', () => {
		expect(toLocaleDecimal('0{,}3', 'en')).toBe('0{,}3');
	});
});

describe('PDF : formules', () => {
	it('anglais : ~0.3~ et $0.25$ avec un point', () => {
		const out = typst('Take ~p=0.3~ and $q=0.25$.', 'en');
		expect(out).toContain('0.3');
		expect(out).toContain('0.25');
		expect(out).not.toContain('","');
	});

	it('français, ou langue absente ou inconnue : virgule', () => {
		for (const language of ['fr', undefined, 'de']) {
			const out = typst('Soit ~p=0.3~ et $q=0.25$.', language);
			expect(out).toContain('0","3');
			expect(out).toContain('0","25');
		}
	});

	it('anglais : grand nombre groupé par une espace fine', () => {
		expect(typst('$12500.5$', 'en')).toContain('12 thin 500.5');
	});

	it('anglais : cellule de tableau', () => {
		expect(processTableCellContent('$0.4$', 'en')).toBe('$0.4$');
		expect(processTableCellContent('$0.4$')).toBe('$0","4$');
	});

	it('anglais : arbre pondéré', () => {
		const md = '```probtree\n$A$:0.3\n  $B$:0.8\n$\\overline{A}$:0.7\n```';
		const en = typst(md, 'en');
		expect(en).toContain('0.3');
		expect(en).toContain('0.8');
		expect(en).not.toContain('","');
		expect(typst(md, 'fr')).toContain('0","3');
	});

	it('anglais : tableau de variations', () => {
		const md =
			'```variation\nvariable: x\ndomain: -inf, 0.5, +inf\n\nsign: f(x)\n  -inf,0.5: +\n  0.5: z\n  0.5,+inf: -\n```';
		expect(typst(md, 'en')).toContain('0.5');
		expect(typst(md, 'en')).not.toContain('","');
		expect(typst(md, 'fr')).toContain('0","5');
	});
});

describe('PDF : fiche complète', () => {
	const config = (language?: string) =>
		({
			show_title: true,
			show_date: false,
			show_student_name: false,
			show_class: false,
			show_points: false,
			numbering_style: 'numeric',
			page_layout: 'A4',
			font_size: 12,
			margins: { top: 20, bottom: 20, left: 15, right: 15 },
			...(language ? { language } : {})
		}) as WorksheetConfig;
	const worksheet = { id: 'w', title: 'T', type: 'worksheet' } as unknown as WorksheetRow;
	const instance = {
		exercises: [
			{
				exercise_id: 'e',
				title: 'E',
				position: 1,
				parameters: {},
				statement: 'Work out ~0.2*0.4~.',
				solution: '~0.08~'
			}
		]
	} as unknown as InstanceData;

	it('fiche en anglais : énoncé et corrigé avec un point', () => {
		for (const mode of ['worksheet', 'correction'] as const) {
			const out = new WorksheetGenerator(config('en'), undefined, { mode }).generate({
				worksheet,
				instance
			}).typstContent;
			expect(out).toContain('0.2');
			expect(out).not.toMatch(/\d","\d/);
		}
	});

	it('fiche en français : virgule', () => {
		const out = new WorksheetGenerator(config(), undefined, { mode: 'correction' }).generate({
			worksheet,
			instance
		}).typstContent;
		expect(out).toContain('0","2');
		expect(out).toContain('0","08');
	});
});
