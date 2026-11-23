/**
 * Page de suivi d'un élève, ce que le PROF lit à l'écran : points groupés par
 * branche puis notion, comptes « Corrigé / Déclaré », marque « seulement
 * déclaré », état vide, erreur de lecture ; contrôles, régularité et
 * compétences (PR 2), chacun avec son état vide et son erreur ; retour selon
 * l'origine (classes ou analytique).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import SuiviPage from '../+page.svelte';

// Adresse courante simulée (le retour dépend de `?depuis=`)
const pageState = vi.hoisted(() => ({
	url: new URL('http://localhost/dashboard/teacher/students/s1')
}));
vi.mock('$app/state', () => ({ page: pageState }));

const CLASS_ID = '11111111-2222-4333-8444-555555555555';

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

const EVALUATIONS = [
	{ evaluation_id: 'e1', title: 'Contrôle fractions', best_grade: 14.5, status: 'completed' },
	{ evaluation_id: 'e2', title: 'Course aux nombres', best_grade: null, status: 'not_started' },
	{ evaluation_id: 'e3', title: 'Contrôle triangles', best_grade: null, status: 'expired' }
];

const REGULARITY = {
	weeks: [
		{ start: '2026-11-02', holiday: false },
		{ start: '2026-11-09', holiday: false }
	],
	tiers: [0, 3]
};

const COMPETENCES = [
	{ id: 'c1', name: 'Chercher', level: 'satisfaisante' },
	{ id: 'c2', name: 'Modéliser', level: null }
];

type PageDataOverrides = Partial<{
	points: unknown[];
	pointsError: boolean;
	evaluations: unknown[];
	evaluationsError: boolean;
	regularity: unknown;
	competences: unknown[];
	competencesError: boolean;
}>;

async function renderPage(data: PageDataOverrides = {}) {
	return await render(SuiviPage, {
		props: {
			data: {
				student: { id: 's1', fullName: 'Alix Martin' },
				points: POINTS,
				pointsError: false,
				evaluations: EVALUATIONS,
				evaluationsError: false,
				regularity: REGULARITY,
				competences: COMPETENCES,
				competencesError: false,
				...data
			}
		} as never
	});
}

beforeEach(() => {
	pageState.url = new URL('http://localhost/dashboard/teacher/students/s1');
});

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

	it('ouvert depuis l’analytique d’une classe : le retour y ramène', async () => {
		pageState.url = new URL(
			`http://localhost/dashboard/teacher/students/s1?depuis=analytique&classe=${CLASS_ID}`
		);
		await renderPage();
		await expect
			.element(page.getByRole('link', { name: "Retour à l'analytique" }))
			.toHaveAttribute('href', `/dashboard/teacher/classes/${CLASS_ID}/analytics`);
	});

	it('contrôles : meilleure note ou statut, lien vers les résultats qui revient au suivi', async () => {
		await renderPage();
		await expect.element(page.getByText('14,5/20')).toBeVisible();
		await expect.element(page.getByText('Pas commencé')).toBeVisible();
		await expect.element(page.getByText('Non rendu, date limite passée')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Contrôle fractions' }))
			.toHaveAttribute('href', '/dashboard/teacher/assessments/e1/results?depuis=suivi&eleve=s1');
	});

	it('contrôles : aucun assigné, ou lecture en échec', async () => {
		await renderPage({ evaluations: [] });
		await expect.element(page.getByText('Aucun contrôle assigné.')).toBeVisible();
	});

	it('contrôles en échec : le bloc le dit, les autres restent', async () => {
		await renderPage({ evaluations: [], evaluationsError: true });
		await expect.element(page.getByText(/Les contrôles n’ont pas pu être lus/)).toBeVisible();
		await expect.element(page.getByText('Chercher')).toBeVisible();
	});

	it('régularité : un palier par semaine, en toutes lettres, jamais un nombre de traces', async () => {
		await renderPage();
		await expect.element(page.getByRole('table', { name: 'Régularité' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: /semaine du 9 nov\. : 4 jours actifs ou plus/ }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: /semaine du 2 nov\. : aucun jour actif/ }))
			.toBeInTheDocument();
	});

	it('régularité en échec : le bloc le dit', async () => {
		await renderPage({ regularity: null });
		await expect.element(page.getByText(/La régularité n’a pas pu être lue/)).toBeVisible();
		expect(page.getByRole('table', { name: 'Régularité' }).elements()).toHaveLength(0);
	});

	it('compétences : niveau ou « pas encore évaluée », sans date', async () => {
		await renderPage();
		await expect.element(page.getByText('Chercher')).toBeVisible();
		await expect.element(page.getByText('Satisfaisante')).toBeVisible();
		await expect.element(page.getByText('pas encore évaluée')).toBeVisible();
	});

	it('compétences en échec : le bloc le dit', async () => {
		await renderPage({ competences: [], competencesError: true });
		await expect.element(page.getByText(/Les compétences n’ont pas pu être lues/)).toBeVisible();
	});
});
