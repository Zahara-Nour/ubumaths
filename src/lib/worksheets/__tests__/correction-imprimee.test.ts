/**
 * Fiche PDF : correction concise ou détaillée (ADR 0017, D11 ; écart D4, 2026-10-11)
 *
 * La fiche choisit (`config.correction_detail`, détaillée par défaut). Le choix
 * s'applique À L'IMPRESSION, avant Typst, à chaque corrigé imprimé : PDF du
 * prof (`worksheet-generator`) et PDF de l'élève (`student-worksheet-typst`).
 * Aucun marqueur brut n'arrive jamais à Typst.
 */
import { describe, it, expect } from 'vitest';
import { correctionForPrint } from '$lib/questions/correction-detail';
import { WorksheetGenerator } from '$lib/typst/generators/worksheet-generator';
import { generateStudentWorksheetTypst } from '../student-worksheet-typst';
import {
	studentWorksheetDetailResponseSchema,
	worksheetConfigSchema
} from '$lib/server/validation/worksheets';
import { asWorksheetConfig } from '$lib/types/worksheets';
import { buildSerie } from '../serie-automatismes';
import type { QuestionTemplate } from '$lib/questions/types';
import type {
	InstanceData,
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow
} from '$lib/types/worksheets';

/** Un corrigé avec les trois sortes de détails */
const MARKED = [
	'On obtient $x=2$.',
	'',
	'> [!méthode] On isole la variable.',
	'',
	'$$\\begin{align} 2x+3&=7 \\\\ \\detail{2x&=987 \\\\} x&=2 \\end{align}$$',
	'',
	'C’est [une équation du premier degré]{.rappel} simple.'
].join('\n');

/** Ce que seule la version détaillée contient */
const DETAILS = ['isole', 'premier degré', '987'];

function expectNoRawMarker(typst: string) {
	expect(typst).not.toContain('detail{');
	expect(typst).not.toContain('[!méthode]');
	expect(typst).not.toContain('{.rappel}');
}

describe('correctionForPrint', () => {
	it('concise : sans aucun détail', () => {
		const text = correctionForPrint(MARKED, 'concise');
		for (const word of DETAILS) expect(text).not.toContain(word);
		expect(text).toContain('On obtient');
	});

	it('détaillée, et par défaut : tous les détails, sans marqueur', () => {
		for (const text of [correctionForPrint(MARKED, 'detailed'), correctionForPrint(MARKED)]) {
			for (const word of DETAILS) expect(text).toContain(word);
			expect(text).not.toContain('\\detail{');
		}
	});

	it('tout est détail : la concise imprimerait vide → la détaillée', () => {
		expect(correctionForPrint('> [!méthode] Tout est méthode.', 'concise')).toContain('Tout est');
	});
});

// =============================================================================
// PDF du prof
// =============================================================================

const worksheet = {
	id: 'w',
	title: 'Équations',
	description: null,
	type: 'worksheet',
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
	created_by: 'u',
	school_id: null,
	created_at: '2026-10-11',
	updated_at: '2026-10-11'
} as unknown as WorksheetRow;

const instance: InstanceData = {
	exercises: [
		{
			exercise_id: 'ex-1',
			title: 'Équation',
			position: 1,
			parameters: {},
			statement: 'Résoudre $2x+3=7$.',
			solution: MARKED
		}
	]
} as InstanceData;

function teacherCorrection(config: WorksheetConfig): string {
	const generator = new WorksheetGenerator(config, undefined, { mode: 'correction' });
	return generator.generate({ worksheet, instance }).typstContent;
}

describe('PDF du prof : la fiche choisit', () => {
	it('concise : aucun détail imprimé, aucun marqueur brut', () => {
		const typst = teacherCorrection({ correction_detail: 'concise' });
		for (const word of DETAILS) expect(typst).not.toContain(word);
		expect(typst).toContain('On obtient');
		expectNoRawMarker(typst);
	});

	it('détaillée : tous les détails, aucun marqueur brut', () => {
		const typst = teacherCorrection({ correction_detail: 'detailed' });
		for (const word of DETAILS) expect(typst).toContain(word);
		expectNoRawMarker(typst);
	});

	it('sans réglage : détaillée', () => {
		const typst = teacherCorrection({});
		for (const word of DETAILS) expect(typst).toContain(word);
		expectNoRawMarker(typst);
	});
});

// =============================================================================
// PDF de l'élève
// =============================================================================

