/**
 * PdfPreview — langue d'impression et « Tout télécharger (.zip) »
 * ===============================================================
 *
 * La langue choisie dans l'aperçu ne change que le PDF : elle part de celle de
 * la fiche, et la fiche n'est pas touchée (ses élèves gardent sa langue).
 * Le zip : les 4 formes, en français puis en anglais, avec la même copie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { WorksheetWithRelations } from '$lib/types/worksheets';
import JSZip from 'jszip';
import PdfPreview from '../PdfPreview.svelte';

// ============================================================================
// MOCKS
// ============================================================================

const captured = vi.hoisted(() => ({
	generated: [] as { mode: string; language: unknown; inline: boolean; seed: unknown }[],
	zipFiles: [] as string[],
	failOn: null as string | null,
	warnings: [] as string[],
	errors: [] as string[]
}));

vi.mock('$lib/typst/generators', () => ({
	generateWorksheetTypst: (options: {
		mode: string;
		inlineCorrections?: boolean;
		config: { language?: unknown };
		instance: { seed?: unknown };
	}) => {
		const language = options.config.language;
		captured.generated.push({
			mode: options.mode,
			language,
			inline: options.inlineCorrections === true,
			seed: options.instance.seed
		});
		return `DOC-${options.mode}${options.inlineCorrections ? '+corrections' : ''}-${String(language)}`;
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
	compileTypstDocument: async (typst: string) => {
		if (captured.failOn === typst) throw new Error('compilation impossible');
		return {
			data: {
				pdf: new Uint8Array([37, 80, 68, 70]),
				svg: `<svg xmlns="http://www.w3.org/2000/svg"><text>${typst}</text></svg>`
			},
			typst,
			fallbackError: null
		};
	},
	fallbackWarning: (message: string) => `Police standard : ${message}`
}));

vi.mock('$lib/stores/toaster.svelte', () => ({
	toaster: {
		success: () => {},
		error: (message: string) => captured.errors.push(message),
		info: () => {},
		warning: (message: string) => captured.warnings.push(message)
	}
}));

// ============================================================================
// FIXTURES
// ============================================================================

function makeWorksheet(language: 'fr' | 'en'): WorksheetWithRelations {
	return {
		id: '808e2eee-162a-4493-81f6-8a945c81db3c',
		title: 'Variables aléatoires',
		description: null,
		config: { language },
		template: null,
		sections: [],
		exercises: []
	} as unknown as WorksheetWithRelations;
}

/** Nom du fichier qu'un bouton fait enregistrer */
async function downloadedFileName(button: string): Promise<string> {
	const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
	await page.getByRole('button', { name: button }).click();
	await expect.poll(() => click.mock.contexts.length).toBeGreaterThan(0);
	const anchor = click.mock.contexts[0] as HTMLAnchorElement;
	click.mockRestore();
	return anchor.download;
}

async function chooseLocale(label: string) {
	await page.getByRole('combobox', { name: "Langue d'impression" }).click();
	await page.getByRole('option', { name: label, exact: true }).click();
}

const preview = (container: HTMLElement) =>
	container.querySelector('#pdf-svg-preview')?.textContent ?? '';

// ============================================================================
// TESTS
// ============================================================================

