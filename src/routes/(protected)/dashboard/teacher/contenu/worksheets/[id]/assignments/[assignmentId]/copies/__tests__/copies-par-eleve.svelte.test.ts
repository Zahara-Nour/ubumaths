/**
 * Copies par élève (ADR 0030, lot 5) : ce que le prof voit avant d'imprimer
 * ========================================================================
 *
 * Toutes les copies à la suite (ordre alphabétique, chacune au nom de son
 * élève), ou la copie d'un élève choisi dans la liste. Chaque copie est celle
 * que l'aperçu rend pour l'élève (`…/preview?studentId=`) ; une seule demande
 * si l'affectation est commune. Le « PDF » factice est le Typst rendu en
 * texte : le test lit ce qui est AFFICHÉ. Noms fictifs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

// Compilations en cours : le compilateur et ses images sont partagés, une seule à la fois
const compiled = vi.hoisted(() => ({ sources: [] as string[], active: 0, maxActive: 0 }));
vi.mock('$lib/typst/compiler', () => ({
	getTypstCompiler: async () => ({
		svg: async ({ mainContent }: { mainContent: string }) => {
			compiled.sources.push(mainContent);
			compiled.active++;
			compiled.maxActive = Math.max(compiled.maxActive, compiled.active);
			// Une compilation qui prend du temps, comme un paquet de 35 copies
			await new Promise((resolve) => setTimeout(resolve, 400));
			compiled.active--;
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

import CopiesPage from '../+page.svelte';

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const ONDINE = '550e8400-e29b-41d4-a716-446655440601';
const ELISE = '550e8400-e29b-41d4-a716-446655440602';
const FELIX = '550e8400-e29b-41d4-a716-446655440603';

const DATA = {
	worksheetId: WORKSHEET_ID,
	assignmentId: ASSIGNMENT_ID,
	// Déjà dans l'ordre d'impression (le serveur trie)
	students: [
		{ id: ONDINE, first_name: 'Ondine', last_name: 'Abricot', class_name: '3e Lune' },
		{ id: ELISE, first_name: 'Élise', last_name: 'Écureuil', class_name: null },
		{ id: FELIX, first_name: 'Félix', last_name: 'Fougère', class_name: '3e Lune' }
	]
};

function view(studentId: string | null, perStudent: boolean, type = 'assessment') {
	return {
		assignment_id: ASSIGNMENT_ID,
		worksheet_id: WORKSHEET_ID,
		title: 'Fractions',
		language: 'fr',
		description: null,
		type,
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: false,
		class_name: '3e Lune',
		read_only: false,
		sections: [],
		exercises: [
			{
				id: '00000000-0000-4000-8000-00000000010a',
				exercise_id: '00000000-0000-4000-8000-00000000020a',
				title: 'Simplifier',
				position: 1,
				points: 2,
				custom_instructions: null,
				statement: perStudent ? `Énoncé de ${studentId}` : 'Énoncé commun',
				correction: null,
				correction_visible: false,
				answers: null,
				section_id: null,
				is_essential: false
			}
		],
		preview_mode: 'student',
		preview_student_id: studentId,
		preview_student_name: null,
		per_student_copies: perStudent
	};
}

describe('copies par élève : l’aperçu avant d’imprimer', () => {
	let requested: URL[];

	function stubFetch(perStudent: boolean, type = 'assessment') {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string) => {
				const url = new URL(String(input));
				requested.push(url);
				return Response.json(view(url.searchParams.get('studentId'), perStudent, type));
			})
		);
	}

	const shown = () => document.querySelector('#pdf-svg-preview')?.textContent ?? '';

	beforeEach(() => {
		requested = [];
		compiled.sources = [];
		compiled.active = 0;
		compiled.maxActive = 0;
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('toutes les copies, dans l’ordre alphabétique, chacune à son nom', async () => {
		stubFetch(false);
		await render(CopiesPage, { props: { data: DATA } as never });
		await expect.poll(shown).toContain('Abricot Ondine');
		const text = shown();
		const order = ['Abricot Ondine', 'Écureuil Élise', 'Fougère Félix'].map((n) => text.indexOf(n));
		expect(order.every((position) => position >= 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
		// Affectation commune : une seule copie demandée, celle d'un élève de la liste
		expect(requested).toHaveLength(1);
		expect(requested[0].pathname).toBe(`/api/worksheets/assignments/${ASSIGNMENT_ID}/preview`);
		expect(requested[0].searchParams.get('studentId')).toBe(ONDINE);
	});

	it('affectation individualisée : la copie propre à chaque élève', async () => {
		stubFetch(true);
		await render(CopiesPage, { props: { data: DATA } as never });
		await expect.poll(shown).toContain('Fougère Félix');
		expect(requested.map((url) => url.searchParams.get('studentId')).sort()).toEqual(
			[ONDINE, ELISE, FELIX].sort()
		);
		for (const id of [ONDINE, ELISE, FELIX]) {
			expect(shown()).toContain(`Énoncé de ${id}`);
		}
	});

	it('choisir un élève : sa copie seule, à son nom', async () => {
		stubFetch(true);
		await render(CopiesPage, { props: { data: DATA } as never });
		await expect.poll(shown).toContain('Fougère Félix');

		await page.getByRole('button', { name: 'Copie à afficher' }).click();
		await page.getByRole('option', { name: /Écureuil Élise/ }).click();

		await expect.poll(shown).not.toContain('Abricot Ondine');
		expect(shown()).toContain('Écureuil Élise');
		expect(shown()).toContain(`Énoncé de ${ELISE}`);
		expect(shown()).not.toContain('Fougère Félix');
	});

	it('changer deux fois de copie très vite : une compilation à la fois, la dernière gagne', async () => {
		stubFetch(true);
		await render(CopiesPage, { props: { data: DATA } as never });
		await expect.poll(shown).toContain('Fougère Félix');

		await page.getByRole('button', { name: 'Copie à afficher' }).click();
		await page.getByRole('option', { name: /Écureuil Élise/ }).click();
		await page.getByRole('button', { name: 'Copie à afficher' }).click();
		await page.getByRole('option', { name: /Fougère Félix/ }).click();

		await expect.poll(shown).toContain(`Énoncé de ${FELIX}`);
		await expect.poll(() => compiled.active).toBe(0);
		expect(shown()).not.toContain('Écureuil Élise');
		expect(compiled.maxActive).toBe(1);
	});

	it('fiche d’exercices sans « Nom de l’élève » : aucun avertissement, le nom s’imprime', async () => {
		stubFetch(false, 'worksheet');
		await render(CopiesPage, { props: { data: DATA } as never });
		await expect.poll(shown).toContain('Énoncé commun');
		expect(document.body.textContent).not.toContain('n’imprime pas le nom des élèves');
	});

	it('aucun élève visé : rien à imprimer, aucune demande', async () => {
		stubFetch(false);
		await render(CopiesPage, { props: { data: { ...DATA, students: [] } } as never });
		await expect.poll(() => document.body.textContent).toContain('Aucun élève');
		expect(requested).toHaveLength(0);
	});

	it('affectation d’une autre fiche que celle de l’adresse : refus, aucun PDF', async () => {
		stubFetch(false);
		await render(CopiesPage, {
			props: { data: { ...DATA, worksheetId: '550e8400-e29b-41d4-a716-446655440099' } } as never
		});
		await expect
			.poll(() => document.body.textContent)
			.toContain('Cette affectation n’appartient pas à cette fiche');
		expect(compiled.sources).toHaveLength(0);
	});

	it('retour à la fiche, au-dessus du titre', async () => {
		stubFetch(false);
		await render(CopiesPage, { props: { data: DATA } as never });
		const back = page.getByRole('link', { name: 'Retour à la fiche' });
		await expect
			.element(back)
			.toHaveAttribute('href', `/dashboard/teacher/contenu/worksheets/${WORKSHEET_ID}`);
	});
});
