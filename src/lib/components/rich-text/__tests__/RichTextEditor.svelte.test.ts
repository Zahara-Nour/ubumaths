import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RichTextEditor from '../RichTextEditor.svelte';

/**
 * Régression : `NumberLineExtension` était enregistrée dans `editor-config.ts`
 * (marqueur « v29 ») et son NodeView complet, mais la commande
 * `insertNumberLine` n'était appelée nulle part — la droite graduée était
 * inatteignable depuis l'éditeur. Aucun contenu de production n'en contenait,
 * ce qui l'avait rendue invisible.
 */
describe('RichTextEditor — insertion des nœuds enrichis', () => {
	/**
	 * Monte l'éditeur puis déplie la section « Insertion », repliée par défaut
	 * (`{#if showInsertion && openSection === 'insertion'}`) : c'est elle qui
	 * porte les boutons de nœuds enrichis.
	 */
	async function renderEditorWithInsertionOpen() {
		const result = render(RichTextEditor, {});
		await new Promise((r) => setTimeout(r, 200));

		const toggle = result.container.querySelector<HTMLButtonElement>('[title="Insertion"]');
		expect(toggle, 'le bouton de section « Insertion » doit exister').not.toBeNull();
		toggle?.click();
		await new Promise((r) => setTimeout(r, 50));

		return result;
	}

	function button(container: HTMLElement, label: string): HTMLElement | null {
		return container.querySelector(`[aria-label="${label}"]`);
	}

	it('propose un bouton pour la droite graduée', async () => {
		const { container } = await renderEditorWithInsertionOpen();

		expect(button(container, 'Insérer une droite graduée')).not.toBeNull();
	});

	it('propose toujours celui du tableau de variation', async () => {
		const { container } = await renderEditorWithInsertionOpen();

		expect(button(container, 'Insérer un tableau de variation')).not.toBeNull();
	});
});
