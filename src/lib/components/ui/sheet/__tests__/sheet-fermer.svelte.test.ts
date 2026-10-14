/**
 * La croix d'un panneau latéral se nomme « Fermer » pour les lecteurs d'écran
 * (« Close » jusqu'au 2026-10-14 ; même correction que `ui/dialog`, #1385).
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import OpenSheetHarness from './OpenSheetHarness.svelte';

describe('le panneau latéral', () => {
	it('a une croix nommée « Fermer »', async () => {
		await render(OpenSheetHarness);

		await expect.element(page.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
	});
});
