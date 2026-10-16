/**
 * Formes = gabarits (ADR 0028, lot 2)
 * ===================================
 *
 * Un style fournit un gabarit par forme ; une forme absente d'un style prend
 * celle du style par défaut, « Fiche élève » (D2, D7). Le générateur ne
 * colle plus de bandeau sur la fiche : le corrigé a son propre gabarit.
 */
import { describe, expect, it } from 'vitest';
import {
	BUILT_IN_STYLES,
	BUILT_IN_STYLE_OPTIONS,
	DEFAULT_STYLE_ID,
	resolveTemplate
} from '../styles';
import {
	CORRECTIONS_PART,
	DEFAULT_TEMPLATES,
	DEFAULT_TEMPLATE_IDS,
	STUDENT_STYLE_TEMPLATE
} from '../default-templates';
import { generateWorksheetTypst } from '../../generators/worksheet-generator';
import type {
	InstanceData,
	WorksheetConfig,
	WorksheetRow,
	WorksheetTemplateRow
} from '$lib/types/worksheets';

const FORMS = ['worksheet', 'answers', 'correction', 'worksheet_with_corrections'] as const;

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
			solution: 'CORRECTION2',
			answers: 'REPONSE2'
		}
	]
};

function worksheet(templateId: string | null): WorksheetRow {
	return {
		id: 'w-1',
		title: 'Fiche test',
		description: null,
		type: 'worksheet',
		config: {},
		template_id: templateId,
		estimated_duration_minutes: null,
		total_points: null
	} as unknown as WorksheetRow;
}

