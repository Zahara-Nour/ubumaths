/**
 * Fenêtre d'un point du widget E : onglet « Erreurs » (chantier
 * `erreurs-frequentes`, PR 2), lu à la première ouverture seulement.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import PointDetailsModal from '../PointDetailsModal.svelte';
import { POINT_ERRORS_EMPTY, POINT_ERRORS_MESSAGE } from '$lib/types/point-errors';
import type { QuestionInstance } from '$lib/questions/types';

const CLASS = '1a2b3c4d-1111-4111-8111-111111111111';
const POINT = '2b3c4d5e-2222-4222-8222-222222222222';
const T1 = '4d5e6f70-4444-4444-8444-444444444441';

const props = {
	open: true,
	classId: CLASS,
	pointId: POINT,
	title: 'Additionner des fractions',
	students: [{ student_id: 's1', display_name: 'Alice', caption: '🆘 À remédier' }]
};

function errorsOf(students: string[]) {
	return {
		status: 'ok',
		templates: [
			{
				templateId: T1,
				title: 'Fractions de même dénominateur',
				capped: false,
				errors: {
					status: 'ok',
					answers: 3,
					withoutAnswer: 1,
					blanks: [],
					groups: [
						{
							instance: {
								templateId: T1,
								statement: 'Calcule 1/3 + 1/3',
								blanks: [{ type: 'text', expectedAnswer: '2/3' }],
								generatedAt: ''
							} as unknown as QuestionInstance,
							values: ['2/6'],
							status: 'incorrect',
							verdict: { unavailable: true, status: 'incorrect' },
							students
						}
					]
				}
			}
		]
	};
}

function stubFetch(body: unknown, ok = true) {
	const fetchMock = vi.fn(
		async (_url: string) => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })
	);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('PointDetailsModal', () => {
	it('s’ouvre sur les élèves concernés ; rien n’est lu avant l’onglet « Erreurs »', async () => {
		const fetchMock = stubFetch(errorsOf(['Bob']));
		await render(PointDetailsModal, props);
		await expect.element(page.getByText('Alice')).toBeVisible();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('onglet « Erreurs » : une lecture pour la classe et le point, modèles et groupes rendus', async () => {
		const fetchMock = stubFetch(errorsOf(['Bob', 'Chloé']));
		await render(PointDetailsModal, props);
		await userEvent.click(page.getByRole('tab', { name: 'Erreurs' }));
		await expect.element(page.getByText('Fractions de même dénominateur')).toBeVisible();
		await expect.element(page.getByText(/2 élèves ont répondu ainsi/)).toBeVisible();
		await expect.element(page.getByText('1 sans réponse')).toBeVisible();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(String(fetchMock.mock.calls[0][0])).toBe(
			`/api/teacher/classes/${CLASS}/analytics/point-errors?point=${POINT}`
		);
		// Revenir aux élèves puis rouvrir « Erreurs » ne relit pas
		await userEvent.click(page.getByRole('tab', { name: /concernés/ }));
		await userEvent.click(page.getByRole('tab', { name: 'Erreurs' }));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('aucune réponse écrite : le message du vide', async () => {
		stubFetch({ status: 'ok', templates: [] });
		await render(PointDetailsModal, props);
		await userEvent.click(page.getByRole('tab', { name: 'Erreurs' }));
		await expect.element(page.getByText(POINT_ERRORS_EMPTY)).toBeVisible();
	});

	it('lecture en échec : le message, les élèves restent', async () => {
		stubFetch({ status: 'error', message: POINT_ERRORS_MESSAGE }, false);
		await render(PointDetailsModal, props);
		await userEvent.click(page.getByRole('tab', { name: 'Erreurs' }));
		await expect.element(page.getByRole('alert')).toHaveTextContent(POINT_ERRORS_MESSAGE);
		await userEvent.click(page.getByRole('tab', { name: /concernés/ }));
		await expect.element(page.getByText('Alice')).toBeVisible();
	});

	it('nom d’élève rendu en texte, jamais interprété', async () => {
		stubFetch(errorsOf(['<b>Bob</b>']));
		await render(PointDetailsModal, props);
		await userEvent.click(page.getByRole('tab', { name: 'Erreurs' }));
		await expect.element(page.getByText('<b>Bob</b>')).toBeVisible();
	});
});
