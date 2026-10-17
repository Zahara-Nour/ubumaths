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
import { page } from 'vitest/browser';
import type { InstanceData, WorksheetWithRelations } from '$lib/types/worksheets';
import PdfPreview from '../PdfPreview.svelte';

// ============================================================================
// MOCKS — le compilateur Typst et le générateur : on capte la copie
// ============================================================================

const captured = vi.hoisted(() => ({
	instances: [] as InstanceData[],
	// Compilation retenue tant que le test ne la relâche pas (null : immédiate)
	gate: null as Promise<void> | null
}));

// Le « Typst » factice est le texte des énoncés : le SVG de l'aperçu le montre,
// le test lit donc ce qui est RENDU, pas seulement la copie calculée.
vi.mock('$lib/typst/generators', () => ({
	generateWorksheetTypst: (options: { instance: InstanceData }) => {
		captured.instances.push(options.instance);
		return options.instance.exercises.map((exercise) => exercise.statement).join(' | ');
	}
}));

vi.mock('$lib/typst/compiler', () => ({
	getTypstCompiler: async () => ({
		svg: async ({ mainContent }: { mainContent: string }) => {
			if (captured.gate) await captured.gate;
			const text = mainContent.replace(/&/g, '&amp;').replace(/</g, '&lt;');
			return `<svg xmlns="http://www.w3.org/2000/svg"><text>${text}</text></svg>`;
		},
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
		captured.gate = null;
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

	it('choisir « Autonome » : l’aperçu RENDU montre la version autonome', async () => {
		const screen = await render(PdfPreview, { props: { worksheet } });
		const preview = () => screen.container.querySelector('#pdf-svg-preview')?.textContent ?? '';
		await expect.poll(preview).toMatch(/Guidé : calcule \d+ fois 3\./);

		await page.getByRole('button', { name: 'Niveau à imprimer' }).click();
		await page.getByRole('option', { name: 'Autonome' }).click();

		await expect.poll(preview).toMatch(/Autonome : triple de \d+ \?/);
		expect(preview()).not.toContain('{{');
	});

	it('onglet Lot : le même choix refait l’aperçu', async () => {
		const screen = await render(PdfPreview, {
			props: { worksheet, students: [{ id: 'e1', first_name: 'Ada', last_name: 'L.' }] }
		});
		const preview = () => screen.container.querySelector('#pdf-svg-preview')?.textContent ?? '';
		await expect.poll(preview).toMatch(/^Guidé/);

		await page.getByRole('tab', { name: 'Lot' }).click();
		await page.getByRole('button', { name: 'Niveau à imprimer' }).click();
		await page.getByRole('option', { name: 'Autonome' }).click();
		await page.getByRole('tab', { name: 'Apercu' }).click();

		await expect.poll(preview).toMatch(/^Autonome/);
	});

	it('niveau changé PENDANT une génération : pas perdu, l’aperçu le rattrape', async () => {
		const screen = await render(PdfPreview, { props: { worksheet } });
		const preview = () => screen.container.querySelector('#pdf-svg-preview')?.textContent ?? '';
		await expect.poll(preview).toMatch(/^Guidé/);

		// Une génération en cours, retenue
		let release: () => void = () => {};
		captured.gate = new Promise<void>((resolve) => (release = resolve));
		const before = captured.instances.length;
		await page.getByRole('button', { name: 'Niveau à imprimer' }).click();
		await page.getByRole('option', { name: 'Intermédiaire' }).click();
		await expect.poll(() => captured.instances.length).toBeGreaterThan(before);

		// Changement pendant qu'elle tourne
		await page.getByRole('button', { name: 'Niveau à imprimer' }).click();
		await page.getByRole('option', { name: 'Autonome' }).click();
		captured.gate = null;
		release();

		await expect.poll(preview).toMatch(/^Autonome/);
	});
});
