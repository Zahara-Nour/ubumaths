/**
 * Éditeur riche : état de chargement et échec de création.
 *
 * Avant l'hydratation, la barre d'outils rendue par le serveur s'affichait sans
 * éditeur derrière : clics et frappe sans effet, plusieurs secondes sur une
 * connexion lente (essai de David par tunnel SSH, 2026-11-06). Et si la création
 * de l'éditeur levait, il restait muet sans rien dire.
 */

import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RichTextEditor from '../RichTextEditor.svelte';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('RichTextEditor — chargement', () => {
	it('éditeur créé : plus d’indicateur, barre active', async () => {
		const { container } = await render(RichTextEditor, {});
		await pause(100);

		expect(container.querySelector('[data-chargement]')).toBeNull();
		// Région annoncée toujours présente, vidée une fois l'éditeur prêt
		expect(container.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
		expect(container.querySelector('[inert]')).toBeNull();
		expect(
			container.querySelector<HTMLButtonElement>('[aria-label="Éditer le markdown brut"]')?.disabled
		).toBe(false);
		expect(container.querySelector('.ProseMirror')).not.toBeNull();
	});

	it('isReady : faux avant la création de l’éditeur, vrai après (cahier de texte)', async () => {
		// Le cahier lit `getMarkdown()` à l'envoi. Avant la création, `getMarkdown()`
		// rend '' : sans `isReady`, un clic trop tôt enregistrait une séance vide.
		const { component } = await render(RichTextEditor, { markdownValue: 'Texte **gardé**' });
		expect(component.isReady()).toBe(false);
		expect(component.getMarkdown()).toBe('');
		await pause(100);
		expect(component.isReady()).toBe(true);
		expect(component.getMarkdown()).toContain('Texte **gardé**');
	});
});
