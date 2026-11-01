/**
 * Page d'aide d'un bloc (catalogue des blocs) : réglages, exemples dessinés,
 * erreurs fréquentes avec leur message, zone « Essayer » en direct.
 */
import { describe, it, expect } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import BlockHelpPage from '../BlockHelpPage.svelte';
import { horlogeEntry } from '$lib/block-catalog/horloge';
import { BLOCK_CATALOG } from '$lib/block-catalog';

describe('BlockHelpPage', () => {
	it('montre les réglages, un bouton Copier par exemple et les horloges', async () => {
		const screen = await render(BlockHelpPage, { entry: horlogeEntry });

		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Horloge à aiguilles' }))
			.toBeInTheDocument();
		// Tous les groupes : réglages de l'horloge, puis `placer` d'une question
		const keys = horlogeEntry.settingGroups.reduce((n, group) => n + group.settings.length, 0);
		expect(screen.container.querySelectorAll('tbody tr').length).toBe(keys);
		expect(page.getByRole('button', { name: 'Copier' }).elements()).toHaveLength(
			horlogeEntry.examples.length
		);
		// Les exemples se dessinent ; seules les erreurs fréquentes portent un message
		expect(screen.container.querySelectorAll('.horloge-erreur').length).toBe(
			horlogeEntry.mistakes.length
		);
		expect(screen.container.querySelector('.horloge-indisponible')).toBeNull();
	});

	it('affiche en direct le message d’erreur de la zone Essayer', async () => {
		const screen = await render(BlockHelpPage, { entry: horlogeEntry });
		const before = screen.container.querySelectorAll('.horloge-erreur').length;

		const field = page.getByLabelText('Texte du bloc');
		await userEvent.clear(field);
		await userEvent.fill(field, '```horloge\nheure: 9:30\n```');

		await expect
			.poll(() => screen.container.querySelectorAll('.horloge-erreur').length)
			.toBe(before + 1);
		await expect.element(page.getByText(/heure « 9:30 » non comprise/).last()).toBeVisible();
	});
});

describe.each(BLOCK_CATALOG)('fiche « $title »', (entry) => {
	it('se rend sans cadre « indisponible »', async () => {
		const screen = await render(BlockHelpPage, { entry });

		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent(entry.title);
		// Le cadre neutre est celui de l'élève : la page d'aide montre toujours le message
		expect(screen.container.querySelector('[class*="indisponible"]')).toBeNull();
	});
});
