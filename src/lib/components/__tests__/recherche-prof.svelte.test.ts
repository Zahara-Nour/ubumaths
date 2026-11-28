/**
 * Page de recherche du prof : message « aucun résultat » (V74) et filtres
 * resynchronisés quand l'adresse change, par exemple au retour arrière (L41).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Recherche from '../../../routes/(protected)/dashboard/teacher/recherche/+page.svelte';
import type { PageData as RecherchePageData } from '../../../routes/(protected)/dashboard/teacher/recherche/$types';
import type { ResourceKind } from '#lib/resources/kinds.ts';

// Types
interface DonneesRecherche {
	query?: string;
	kinds?: ResourceKind[];
	tags?: string[];
	searched?: boolean;
}

// Functions

/** Les données de la page, sans résultat. */
function rechercheData({
	query = '',
	kinds = [],
	tags = [],
	searched = false
}: DonneesRecherche): RecherchePageData {
	const data = {
		query,
		kinds,
		tags,
		results: [] as RecherchePageData['results'],
		searched,
		error: null
	} satisfies Pick<
		RecherchePageData,
		'query' | 'kinds' | 'tags' | 'results' | 'searched' | 'error'
	>;
	return data as RecherchePageData;
}

/** La valeur d'un champ caché tel que le formulaire l'enverrait. */
function champEnvoye(container: HTMLElement, name: 'kinds' | 'tags'): string {
	return container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value ?? 'absent';
}

describe('recherche du prof : aucun résultat (V74)', () => {
	it('texte seul : le message cite le texte', async () => {
		const { container } = await render(Recherche, {
			props: { data: rechercheData({ query: 'pythagore', searched: true }) }
		});
		expect(container.textContent).toContain('Aucun résultat pour « pythagore ».');
	});

	it('tag seul : le message cite le tag, pas des guillemets vides', async () => {
		const { container } = await render(Recherche, {
			props: { data: rechercheData({ tags: ['fractions'], searched: true }) }
		});
		expect(container.textContent).toContain('Aucun résultat pour le tag #fractions.');
		expect(container.textContent).not.toContain('« »');
	});

	it('texte et tag : le message cite les deux', async () => {
		const { container } = await render(Recherche, {
			props: { data: rechercheData({ query: 'pythagore', tags: ['géométrie'], searched: true }) }
		});
		expect(container.textContent).toContain(
			'Aucun résultat pour « pythagore » avec le tag #géométrie.'
		);
	});

	it('plusieurs tags : pluriel', async () => {
		const { container } = await render(Recherche, {
			props: { data: rechercheData({ tags: ['fractions', 'calcul'], searched: true }) }
		});
		expect(container.textContent).toContain('Aucun résultat pour les tags #fractions, #calcul.');
	});
});

describe('recherche du prof : filtres au retour arrière (L41)', () => {
	it('les types de l’adresse d’arrivée sont cochés', async () => {
		const { container } = await render(Recherche, {
			props: { data: rechercheData({ query: 'fractions', kinds: ['exercise'] }) }
		});
		expect(champEnvoye(container, 'kinds')).toBe('exercise');
	});

	it('une autre recherche coche ses propres types et tags', async () => {
		const { container, rerender } = await render(Recherche, {
			props: { data: rechercheData({ query: 'fractions', kinds: ['exercise'], tags: ['a'] }) }
		});
		await rerender({
			data: rechercheData({ query: 'pythagore', kinds: ['worksheet'], tags: ['b'] })
		});
		expect(champEnvoye(container, 'kinds')).toBe('worksheet');
		expect(champEnvoye(container, 'tags')).toBe('b');
	});
});
