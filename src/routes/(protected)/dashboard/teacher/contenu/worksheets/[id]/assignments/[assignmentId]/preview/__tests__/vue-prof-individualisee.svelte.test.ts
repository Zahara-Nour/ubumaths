/**
 * Aperçu « vue prof » d'une affectation individualisée (décision de David, D6)
 * ===========================================================================
 *
 * Chaque élève a sa version (`per_student_copies`) : la vue prof s'appuie sur
 * la copie d'un élève choisi dans une liste (premier par défaut), avertit à
 * l'écran, et son PDF imprime l'avertissement en tête, sans nom d'élève.
 * Affectation commune : rien ne change (pas de liste, pas d'avertissement).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const pdf = vi.hoisted(() => ({ sources: [] as string[], names: [] as string[] }));
vi.mock('$lib/typst/pdf-generator', () => ({
	generateAndDownloadPdf: async (generate: () => string, filename: string) => {
		pdf.sources.push(generate());
		pdf.names.push(filename);
		return { success: true };
	}
}));

import PreviewPage from '../+page.svelte';

const NOTICE = 'Chaque élève a sa propre version : consulte ta correction personnelle.';
const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const LEA = '550e8400-e29b-41d4-a716-446655440501';
const TOM = '550e8400-e29b-41d4-a716-446655440502';

function view(copyOf: string | null, perStudent: boolean) {
	return {
		assignment_id: ASSIGNMENT_ID,
		worksheet_id: WORKSHEET_ID,
		title: 'Fiche',
		language: 'fr',
		description: null,
		type: 'worksheet',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: true,
		class_name: null,
		read_only: false,
		sections: [],
		exercises: [
			{
				id: '00000000-0000-4000-8000-00000000010a',
				exercise_id: '00000000-0000-4000-8000-00000000020a',
				title: `Titre ${copyOf === LEA ? 'copie Léa' : copyOf === TOM ? 'copie Tom' : 'classe'}`,
				position: 1,
				points: null,
				custom_instructions: null,
				statement: 'Énoncé',
				correction: 'Corrigé',
				correction_visible: true,
				answers: null,
				section_id: null,
				is_essential: false
			}
		],
		preview_mode: 'teacher',
		preview_student_id: null,
		preview_student_name: null,
		per_student_copies: perStudent
	};
}

const DATA = {
	worksheetId: WORKSHEET_ID,
	assignmentId: ASSIGNMENT_ID,
	// Ordre de la base : la liste est triée par nom à l'écran (Léa Martin, puis Tom Durand… triés)
	students: [
		{ id: TOM, first_name: 'Tom', last_name: 'Durand', class_name: '2nde A' },
		{ id: LEA, first_name: 'Léa', last_name: 'Martin', class_name: '2nde A' }
	],
	initialStudentId: null
};

describe('aperçu vue prof : affectation dont chaque élève a sa version', () => {
	let requested: URL[];

	function stubFetch(perStudent: boolean) {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string) => {
				const url = new URL(String(input));
				requested.push(url);
				return Response.json(view(url.searchParams.get('copyOf'), perStudent));
			})
		);
	}

	beforeEach(() => {
		requested = [];
		pdf.sources = [];
		pdf.names = [];
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('copie du premier élève de la liste par défaut, avertissement à l’écran', async () => {
		stubFetch(true);
		await render(PreviewPage, { props: { data: DATA } as never });
		await expect.poll(() => document.body.textContent).toContain('Titre copie Léa');
		expect(requested.at(-1)?.searchParams.get('copyOf')).toBe(LEA);
		expect(requested.at(-1)?.searchParams.get('studentId')).toBeNull();
		expect(document.body.textContent).toContain('Chaque élève a sa propre version');
		expect(document.body.textContent).toContain('Copie de référence');
	});

	it('PDF de la vue prof : avertissement en tête, aucun nom d’élève', async () => {
		stubFetch(true);
		await render(PreviewPage, { props: { data: DATA } as never });
		await expect.poll(() => document.body.textContent).toContain('Titre copie Léa');
		await page.getByRole('button', { name: /PDF/ }).first().click();
		await page.getByRole('button', { name: 'Avec corrigé' }).click();
		await expect.poll(() => pdf.sources.length).toBe(1);
		expect(pdf.sources[0]).toContain(NOTICE);
		expect(pdf.sources[0]).not.toContain('Martin');
		expect(pdf.names[0]).not.toContain('Martin');
	});

	it('affectation commune : copie de la classe, ni liste ni avertissement', async () => {
		stubFetch(false);
		await render(PreviewPage, { props: { data: DATA } as never });
		await expect.poll(() => document.body.textContent).toContain('Titre classe');
		expect(requested).toHaveLength(1);
		expect(document.body.textContent).not.toContain('Copie de référence');
		expect(document.body.textContent).not.toContain('Chaque élève a sa propre version');
	});
});