function row(content: string, id = 'perso'): WorksheetTemplateRow {
	return {
		id,
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
	mode: 'worksheet' | 'answers' | 'correction',
	options: {
		templateId?: string | null;
		template?: WorksheetTemplateRow | null;
		config?: WorksheetConfig;
		withCorrections?: 'answers' | 'correction';
		correctionFonts?: boolean;
	} = {}
): string {
	return generateWorksheetTypst({
		worksheet: worksheet(options.templateId ?? null),
		instance: INSTANCE,
		config: options.config ?? {},
		mode,
		template: options.template ?? null,
		withCorrections: options.withCorrections,
		correctionFonts: options.correctionFonts
	});
}

describe('styles fournis par Chiphre', () => {
	it('un style par gabarit intégré, chacun avec sa fiche', () => {
		expect(BUILT_IN_STYLES.map((s) => s.id)).toEqual(DEFAULT_TEMPLATES.map((t) => t.id));
		for (const style of BUILT_IN_STYLES) expect(style.templates.worksheet).toBeTruthy();
	});

	it('« Fiche élève » est le style par défaut et a les quatre formes', () => {
		expect(DEFAULT_STYLE_ID).toBe(DEFAULT_TEMPLATE_IDS.studentStyle);
		const style = BUILT_IN_STYLES.find((s) => s.id === DEFAULT_STYLE_ID);
		for (const form of FORMS) expect(style?.templates[form]).toBeTruthy();
	});

	it('la fiche « Fiche élève » résolue est le gabarit intégré d’avant, à l’octet', () => {
		expect(resolveTemplate(DEFAULT_STYLE_ID, 'worksheet').content).toBe(
			STUDENT_STYLE_TEMPLATE.template_content
		);
	});

	it('le code commun du style remplace {{style_common}} dans chaque forme', () => {
		for (const form of FORMS) {
			const resolved = resolveTemplate(DEFAULT_STYLE_ID, form).content;
			expect(resolved).not.toContain('{{style_common}}');
			expect(resolved).toContain('columns: 2');
		}
	});
});

describe('« 2 colonnes - paysage » (David, 2026-10-16)', () => {
	const LANDSCAPE_ID = DEFAULT_TEMPLATE_IDS.studentStyleLandscape;

	/** Le Typst d'une forme, l'orientation paysage retirée */
	function asPortrait(typst: string): string {
		return typst.replace('A4 paysage sur', 'A4 sur').replace('\n  flipped: true,', '');
	}

	it('proposé au menu, sous ce nom', () => {
		expect(BUILT_IN_STYLE_OPTIONS.find((s) => s.id === LANDSCAPE_ID)?.name).toBe(
			'2 colonnes - paysage'
		);
	});

	it('ses quatre formes sont en A4 paysage, sur deux colonnes', () => {
		for (const form of FORMS) {
			const resolved = resolveTemplate(LANDSCAPE_ID, form).content;
			expect(resolved).toContain('paper: "a4",\n  flipped: true,');
			expect(resolved).toContain('columns: 2');
		}
	});

	it('à l’orientation près, chaque forme est celle de « Fiche élève »', () => {
		for (const form of FORMS) {
			const landscape = resolveTemplate(LANDSCAPE_ID, form).content;
			expect(landscape).not.toBe(resolveTemplate(DEFAULT_STYLE_ID, form).content);
			expect(asPortrait(landscape)).toBe(resolveTemplate(DEFAULT_STYLE_ID, form).content);
		}
	});

	it('« Fiche élève » reste en portrait', () => {
		for (const form of FORMS) {
			expect(resolveTemplate(DEFAULT_STYLE_ID, form).content).not.toContain('flipped');
		}
	});

	it('le générateur imprime la fiche et le corrigé en paysage', () => {
		for (const mode of ['worksheet', 'correction'] as const) {
			const typst = generate(mode, { templateId: LANDSCAPE_ID });
			expect(typst).toContain('flipped: true');
			expect(typst).toContain(mode === 'worksheet' ? 'ENONCE1' : 'CORRECTION1');
		}
	});
});

describe('résolution du gabarit', () => {
	it('un autre style garde SA fiche', () => {
		const standard = DEFAULT_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_IDS.standard);
		expect(resolveTemplate(DEFAULT_TEMPLATE_IDS.standard, 'worksheet').content).toBe(
			standard?.template_content
		);
	});

	it('ses réponses et son corrigé sont ceux de « Fiche élève » (D2)', () => {
		for (const form of ['answers', 'correction'] as const) {
			expect(resolveTemplate(DEFAULT_TEMPLATE_IDS.standard, form).content).toBe(
				resolveTemplate(DEFAULT_STYLE_ID, form).content
			);
		}
	});

	it('sa fiche + corrections : SA fiche, puis la partie de fin (David, 2026-10-14)', () => {
		const resolved = resolveTemplate(DEFAULT_TEMPLATE_IDS.standard, 'worksheet_with_corrections');
		expect(resolved.content).toBe(
			`${resolveTemplate(DEFAULT_TEMPLATE_IDS.standard, 'worksheet').content}\n${CORRECTIONS_PART}`
		);
	});

	it('style absent ou inconnu → « Fiche élève », pour toutes les formes', () => {
		for (const form of FORMS) {
			expect(resolveTemplate(null, form).content).toBe(
				resolveTemplate(DEFAULT_STYLE_ID, form).content
			);
			expect(resolveTemplate('inconnu', form).content).toBe(
				resolveTemplate(DEFAULT_STYLE_ID, form).content
			);
		}
	});

	it('gabarit du prof : sa fiche seulement, le corrigé est celui du style par défaut', () => {
		expect(resolveTemplate(null, 'worksheet', 'PERSO').content).toBe('PERSO');
		expect(resolveTemplate(null, 'correction', 'PERSO').content).toBe(
			resolveTemplate(DEFAULT_STYLE_ID, 'correction').content
		);
	});
});

