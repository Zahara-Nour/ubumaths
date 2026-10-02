/**
 * La vue Données, vue depuis l'écran.
 *
 * Une liste se tape sur une ligne, séparée par des points-virgules. La virgule
 * reste décimale — c'est la décision §4 E2, prise parce que distinguer `1,2` de
 * `1, 2` par une espace est intenable en classe.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

async function openData(atelier = new Atelier()) {
	const view = await render(AtelierContainer, { atelier, ephemeral: true, view: 'donnees' });
	await settle();
	return { ...view, atelier };
}

const fieldFor = (container: HTMLElement, name: string) =>
	container.querySelector(`#liste-${name}`) as HTMLInputElement | null;

describe('la vue Données', () => {
	it('explique comment commencer quand il n’y a rien', async () => {
		const { container } = await openData();

		expect(container.textContent).toContain('+ Liste');
		expect(container.textContent).toContain('12 ; 15 ; 9');
	});

	it('montre une colonne par liste', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });
		atelier.create({ kind: 'list', name: 'M', definition: '2 ; 4' });

		const { container } = await openData(atelier);

		expect(container.querySelectorAll('.colonne').length).toBe(2);
		expect(fieldFor(container, 'L')?.value).toBe('12 ; 15 ; 9');
	});

	it('donne un aperçu chiffré sans qu’on clique', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.apercu')?.textContent).toContain('n = 3');
		expect(container.querySelector('.apercu')?.textContent).toContain('12');
	});

	it('modifie la liste de l’atelier quand on tape', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1' });
		const { container } = await openData(atelier);

		const field = fieldFor(container, 'L')!;
		field.value = '1 ; 2 ; 3';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();

		const list = atelier.get('L');
		expect(list && 'values' in list && list.values).toEqual([1, 2, 3]);
	});

	// §4 E1 : ignorée ET signalée
	it('signale une valeur qui n’est pas un nombre', async () => {
		const atelier = new Atelier();
		// Q84 : sans lettre ; un mot rendrait la liste qualitative
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 1/0 ; 9' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.ecarte')?.textContent).toContain('1 valeur ignorée');
	});

	// Q1 : la correction est montrée, pas seulement la règle
	it('montre la correction quand l’élève sépare par des virgules', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12, 15, 9' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.probleme')?.textContent).toContain('12 ; 15 ; 9');
	});

	it('n’accuse pas un décimal écrit à la virgule', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '3,14 ; 2,5' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.probleme')).toBeNull();
		expect(container.querySelector('.apercu')?.textContent).toContain('n = 2');
	});

	it('rappelle la règle du séparateur', async () => {
		const { container } = await openData();

		expect(container.querySelector('.aide')?.textContent).toContain('points-virgules');
	});
});

// =============================================================================
// Lot 5 (outils statistiques) : diagramme vivant sous la liste
// =============================================================================

describe('diagramme d’une liste', () => {
	function selectCard(container: HTMLElement, name: string) {
		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === name
		);
		(carte?.querySelector('button') as HTMLButtonElement | undefined)?.click();
	}

	function clickAction(container: HTMLElement, label: string) {
		const bouton = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === label
		) as HTMLButtonElement | undefined;
		bouton?.click();
	}

	const columnOf = (container: HTMLElement, name: string) =>
		fieldFor(container, name)?.closest('.colonne') as HTMLElement | null;

	it('« Diagramme en bâtons » : bascule sur Données, barres sous la bonne colonne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '2 ; 3 ; 3 ; 5' });
		atelier.create({ kind: 'list', name: 'M', definition: '1 ; 1' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await settle();

		selectCard(container, 'L');
		await settle();
		clickAction(container, 'Diagramme en bâtons');
		await settle();

		expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Données');
		expect(columnOf(container, 'L')?.querySelectorAll('.stat-barre').length).toBe(3);
		expect(columnOf(container, 'M')?.querySelector('svg')).toBeNull();
		expect(columnOf(container, 'L')?.querySelector('.stat-indicateurs')).not.toBeNull();
	});

	// Revue Q88 (B1) : « Diagramme circulaire » menait à la vue Calcul, rien affiché
	it('« Diagramme circulaire » au CLIC : bascule sur Données, secteurs, annonce', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: 'fille ; garçon ; fille' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await settle();
		const live = () => container.querySelector('[data-annonce]')?.textContent?.trim();

		selectCard(container, 'L');
		await settle();
		clickAction(container, 'Diagramme circulaire');
		await settle();
		await new Promise((r) => setTimeout(r, 50));

		expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Données');
		expect(columnOf(container, 'L')?.querySelectorAll('.stat-secteur').length).toBe(2);
		expect(live()).toBe('Diagramme de L affiché dans l’onglet Données.');
	});

	// Audit a11y du lot 5 (WCAG 4.1.3) : la bascule de vue et l'apparition du
	// diagramme étaient silencieuses pour un lecteur d'écran
	it('annonce le diagramme affiché, puis retiré', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '2 ; 3' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await settle();
		const live = () => container.querySelector('[data-annonce]')?.textContent?.trim();

		selectCard(container, 'L');
		await settle();
		clickAction(container, 'Diagramme en bâtons');
		await settle();
		await new Promise((r) => setTimeout(r, 50));
		expect(live()).toBe('Diagramme de L affiché dans l’onglet Données.');

		clickAction(container, 'Retirer le diagramme');
		await settle();
		await new Promise((r) => setTimeout(r, 50));
		expect(live()).toBe('Diagramme de L retiré.');
	});

	it('le diagramme nomme sa liste, et la partenaire des effectifs', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '2 ; 3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4 ; 5' });
		atelier.toggleChart('L', 'M');
		const { container } = await openData(atelier);

		expect(columnOf(container, 'L')?.querySelector('figcaption')?.textContent).toBe(
			'Diagramme de L, effectifs M'
		);
	});

	it('le champ de la liste est décrit par son aperçu et par le message du diagramme', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '' });
		atelier.toggleChart('L', null);
		const { container } = await openData(atelier);
		const field = fieldFor(container, 'L')!;
		const described = (field.getAttribute('aria-describedby') ?? '')
			.split(' ')
			.map((id) => document.getElementById(id)?.textContent ?? '')
			.join(' ');

		expect(described).toMatch(/n['’]a pas encore de valeurs/);
	});

	it('vivant : la saisie redessine le diagramme', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 1' });
		atelier.toggleChart('L', null);
		const { container } = await openData(atelier);
		expect(columnOf(container, 'L')?.querySelectorAll('.stat-barre').length).toBe(1);

		const field = fieldFor(container, 'L')!;
		field.value = '1 ; 2 ; 3';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();

		expect(columnOf(container, 'L')?.querySelectorAll('.stat-barre').length).toBe(3);
	});

	it('un diagramme impossible dit pourquoi, sous la colonne', async () => {
		const atelier = new Atelier();
		atelier.create({
			kind: 'list',
			name: 'L',
			definition: Array.from({ length: 31 }, (_, i) => i).join(' ; ')
		});
		atelier.toggleChart('L', null);
		const { container } = await openData(atelier);

		expect(columnOf(container, 'L')?.textContent).toMatch(/30/);
	});
});

// Q39 : « Nuage avec M » basculait sur Calcul depuis que l'action s'appelle `scatter:M`
describe('nuage avec une partenaire', () => {
	it('bascule sur le Graphe', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		atelier.create({ kind: 'list', name: 'M', definition: '3 ; 4' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		await settle();

		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'L'
		);
		(carte?.querySelector('button') as HTMLButtonElement).click();
		await settle();
		const bouton = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Nuage avec M'
		) as HTMLButtonElement;
		bouton.click();
		await settle();

		expect(container.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Graphe');
	});
});

// Outils statistiques v2, Q84-Q88 : une liste qualitative dans la vue Données
describe('liste qualitative', () => {
	it('aperçu « liste qualitative », et diagramme circulaire VISIBLE', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: 'fille ; garçon ; fille' });
		atelier.toggleChart('L', null, 'circulaire');
		const screen = await openData(atelier);

		expect(screen.container.textContent).toContain('liste qualitative · 3 entrées · 2 modalités');
		expect(screen.container.textContent).not.toContain('ignorée');
		const sectors = screen.container.querySelectorAll('.stat-secteur');
		expect(sectors.length).toBe(2);
	});
});

// Q92 : l'aperçu dit pourquoi une liste mélangée est qualitative
describe('liste mélangée', () => {
	it('« liste qualitative, à cause de « 2x » »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 2x ; 15' });
		const { container } = await openData(atelier);

		expect(container.textContent).toContain('liste qualitative, à cause de « 2x » · 3 entrées');
	});
});
