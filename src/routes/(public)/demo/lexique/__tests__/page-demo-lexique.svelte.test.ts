/**
 * Vitrine — le lexique (`/demo/lexique`)
 * Comportements validés par David le 2026-10-24 (docs/wip/demo-debug-progress.md, PR 6d).
 *
 * - un visiteur voit le titre, le retour vers `/demo`, une question et des phrases aux mots soulignés ;
 * - la page s'ouvre en 6e : les mots vus plus tard (« fonction ») ne sont pas soulignés ;
 * - le niveau choisi vaut pour toute la page, question comprise ;
 * - ni indice ni phrases d'essai de la page de test.
 */
import { describe, it, expect, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('$lib/dictionary/fetch-dictionary', async () => {
	const { REFERENCE_DICTIONARY: entries } =
		await import('../../../../../../tests/fixtures/lexique/dictionnaire-reference');
	return { fetchDictionary: async () => entries };
});

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

async function chooseGrade(label: string): Promise<void> {
	await page.getByRole('button', { name: 'Niveau de l’élève' }).click();
	await page.getByRole('option', { name: label, exact: true }).click();
}

describe('/demo/lexique', () => {
	it('montre au visiteur le titre, le retour vers /demo et les mots soulignés', async () => {
		const { container } = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('Le lexique');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		await expect.element(page.getByText(/Calcule l’aire d’un carré/).first()).toBeInTheDocument();
		await expect.poll(() => lexiconButtons(container)).toContain('aire');
		await expect.poll(() => lexiconButtons(container)).toContain('périmètre');
	});

	it('en 6e, « fonction » n’est pas encore soulignée ; en 3e, elle l’est', async () => {
		const { container } = await render(Page);
		// Les phrases sont repérées : l'absence qui suit prouve quelque chose
		await expect.poll(() => lexiconButtons(container)).toContain('périmètre');
		expect(lexiconButtons(container)).not.toContain('fonction');
		expect(lexiconButtons(container)).not.toContain('fonction exponentielle');

		await chooseGrade('3ème');
		await expect.poll(() => lexiconButtons(container)).toContain('fonction');
	});

	it('le niveau choisi s’applique à la question : « carré » prend son sens « puissance » en 5e', async () => {
		await render(Page);
		const carre = page.getByRole('button', { name: 'carré', exact: true }).first();
		await carre.click();
		await expect.element(page.getByText('(géométrie)').last()).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('(puissance)');
		await userEvent.keyboard('{Escape}');

		await chooseGrade('5ème');
		await carre.click();
		await expect.element(page.getByText('(puissance)').last()).toBeInTheDocument();
	});

	it('« fonction exponentielle » : exp en 1re spé, de base a en 1re générale', async () => {
		await render(Page);
		await chooseGrade('1ère spécialité maths');
		const terme = page.getByRole('button', { name: 'fonction exponentielle', exact: true });
		await terme.click();
		await expect.element(page.getByText('(exp)').last()).toBeInTheDocument();
		await userEvent.keyboard('{Escape}');

		await chooseGrade('1ère générale (maths spécifiques)');
		await terme.click();
		await expect.element(page.getByText('(de base a)').last()).toBeInTheDocument();
	});

	it('ni indice ni phrases d’essai de la page de test', async () => {
		const { container } = await render(Page);
		await expect.poll(() => lexiconButtons(container)).toContain('périmètre');
		expect(page.getByRole('button', { name: /Afficher l'indice/ }).elements()).toHaveLength(0);
		expect(container.textContent).not.toContain('urne');
		expect(container.textContent).not.toContain('page de test');
	});
});
