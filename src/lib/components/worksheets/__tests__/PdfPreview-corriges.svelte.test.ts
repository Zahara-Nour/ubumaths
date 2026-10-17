/**
 * PdfPreview — les PDF du professeur : Fiche · Réponses · Corrigé · Fiche + corrigé
 * ===============================================================================
 *
 * Chaque PDF a son nom de fichier ; le Corrigé dont la compilation échoue
 * dans ses polices est recompilé dans la police standard, avec un avertissement.
 * La lecture publique (`reader`) n'a pas le choix : la fiche.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { WorksheetWithRelations } from '$lib/types/worksheets';
import PdfPreview from '../PdfPreview.svelte';

// ============================================================================
// MOCKS
// ============================================================================

const captured = vi.hoisted(() => ({
	modes: [] as string[],
	fallback: null as string | null,
	warnings: [] as string[]
}));

vi.mock('$lib/typst/generators', () => ({
	generateWorksheetTypst: (options: { mode: string; inlineCorrections?: boolean }) => {
		captured.modes.push(options.mode);
		// Fiche + corrigé : une fiche, corrections sous les énoncés
		return options.inlineCorrections ? `DOC-${options.mode}+corrections` : `DOC-${options.mode}`;
	}
}));

vi.mock('$lib/typst/compiler', () => ({
	getTypstCompiler: async () => ({
		svg: async () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
		pdf: async () => new Uint8Array([37, 80, 68, 70]),
		mapShadow: () => {},
		resetShadow: () => {}
	}),
	getCompilerError: () => null,
	resetCompilerState: () => {}
}));

vi.mock('$lib/typst/compiler/correction-fonts-compiler', () => ({
	compileTypstDocument: async (typst: string) => ({
		data: {
			pdf: new Uint8Array([37, 80, 68, 70]),
			svg: `<svg xmlns="http://www.w3.org/2000/svg"><text>${typst}</text></svg>`
		},
		typst,
		fallbackError: typst === 'DOC-correction' ? captured.fallback : null
	}),
	fallbackWarning: (message: string) => `Corrigé imprimé dans la police standard : ${message}`
}));

vi.mock('$lib/stores/toaster.svelte', () => ({
	toaster: {
		success: () => {},
		error: () => {},
		info: () => {},
		warning: (message: string) => captured.warnings.push(message)
	}
}));

// ============================================================================
// FIXTURES
// ============================================================================

const worksheet = {
	id: '808e2eee-162a-4493-81f6-8a945c81db3c',
	title: 'Variables aléatoires',
	description: null,
	config: {},
	template: null,
	sections: [],
	exercises: []
} as unknown as WorksheetWithRelations;

/** Nom du fichier que le bouton « Telecharger » fait enregistrer */
async function downloadedFileName(): Promise<string> {
	const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
	await page.getByRole('button', { name: 'Telecharger' }).click();
	const anchor = click.mock.contexts[0] as HTMLAnchorElement;
	click.mockRestore();
	return anchor.download;
}

async function choose(label: string) {
	await page.getByRole('button', { name: 'PDF à générer' }).click();
	await page.getByRole('option', { name: label, exact: true }).click();
}

// ============================================================================
// TESTS
// ============================================================================

describe('PdfPreview — Fiche, Réponses, Corrigé', () => {
	beforeEach(() => {
		captured.modes = [];
		captured.fallback = null;
		captured.warnings = [];
	});

	it('trois choix, chacun son PDF et son nom de fichier', async () => {
		const screen = await render(PdfPreview, { props: { worksheet } });
		const preview = () => screen.container.querySelector('#pdf-svg-preview')?.textContent ?? '';
		await expect.poll(preview).toBe('DOC-worksheet');
		expect(await downloadedFileName()).toBe('Variables_aleatoires.pdf');

		await choose('Réponses');
		await expect.poll(preview).toBe('DOC-answers');
		expect(await downloadedFileName()).toBe('Variables_aleatoires - Réponses.pdf');

		await choose('Corrigé');
		await expect.poll(preview).toBe('DOC-correction');
		expect(await downloadedFileName()).toBe('Variables_aleatoires - Corrigé.pdf');
		expect(captured.warnings).toEqual([]);
	});

	it('« Fiche + corrigé » : la fiche, corrections sous les énoncés, son nom de fichier', async () => {
		const screen = await render(PdfPreview, { props: { worksheet } });
		const preview = () => screen.container.querySelector('#pdf-svg-preview')?.textContent ?? '';
		await expect.poll(preview).toBe('DOC-worksheet');

		await choose('Fiche + corrigé');
		await expect.poll(preview).toBe('DOC-worksheet+corrections');
		expect(await downloadedFileName()).toBe('Variables_aleatoires - Fiche et corrigé.pdf');
	});

	it('Corrigé recompilé dans la police standard : avertissement', async () => {
		captured.fallback = 'unknown font family: chiphre math';
		await render(PdfPreview, { props: { worksheet } });
		await expect.poll(() => captured.modes).toContain('worksheet');
		await choose('Corrigé');
		await expect
			.poll(() => captured.warnings)
			.toEqual(['Corrigé imprimé dans la police standard : unknown font family: chiphre math']);
	});

	it('lecture publique : pas de choix, la fiche seulement', async () => {
		const screen = await render(PdfPreview, { props: { worksheet, variant: 'reader' } });
		await expect.poll(() => captured.modes).toContain('worksheet');
		expect(screen.container.textContent).not.toContain('PDF à générer');
		expect(screen.container.textContent).not.toContain('Fiche + corrigé');
		expect(captured.modes.every((mode) => mode === 'worksheet')).toBe(true);
	});
});
