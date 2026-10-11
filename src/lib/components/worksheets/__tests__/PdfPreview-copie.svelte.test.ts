/**
 * PdfPreview — la copie imprimée hors affectation (ADR 0023)
 * ==========================================================
 *
 * Page de la fiche et cahier public : la version GUIDÉE par défaut, et les
 * variables substituées (elles ne l'étaient pas : le PDF imprimait le texte
 * brut de la variation 0, `{{a}}` compris).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { InstanceData, WorksheetWithRelations } from '$lib/types/worksheets';
import PdfPreview from '../PdfPreview.svelte';

// ============================================================================
// MOCKS — le compilateur Typst et le générateur : on capte la copie
// ============================================================================

const captured = vi.hoisted(() => ({ instances: [] as InstanceData[] }));

vi.mock('$lib/worksheets/typst-generator', () => ({
	generateWorksheetTypst: (options: { instance: InstanceData }) => {
		captured.instances.push(options.instance);
		return '= fiche';
	}
}));

vi.mock('$lib/worksheets/typst-compiler', () => ({
	getTypstCompiler: async () => ({
		svg: async () => '<svg></svg>',
		pdf: async () => new Uint8Array([37, 80, 68, 70]),
		mapShadow: () => {},
		resetShadow: () => {}
	}),
	getCompilerError: () => null,
	resetCompilerState: () => {}
}));

// ============================================================================
// FIXTURES
// ============================================================================

const FICHE = '808e2eee-162a-4493-81f6-8a945c81db3c';
const EXO = '02a099dd-ff75-4a75-835b-056cd3565f8f';

const worksheet = {
	id: FICHE,
	title: 'Proportionnalité',
	description: null,
	config: {},
	template: null,
	sections: [],
	exercises: [
		{
			id: 'we-1',
			worksheet_id: FICHE,
			exercise_id: EXO,
			section_id: null,
			position: 1,
			points: null,
			custom_instructions: null,
			translations: null,
			variation_index: null,
			exercise: {
				id: EXO,
				title: 'Triple',
				shared: {
					variables: [
						{ name: 'a', expression: '{{2..99}}' },
						{ name: 't', expression: '{{eval:3*{{a}}}}' }
					]
				},
				variations: [
					{
						label: 'guided',
						statement_md: 'Guidé : calcule {{a}} fois 3.',
						solution_md: 'Guidé : {{t}}'
					},
					{
						label: 'autonomous',
						statement_md: 'Autonome : triple de {{a}} ?',
						solution_md: 'Autonome : {{t}}'
					}
				]
			}
		}
	]
} as unknown as WorksheetWithRelations;

// ============================================================================
// TESTS
// ============================================================================

describe('PdfPreview — copie hors affectation', () => {
	beforeEach(() => {
		captured.instances = [];
	});

	it.each([['editor' as const], ['reader' as const]])(
		'%s : version guidée par défaut, variables substituées',
		async (variant) => {
			await render(PdfPreview, { props: { worksheet, variant } });
			await expect.poll(() => captured.instances.length).toBeGreaterThan(0);
			const exercise = captured.instances[0].exercises[0];
			expect(exercise.statement).toMatch(/^Guidé : calcule \d+ fois 3\.$/);
			const a = Number(/calcule (\d+) fois/.exec(exercise.statement)?.[1]);
			expect(exercise.solution).toBe(`Guidé : ${3 * a}`);
		}
	);

	it('page publique (reader) : pas de choix du niveau à imprimer', async () => {
		const screen = await render(PdfPreview, { props: { worksheet, variant: 'reader' } });
		await expect.poll(() => captured.instances.length).toBeGreaterThan(0);
		expect(screen.container.textContent).not.toContain('Niveau à imprimer');
	});

	it('éditeur : le choix « Niveau à imprimer » est proposé', async () => {
		const screen = await render(PdfPreview, { props: { worksheet } });
		await expect.poll(() => screen.container.textContent).toContain('Niveau à imprimer');
	});
});
