/**
 * Les deux corrigés d'une fiche : « Réponses » et « Corrigé »
 * ===========================================================
 *
 * - Réponses : les résultats seuls (`answers`), police actuelle ; exercice sans
 *   réponses → « Réponses non rédigées : voir le corrigé. »
 * - Corrigé : la correction (concise ou détaillée selon la fiche, ADR 0017), en
 *   Shantell Sans (texte) et Chiphre Math (formules) ; option pour l'imprimer
 *   dans la police standard (repli quand la compilation avec ces polices échoue).
 * - Ni l'un ni l'autre ne répète l'énoncé : numéro et titre, puis le contenu.
 */
import { describe, it, expect } from 'vitest';
import { WorksheetGenerator, generateWorksheetTypst } from '../worksheet-generator';
import { DEFAULT_TEMPLATES } from '../../templates/default-templates';
import {
	CORRECTION_FONT_RULES,
	hasCorrectionFonts,
	withoutCorrectionFonts
} from '../../correction-fonts';
import {
	correctionFontBlocks,
	outsideCorrectionFontBlocks
} from '../../__tests__/correction-font-blocks';
import type {
	WorksheetRow,
	InstanceData,
	WorksheetConfig,
	WorksheetTemplateRow,
	WorksheetType
} from '$lib/types/worksheets';

// ============================================================================
// FIXTURES
// ============================================================================

const STATEMENT = 'ENONCEUNIQUE calculer la somme';
const SOLUTION = 'CORRECTIONDETAILLEE on additionne';
const ANSWERS = 'REPONSESEULE 12';

function worksheet(type: WorksheetType = 'worksheet'): WorksheetRow {
	return {
		id: 'w-1',
		title: 'Fiche test',
		description: null,
		type,
		config: {},
		status: 'published',
		version: 1,
		published_at: null,
		archived_at: null,
		template_id: null,
		estimated_duration_minutes: null,
		total_points: null,
		grades: [],
		tags: [],
		created_by: 'prof',
		school_id: null,
		created_at: '',
		updated_at: ''
	} as unknown as WorksheetRow;
}

function instance(answers?: string): InstanceData {
	return {
		exercises: [
			{
				exercise_id: 'ex-1',
				title: 'Somme',
				position: 1,
				parameters: {},
				statement: STATEMENT,
				solution: SOLUTION,
				answers,
				custom_instructions: 'CONSIGNEDUPROF'
			}
		]
	};
}

function template(content: string): WorksheetTemplateRow {
	return {
		id: 't',
		name: 'T',
		description: null,
		template_content: content,
		placeholders: [],
		created_by: 'prof',
		created_at: '',
		updated_at: ''
	};
}

function generate(
	mode: 'worksheet' | 'answers' | 'correction',
	options: {
		config?: WorksheetConfig;
		templateContent?: string;
		answers?: string;
		type?: WorksheetType;
		correctionFonts?: boolean;
	} = {}
): string {
	return generateWorksheetTypst({
		worksheet: worksheet(options.type),
		instance: instance('answers' in options ? options.answers : ANSWERS),
		config: options.config ?? {},
		mode,
		template: options.templateContent ? template(options.templateContent) : null,
		correctionFonts: options.correctionFonts
	});
}

const LAYOUTS: Array<[string, string | undefined]> = [
	['sans modèle', undefined],
	...DEFAULT_TEMPLATES.map((t): [string, string] => [t.name, t.template_content])
];

// ============================================================================
// PAS D'ÉNONCÉ
// ============================================================================

describe('Réponses et Corrigé : jamais l’énoncé', () => {
	it.each(LAYOUTS)('Corrigé « %s » : numéro, titre et correction, sans énoncé', (_n, content) => {
		const typst = generate('correction', { templateContent: content });
		expect(typst).not.toContain('ENONCEUNIQUE');
		expect(typst).not.toContain('CONSIGNEDUPROF');
		expect(typst).toContain('CORRECTIONDETAILLEE');
		expect(typst).toContain('Somme');
		expect(typst).not.toContain('REPONSESEULE');
	});

	it.each(LAYOUTS)('Réponses « %s » : les réponses seules, sans énoncé', (_n, content) => {
		const typst = generate('answers', { templateContent: content });
		expect(typst).not.toContain('ENONCEUNIQUE');
		expect(typst).not.toContain('CORRECTIONDETAILLEE');
		expect(typst).toContain('REPONSESEULE');
		expect(typst).toContain('Somme');
	});

	it.each(LAYOUTS)('Fiche « %s » : l’énoncé, ni réponses ni correction', (_n, content) => {
		const typst = generate('worksheet', { templateContent: content });
		expect(typst).toContain('ENONCEUNIQUE');
		expect(typst).not.toContain('CORRECTIONDETAILLEE');
		expect(typst).not.toContain('REPONSESEULE');
	});

	it('évaluation, réponses sur le sujet : pas de cadre de réponse dans les corrigés', () => {
		const config: WorksheetConfig = { answers_on_sheet: true };
		for (const mode of ['answers', 'correction'] as const) {
			const typst = generate(mode, { type: 'exam', config });
			expect(typst).not.toContain('dash: "dashed"), fill: none)');
		}
		expect(generate('worksheet', { type: 'exam', config })).toContain(
			'dash: "dashed"), fill: none)'
		);
	});
});

