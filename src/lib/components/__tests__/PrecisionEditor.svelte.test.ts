/**
 * PrecisionEditor — réglage de la précision d'une réponse numérique
 *
 * Écart L93 : ses deux listes sont des `MySelect` (règle 2 de CLAUDE.md), pas des
 * `<select>` natifs ; choisir un type ou un mode change bien la précision.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import PrecisionEditor from '../PrecisionEditor.svelte';

describe('PrecisionEditor', () => {
	it('aucune liste native : des listes au nom qui dit la valeur choisie', async () => {
		const screen = await render(PrecisionEditor, { precision: { type: 'none' } });

		expect(screen.container.querySelector('select')).toBeNull();
		await expect
			.element(page.getByRole('combobox', { name: /Type de précision : Aucune/ }))
			.toBeInTheDocument();
	});

	it('tolérance, puis mode relatif : « en % » apparaît', async () => {
		await render(PrecisionEditor, { precision: { type: 'none' } });

		await page.getByRole('combobox', { name: /Type de précision/ }).click();
		await page.getByRole('option', { name: /Tolérance/ }).click();
		await page.getByRole('combobox', { name: 'Mode de tolérance : absolue' }).click();
		await page.getByRole('option', { name: /Relative/ }).click();

		await expect
			.element(page.getByRole('combobox', { name: 'Mode de tolérance : relative' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('en %')).toBeInTheDocument();
		await page.screenshot({ path: '../../../../.captures/precision-editor-l93.png' });
	});
});
