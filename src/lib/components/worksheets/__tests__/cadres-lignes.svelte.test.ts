/**
 * Réglage des cadres de réponse en lignes, dans la liste des exercices (ADR 0030, lot 4)
 * =====================================================================================
 *
 * Écran validé par David : sous chaque exercice, seulement avec « réponses sur
 * le sujet » ; une ligne par question (ou « Cadre » en mode exercice), stepper
 * −/+, « auto » tant que non modifié, « modifié ↺ » sinon (↺ remet en auto),
 * 0 ligne = pas de cadre. Sauvegarde à chaque changement, retour arrière si
 * elle échoue.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExerciseList from '../ExerciseList.svelte';
import type { AnswerFrameLines, WorksheetExerciseWithExercise } from '$lib/types/worksheets';

const FICHE = '808e2eee-162a-4493-81f6-8a945c81db3c';
const EXO = '02a099dd-ff75-4a75-835b-056cd3565f8f';
const WE = '5b1f3c0e-7d2a-4f7e-9a51-0c2d6b7e8f90';

/** Deux questions, deux réponses courtes : deux petits cadres, 3 lignes chacun */
function exercise(lines: AnswerFrameLines | null = null): WorksheetExerciseWithExercise {
	return {
		id: WE,
		worksheet_id: FICHE,
		exercise_id: EXO,
		section_id: null,
		position: 1,
		points: null,
		variant_mode: 'none',
		variant_config: {},
		custom_instructions: null,
		correction_visible: false,
		variation_index: null,
		is_essential: false,
		answer_frame_lines: lines,
		created_at: '2026-10-15T10:00:00Z',
		updated_at: '2026-10-15T10:00:00Z',
		exercise: {
			id: EXO,
			title: 'Deux questions',
			variations: [
				{ label: 'guided', statement_md: '1. Calcule.\n2. Conclus.', solution_md: '1. $3$\n2. $4$' }
			]
		}
	} as unknown as WorksheetExerciseWithExercise;
}

interface Options {
	lines?: AnswerFrameLines | null;
	answersOnSheet?: boolean;
	mode?: 'question' | 'exercise';
}

/** La liste, avec un parent qui applique les changements comme la page */
async function show({ lines = null, answersOnSheet = true, mode = 'question' }: Options = {}) {
	const changes: WorksheetExerciseWithExercise[][] = [];
	const screen = await render(ExerciseList, {
		props: {
			worksheetId: FICHE,
			exercises: [exercise(lines)],
			sections: [],
			answersOnSheet,
			answerFrameMode: mode,
			frameSaveDelayMs: 0,
			onExercisesChange: async (next: WorksheetExerciseWithExercise[]) => {
				changes.push(next);
				await screen.rerender({ exercises: next });
			}
		}
	});
	return { screen, changes };
}

function mockFetch(ok: boolean) {
	const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
		const body = JSON.parse(String(init?.body ?? '{}'));
		return new Response(
			JSON.stringify(
				ok ? { exercise: { ...exercise(), ...body } } : { message: 'Refusé par le serveur' }
			),
			{ status: ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
		);
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('cadres de réponse en lignes', () => {
	it('sans « réponses sur le sujet » : aucun bloc', async () => {
		await show({ answersOnSheet: false });
		await expect.element(page.getByText('Deux questions')).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('Cadres de réponse');
	});

	it('une ligne par question, estimation de départ, « auto »', async () => {
		await show();
		await expect.element(page.getByText('Cadres de réponse')).toBeInTheDocument();
		const rows = page.getByTestId('cadre-ligne');
		await expect.element(rows.nth(0)).toHaveTextContent(/Question 1.*3 lignes.*auto/);
		await expect.element(rows.nth(1)).toHaveTextContent(/Question 2.*3 lignes.*auto/);
	});

	it('+ : 4 lignes, « modifié », sauvegardé ; ↺ remet en auto', async () => {
		const fetchMock = mockFetch(true);
		await show();
		await page.getByRole('button', { name: 'Une ligne de plus, question 1' }).click();
		const first = page.getByTestId('cadre-ligne').nth(0);
		await expect.element(first).toHaveTextContent(/4 lignes.*modifié/);
		await expect.poll(() => fetchMock.mock.calls.length).toBe(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`/api/worksheets/${FICHE}/exercises/${WE}`);
		expect(JSON.parse(String(init?.body))).toEqual({
			answer_frame_lines: { questions: [4, null] }
		});

		await page.getByRole('button', { name: 'Remettre en automatique, question 1' }).click();
		await expect.element(first).toHaveTextContent(/3 lignes.*auto/);
		await expect.poll(() => fetchMock.mock.calls.length).toBe(2);
		expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
			answer_frame_lines: null
		});
	});

	it('0 ligne : « pas de cadre », et − n’ira pas plus bas', async () => {
		mockFetch(true);
		await show({ lines: { questions: [1, null] } });
		const minus = page.getByRole('button', { name: 'Une ligne de moins, question 1' });
		await minus.click();
		await expect
			.element(page.getByTestId('cadre-ligne').nth(0))
			.toHaveTextContent(/pas de cadre.*modifié/);
		await expect.element(minus).toBeDisabled();
	});

	it('mode exercice : une seule ligne « Cadre »', async () => {
		await show({ mode: 'exercise', lines: { exercise: 7 } });
		const rows = page.getByTestId('cadre-ligne');
		await expect.element(rows.nth(0)).toHaveTextContent(/Cadre.*7 lignes.*modifié/);
		expect(document.body.textContent).not.toContain('Question 1');
	});

	it('questions changées : avertissement, tout en auto', async () => {
		await show({ lines: { questions: [9, 9, 9] } });
		await expect
			.element(page.getByText('Les questions de l’exercice ont changé', { exact: false }))
			.toBeInTheDocument();
		await expect
			.element(page.getByTestId('cadre-ligne').nth(0))
			.toHaveTextContent(/3 lignes.*auto/);
	});

	it('échec de la sauvegarde : retour à la valeur d’avant', async () => {
		mockFetch(false);
		const { changes } = await show();
		await page.getByRole('button', { name: 'Une ligne de plus, question 2' }).click();
		await expect.poll(() => changes.length).toBe(2);
		expect(changes[0][0].answer_frame_lines).toEqual({ questions: [null, 4] });
		expect(changes[1][0].answer_frame_lines).toBeNull();
		await expect
			.element(page.getByTestId('cadre-ligne').nth(1))
			.toHaveTextContent(/3 lignes.*auto/);
	});
});