describe('générateur : une forme = un gabarit', () => {
	it('fiche sans gabarit = fiche « Fiche élève » (D7)', () => {
		expect(generate('worksheet')).toBe(generate('worksheet', { templateId: DEFAULT_STYLE_ID }));
	});

	it('plus de mise en page écrite dans le code (en-tête en grille, points-badge)', () => {
		for (const mode of ['worksheet', 'answers', 'correction'] as const) {
			const typst = generate(mode);
			expect(typst).not.toContain('#exercise-header');
			expect(typst).not.toContain('points-badge');
		}
	});

	it('le corrigé ne dépend plus du style de la fiche, ni du gabarit lu en base', () => {
		const reference = generate('correction');
		// Sauf « 2 colonnes - paysage », qui a son propre corrigé (en paysage)
		const others = DEFAULT_TEMPLATES.filter(
			(t) => t.id !== DEFAULT_TEMPLATE_IDS.studentStyleLandscape
		);
		for (const t of others) {
			expect(generate('correction', { templateId: t.id })).toBe(reference);
			expect(
				generate('correction', { templateId: t.id, template: row(t.template_content, t.id) })
			).toBe(reference);
		}
	});

	it('corrigé : bandeau vert écrit une seule fois, deux colonnes, carrés, pas d’énoncé', () => {
		const typst = generate('correction');
		expect(typst.match(/rgb\("#228b22"\)/g)).toHaveLength(1);
		expect(typst).toContain('CORRECTION');
		expect(typst).toContain('columns: 2');
		expect(typst).toContain('CORRECTION1');
		expect(typst).not.toContain('ENONCE1');
	});

	it('réponses : bandeau RÉPONSES, les réponses, ni énoncé ni corrigé', () => {
		const typst = generate('answers');
		expect(typst).toContain('RÉPONSES');
		expect(typst).toContain('REPONSE1');
		expect(typst).not.toContain('ENONCE1');
		expect(typst).not.toContain('CORRECTION1');
	});

	it('fiche anglaise : bandeau en anglais', () => {
		const typst = generate('correction', { config: { language: 'en' } });
		expect(typst).toContain('SOLUTIONS');
	});

	it('la fiche n’a jamais de bandeau', () => {
		expect(generate('worksheet')).not.toContain('228b22');
	});

	it('aucun placeholder laissé dans le Typst', () => {
		for (const mode of ['worksheet', 'answers', 'correction'] as const) {
			expect(generate(mode)).not.toMatch(/\{\{/);
		}
		expect(generate('worksheet', { withCorrections: 'correction' })).not.toMatch(/\{\{/);
	});
});

describe('fiche + corrections', () => {
	it('les énoncés, puis le corrigé sur une nouvelle page', () => {
		const typst = generate('worksheet', { withCorrections: 'correction' });
		const breakAt = typst.indexOf('#pagebreak()');
		expect(breakAt).toBeGreaterThan(typst.indexOf('ENONCE2'));
		expect(typst.indexOf('CORRECTION1')).toBeGreaterThan(breakAt);
		expect(typst.slice(breakAt)).toContain('CORRECTION');
	});

	it('les réponses au lieu du corrigé', () => {
		const typst = generate('worksheet', { withCorrections: 'answers' });
		expect(typst.indexOf('REPONSE1')).toBeGreaterThan(typst.indexOf('#pagebreak()'));
		expect(typst).not.toContain('CORRECTION1');
	});

	it('polices du corrigé : sur la partie corrigé seulement', () => {
		const typst = generate('worksheet', { withCorrections: 'correction' });
		const shantell = typst.indexOf('Shantell Sans');
		expect(shantell).toBeGreaterThan(typst.indexOf('#pagebreak()'));
		expect(generate('worksheet', { withCorrections: 'answers' })).not.toContain('Shantell Sans');
		expect(
			generate('worksheet', { withCorrections: 'correction', correctionFonts: false })
		).not.toContain('Shantell Sans');
	});
});

describe('points : le type de la fiche décide, quel que soit le style (ADR 0030)', () => {
	const POINTS = /\)\[\d+ pts?\]/;
	const withPoints: InstanceData = {
		exercises: INSTANCE.exercises.map((e) => ({ ...e, points: 2 }))
	};
	function gen(
		type: 'worksheet' | 'assessment',
		mode: 'worksheet' | 'answers' | 'correction',
		templateId: string | null,
		template: WorksheetTemplateRow | null = null
	): string {
		return generateWorksheetTypst({
			worksheet: { ...worksheet(templateId), type },
			instance: withPoints,
			config: { show_points: true },
			mode,
			template
		});
	}
	const perso = row('#set page(paper: "a4")\n{{exercises}}');

	it("fiche d'exercices : aucun point, dans aucun style, même case cochée", () => {
		for (const mode of ['worksheet', 'answers', 'correction'] as const) {
			expect(gen('worksheet', mode, null)).not.toMatch(POINTS);
			expect(gen('worksheet', mode, DEFAULT_TEMPLATE_IDS.standard)).not.toMatch(POINTS);
		}
		expect(gen('worksheet', 'worksheet', 'perso', perso)).not.toMatch(POINTS);
	});

	it('évaluation écrite, points cochés : dans tous les styles, « Fiche élève » compris', () => {
		expect(gen('assessment', 'worksheet', null)).toMatch(POINTS);
		expect(gen('assessment', 'worksheet', DEFAULT_STYLE_ID)).toMatch(POINTS);
		expect(gen('assessment', 'worksheet', DEFAULT_TEMPLATE_IDS.standard)).toMatch(POINTS);
		expect(gen('assessment', 'worksheet', 'perso', perso)).toMatch(POINTS);
		const copy = row(STUDENT_STYLE_TEMPLATE.template_content, DEFAULT_STYLE_ID);
		expect(gen('assessment', 'worksheet', DEFAULT_STYLE_ID, copy)).toMatch(POINTS);
	});
});
