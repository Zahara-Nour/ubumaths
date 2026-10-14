/**
 * Corrigé de classe d'une affectation individualisée : choisir l'élève (D6)
 * ========================================================================
 *
 * Quand chaque élève a sa version (valeurs ou ordre), la route du corrigé
 * demande l'élève (`needs_student`). Le gestionnaire propose alors la liste
 * des élèves de l'affectation (le premier par défaut) ; le corrigé est
 * produit d'après la copie de l'élève choisi. Affectation commune : le
 * corrigé part tout de suite, comme avant.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { WorksheetAssignmentRow } from '$lib/types/worksheets';

const compiled = vi.hoisted(() => ({ sources: [] as string[] }));
vi.mock('$lib/typst/compiler/correction-fonts-compiler', () => ({
	compileTypstDocument: async (source: string) => {
		compiled.sources.push(source);
		return { data: { pdf: new Uint8Array([1]) } };
	},
	fallbackWarning: () => ''
}));

import CorrectionManager from '../CorrectionManager.svelte';

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const LEA = '550e8400-e29b-41d4-a716-446655440501';
const ADAM = '550e8400-e29b-41d4-a716-446655440502';

const ASSIGNMENT = {
	id: ASSIGNMENT_ID,
	worksheet_id: WORKSHEET_ID,
	correction_release_mode: 'manual',
	correction_release_at: null
} as unknown as WorksheetAssignmentRow;

describe('gestionnaire de corrections : corrigé de classe', () => {
	let correctionRequests: URL[];

	function stubFetch(
		perStudent: boolean,
		students: 'ok' | 'empty' | 'error' | (() => 'ok' | 'error') = 'ok'
	) {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string) => {
				const url = new URL(String(input), 'http://localhost');
				if (url.pathname.endsWith('/correction')) {
					correctionRequests.push(url);
					if (perStudent && !url.searchParams.get('studentId')) {
						return Response.json({ success: true, needs_student: true, per_student_copies: true });
					}
					return Response.json({
						success: true,
						typst: `CORRIGE:${url.searchParams.get('studentId') ?? 'classe'}`,
						per_student_copies: perStudent
					});
				}
				const studentsState = typeof students === 'function' ? students() : students;
				if (url.pathname.endsWith('/students') && studentsState === 'error') {
					return Response.json({ message: 'panne' }, { status: 500 });
				}
				if (url.pathname.endsWith('/students') && studentsState === 'empty') {
					return Response.json({ students: [] });
				}
				if (url.pathname.endsWith('/students')) {
					// Ordre de la base : la liste est triée par nom à l'affichage
					return Response.json({
						students: [
							{ id: LEA, first_name: 'Léa', last_name: 'Martin', class_name: '2nde A' },
							{ id: ADAM, first_name: 'Adam', last_name: 'Bernard', class_name: '2nde A' }
						]
					});
				}
				if (url.pathname.endsWith('/exercises')) return Response.json({ exercises: [] });
				return Response.json({ exercise_settings: [] });
			})
		);
	}

	beforeEach(() => {
		correctionRequests = [];
		compiled.sources = [];
		vi.stubGlobal('open', vi.fn());
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('copies propres à chaque élève : liste des élèves, premier par défaut, corrigé de sa copie', async () => {
		stubFetch(true);
		await render(CorrectionManager, {
			props: { assignment: ASSIGNMENT, worksheetId: WORKSHEET_ID }
		});
		await page.getByRole('button', { name: 'PDF' }).click();

		// La liste s'ouvre, triée par nom : Adam Bernard d'abord, présélectionné
		await expect
			.poll(() => document.body.textContent)
			.toContain('Chaque élève a sa propre version');
		await expect.poll(() => document.body.textContent).toContain('Adam Bernard');
		expect(compiled.sources).toHaveLength(0);

		await page.getByRole('button', { name: 'Produire le corrigé' }).click();
		await expect.poll(() => compiled.sources).toEqual([`CORRIGE:${ADAM}`]);
		expect(correctionRequests.at(-1)?.searchParams.get('studentId')).toBe(ADAM);
	});

	it('copie commune : le corrigé part tout de suite, sans liste', async () => {
		stubFetch(false);
		await render(CorrectionManager, {
			props: { assignment: ASSIGNMENT, worksheetId: WORKSHEET_ID }
		});
		await page.getByRole('button', { name: 'PDF' }).click();
		await expect.poll(() => compiled.sources).toEqual(['CORRIGE:classe']);
		expect(document.body.textContent).not.toContain('Produire le corrigé');
	});

	it('texte du choix : « valeurs ou ordre des exercices » (pas le mot du lore des fiches)', async () => {
		stubFetch(true);
		await render(CorrectionManager, {
			props: { assignment: ASSIGNMENT, worksheetId: WORKSHEET_ID }
		});
		await page.getByRole('button', { name: 'PDF' }).click();
		await expect.poll(() => document.body.textContent).toContain('valeurs ou ordre des exercices');
		expect(document.body.textContent).not.toContain('Corvée');
	});

	it('liste des élèves en panne : message d’erreur et « Réessayer », pas « aucun élève »', async () => {
		let state: 'ok' | 'error' = 'error';
		stubFetch(true, () => state);
		await render(CorrectionManager, {
			props: { assignment: ASSIGNMENT, worksheetId: WORKSHEET_ID }
		});
		await page.getByRole('button', { name: 'PDF' }).click();
		await expect
			.poll(() => document.body.textContent)
			.toContain('Impossible de charger la liste des élèves');
		expect(document.body.textContent).not.toContain('Aucun élève dans cette affectation');
		state = 'ok';
		await page.getByRole('button', { name: 'Réessayer' }).click();
		await expect.poll(() => document.body.textContent).toContain('Adam Bernard');
	});

	it('affectation sans élève : « Aucun élève dans cette affectation », sans « Réessayer »', async () => {
		stubFetch(true, 'empty');
		await render(CorrectionManager, {
			props: { assignment: ASSIGNMENT, worksheetId: WORKSHEET_ID }
		});
		await page.getByRole('button', { name: 'PDF' }).click();
		await expect
			.poll(() => document.body.textContent)
			.toContain('Aucun élève dans cette affectation');
		expect(document.body.textContent).not.toContain('Réessayer');
		expect(compiled.sources).toHaveLength(0);
	});
});
