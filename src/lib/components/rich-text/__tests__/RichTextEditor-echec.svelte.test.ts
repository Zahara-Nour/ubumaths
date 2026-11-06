/**
 * Éditeur riche : la création de l'éditeur lève (extension en faute, contenu que
 * le schéma refuse…). Avant, l'éditeur restait muet sans rien dire.
 *
 * Fichier à part : le `vi.mock` vaut pour tout le fichier.
 */

import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RichTextEditor from '../RichTextEditor.svelte';

vi.mock('../editor-config', async (importOriginal) => {
	const original = await importOriginal<typeof import('../editor-config')>();
	return {
		...original,
		createEditorExtensions: () => {
			throw new Error('extension en faute');
		}
	};
});

describe('RichTextEditor — création impossible', () => {
	it('le dit, propose de recharger, barre inerte', async () => {
		const { container } = await render(RichTextEditor, {});
		await new Promise((r) => setTimeout(r, 100));

		const alerte = container.querySelector('[role="alert"]');
		expect(alerte?.textContent).toContain('L’éditeur n’a pas pu se charger');
		expect(alerte?.querySelector('button')?.textContent).toContain('Recharger la page');
		expect(container.querySelector('[data-chargement]')).toBeNull();
		expect(container.querySelector('[inert]')).not.toBeNull();
		// Le bouton markdown n'agirait sur rien : désactivé lui aussi
		expect(
			container.querySelector<HTMLButtonElement>('[aria-label="Éditer le markdown brut"]')?.disabled
		).toBe(true);
	});
});
