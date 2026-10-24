/**
 * Vitrine — les corrigés des fiches (`/demo/corriges`)
 * Comportements validés par David le 2026-10-24 (docs/wip/demo-debug-progress.md, PR 6e).
 *
 * - un visiteur voit le titre, le retour vers `/demo` et le texte qui explique le Corrigé ;
 * - la page montre une page de corrigé en image fixe, servie par `static/`, décrite par son `alt`.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import { CORRIGE_IMAGE } from '../corriges';

describe('/demo/corriges', () => {
	it('montre au visiteur le titre, le retour vers /demo et le texte', async () => {
		const screen = await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Les corrigés des fiches');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		expect(screen.container.textContent).toContain('écriture manuscrite');
	});

	it('affiche la page de corrigé en image fixe, décrite pour qui ne la voit pas', async () => {
		await render(Page);

		const image = page.getByRole('img', { name: /Page de corrigé/ });
		await expect.element(image).toHaveAttribute('src', CORRIGE_IMAGE.src);
		await expect.element(image).toHaveAttribute('alt', expect.stringContaining('cos x = √2/2'));
	});
});
