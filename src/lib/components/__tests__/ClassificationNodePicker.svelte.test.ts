/**
 * « Rangé dans » : cascade branche → notion → sous-notion. Les notions
 * proposées sont celles de la branche choisie, les sous-notions celles de la
 * notion choisie ; un choix en amont vide ce qui dépend de lui.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ClassificationNodePicker from '../questions/ClassificationNodePicker.svelte';
import type { TreeNode } from '$lib/questions/classification-tree';

const NODES: TreeNode[] = [
	{ id: 'b1', kind: 'branch', name: 'Calcul', parent_id: null, position: 0 },
	{ id: 'b2', kind: 'branch', name: 'Géométrie', parent_id: null, position: 1 },
	{ id: 'n1', kind: 'notion', name: 'Fractions', parent_id: 'b1', position: 0 },
	{ id: 'n2', kind: 'notion', name: 'Décimaux', parent_id: 'b1', position: 1 },
	{ id: 's1', kind: 'subnotion', name: 'Additionner', parent_id: 'n1', position: 0 },
	{ id: 'n3', kind: 'notion', name: 'Triangles', parent_id: 'b2', position: 0 }
];

async function renderPicker(value: string | null) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(ClassificationNodePicker, { target: main, props: { nodes: NODES, value } });
}

function optionNames(): string[] {
	return page
		.getByRole('option')
		.elements()
		.map((o) => o.textContent?.replace('✓', '').trim() ?? '');
}

describe('ClassificationNodePicker', () => {
	it('relit une sous-notion enregistrée dans les trois champs', async () => {
		await renderPicker('s1');

		await expect.element(page.getByRole('button', { name: 'Branche : Calcul' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Notion : Fractions' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Sous-notion : Additionner' }))
			.toBeVisible();
	});

	it('ne propose que les notions de la branche choisie', async () => {
		await renderPicker('n1');

		await page.getByRole('button', { name: /^Notion/ }).click();
		await expect.element(page.getByRole('option', { name: 'Décimaux' })).toBeVisible();
		expect(optionNames()).toEqual(['Aucune notion', 'Fractions', 'Décimaux']);
	});

	it('modèle non rangé : notion et sous-notion sont fermées', async () => {
		await renderPicker(null);

		await expect.element(page.getByRole('button', { name: 'Branche : aucune' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: /^Notion/ })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /^Sous-notion/ })).toBeDisabled();
	});
});
