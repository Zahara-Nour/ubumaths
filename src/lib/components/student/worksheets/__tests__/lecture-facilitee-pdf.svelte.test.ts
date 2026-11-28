/**
 * Fiche de l'élève — case « Lecture facilitée » de ses PDF
 * ========================================================
 *
 * Chantier `lecture-facilitee`, D9 du 2026-11-19 : à côté du menu « Taille du
 * texte », enregistrée pour toutes ses fiches ; son PDF sort ensuite en
 * Luciole. Un enregistrement refusé remet la case comme avant.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { StudentWorksheetView } from '#lib/types/worksheets.ts';
import WorksheetHeader from '../WorksheetHeader.svelte';

// ============================================================================
// MOCKS — le PDF : on capte les options données au générateur
// ============================================================================

const captured = vi.hoisted(() => ({
	options: [] as { easyReading?: boolean; textSize?: string }[]
}));

vi.mock('#lib/worksheets/student-worksheet-typst.ts', () => ({
	generateStudentWorksheetTypst: (
		_worksheet: unknown,
		_ending: unknown,
		options: { easyReading?: boolean; textSize?: string }
	) => {
		captured.options.push(options);
		return 'TYPST';
	}
}));

vi.mock('#lib/typst/pdf-generator.ts', () => ({
	generateAndDownloadPdf: async (generate: () => string) => {
		generate();
		return { success: true, fallbackError: null };
	}
}));

// ============================================================================
// FIXTURES
// ============================================================================

const worksheet = {
	assignment_id: '4f2b1c8e-0d6a-4b7e-9a3c-2e5d7f9a1b3c',
	worksheet_id: '808e2eee-162a-4493-81f6-8a945c81db3c',
	title: 'Proportionnalité',
	description: null,
	type: 'worksheet',
	class_name: '5e Lune',
	show_corrections: false,
	read_only: false,
	exercises: [],
	sections: []
} as unknown as StudentWorksheetView;

/** Les corps des requêtes PUT envoyées à l'API des réglages */
function putBodies(fetchMock: ReturnType<typeof vi.fn>): unknown[] {
	return fetchMock.mock.calls
		.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT')
		.map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

// ============================================================================
// TESTS
// ============================================================================

describe('WorksheetHeader : lecture facilitée du PDF', () => {
	beforeEach(() => {
		captured.options = [];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('éteinte par défaut ; le PDF sort sans Luciole', async () => {
		vi.stubGlobal('fetch', vi.fn());
		await render(WorksheetHeader, { worksheet });

		await expect
			.element(page.getByRole('checkbox', { name: 'Lecture facilitée' }))
			.not.toBeChecked();
		await page.getByRole('button', { name: /PDF/i }).click();
		await vi.waitFor(() => expect(captured.options).toHaveLength(1));
		expect(captured.options[0].easyReading).toBe(false);
	});

	it('réglage enregistré : case cochée, PDF en Luciole', async () => {
		vi.stubGlobal('fetch', vi.fn());
		await render(WorksheetHeader, { worksheet, easyReading: true });

		await expect.element(page.getByRole('checkbox', { name: 'Lecture facilitée' })).toBeChecked();
		await page.getByRole('button', { name: /PDF/i }).click();
		await vi.waitFor(() => expect(captured.options).toHaveLength(1));
		expect(captured.options[0].easyReading).toBe(true);
	});

	it('cocher la case : enregistrée pour l’élève, puis PDF en Luciole', async () => {
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({ easyReading: true })));
		vi.stubGlobal('fetch', fetchMock);
		await render(WorksheetHeader, { worksheet });

		await page.getByRole('checkbox', { name: 'Lecture facilitée' }).click();
		await vi.waitFor(() => expect(putBodies(fetchMock)).toEqual([{ easyReading: true }]));

		await page.getByRole('button', { name: /PDF/i }).click();
		await vi.waitFor(() => expect(captured.options).toHaveLength(1));
		expect(captured.options[0].easyReading).toBe(true);
	});

	it('enregistrement refusé : la case revient comme avant', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 403 }));
		vi.stubGlobal('fetch', fetchMock);
		await render(WorksheetHeader, { worksheet });

		const checkbox = page.getByRole('checkbox', { name: 'Lecture facilitée' });
		await checkbox.click();
		await vi.waitFor(() => expect(putBodies(fetchMock)).toHaveLength(1));
		await expect.element(checkbox).not.toBeChecked();
	});
});
