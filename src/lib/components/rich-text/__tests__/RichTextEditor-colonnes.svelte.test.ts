/**
 * Menu « Colonnes de la liste » de la barre d'outils (2026-09-25)
 *
 * Geste réel : clic dans la liste, ouverture du menu, choix → le markdown porte
 * `:colonnes N` ; hors d'une liste, le menu est désactivé.
 */
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import RichTextEditor from '../RichTextEditor.svelte';

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ouvrir(markdown: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result = await render(RichTextEditor as any, { props: { markdownValue: markdown } });
	await attendre(200);
	result.container.querySelector<HTMLButtonElement>('[title="Insertion"]')?.click();
	await attendre(50);
	return result;
}

function menu(container: HTMLElement): HTMLButtonElement {
	const bouton = container.querySelector<HTMLButtonElement>('[aria-label="Colonnes de la liste"]');
	if (!bouton) throw new Error('bouton « Colonnes de la liste » absent');
	return bouton;
}

/** Clic réel dans le texte `mot` de l'éditeur (place le curseur). */
async function cliquerDans(container: HTMLElement, mot: string) {
	const cible = [...container.querySelectorAll('.ProseMirror p')].find((p) =>
		p.textContent?.includes(mot)
	) as HTMLElement | undefined;
	if (!cible) throw new Error(`« ${mot} » absent de l'éditeur`);
	await userEvent.click(cible);
	await attendre(50);
}

describe('RichTextEditor — colonnes de la liste', () => {
	it('curseur dans la liste : choisir 3 écrit `:colonnes 3` dans le markdown', async () => {
		const { container, component } = await ouvrir('Consigne.\n\n1. alpha\n2. beta\n3. gamma');
		await cliquerDans(container, 'beta');
		expect(menu(container).disabled).toBe(false);

		await userEvent.click(menu(container));
		await page.getByRole('menuitemradio', { name: '3 colonnes' }).click();
		await attendre(50);

		const md = (component as { getMarkdown: () => string }).getMarkdown();
		expect(md).toContain(':colonnes 3\n1. alpha');
		expect(container.querySelector('.ProseMirror ol')?.getAttribute('data-columns')).toBe('3');
	});

	it('« 1 (liste normale) » retire les colonnes', async () => {
		const { container, component } = await ouvrir(':colonnes 2\n1. alpha\n2. beta');
		await cliquerDans(container, 'alpha');
		await userEvent.click(menu(container));
		await page.getByRole('menuitemradio', { name: '1 (liste normale)' }).click();
		await attendre(50);
		expect((component as { getMarkdown: () => string }).getMarkdown()).not.toContain(':colonnes');
	});

	it('curseur hors d’une liste : menu désactivé', async () => {
		const { container } = await ouvrir('Consigne.\n\n1. alpha');
		await cliquerDans(container, 'Consigne');
		expect(menu(container).disabled).toBe(true);
	});
});
