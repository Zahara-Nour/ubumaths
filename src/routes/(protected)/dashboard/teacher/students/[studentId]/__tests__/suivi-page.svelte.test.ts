/**
 * Page de suivi d'un élève, ce que le PROF lit à l'écran : points groupés par
 * branche puis notion, comptes « Corrigé / Déclaré », marque « seulement
 * déclaré », état vide, erreur de lecture.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import SuiviPage from '../+page.svelte';

const NONE = { done: 0, succeeded: 0 };

const POINTS = [
	{
		id: 'p1',
		name: 'Additionner des fractions',
		branch_name: 'Nombres et calculs',
		notion_name: 'Fractions',
		badge: 'acquise_en_memoire',
		proved: { done: 6, succeeded: 4 },
		declared: { done: 3, succeeded: 3 },
		onlyDeclared: false
	},
	{
		id: 'p2',
		name: 'Comparer des fractions',
		branch_name: 'Nombres et calculs',
		notion_name: 'Fractions',
		badge: 'a_remedier',
		proved: NONE,
		declared: { done: 2, succeeded: 1 },
		onlyDeclared: true
	},
	{
		id: 'p3',
		name: 'Tracer un triangle',
		branch_name: 'Géométrie',
		notion_name: 'Triangles',
		badge: 'en_apprentissage',
		proved: { done: 2, succeeded: 2 },
		declared: NONE,
		onlyDeclared: false
	}
];

async function renderPage(data: Partial<{ points: unknown[]; pointsError: boolean }> = {}) {
	return await render(SuiviPage, {
		props: {
			data: {
				student: { id: 's1', fullName: 'Alix Martin' },
				points: POINTS,
				pointsError: false,
				...data
			}
		} as never
	});
}

describe('Suivi d’un élève, vue du prof', () => {
	it('titre, retour vers les classes, lien vers le journal', async () => {
		await renderPage();
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Suivi de Alix Martin' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /Retour aux/ }))
			.toHaveAttribute('href', '/dashboard/teacher/classes');
		await expect
			.element(page.getByRole('link', { name: /journal des récompenses/i }))
			.toHaveAttribute('href', '/dashboard/teacher/students/s1/journal?depuis=suivi');
	});

	it('groupe par branche puis notion', async () => {
		await renderPage();
		await expect.element(page.getByRole('heading', { name: 'Nombres et calculs' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Géométrie' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Fractions' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Triangles' })).toBeVisible();
		await expect.element(page.getByText('Additionner des fractions')).toBeVisible();
		await expect.element(page.getByText('Tracer un triangle')).toBeVisible();
	});

	it('affiche les comptes corrigé / déclaré, en omettant une moitié à 0', async () => {
		await renderPage();
		await expect
			.element(page.getByText('Corrigé : 4 réussies sur 6 · Déclaré : 3 réussies sur 3'))
			.toBeVisible();
		await expect.element(page.getByText('Déclaré : 1 réussie sur 2')).toBeVisible();
		await expect.element(page.getByText('Corrigé : 2 réussies sur 2')).toBeVisible();
		expect(page.getByText(/Corrigé : 0/).elements()).toHaveLength(0);
		expect(page.getByText(/Déclaré : 0/).elements()).toHaveLength(0);
	});

	it('marque « seulement déclaré » sur le seul point concerné', async () => {
		await renderPage();
		expect(page.getByText('seulement déclaré').elements()).toHaveLength(1);
	});

	it('dit le badge de chaque point', async () => {
		await renderPage();
		await expect.element(page.getByLabelText('Acquise')).toBeVisible();
		await expect.element(page.getByLabelText('À remédier')).toBeVisible();
		await expect.element(page.getByLabelText('En apprentissage')).toBeVisible();
	});

	it('deux notions homonymes non voisines : deux groupes, la page tient', async () => {
		const point = (id: string, notion: string) => ({
			...POINTS[2],
			id,
			name: `Point ${id}`,
			branch_name: 'Nombres et calculs',
			notion_name: notion
		});
		await renderPage({
			points: [point('a', 'Fractions'), point('b', 'Décimaux'), point('c', 'Fractions')]
		});
		expect(page.getByRole('heading', { name: 'Fractions' }).elements()).toHaveLength(2);
		await expect.element(page.getByText('Point c')).toBeVisible();
	});

	it('aucun point travaillé : le dit', async () => {
		await renderPage({ points: [] });
		await expect.element(page.getByText('Pas encore de point travaillé.')).toBeVisible();
	});

	it('lecture en échec : le bloc le dit, la page reste', async () => {
		await renderPage({ points: [], pointsError: true });
		await expect
			.element(page.getByText(/Les points du programme n’ont pas pu être lus/))
			.toBeVisible();
		expect(page.getByText('Pas encore de point travaillé.').elements()).toHaveLength(0);
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Suivi de Alix Martin' }))
			.toBeVisible();
	});
});
