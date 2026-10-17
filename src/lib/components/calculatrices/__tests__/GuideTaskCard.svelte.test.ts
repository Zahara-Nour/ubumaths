/**
 * Guides calculatrices : ce que l'élève VOIT d'une tâche (phase 0, points 3, 4, 7 et 9).
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GuideTaskCard from '../GuideTaskCard.svelte';
import type { GuideEntry } from '$lib/calculatrices/guide';
import type { CalculatorTask, TaskSequence } from '$lib/calculatrices/types';

const KEYS = { shift: 'shift', del: '⌫' };

function entry(
	task: Partial<CalculatorTask> = {},
	sequence: Partial<TaskSequence> = {}
): GuideEntry {
	return {
		task: {
			id: 'clear-input',
			grade: '6',
			title: 'Effacer une saisie',
			status: 'pratique',
			boRefs: [],
			...task
		},
		sequence: {
			taskId: 'clear-input',
			app: 'Calculs',
			steps: ['Appuie sur [[shift]] puis [[del]].'],
			sources: [{ kind: 'doc', url: 'https://exemple.test' }],
			verifiedOnDevice: true,
			...sequence
		}
	};
}

async function renderCard(value: GuideEntry) {
	return await render(GuideTaskCard, {
		props: { entry: value, keys: KEYS, modelName: 'NumWorks' }
	});
}

describe('GuideTaskCard', () => {
	it('dessine les touches au milieu du texte de l’étape', async () => {
		await renderCard(entry());
		await expect.element(page.getByRole('heading', { name: 'Effacer une saisie' })).toBeVisible();
		await expect.element(page.getByText('Application Calculs')).toBeVisible();
		const keys = page.getByRole('listitem').first().element().querySelectorAll('kbd');
		expect([...keys].map((key) => key.textContent)).toEqual(['shift', '⌫']);
		await expect
			.element(page.getByRole('listitem').first())
			.toHaveTextContent('Appuie sur shift puis ⌫.');
	});

	it('une tâche « vérifier » porte le bandeau', async () => {
		await renderCard(entry({ status: 'verifier' }));
		await expect
			.element(page.getByText(/Pour contrôler ton résultat, pas pour le remplacer/))
			.toBeVisible();
	});

	it('une tâche « programme » ne le porte pas', async () => {
		await renderCard(entry({ status: 'programme' }));
		await expect.element(page.getByText(/Pour contrôler ton résultat/)).not.toBeInTheDocument();
	});

	it('sans fonction dédiée : le dit avant le contournement', async () => {
		await renderCard(entry({}, { noDedicatedFunction: true }));
		await expect
			.element(
				page.getByText('Pas de fonction dédiée sur la NumWorks : voici comment faire autrement.')
			)
			.toBeVisible();
	});

	it('une fonction récente dit à partir de quelle version', async () => {
		await renderCard(entry({}, { sinceVersion: '26' }));
		await expect.element(page.getByText(/À partir de la version 26 du système/)).toBeVisible();
	});

	it('signale une séquence non relue sur la machine', async () => {
		await renderCard(entry({}, { verifiedOnDevice: false }));
		await expect.element(page.getByText('Non relu sur la machine')).toBeVisible();
	});
});
