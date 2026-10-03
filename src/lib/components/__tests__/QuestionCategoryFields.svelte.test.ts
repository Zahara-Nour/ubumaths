/**
 * Catégorisation de l'éditeur de modèle : Domaine filtré par Thème, Sous-domaine
 * par Thème + Domaine, « Ajouter… » ajoute ET sélectionne la nouvelle valeur.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import QuestionCategoryFields from '../QuestionCategoryFields.svelte';
import type { CategoryEntry } from '$lib/questions/category-options';

const ENTRIES: CategoryEntry[] = [
	{ theme: 'Suites', domain: 'Définition', subdomain: 'Explicite' },
	{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' },
	{ theme: 'Suites', domain: 'Arithmétiques', subdomain: 'Terme général' },
	{ theme: 'Fractions', domain: 'Définition', subdomain: 'Simplifier' },
	{ theme: 'Fractions', domain: 'Comparer', subdomain: null }
];

async function renderFields(props: { theme?: string; domain?: string; subdomain?: string }) {
	// Décor réel : l'éditeur vit dans <main>
	const main = document.body.appendChild(document.createElement('main'));
	return await render(QuestionCategoryFields, {
		target: main,
		props: { entries: ENTRIES, theme: '', domain: '', subdomain: '', ...props }
	});
}

async function optionNames(): Promise<string[]> {
	const options = page.getByRole('option').elements();
	return options.map((o) => o.textContent?.replace('✓', '').trim() ?? '');
}

describe('QuestionCategoryFields', () => {
	it('Sous-domaine : seulement ceux du thème + domaine choisis', async () => {
		await renderFields({ theme: 'Suites', domain: 'Définition', subdomain: 'Explicite' });

		await page.getByRole('button', { name: /^Sous-domaine/ }).click();
		await expect.element(page.getByRole('option', { name: 'Récurrence' })).toBeVisible();
		expect(await optionNames()).toEqual(['Aucun', 'Explicite', 'Récurrence', '➕ Ajouter…']);
	});

	it('Domaine : seulement ceux du thème choisi', async () => {
		await renderFields({ theme: 'Fractions', domain: 'Comparer' });

		await page.getByRole('button', { name: /^Domaine/ }).click();
		await expect.element(page.getByRole('option', { name: 'Comparer' })).toBeVisible();
		expect(await optionNames()).toEqual(['Comparer', 'Définition', '➕ Ajouter…']);
	});

	it('« Ajouter… » ajoute « Méthode » et la sélectionne', async () => {
		await renderFields({ theme: 'Suites', domain: 'Définition', subdomain: 'Explicite' });

		await page.getByRole('button', { name: /^Sous-domaine/ }).click();
		await page.getByRole('option', { name: '➕ Ajouter…' }).click();
		await page.getByLabelText('Nom de la catégorie').fill('Méthode');
		await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

		await expect
			.element(page.getByRole('button', { name: 'Sous-domaine : Méthode' }))
			.toBeVisible();

		// Toujours disponible ensuite dans la liste
		await page.getByRole('button', { name: 'Sous-domaine : Méthode' }).click();
		await expect.element(page.getByRole('option', { name: 'Méthode' })).toBeVisible();
		await userEvent.keyboard('{Escape}');
	});

	it('« Ajouter… » puis Annuler : la valeur précédente reste affichée', async () => {
		await renderFields({ theme: 'Suites', domain: 'Définition', subdomain: 'Explicite' });

		await page.getByRole('button', { name: /^Sous-domaine/ }).click();
		await page.getByRole('option', { name: '➕ Ajouter…' }).click();
		await page.getByRole('button', { name: 'Annuler' }).click();

		const trigger = page.getByRole('button', { name: 'Sous-domaine : Explicite' });
		await expect.element(trigger).toHaveTextContent('Explicite');
	});

	it('changer de thème garde le domaine incompatible, visible et signalé', async () => {
		await renderFields({ theme: 'Suites', domain: 'Arithmétiques' });

		await page.getByRole('button', { name: /^Thème/ }).click();
		await page.getByRole('option', { name: 'Fractions' }).click();

		await expect
			.element(page.getByRole('button', { name: 'Domaine : Arithmétiques' }))
			.toBeVisible();
		await expect
			.element(page.getByText('« Arithmétiques » n’existe pas encore dans le thème « Fractions »'))
			.toBeVisible();
	});
	it('sans thème : « Ajouter… » du domaine est désactivé, avec une indication', async () => {
		await renderFields({});

		// Sans thème, le domaine ET le sous-domaine portent l'indication
		await expect.element(page.getByText('Choisis d’abord un thème').first()).toBeVisible();
		await page.getByRole('button', { name: /^Domaine/ }).click();
		const addOption = page.getByRole('option', { name: '➕ Ajouter…' });
		await expect.element(addOption).toHaveAttribute('data-disabled');
		await userEvent.keyboard('{Escape}');
	});

	it('sans domaine : « Ajouter… » du sous-domaine est désactivé, avec une indication', async () => {
		await renderFields({ theme: 'Suites' });

		await expect.element(page.getByText('Choisis d’abord un domaine')).toBeVisible();
		await page.getByRole('button', { name: /^Sous-domaine/ }).click();
		const addOption = page.getByRole('option', { name: '➕ Ajouter…' });
		await expect.element(addOption).toHaveAttribute('data-disabled');
		await userEvent.keyboard('{Escape}');
	});

	it('thème choisi : « Ajouter… » du domaine est actif, sans indication', async () => {
		await renderFields({ theme: 'Suites' });

		expect(page.getByText('Choisis d’abord un thème').elements()).toHaveLength(0);
		await page.getByRole('button', { name: /^Domaine/ }).click();
		const addOption = page.getByRole('option', { name: '➕ Ajouter…' });
		await expect.element(addOption).not.toHaveAttribute('data-disabled');
		await userEvent.keyboard('{Escape}');
	});
});
