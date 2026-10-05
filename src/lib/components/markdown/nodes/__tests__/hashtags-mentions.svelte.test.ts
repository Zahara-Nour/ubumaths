/**
 * `#tag` et `@nom` dans un contenu Markdown.
 *
 * Régression (2026-10-05) : sans action fournie par la page, ils devenaient des
 * liens vers `/search?tag=…` et `/profile/…`, deux pages qui n'existent pas (404
 * en production). Sans action : simple texte. Avec action : un bouton.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';

const CONTENU = '# Titre #geometrie\n\nVoir #geometrie et @cotice.';

describe('hashtags et mentions', () => {
	it('sans action : du texte, aucun lien vers une page inexistante', async () => {
		const screen = await render(MarkdownRenderer, { props: { content: CONTENU } });
		const liens = [...screen.container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
		expect(liens.filter((h) => h?.startsWith('/search') || h?.startsWith('/profile'))).toEqual([]);
		expect(screen.container.textContent).toContain('#geometrie');
		expect(screen.container.textContent).toContain('@cotice');
	});

	it('avec action : un bouton qui l’appelle', async () => {
		const onHashtagClick = vi.fn();
		const onMentionClick = vi.fn();
		const screen = await render(MarkdownRenderer, {
			props: { content: 'Voir #geometrie et @cotice.', onHashtagClick, onMentionClick }
		});
		await screen.getByRole('button', { name: '#geometrie' }).click();
		await screen.getByRole('button', { name: '@cotice' }).click();
		expect(onHashtagClick).toHaveBeenCalledWith('geometrie');
		expect(onMentionClick).toHaveBeenCalledWith('cotice');
	});
});
