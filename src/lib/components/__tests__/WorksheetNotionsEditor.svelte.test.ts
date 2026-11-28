/**
 * Notions d'une fiche dans l'éditeur (ADR 0041)
 *
 * Toute fiche admet plusieurs notions (ADR 0041, amendé le 2026-11-19) : la
 * liste, un bouton pour ajouter la notion choisie, un pour retirer chacune.
 * Une notion ajoutée porte son nom anglais, lu dans l'arbre (ADR 0043).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WorksheetNotionsEditor from '../worksheets/WorksheetNotionsEditor.svelte';
import type { TreeNode } from '#lib/questions/classification-tree.ts';
import type { WorksheetClassificationView } from '#lib/types/worksheets.ts';

const NODES: TreeNode[] = [
	{ id: 'b1', kind: 'branch', name: 'Analyse', parent_id: null, position: 0 },
	{ id: 'n1', kind: 'notion', name: 'Suites', parent_id: 'b1', position: 0 },
	{
		id: 'n2',
		kind: 'notion',
		name: 'Dérivation',
		parent_id: 'b1',
		position: 1,
		translations: { en: { name: 'Derivatives' } }
	}
];

const SUITES: WorksheetClassificationView = {
	node_id: 'n1',
	name: 'Suites',
	kind: 'notion',
	name_en: null,
	position: 0
};
const DERIVATION: WorksheetClassificationView = {
	node_id: 'n2',
	name: 'Dérivation',
	kind: 'notion',
	name_en: 'Derivatives',
	position: 1
};

async function renderEditor(value: WorksheetClassificationView[]) {
	const onchange = vi.fn();
	const main = document.body.appendChild(document.createElement('main'));
	await render(WorksheetNotionsEditor, {
		target: main,
		props: { nodes: NODES, value, onchange }
	});
	return onchange;
}

async function choose(branch: string, notion: string) {
	await page.getByRole('combobox', { name: /^Branche/ }).click();
	await page.getByRole('option', { name: branch }).click();
	await page.getByRole('combobox', { name: /^Notion/ }).click();
	await page.getByRole('option', { name: notion }).click();
}

describe('WorksheetNotionsEditor', () => {
	it('aucune notion : la première s’ajoute à la liste vide', async () => {
		const onchange = await renderEditor([]);

		await choose('Analyse', 'Suites');
		await page.getByRole('button', { name: 'Ajouter la notion' }).click();

		expect(onchange).toHaveBeenLastCalledWith([SUITES]);
	});

	it('plusieurs notions : ajouter la notion choisie à la fin', async () => {
		const onchange = await renderEditor([SUITES]);
		await expect.element(page.getByText('Suites', { exact: true })).toBeVisible();

		await choose('Analyse', 'Dérivation');
		await page.getByRole('button', { name: 'Ajouter la notion' }).click();

		expect(onchange).toHaveBeenLastCalledWith([SUITES, { ...DERIVATION, position: 1 }]);
	});

	it('plusieurs notions : retirer une notion renumérote les suivantes', async () => {
		const onchange = await renderEditor([SUITES, DERIVATION]);

		await page.getByRole('button', { name: 'Retirer Suites' }).click();

		expect(onchange).toHaveBeenLastCalledWith([{ ...DERIVATION, position: 0 }]);
	});

	it('une notion déjà dans la liste ne s’ajoute pas deux fois', async () => {
		await renderEditor([SUITES]);

		await choose('Analyse', 'Suites');

		await expect.element(page.getByRole('button', { name: 'Ajouter la notion' })).toBeDisabled();
	});
});
