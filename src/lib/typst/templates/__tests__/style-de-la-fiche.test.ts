/**
 * Le style retenu pour une fiche (ADR 0028, lot 3b)
 * =================================================
 *
 * La fiche désigne son style par `style_id` ; les fiches d'avant le lot 3
 * le désignent par `template_id` (même identifiant pour les styles de
 * Chiphre) ; sans l'un ni l'autre, « Fiche élève » (D7). Le Typst d'un style
 * de Chiphre vient toujours du code, jamais de la base (audit du lot 3a).
 */
import { describe, expect, it } from 'vitest';
import {
	BUILT_IN_STYLE_OPTIONS,
	BUILT_IN_STYLES,
	DEFAULT_STYLE_ID,
	resolveTemplate,
	isBuiltInStyle,
	styleIdOf
} from '../styles';
import { DEFAULT_TEMPLATES, DEFAULT_TEMPLATE_IDS } from '../default-templates';
import { generateWorksheetTypst } from '../../generators/worksheet-generator';
import type { InstanceData, WorksheetRow, WorksheetTemplateRow } from '$lib/types/worksheets';

const STANDARD = DEFAULT_TEMPLATE_IDS.standard;
const MODERN = DEFAULT_TEMPLATE_IDS.modern;
const PROF_STYLE = '6f1c2a4e-0000-4000-8000-00000000abcd';

const INSTANCE: InstanceData = {
	exercises: [
		{
			exercise_id: 'ex-1',
			title: 'Dériver',
			position: 1,
			parameters: {},
			statement: 'ENONCE1',
			solution: 'CORRECTION1',
			answers: 'REPONSE1'
		}
	]
};

function worksheet(ids: { style_id?: string | null; template_id?: string | null }): WorksheetRow {
	return {
		id: 'w-1',
		title: 'Fiche test',
		description: null,
		type: 'worksheet',
		config: {},
		template_id: ids.template_id ?? null,
		style_id: ids.style_id ?? null,
		estimated_duration_minutes: null,
		total_points: null
	} as unknown as WorksheetRow;
}

function profTemplate(content: string): WorksheetTemplateRow {
	return {
		id: PROF_STYLE,
		name: 'Perso',
		description: null,
		template_content: content,
		placeholders: [],
		created_by: 'prof',
		created_at: '',
		updated_at: ''
	} as WorksheetTemplateRow;
}

function generate(
	ids: { style_id?: string | null; template_id?: string | null },
	template: WorksheetTemplateRow | null = null
): string {
	return generateWorksheetTypst({
		worksheet: worksheet(ids),
		instance: INSTANCE,
		config: {},
		mode: 'worksheet',
		template
	});
}

function builtInWorksheet(id: string): string {
	return resolveTemplate(id, 'worksheet').content;
}

/** Une ligne propre au gabarit, absente de « Fiche élève » : la signature du style. */
function signature(id: string): string {
	const own = builtInWorksheet(id).split('\n');
	const fallback = new Set(builtInWorksheet(DEFAULT_STYLE_ID).split('\n'));
	const line = own.find((l) => l.trim().length > 20 && !fallback.has(l));
	if (!line) throw new Error(`aucune ligne propre au style ${id}`);
	return line;
}

describe('le style retenu', () => {
	it('`style_id` d’abord', () => {
		expect(styleIdOf({ style_id: STANDARD, template_id: MODERN })).toBe(STANDARD);
	});

	it('sinon `template_id` (fiches d’avant le lot 3)', () => {
		expect(styleIdOf({ style_id: null, template_id: MODERN })).toBe(MODERN);
		expect(styleIdOf({ template_id: MODERN })).toBe(MODERN);
	});

	it('sinon aucun (le générateur prend « Fiche élève »)', () => {
		expect(styleIdOf({ style_id: null, template_id: null })).toBeNull();
		expect(styleIdOf({})).toBeNull();
	});
});

describe('le PDF suit le style retenu', () => {
	it('`style_id` = Standard → la fiche Standard, même si `template_id` dit Moderne', () => {
		const typst = generate({ style_id: STANDARD, template_id: MODERN });
		expect(typst).toContain(signature(STANDARD));
		expect(typst).not.toContain(signature(MODERN));
	});

	it('fiche d’avant le lot 3 : `template_id` seul décide', () => {
		expect(generate({ template_id: MODERN })).toContain(signature(MODERN));
	});

	it('style inconnu → « Fiche élève », sans planter', () => {
		expect(generate({ style_id: PROF_STYLE })).toBe(generate({}));
	});

	it('style de Chiphre : le Typst lu en base est ignoré, celui du code fait foi', () => {
		const typst = generate({ style_id: STANDARD }, profTemplate('#text[COPIE-EN-BASE]'));
		expect(typst).not.toContain('COPIE-EN-BASE');
		expect(typst).toContain(signature(STANDARD));
	});

	it('style du prof : son gabarit sert à la fiche', () => {
		const typst = generate({ style_id: PROF_STYLE }, profTemplate('#text[GABARIT-DU-PROF]'));
		expect(typst).toContain('GABARIT-DU-PROF');
	});
});

// Styles qui imitaient un type de fiche : retirés du menu (ADR 0030, lot 2)
const RETIRED: readonly string[] = [
	DEFAULT_TEMPLATE_IDS.assessment,
	DEFAULT_TEMPLATE_IDS.exam,
	DEFAULT_TEMPLATE_IDS.homework,
	DEFAULT_TEMPLATE_IDS.quiz
];

describe('les styles de Chiphre proposés au menu', () => {
	it('les 8 qui ne sont qu’une apparence, dans l’ordre du code, avec nom et description', () => {
		expect(BUILT_IN_STYLE_OPTIONS.map((s) => s.id)).toEqual(
			DEFAULT_TEMPLATES.map((t) => t.id).filter((id) => !RETIRED.includes(id))
		);
		for (const name of ['Contrôle', 'Examen', 'Devoirs', 'Quiz'])
			expect(BUILT_IN_STYLE_OPTIONS.map((s) => s.name)).not.toContain(name);
		for (const option of BUILT_IN_STYLE_OPTIONS) {
			const style = BUILT_IN_STYLES.find((s) => s.id === option.id);
			expect(option).toEqual({
				id: style?.id,
				name: style?.name,
				description: style?.description
			});
		}
	});

	it('une fiche qui désigne encore un style retiré s’imprime toujours avec lui', () => {
		for (const id of RETIRED) {
			expect(isBuiltInStyle(id)).toBe(true);
			expect(resolveTemplate(id, 'worksheet').content).toBe(
				DEFAULT_TEMPLATES.find((t) => t.id === id)?.template_content
			);
		}
	});
});