function studentCorrection(correction_detail?: 'concise' | 'detailed'): string {
	const view = {
		assignment_id: 'a',
		worksheet_id: 'w',
		title: 'Équations',
		description: null,
		type: 'worksheet',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: true,
		class_name: null,
		read_only: false,
		sections: [],
		...(correction_detail ? { correction_detail } : {}),
		exercises: [
			{
				id: 'we-1',
				exercise_id: 'ex-1',
				title: 'Équation',
				position: 1,
				section_id: null,
				points: null,
				is_essential: false,
				custom_instructions: null,
				statement: 'Résoudre $2x+3=7$.',
				correction: MARKED,
				correction_visible: true
			}
		]
	} as unknown as StudentWorksheetView;
	return generateStudentWorksheetTypst(view, true);
}

describe('PDF de l’élève : le réglage de la fiche', () => {
	it('concise : aucun détail, aucun marqueur brut', () => {
		const typst = studentCorrection('concise');
		for (const word of DETAILS) expect(typst).not.toContain(word);
		expectNoRawMarker(typst);
	});

	it('sans réglage : détaillée, aucun marqueur brut', () => {
		const typst = studentCorrection();
		for (const word of DETAILS) expect(typst).toContain(word);
		expectNoRawMarker(typst);
	});
});

// =============================================================================
// Réglage : validation et lecture
// =============================================================================

describe('le réglage correction_detail', () => {
	it('Zod : concise et detailed acceptées, autre valeur refusée', () => {
		expect(worksheetConfigSchema.parse({ correction_detail: 'concise' }).correction_detail).toBe(
			'concise'
		);
		expect(worksheetConfigSchema.parse({ correction_detail: 'detailed' }).correction_detail).toBe(
			'detailed'
		);
		expect(worksheetConfigSchema.safeParse({ correction_detail: 'brève' }).success).toBe(false);
	});

	it('lecture de la colonne : valeur connue gardée, inconnue ignorée', () => {
		expect(asWorksheetConfig({ correction_detail: 'concise' }).correction_detail).toBe('concise');
		expect(asWorksheetConfig({ correction_detail: 'brève' }).correction_detail).toBeUndefined();
	});
});

// =============================================================================
// Série d'automatismes : le choix reste possible après sa création
// =============================================================================

describe('série d’automatismes : les marqueurs sont gardés, le choix se fait à l’impression', () => {
	const marque = {
		title: 't',
		grades: ['2'],
		theme: 'T',
		domain: 'D',
		level: 1,
		status: 'draft',
		id: 'marque',
		variations: [
			{
				statement: 'Combien font $2+{{a}}$ ?\n\nRéponse : $?$.',
				variables: [{ name: 'a', expression: '1..9' }],
				blanks: [{ expectedAnswer: '{{eval:2+a}}' }],
				correction: {
					steps: [
						'On additionne : $2+{{a}}={{eval:2+a}}$.\n\n> [!méthode] On compte sur ses doigts.'
					]
				}
			}
		]
	} as unknown as QuestionTemplate;

	it('le corrigé figé garde le détail ; la fiche concise ne l’imprime pas', () => {
		const serie = buildSerie(new Map([['marque', marque]]), [{ templateId: 'marque', seed: 3 }]);
		expect(serie.solution).toContain('[!méthode]');
		const concise = new WorksheetGenerator({ correction_detail: 'concise' }, undefined, {
			mode: 'correction'
		}).generate({
			worksheet,
			instance: {
				exercises: [
					{
						exercise_id: 's',
						title: null,
						position: 1,
						parameters: {},
						statement: serie.statement,
						solution: serie.solution
					}
				]
			} as InstanceData
		}).typstContent;
		expect(concise).not.toContain('doigts');
		expect(concise).toContain('additionne');
	});
});

// La page de l'élève lit l'API : son schéma de réponse retire les clés qu'il ne
// connaît pas (`validation.data`). Sans ces deux champs, le PDF de l'élève
// perdait la langue de la fiche (constaté le 2026-10-11) et perdrait le réglage.
describe('API élève : la langue et le réglage du corrigé arrivent au PDF', () => {
	it('le schéma de réponse garde language et correction_detail', () => {
		const response = {
			assignment_id: '11111111-1111-4111-8111-111111111111',
			worksheet_id: '22222222-2222-4222-8222-222222222222',
			title: 'Equations',
			language: 'en',
			correction_detail: 'concise',
			description: null,
			type: 'worksheet',
			instructions: null,
			available_from: '2026-10-11T08:00:00.000Z',
			closes_at: null,
			show_corrections: true,
			class_name: null,
			read_only: false,
			exercises: [],
			sections: []
		};
		const parsed = studentWorksheetDetailResponseSchema.parse(response);
		expect(parsed.language).toBe('en');
		expect(parsed.correction_detail).toBe('concise');
	});
});
