import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import TortueBacASable from '../TortueBacASable.svelte';

// Sur téléphone (sous `lg`), un seul panneau à la fois : onglets « Blocs » / « Tortue ».
// Au-dessus, les deux panneaux côte à côte, sans onglets.

function panneauBlocs() {
	return page.getByRole('application', { name: 'Espace de travail Blockly', includeHidden: true });
}

function quadrillage() {
	return page.getByRole('img', { name: /Tracé de la tortue/, includeHidden: true });
}

afterEach(async () => {
	await page.viewport(1280, 900);
});

describe('La Tortue sur téléphone', () => {
	it('au départ : onglet Blocs, quadrillage masqué', async () => {
		await page.viewport(390, 844);
		await render(TortueBacASable);
		await expect
			.element(page.getByRole('tab', { name: 'Blocs' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(panneauBlocs()).toBeVisible();
		await expect.element(quadrillage()).not.toBeVisible();
	});

	it('onglet Tortue : le quadrillage remplace les blocs', async () => {
		await page.viewport(390, 844);
		await render(TortueBacASable);
		await page.getByRole('tab', { name: 'Tortue' }).click();
		await expect.element(quadrillage()).toBeVisible();
		await expect.element(panneauBlocs()).not.toBeVisible();
	});

	it('« Lancer » bascule sur l’onglet Tortue', async () => {
		await page.viewport(390, 844);
		await render(TortueBacASable);
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect
			.element(page.getByRole('tab', { name: 'Tortue' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(quadrillage()).toBeVisible();
	});

	it('retour aux blocs : l’espace de travail est toujours là', async () => {
		await page.viewport(390, 844);
		await render(TortueBacASable);
		await page.getByRole('tab', { name: 'Tortue' }).click();
		await page.getByRole('tab', { name: 'Blocs' }).click();
		await expect.element(panneauBlocs()).toBeVisible();
		await expect.element(page.getByText('Boucles', { exact: true })).toBeVisible();
	});
});

describe('Pause au départ', () => {
	it('après « Lancer », la tortue attend au départ avant le premier pas', async () => {
		await page.viewport(390, 844);
		await render(TortueBacASable);
		// L'espace de travail créé par le composant : on y pose « avancer de 2 »
		await expect.element(panneauBlocs()).toBeVisible();
		Blockly.serialization.workspaces.load(
			{
				blocks: {
					blocks: [
						{
							type: 'tortue_avancer',
							x: 10,
							y: 10,
							inputs: { VALEUR: { shadow: { type: 'math_number', fields: { NUM: 2 } } } }
						}
					]
				}
			},
			Blockly.getMainWorkspace()
		);
		await page.getByRole('button', { name: 'Lancer' }).click();
		await expect
			.element(quadrillage())
			.toHaveAttribute('aria-label', 'Tracé de la tortue : 0 segment');
		await new Promise((r) => setTimeout(r, 400));
		await expect
			.element(quadrillage())
			.toHaveAttribute('aria-label', 'Tracé de la tortue : 0 segment');
		await expect
			.element(quadrillage())
			.toHaveAttribute('aria-label', 'Tracé de la tortue : 1 segment');
	});
});

describe('La Tortue sur ordinateur', () => {
	it('les deux panneaux côte à côte, sans onglets', async () => {
		await page.viewport(1280, 900);
		await render(TortueBacASable);
		await expect.element(panneauBlocs()).toBeVisible();
		await expect.element(quadrillage()).toBeVisible();
		await expect
			.element(page.getByRole('tab', { name: 'Blocs', includeHidden: true }))
			.not.toBeVisible();
	});
});