describe('PdfPreview — langue d’impression', () => {
	beforeEach(() => {
		captured.generated = [];
		captured.zipFiles = [];
		captured.failOn = null;
		vi.restoreAllMocks();
		// Le vrai JSZip : seuls les noms des fichiers ajoutés sont relevés
		const file = JSZip.prototype.file;
		vi.spyOn(JSZip.prototype, 'file').mockImplementation(function (
			this: JSZip,
			...args: Parameters<typeof file>
		) {
			if (typeof args[0] === 'string' && args.length > 1) captured.zipFiles.push(args[0]);
			return file.apply(this, args);
		} as typeof file);
		captured.warnings = [];
		captured.errors = [];
	});

	it('part de la langue de la fiche ; English imprime en anglais, nom en _EN, fiche intacte', async () => {
		const worksheet = makeWorksheet('fr');
		const screen = await render(PdfPreview, { props: { worksheet } });
		await expect.poll(() => preview(screen.container)).toBe('DOC-worksheet-fr');
		expect(await downloadedFileName('Telecharger')).toBe('Variables_aleatoires.pdf');

		await chooseLocale('English');
		await expect.poll(() => preview(screen.container)).toBe('DOC-worksheet-en');
		expect(await downloadedFileName('Telecharger')).toBe('Variables_aleatoires_EN.pdf');
		// La fiche elle-même garde sa langue
		expect(worksheet.config).toEqual({ language: 'fr' });
	});

	it('fiche en anglais : l’aperçu part de l’anglais, et peut imprimer en français', async () => {
		const screen = await render(PdfPreview, { props: { worksheet: makeWorksheet('en') } });
		await expect.poll(() => preview(screen.container)).toBe('DOC-worksheet-en');

		await chooseLocale('Français');
		await expect.poll(() => preview(screen.container)).toBe('DOC-worksheet-fr');
		expect(await downloadedFileName('Telecharger')).toBe('Variables_aleatoires.pdf');
	});

	it('lecture publique : pas de choix de langue, celle de la fiche', async () => {
		const screen = await render(PdfPreview, {
			props: { worksheet: makeWorksheet('en'), variant: 'reader' }
		});
		await expect.poll(() => preview(screen.container)).toBe('DOC-worksheet-en');
		expect(screen.container.textContent).not.toContain("Langue d'impression");
		expect(screen.container.textContent).not.toContain('Tout télécharger');
	});
});

describe('PdfPreview — Tout télécharger (.zip)', () => {
	beforeEach(() => {
		captured.generated = [];
		captured.zipFiles = [];
		captured.failOn = null;
		vi.restoreAllMocks();
		// Le vrai JSZip : seuls les noms des fichiers ajoutés sont relevés
		const file = JSZip.prototype.file;
		vi.spyOn(JSZip.prototype, 'file').mockImplementation(function (
			this: JSZip,
			...args: Parameters<typeof file>
		) {
			if (typeof args[0] === 'string' && args.length > 1) captured.zipFiles.push(args[0]);
			return file.apply(this, args);
		} as typeof file);
		captured.warnings = [];
		captured.errors = [];
	});

	it('8 PDF : les 4 formes en français puis en anglais, même copie', async () => {
		const screen = await render(PdfPreview, { props: { worksheet: makeWorksheet('fr') } });
		await expect.poll(() => preview(screen.container)).toBe('DOC-worksheet-fr');
		captured.generated = [];

		expect(await downloadedFileName('Tout télécharger (.zip)')).toBe('Variables_aleatoires.zip');
		expect(captured.zipFiles).toEqual([
			'Variables_aleatoires.pdf',
			'Variables_aleatoires - Réponses.pdf',
			'Variables_aleatoires - Corrigé.pdf',
			'Variables_aleatoires - Fiche et corrigé.pdf',
			'Variables_aleatoires_EN.pdf',
			'Variables_aleatoires - Réponses_EN.pdf',
			'Variables_aleatoires - Corrigé_EN.pdf',
			'Variables_aleatoires - Fiche et corrigé_EN.pdf'
		]);
		expect(captured.generated.map((g) => `${g.mode}${g.inline ? '+c' : ''}/${g.language}`)).toEqual(
			[
				'worksheet/fr',
				'answers/fr',
				'correction/fr',
				'worksheet+c/fr',
				'worksheet/en',
				'answers/en',
				'correction/en',
				'worksheet+c/en'
			]
		);
		// Même graine partout : le corrigé correspond à la fiche
		expect(new Set(captured.generated.map((g) => g.seed)).size).toBe(1);
		expect(captured.errors).toEqual([]);
	});

	it('un PDF échoue : aucun zip, le message dit lequel', async () => {
		captured.failOn = 'DOC-correction-en';
		const screen = await render(PdfPreview, { props: { worksheet: makeWorksheet('fr') } });
		await expect.poll(() => preview(screen.container)).toBe('DOC-worksheet-fr');

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		await page.getByRole('button', { name: 'Tout télécharger (.zip)' }).click();
		await expect
			.poll(() => captured.errors)
			.toEqual(['Le zip n’a pas pu être fabriqué (Corrigé, anglais)']);
		expect(click).not.toHaveBeenCalled();
		click.mockRestore();
	});
});
