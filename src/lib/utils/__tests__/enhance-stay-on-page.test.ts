/**
 * `stayOnPage` : un formulaire amélioré reste sur la page affichée
 * ================================================================
 *
 * Depuis SvelteKit 3, `update()` sans option navigue vers l'adresse de l'action et perd la
 * recherche de la page. `stayOnPage` doit appeler `update` UNE fois, avec `navigate: false`, et
 * garder les autres réglages par défaut (remise à zéro du formulaire, relecture des données).
 */

import { describe, it, expect, vi } from 'vitest';
import { stayOnPage } from '#lib/utils/enhance-stay-on-page.ts';

// Types
type SubmitInput = Parameters<typeof stayOnPage>[0];
type Callback = (opts: { update: (o?: unknown) => Promise<void> }) => Promise<void>;

// Functions
async function submitWith(update: (o?: unknown) => Promise<void>): Promise<void> {
	const callback = (await stayOnPage({} as SubmitInput)) as unknown as Callback;
	await callback({ update });
}

describe('stayOnPage', () => {
	it('appelle update une seule fois, avec navigate: false et rien d’autre', async () => {
		const update = vi.fn(async () => undefined);
		await submitWith(update);
		expect(update).toHaveBeenCalledTimes(1);
		expect(update).toHaveBeenCalledWith({ navigate: false });
	});

	it('attend la fin de update avant de rendre la main', async () => {
		let fini = false;
		await submitWith(async () => {
			await Promise.resolve();
			fini = true;
		});
		expect(fini).toBe(true);
	});
});
