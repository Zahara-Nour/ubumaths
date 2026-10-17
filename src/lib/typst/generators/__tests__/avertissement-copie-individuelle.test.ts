/**
 * Corrigé de classe d'une affectation individualisée : l'avertissement (D6)
 * ========================================================================
 *
 * Chaque élève a sa version (valeurs ou ordre) : le corrigé de classe montre
 * la copie d'UN élève et le dit, en tête, dans la langue de la fiche. Sans
 * l'option : rien ne change.
 */
import { describe, expect, it } from 'vitest';
import { generateWorksheetTypst } from '../worksheet-generator';
import { DEFAULT_TEMPLATES } from '../../templates/default-templates';
import type {
	InstanceData,
	WorksheetConfig,
	WorksheetRow,
	WorksheetTemplateRow
} from '$lib/types/worksheets';

const FR = 'Chaque élève a sa propre version : consulte ta correction personnelle.';
const EN = 'Each student has their own version: check your personal correction.';

const WORKSHEET = {
	id: 'w-1',
	title: 'Fiche test',
	description: null,
	type: 'worksheet',
	config: {},
	template_id: null,
	estimated_duration_minutes: null,
	total_points: null
} as unknown as WorksheetRow;

const INSTANCE: InstanceData = {
	exercises: [
		{
			exercise_id: 'ex-1',
			title: 'Calculer une dérivée',
			position: 1,
			parameters: {},
			statement: 'ENONCE',
			solution: 'CORRECTIONUNIQUE'
		}
	]
};

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
	} as WorksheetTemplateRow;
}

function generate(options: {
	notice?: boolean;
	config?: WorksheetConfig;
	templateContent?: string;
	mode?: 'worksheet' | 'answers' | 'correction';
}): string {
	return generateWorksheetTypst({
		worksheet: WORKSHEET,
		instance: INSTANCE,
		config: options.config ?? {},
		mode: options.mode ?? 'correction',
		template: options.templateContent ? template(options.templateContent) : null,
		individualCopyNotice: options.notice
	});
}

const LAYOUTS: Array<[string, string | undefined]> = [
	['sans modèle', undefined],
	...DEFAULT_TEMPLATES.map((t): [string, string] => [t.name, t.template_content])
];

describe('avertissement « chaque élève a sa propre version »', () => {
	it.each(LAYOUTS)('« %s » : imprimé en tête, avant les corrections', (_name, content) => {
		const typst = generate({ notice: true, templateContent: content });
		expect(typst).toContain(FR);
		expect(typst.indexOf(FR)).toBeLessThan(typst.indexOf('CORRECTIONUNIQUE'));
		// L'exercice reste identifié par son titre
		expect(typst).toContain('Calculer une dérivée');
	});

	it('fiche en anglais : avertissement en anglais', () => {
		const typst = generate({ notice: true, config: { language: 'en' } });
		expect(typst).toContain(EN);
		expect(typst).not.toContain(FR);
	});

	it.each(LAYOUTS)('« %s » sans l’option : aucun avertissement', (_name, content) => {
		const typst = generate({ templateContent: content });
		expect(typst).not.toContain(FR);
	});
});
