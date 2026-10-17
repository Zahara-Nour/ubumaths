/**
 * Aperçu markdown à l'écran du prof (PdfPreview) : le même document que le PDF
 * =============================================================================
 *
 * Avant le lot 2, l'aperçu refaisait sa numérotation (`i + 1`), ignorait
 * l'ordre tiré, les sections et la langue, et n'écrivait pas « correction non
 * écrite ». Il passe désormais par le document commun (ADR 0028).
 */
import { describe, expect, it } from 'vitest';
import { documentFromTeacherCopy } from '../teacher-adapter';
import { renderMarkdownPreview } from '../render-exercise';
import type { InstanceData, WorksheetConfig, WorksheetRow } from '$lib/types/worksheets';

const WORKSHEET = {
	id: 'w',
	title: 'Fiche test',
	description: 'Une description.',
	type: 'worksheet',
	config: {},
	template_id: null
} as unknown as WorksheetRow;

function instance(overrides: Partial<InstanceData> = {}): InstanceData {
	return {
		exercises: [
			{
				exercise_id: 'a',
				title: 'Dériver',
				position: 1,
				parameters: {},
				statement: 'ENONCE1',
				solution: 'CORRECTION1',
				answers: 'REPONSE1',
				custom_instructions: 'CONSIGNE1'
			},
			{
				exercise_id: 'b',
				title: null,
				position: 2,
				parameters: {},
				statement: 'ENONCE2',
				solution: 'CORRECTION2',
				answers: ''
			},
			{
				exercise_id: 'c',
				title: 'Factoriser',
				position: 3,
				parameters: {},
				statement: 'ENONCE3',
				solution: '',
				answers: ''
			}
		],
		...overrides
	};
}

function preview(
	form: 'worksheet' | 'answers' | 'correction',
	config: WorksheetConfig = {},
	data: InstanceData = instance()
): string {
	return renderMarkdownPreview(
		documentFromTeacherCopy({ worksheet: WORKSHEET, instance: data, config }),
		form
	);
}

describe('aperçu markdown du prof', () => {
	it('fiche : titre, description, « Exercice N : titre », consigne et énoncé', () => {
		const md = preview('worksheet');
		expect(md).toContain('# Fiche test');
		expect(md).toContain('Une description.');
		expect(md).toContain('## Exercice 1 : Dériver');
		expect(md).toContain('## Exercice 2\n');
		expect(md).toContain('_CONSIGNE1_');
		expect(md).toContain('ENONCE1');
		expect(md).not.toContain('CORRECTION1');
	});

	it('chiffres arabes (ADR 0030, ancienne clé ignorée) et ordre tiré, comme le PDF', () => {
		const md = preview(
			'worksheet',
			{ numbering_style: 'roman' } as WorksheetConfig,
			instance({ exercise_order: [2, 0, 1] })
		);
		expect(md.indexOf('ENONCE3')).toBeLessThan(md.indexOf('ENONCE1'));
		expect(md).toContain('## Exercice 1 : Factoriser');
		expect(md).toContain('## Exercice 3');
	});

	it('corrigé : la correction, sans énoncé ni consigne ; absente → « Correction non écrite. »', () => {
		const md = preview('correction');
		expect(md).toContain('CORRECTION1');
		expect(md).not.toContain('ENONCE1');
		expect(md).not.toContain('CONSIGNE1');
		expect(md).toContain('_Correction non écrite._');
	});

	it('réponses : absentes → renvoi au corrigé ; sans corrigé non plus → correction non écrite', () => {
		const md = preview('answers');
		expect(md).toContain('REPONSE1');
		expect(md).toContain('_Réponses non rédigées : voir le corrigé._');
		expect(md).toContain('_Correction non écrite._');
		expect(md).not.toContain('CORRECTION2');
	});

	it('fiche anglaise : les mots en anglais', () => {
		const md = preview('answers', { language: 'en' });
		expect(md).toContain('## Exercise 1');
		expect(md).toContain('_Answers not written: see the worked solutions._');
	});

	it('sections : titres de section, puis « Autres exercices » pour les exercices hors section', () => {
		const data = instance({
			sections: [
				{ id: 's1', title: 'Échauffement', instructions: 'Sans calculatrice.', position: 1 }
			]
		});
		data.exercises[0].section_id = 's1';
		data.exercises[1].section_id = 's1';
		const md = preview('worksheet', {}, data);
		expect(md).toContain('## Échauffement');
		expect(md).toContain('_Sans calculatrice._');
		expect(md).toContain('### Exercice 1 : Dériver');
		expect(md).toContain('## Autres exercices');
		// La consigne de section fait partie de l'énoncé : pas dans le corrigé
		expect(preview('correction', {}, data)).not.toContain('Sans calculatrice.');
	});
});
