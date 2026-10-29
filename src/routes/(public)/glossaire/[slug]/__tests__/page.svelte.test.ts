/**
 * Page d'un terme du glossaire : toutes les définitions, chacune avec son niveau,
 * le retour au glossaire, le lien vers le terme cité et vers le Cabinet Noir.
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { MathTerm } from '$lib/dictionary/model';
import TermPage from '../+page.svelte';
import type { PageData } from '../$types';

const MULTIPLICATION: MathTerm = {
	term: 'multiplication',
	tags: ['operations'],
	grade: 'CP',
	definitions: {
		items: [
			{ grade: 'CP', content: 'Compter vite des paquets identiques.' },
			{ grade: 'CE1', content: 'Addition répétée du même nombre.' }
		]
	},
	exemples: { items: [{ grade: 'CP', content: '3 paquets de 2 font 6.' }] },
	synonyms: ['produit'],
	seeAlso: { label: 'Les Dépêches du Czar', path: '/chiffrement/depeches' }
};

async function renderTerm(data: Pick<PageData, 'term' | 'description' | 'cited'>) {
	return await render(TermPage, {
		props: { params: { slug: 'x' }, data: data as PageData, form: undefined }
	});
}

describe('/glossaire/[slug] : la page', () => {
	it('montre toutes les définitions, chacune avec son niveau', async () => {
		await renderTerm({ term: MULTIPLICATION, description: 'd', cited: null });
		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('multiplication');
		await expect.element(page.getByText('Compter vite des paquets identiques.')).toBeVisible();
		await expect.element(page.getByText('Addition répétée du même nombre.')).toBeVisible();
		await expect.element(page.getByText('CE1', { exact: true })).toBeVisible();
		await expect.element(page.getByText('3 paquets de 2 font 6.')).toBeVisible();
		await expect.element(page.getByText('produit', { exact: true })).toBeVisible();
	});

	it('ramène au glossaire et mène au Cabinet Noir', async () => {
		await renderTerm({ term: MULTIPLICATION, description: 'd', cited: null });
		await expect
			.element(page.getByRole('link', { name: /Retour au glossaire/ }))
			.toHaveAttribute('href', '/glossaire');
		await expect
			.element(page.getByRole('link', { name: 'Les Dépêches du Czar' }))
			.toHaveAttribute('href', '/chiffrement/depeches');
	});

	it('un renvoi qui a sa propre définition garde la sienne et mène au terme cité', async () => {
		const thales: MathTerm = {
			term: 'Thalès',
			tags: [],
			grade: '4',
			derivedFrom: 'théorème de Thalès',
			definitions: { items: [{ grade: '4', content: 'Mathématicien grec.' }] }
		};
		const cited: MathTerm = { term: 'théorème de Thalès', tags: [], grade: '4' };
		await renderTerm({
			term: thales,
			description: 'd',
			cited: { term: cited, slug: 'theoreme-de-thales' }
		});
		await expect.element(page.getByText('Mathématicien grec.')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'théorème de Thalès' }))
			.toHaveAttribute('href', '/glossaire/theoreme-de-thales');
	});

	it('un homonyme porte son sens dans le titre', async () => {
		await renderTerm({
			term: { term: 'base', sense: 'puissance', tags: [], grade: '4' },
			description: 'd',
			cited: null
		});
		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('base(puissance)');
	});
});
