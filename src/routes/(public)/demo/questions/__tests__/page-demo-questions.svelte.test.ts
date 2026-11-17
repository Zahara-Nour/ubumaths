/**
 * Vitrine — les questions (`/demo/questions`)
 * Comportements validés par David le 2026-10-25 (docs/wip/demo-debug-progress.md, PR 6g).
 *
 * - un visiteur voit le titre, le retour vers `/demo`, 6 onglets et le lien vers Automaths ;
 * - chaque onglet monte sa forme sur les 4 questions de la page ;
 * - pas de bandeau « Connecte-toi… », une ligne « Rien n'est enregistré » ;
 * - révisions espacées simulées : après le retournement, « Pas réussi / Réussi » et la prochaine date ;
 * - rien n'est enregistré : aucune requête d'écriture (le lexique lit `/api/dictionnaire`).
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

// Le lexique lit /api/dictionnaire (ADR 0022) : sans mots ici, le serveur de test n'est pas appelé
vi.mock('$lib/dictionary/fetch-dictionary', () => ({ fetchDictionary: async () => [] }));

const TABS = [
	'En classe',
	'Contrôle blanc',
	'Flash-cards',
	'Saisie',
	'Course aux nombres',
	'Révisions espacées'
];

async function openTab(name: string): Promise<void> {
	await page.getByRole('tab', { name }).click();
	await expect.element(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('/demo/questions', () => {
	it('montre au visiteur le titre, le retour vers /demo, 5 onglets et le lien vers Automaths', async () => {
		await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Une série, six formes');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		expect(
			page
				.getByRole('tab')
				.elements()
				.map((tab) => tab.textContent?.trim())
		).toEqual(TABS);
		await expect
			.element(page.getByRole('link', { name: /Composer sa propre série/ }))
			.toHaveAttribute('href', '/automaths');
		await expect.element(page.getByText(/Rien n'est enregistré/)).toBeInTheDocument();
	});

	it('ouvre « En classe » sur la première des 4 questions', async () => {
		await render(Page);

		await expect.element(page.getByText('Question 1 / 4').first()).toBeInTheDocument();
	});

	it('monte le Contrôle blanc et les Flash-cards sans bandeau « Connecte-toi »', async () => {
		await render(Page);

		await openTab('Contrôle blanc');
		await expect.element(page.getByText('Question 1 sur 4')).toBeInTheDocument();
		expect(page.getByText(/Connecte-toi/).elements()).toHaveLength(0);

		await openTab('Flash-cards');
		await expect
			.element(page.getByRole('button', { name: 'Voir la correction' }))
			.toBeInTheDocument();
		expect(page.getByText(/Connecte-toi/).elements()).toHaveLength(0);

		await openTab('Saisie');
		await expect.element(page.getByTestId('typing-position')).toHaveTextContent('Question 1 / 4');
		expect(page.getByText(/Connecte-toi/).elements()).toHaveLength(0);
	});

	it('affiche les 4 questions à la fois dans la course aux nombres', async () => {
		await render(Page);

		await openTab('Course aux nombres');
		await expect.element(page.getByText(/Résous/).first()).toBeInTheDocument();
		expect(page.getByText(/Calcule/).elements().length).toBeGreaterThanOrEqual(3);
	});

	it('révisions espacées : après le retournement, deux boutons et la prochaine date', async () => {
		await render(Page);

		await openTab('Révisions espacées');
		await expect.element(page.getByText('Carte 1 sur 4')).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Réussi', exact: true }).elements()).toHaveLength(0);

		await page.getByRole('button', { name: 'Voir la correction' }).click();
		expect(page.getByRole('button', { name: 'Bien' }).elements()).toHaveLength(0);
		await expect.element(page.getByRole('button', { name: 'Pas réussi' })).toBeVisible();
		await page.getByRole('button', { name: 'Réussi', exact: true }).click();
		await expect
			.element(page.getByText(/« Réussi » : cette carte reviendra/))
			.toHaveTextContent(/dans \d+ jours/);

		await page.getByRole('button', { name: 'Carte suivante' }).click();
		await expect.element(page.getByText('Carte 2 sur 4')).toBeInTheDocument();
	});

	it('n’envoie aucune requête d’écriture, quel que soit l’onglet', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await render(Page);

		for (const tab of TABS) await openTab(tab);

		const methods = fetchSpy.mock.calls.map(([, init]) => (init?.method ?? 'GET').toUpperCase());
		expect(methods.filter((method) => method !== 'GET')).toEqual([]);
	});
});
