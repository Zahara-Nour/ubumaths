/**
 * Page d'une affectation : « Imprimer une copie par élève » (ADR 0030, lot 5)
 * ==========================================================================
 *
 * Le bouton mène aux copies par élève de CETTE affectation ; il n'est proposé
 * que si l'affectation vise des élèves. Noms fictifs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

vi.mock('$lib/typst/pdf-generator', () => ({
	generateAndDownloadPdf: async () => ({ success: true })
}));

import PreviewPage from '../+page.svelte';

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const ONDINE = '550e8400-e29b-41d4-a716-446655440601';

const VIEW = {
	assignment_id: ASSIGNMENT_ID,
	worksheet_id: WORKSHEET_ID,
	title: 'Fractions',
	language: 'fr',
	description: null,
	type: 'assessment',
	instructions: null,
	available_from: null,
	closes_at: null,
	show_corrections: true,
	class_name: null,
	read_only: false,
	sections: [],
	exercises: [],
	preview_mode: 'teacher',
	preview_student_id: null,
	preview_student_name: null,
	per_student_copies: false
};

function data(students: { id: string; first_name: string; last_name: string }[]) {
	return {
		worksheetId: WORKSHEET_ID,
		assignmentId: ASSIGNMENT_ID,
		students: students.map((s) => ({ ...s, class_name: '3e Lune' })),
		initialStudentId: null,
		discardedStudent: false
	};
}

describe('page d’une affectation : copies par élève', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(VIEW))
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('le bouton mène aux copies par élève de cette affectation', async () => {
		render(PreviewPage, {
			props: { data: data([{ id: ONDINE, first_name: 'Ondine', last_name: 'Abricot' }]) } as never
		});
		const link = page.getByRole('link', { name: 'Imprimer une copie par élève' });
		await expect
			.element(link)
			.toHaveAttribute(
				'href',
				`/dashboard/teacher/contenu/worksheets/${WORKSHEET_ID}/assignments/${ASSIGNMENT_ID}/copies`
			);
	});

	it('aucun élève visé : pas de bouton', async () => {
		render(PreviewPage, { props: { data: data([]) } as never });
		await expect.poll(() => document.body.textContent).toContain('Fractions');
		expect(document.body.textContent).not.toContain('Imprimer une copie par élève');
	});
});
