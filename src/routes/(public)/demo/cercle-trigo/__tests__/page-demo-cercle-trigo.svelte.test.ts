/**
 * Vitrine — le cercle trigonométrique (`/demo/cercle-trigo`)
 * Comportements validés par David le 2026-10-24 (docs/wip/demo-debug-progress.md, PR 6b).
 *
 * - un visiteur voit le titre, le retour vers `/demo` et 4 exemples, chacun rendu en cercle ;
 * - l'exemple π/6 seul : un angle, une ligne de tableau ;
 * - aucun texte de bloc `trig` (réservé au catalogue `/aide-ecriture/cercle-trigo`).
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

describe('/demo/cercle-trigo', () => {
	it('montre au visiteur le titre, le retour vers /demo et les 4 exemples rendus', async () => {
		const screen = await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Le cercle trigonométrique');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		expect(page.getByRole('heading', { level: 2 }).elements()).toHaveLength(4);
		expect(screen.container.querySelectorAll('.trig-circle-svg')).toHaveLength(4);
		expect(screen.container.querySelector('.trig-erreur')).toBeNull();
	});

	it("rend l'exemple π/6 avec un seul angle dans le tableau", async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		const cells = [...screen.container.querySelectorAll('.trig-table tbody td:first-child')];
		expect(cells.map((c) => c.textContent?.trim())).toContain('\\frac{\\pi}{6}');
	});

	it("n'affiche aucun texte de bloc trig", async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		const text = screen.container.textContent ?? '';
		expect(text).not.toMatch(/```|preset:|display:|equation:/);
		expect(screen.container.querySelector('details')).toBeNull();
	});
});
