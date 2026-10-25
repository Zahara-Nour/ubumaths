/**
 * Catalogue du bloc `trig` (`/aide-ecriture/cercle-trigo`)
 *
 * Chaque exemple du catalogue se dessine : aucun n'est refusé par le parseur
 * (le mode interactif sans angle de départ l'était, chantier demo-debug, PR 6b).
 * Seules les erreurs fréquentes de la fiche montrent un message (catalogue des blocs).
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import { trigEntry } from '$lib/block-catalog/trig';

describe('/aide-ecriture/cercle-trigo', () => {
	it('dessine chacun de ses exemples', async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(screen.container.querySelector('.trig-indisponible')).toBeNull();
		expect(screen.container.querySelectorAll('.trig-erreur').length).toBe(
			trigEntry.mistakes.length
		);
		expect(screen.container.querySelectorAll('.trig-circle-container').length).toBeGreaterThan(10);
	});
});