// ============================================================================
// RÉPONSES
// ============================================================================

describe('Réponses : bandeau et réponses absentes', () => {
	it('bandeau RÉPONSES en français, ANSWERS en anglais', () => {
		expect(generate('answers')).toContain('RÉPONSES');
		const en = generate('answers', { config: { language: 'en' } });
		expect(en).toContain('ANSWERS');
		expect(en).not.toContain('RÉPONSES');
	});

	it.each([
		['absentes', undefined],
		['vides', '  ']
	])('réponses %s : renvoi au corrigé, en italique', (_label, answers) => {
		const typst = generate('answers', { answers });
		expect(typst).toContain('Réponses non rédigées : voir le corrigé.');
		expect(typst).toMatch(/#emph\[Réponses non rédigées : voir le corrigé\.\]/);
	});

	it('réponses absentes, fiche anglaise : renvoi en anglais', () => {
		const typst = generate('answers', { answers: undefined, config: { language: 'en' } });
		expect(typst).toContain('Answers not written: see the worked solutions.');
	});

	it('police actuelle : pas de Shantell dans les Réponses', () => {
		expect(hasCorrectionFonts(generate('answers'))).toBe(false);
	});
});

// ============================================================================
// CORRIGÉ : POLICES
// ============================================================================

describe('Corrigé : Shantell Sans et Chiphre Math', () => {
	it('le Corrigé anglais s’appelle SOLUTIONS (plus ANSWERS, réservé aux Réponses)', () => {
		const en = generate('correction', { config: { language: 'en' } });
		expect(en).toContain('SOLUTIONS');
		expect(en).not.toContain('ANSWERS');
	});

	it.each(LAYOUTS)(
		'« %s » : la correction seule en Shantell, titres et bandeau en police habituelle',
		(_n, content) => {
			const typst = generate('correction', { templateContent: content });
			expect(typst).toContain('#set text(font: "Shantell Sans", weight: "light")');
			expect(typst).toContain('#show math.equation: set text(font: "Chiphre Math")');
			// Ni en tête ni au niveau du document : pied de page, bandeau, titres
			// et numéros gardent la police du modèle (David, 2026-10-18)
			expect(typst.startsWith(CORRECTION_FONT_RULES)).toBe(false);
			const blocks = correctionFontBlocks(typst);
			expect(blocks).toHaveLength(1);
			expect(blocks[0]).toContain('CORRECTIONDETAILLEE');
			const outside = outsideCorrectionFontBlocks(typst);
			expect(outside).toContain('Somme');
			expect(outside).not.toContain('CORRECTIONDETAILLEE');
			expect(blocks[0]).not.toContain('Somme');
		}
	);

	it('deux exercices : deux corrections bornées, titres hors blocs, repli identique', () => {
		const first = instance(ANSWERS).exercises[0];
		const second = {
			...first,
			exercise_id: 'ex-2',
			title: 'Produit',
			position: 2,
			solution: 'SECONDECORRECTION on multiplie'
		};
		const input = {
			worksheet: worksheet(),
			instance: { exercises: [first, second] },
			config: {},
			mode: 'correction' as const
		};
		const typst = generateWorksheetTypst(input);
		const blocks = correctionFontBlocks(typst);
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toContain('CORRECTIONDETAILLEE');
		expect(blocks[1]).toContain('SECONDECORRECTION');
		const outside = outsideCorrectionFontBlocks(typst);
		expect(outside).toContain('Somme');
		expect(outside).toContain('Produit');
		expect(outside).not.toContain('CORRECTIONDETAILLEE');
		expect(outside).not.toContain('SECONDECORRECTION');
		// Le repli retire les deux blocs de règles : même document que sans polices
		const plain = generateWorksheetTypst({ ...input, correctionFonts: false });
		expect(withoutCorrectionFonts(typst)).toBe(plain);
	});

	it('correction non écrite : le message aussi dans la police du corrigé', () => {
		const typst = generateWorksheetTypst({
			worksheet: worksheet(),
			instance: { exercises: [{ ...instance().exercises[0], solution: '' }] },
			config: {},
			mode: 'correction'
		});
		const blocks = correctionFontBlocks(typst);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toContain('Correction non écrite.');
	});

	it('option sans polices : le même corrigé dans la police standard', () => {
		const withFonts = generate('correction');
		const plain = generate('correction', { correctionFonts: false });
		expect(hasCorrectionFonts(plain)).toBe(false);
		expect(plain).toContain('CORRECTIONDETAILLEE');
		expect(withoutCorrectionFonts(withFonts)).toBe(plain);
	});

	it('la fiche n’emporte jamais ces polices', () => {
		expect(hasCorrectionFonts(generate('worksheet'))).toBe(false);
	});

	it('imprime toujours la correction détaillée, même avec l’ancienne clé « concise » (ADR 0030)', () => {
		const generator = new WorksheetGenerator(
			{ correction_detail: 'concise' } as WorksheetConfig,
			{},
			{ mode: 'correction' }
		);
		const typst = generator.generate({
			worksheet: worksheet(),
			instance: {
				exercises: [
					{
						...instance(ANSWERS).exercises[0],
						solution: 'GARDE \\detail{DETAILCACHE}'
					}
				]
			}
		}).typstContent;
		expect(typst).toContain('GARDE');
		expect(typst).toContain('DETAILCACHE');
	});
});
