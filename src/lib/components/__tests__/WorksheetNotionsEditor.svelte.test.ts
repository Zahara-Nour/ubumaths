/**
 * Notions d'une fiche dans l'éditeur (ADR 0041)
 *
 * - une seule notion (Entraînement technique, Applications, sans catégorie) :
 *   le sélecteur choisit LA notion, il remplace la précédente ;
 * - plusieurs notions (Révisions, Automatismes, autres types) : la liste, un
 *   bouton pour ajouter la notion choisie, un pour retirer chacune ;
 * - trop de notions pour la catégorie choisie : la liste reste, avec la
 *   consigne de retirer les notions en trop (le serveur refuserait).
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
	{ id: 'n2', kind: 'notion', name: 'Dérivation', parent_id: 'b1', position: 1 }
];

const SUITES: WorksheetClassificationView = {
	node_id: 'n1',
	name: 'Suites',
	kind: 'notion',
	position: 0
};
const DERIVATION: WorksheetClassificationView = {
	node_id: 'n2',
	name: 'Dérivation',
	kind: 'notion',
	position: 1
};

async function renderEditor(value: WorksheetClassificationView[], several: boolean) {
	const onchange = vi.fn();
	const main = document.body.appendChild(document.createElement('main'));
	await render(WorksheetNotionsEditor, {
		target: main,
		props: { nodes: NODES, value, several, onchange }
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
	it('une seule notion : le sélecteur relit la notion et la remplace', async () => {
		const onchange = await renderEditor([SUITES], false);
		await expect.element(page.getByRole('combobox', { name: 'Notion : Suites' })).toBeVisible();

		await page.getByRole('combobox', { name: /^Notion/ }).click();
		await page.getByRole('option', { name: 'Dérivation' }).click();

		expect(onchange).toHaveBeenLastCalledWith([{ ...DERIVATION, position: 0 }]);
	});

	it('plusieurs notions : ajouter la notion choisie à la fin', async () => {
		const onchange = await renderEditor([SUITES], true);
		await expect.element(page.getByText('Suites', { exact: true })).toBeVisible();

		await choose('Analyse', 'Dérivation');
		await page.getByRole('button', { name: 'Ajouter la notion' }).click();

		expect(onchange).toHaveBeenLastCalledWith([SUITES, { ...DERIVATION, position: 1 }]);
	});

	it('plusieurs notions : retirer une notion renumérote les suivantes', async () => {
		const onchange = await renderEditor([SUITES, DERIVATION], true);

		await page.getByRole('button', { name: 'Retirer Suites' }).click();

		expect(onchange).toHaveBeenLastCalledWith([{ ...DERIVATION, position: 0 }]);
	});

	it('une notion déjà dans la liste ne s’ajoute pas deux fois', async () => {
		await renderEditor([SUITES], true);

		await choose('Analyse', 'Suites');

		await expect.element(page.getByRole('button', { name: 'Ajouter la notion' })).toBeDisabled();
	});

	it('trop de notions pour une catégorie à une notion : consigne, et la liste pour retirer', async () => {
		const onchange = await renderEditor([SUITES, DERIVATION], false);

		await expect.element(page.getByText(/une seule notion/i)).toBeVisible();
		await page.getByRole('button', { name: 'Retirer Dérivation' }).click();

		expect(onchange).toHaveBeenLastCalledWith([SUITES]);
	});
});
