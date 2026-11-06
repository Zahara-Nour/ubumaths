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

		expect(container.querySelector('[role="status"]')).toBeNull();
		expect(container.querySelector('[inert]')).toBeNull();
		expect(container.querySelector('.ProseMirror')).not.toBeNull();
	});
});
