/**
 * « Fiche + corrigé » du prof : chaque correction suit son énoncé
 * ===============================================================
 *
 * Demande de David (2026-10-14), « comme avant » le lot 2 de l'ADR 0028 : un
 * PDF du prof où, exercice par exercice, la correction vient juste sous
 * l'énoncé. Mise en page de la fiche (son style), « — Correction » après le
 * titre, pas de cadre de réponse vide, la correction seule en police du
 * corrigé. Toutes les corrections : c'est la copie du prof.
 */
import { describe, expect, it } from 'vitest';
import { generateWorksheetTypst } from '../worksheet-generator';
import { resolveTemplate } from '../../templates/styles';
import { DEFAULT_TEMPLATE_IDS } from '../../templates/default-templates';
import { hasCorrectionFonts, withoutCorrectionFonts } from '../../correction-fonts';
import { worksheetPdfFileName } from '$lib/worksheets/pdf-file-name';
import type { InstanceData, WorksheetConfig, WorksheetRow } from '$lib/types/worksheets';

const ASSESSMENT = DEFAULT_TEMPLATE_IDS.assessment;

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
		},
		{
			exercise_id: 'ex-2',
			title: 'Factoriser',
			position: 2,
			parameters: {},
			statement: 'ENONCE2',
			solution: '',
			answers: ''
		},
		{
			exercise_id: 'ex-3',
			title: 'Résoudre',
			position: 3,
			parameters: {},
			statement: 'ENONCE3',
			solution: 'CORRECTION3',
			answers: 'REPONSE3'
		}
	]
};

function worksheet(styleId: string | null, type = 'worksheet'): WorksheetRow {
	return {
		id: 'w-1',
		title: 'Fonctions',
		description: null,
		type,
		config: {},
		template_id: styleId,
		style_id: styleId,
		estimated_duration_minutes: null,
		total_points: null
	} as unknown as WorksheetRow;
}

function ficheEtCorrige(
	styleId: string | null = null,
	options: { type?: string; config?: WorksheetConfig; correctionFonts?: boolean } = {}
): string {
	return generateWorksheetTypst({
		worksheet: worksheet(styleId, options.type),
		instance: INSTANCE,
		config: options.config ?? {},
		mode: 'worksheet',
		inlineCorrections: true,
		correctionFonts: options.correctionFonts
	});
}

describe('chaque correction suit son énoncé', () => {
	it('énoncé 1, correction 1, énoncé 2, …, dans cet ordre', () => {
		const typst = ficheEtCorrige();
		const order = ['ENONCE1', 'CORRECTION1', 'ENONCE2', 'ENONCE3', 'CORRECTION3'].map((m) =>
			typst.indexOf(m)
		);
		expect(order.every((i) => i > -1)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	it('exercice sans correction : « Correction non écrite », sous son énoncé', () => {
		const typst = ficheEtCorrige();
		const between = typst.slice(typst.indexOf('ENONCE2'), typst.indexOf('ENONCE3'));
		expect(between).toContain('Correction non écrite.');
	});

	it('corrigé concis ou détaillé selon la fiche, comme le Corrigé', () => {
		const typst = (detail: 'concise' | 'detailed') =>
			generateWorksheetTypst({
				worksheet: worksheet(null),
				instance: {
					exercises: [
						{ ...INSTANCE.exercises[0], solution: 'Résultat. \\detail{DETAILCORRECTION}' }
					]
				},
				config: { correction_detail: detail },
				mode: 'worksheet',
				inlineCorrections: true
			});
		expect(typst('concise')).toContain('Résultat.');
		expect(typst('concise')).not.toContain('DETAILCORRECTION');
		expect(typst('detailed')).toContain('DETAILCORRECTION');
	});
});

describe('la mise en page de la fiche', () => {
	it('le style de la fiche (Contrôle) : sa fiche, pas le corrigé', () => {
		const typst = ficheEtCorrige(ASSESSMENT, { type: 'assessment' });
		const sheet = resolveTemplate(ASSESSMENT, 'worksheet').content;
		const ownLine = sheet.split('\n').find((l) => l.includes('#set page'));
		expect(ownLine).toBeDefined();
		expect(typst).toContain(ownLine!);
	});

	it('« — Correction » après le titre', () => {
		expect(ficheEtCorrige()).toContain('Fonctions — Correction');
	});

	it('pas de cadre de réponse vide, même pour un contrôle', () => {
		const sheet = generateWorksheetTypst({
			worksheet: worksheet(ASSESSMENT, 'assessment'),
			instance: INSTANCE,
			config: {},
			mode: 'worksheet'
		});
		expect(sheet).toContain('height: 5cm');
		expect(ficheEtCorrige(ASSESSMENT, { type: 'assessment' })).not.toContain('height: 5cm');
	});
});

describe('la police du corrigé, sur les corrections seulement', () => {
	it('les énoncés gardent la police de la fiche', () => {
		const typst = ficheEtCorrige();
		expect(hasCorrectionFonts(typst)).toBe(true);
		// Aucune règle de police avant le premier énoncé : elles sont dans les blocs de correction
		const head = typst.slice(0, typst.indexOf('ENONCE1'));
		expect(head).not.toContain('Shantell Sans');
	});

	it('repli sans polices : le même PDF, police standard', () => {
		const plain = ficheEtCorrige(null, { correctionFonts: false });
		expect(hasCorrectionFonts(plain)).toBe(false);
		const lines = (typst: string) => typst.replace(/\n{2,}/g, '\n');
		expect(lines(withoutCorrectionFonts(ficheEtCorrige()))).toBe(lines(plain));
	});
});

describe('nom du fichier', () => {
	it('« Fiche et corrigé »', () => {
		expect(worksheetPdfFileName('Fonctions', 'worksheet_correction')).toBe(
			'Fonctions - Fiche et corrigé.pdf'
		);
	});
});
