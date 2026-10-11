import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BackLink from '../BackLink.svelte';

describe('BackLink', () => {
	// La destination est écrite dans le lien : clic molette, nouvel onglet et
	// rechargement mènent au même endroit, et le libellé l'annonce avant le clic.
	it('est un vrai lien vers la page parente, nommé par son libellé', async () => {
		const screen = await render(BackLink, {
			props: { href: '/dashboard/teacher/series', label: 'Retour aux séries' }
		});
		const link = screen.getByRole('link', { name: 'Retour aux séries' });
		await expect.element(link).toBeVisible();
		await expect.element(link).toHaveAttribute('href', '/dashboard/teacher/series');
	});

	it('« Quitter » mène aussi à la page parente', async () => {
		const screen = await render(BackLink, {
			props: { href: '/automaths/panier', label: 'Quitter', kind: 'quit' }
		});
		await expect
			.element(screen.getByRole('link', { name: 'Quitter' }))
			.toHaveAttribute('href', '/automaths/panier');
	});

	it("l'icône est décorative : seul le libellé est lu", async () => {
		const screen = await render(BackLink, {
			props: { href: '/dashboard/student/riddles', label: 'Retour aux énigmes' }
		});
		const svg = screen.container.querySelector('svg');
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
	});
});
