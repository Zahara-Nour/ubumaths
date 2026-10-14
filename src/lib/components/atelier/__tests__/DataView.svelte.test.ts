/**
 * La vue Données, vue depuis l'écran : la grille (tableur intégré, lot 1).
 *
 * Phase 0 : `docs/wip/atelier-tableur-phase0.md` §1 à §3. Une liste est une
 * colonne NOMMÉE ; une cellule se lit comme une entrée de liste (`1,5`, `1/6`,
 * sinon un mot). La virgule reste décimale (§4 E2 de la v1).
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isList } from '$lib/atelier/types';

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

const cellAt = (container: HTMLElement, address: string) =>
	container.querySelector(`[data-cell="${address}"]`) as HTMLElement | null;

const headerOf = (container: HTMLElement, letter: string) =>
	container.querySelector(`th[data-column="${letter}"]`) as HTMLElement | null;

const summaryOf = (container: HTMLElement, list: string) =>
	container.querySelector(`[data-apercu="${list}"]`) as HTMLElement | null;

const chartOf = (container: HTMLElement, list: string) =>
	container.querySelector(`[data-diagramme="${list}"]`) as HTMLElement | null;

const valuesOf = (atelier: Atelier, name: string) => {
	const list = atelier.get(name);
	return list !== undefined && isList(list) ? list.values : null;
};

describe('la grille', () => {
	it('explique comment commencer quand il n’y a rien', async () => {
		const { container } = await openData();

		expect(container.querySelector('.consigne')?.textContent).toContain('Tape tes valeurs');
		// Au moins 10 lignes et 5 colonnes, même vide (phase 0 §2)
		expect(cellAt(container, 'E10')).not.toBeNull();
	});

	it('une liste est une colonne nommée, ses valeurs une par ligne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });
		atelier.create({ kind: 'list', name: 'M', definition: '2 ; 4' });

		const { container } = await openData(atelier);

		expect(headerOf(container, 'A')?.textContent).toContain('L');
		expect(headerOf(container, 'B')?.textContent).toContain('M');
		expect(cellAt(container, 'A3')?.textContent?.trim()).toBe('9');
		expect(cellAt(container, 'B2')?.textContent?.trim()).toBe('4');
	});

	it('la zone utilisée plus une marge de 10 lignes', async () => {
		const atelier = new Atelier();
		const twelve = Array.from({ length: 12 }, (_, i) => i + 1).join(' ; ');
		atelier.create({ kind: 'list', name: 'L', definition: twelve });

		const { container } = await openData(atelier);

		expect(cellAt(container, 'A22')).not.toBeNull();
		expect(cellAt(container, 'A23')).toBeNull();
	});

	it('donne un aperçu chiffré sous le nom de la liste', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });

		const { container } = await openData(atelier);

		expect(summaryOf(container, 'L')?.textContent).toContain('n = 3');
	});

	// §4 E1 de la v1 : ignorée ET signalée — mais une case vide n'est pas ignorée
	it('signale une valeur qui n’est pas un nombre, pas une case vide', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ;  ; 1/0 ; 9' });

		const { container } = await openData(atelier);

		expect(summaryOf(container, 'L')?.textContent).toContain('1 valeur ignorée');
	});

	it('une colonne de mots est une liste qualitative', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: 'fille ; garçon ; fille' });

		const { container } = await openData(atelier);

		expect(summaryOf(container, 'L')?.textContent).toContain(
			'liste qualitative · 3 entrées · 2 modalités'
		);
		expect(summaryOf(container, 'L')?.textContent).not.toContain('ignorée');
	});

	// Q92 : l'aperçu dit pourquoi une liste mélangée est qualitative
	it('« liste qualitative, à cause de « 2x » »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 2x ; 15' });
		const { container } = await openData(atelier);

		expect(summaryOf(container, 'L')?.textContent).toContain(
			'liste qualitative, à cause de « 2x » · 3 entrées'
		);
	});

	// Q1 de la v1 : la correction est montrée, pas seulement la règle
	it('montre la correction d’une cellule séparée par des virgules', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12,15,9' });

		const { container } = await openData(atelier);

		expect(summaryOf(container, 'L')?.textContent).toContain('12 ; 15 ; 9');
	});

	it('n’accuse pas un décimal écrit à la virgule', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '3,14 ; 2,5' });

		const { container } = await openData(atelier);

		expect(summaryOf(container, 'L')?.textContent).toContain('n = 2');
	});

	it('rappelle que la virgule est décimale', async () => {
		const { container } = await openData();

		expect(container.querySelector('.aide')?.textContent).toContain('3,14');
	});
});

describe('saisie au clavier (§3)', () => {
	it('taper sur une cellule puis Entrée : la liste change, la sélection descend', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1' });
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A2')!);
		await userEvent.keyboard('7{Enter}');
		await settle();

		expect(valuesOf(atelier, 'L')).toEqual([1, 7]);
		expect(cellAt(container, 'A3')?.getAttribute('aria-selected')).toBe('true');
	});

	it('Échap annule la frappe', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1' });
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('9{Escape}');
		await settle();

		expect(valuesOf(atelier, 'L')).toEqual([1]);
		expect(cellAt(container, 'A1')?.textContent?.trim()).toBe('1');
	});

	it('Suppr vide la cellule', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('{Delete}');
		await settle();

		expect(valuesOf(atelier, 'L')).toEqual([2]);
	});

	it('les flèches déplacent la sélection, et le focus la suit', async () => {
		const { container } = await openData();

		await userEvent.click(cellAt(container, 'B2')!);
		await userEvent.keyboard('{ArrowRight}{ArrowDown}');
		await settle();

		expect(cellAt(container, 'C3')?.getAttribute('aria-selected')).toBe('true');
		expect(document.activeElement).toBe(cellAt(container, 'C3'));
	});

	it('P2 : « 12 ; 15 ; 9 » tapé dans une cellule se répartit vers le bas', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'C1')!);
		await userEvent.keyboard('12 ; 15 ; 9{Enter}');
		await settle();

		expect(cellAt(container, 'C2')?.textContent?.trim()).toBe('15');
		expect(atelier.cell(2, 3)).toBe('9');
	});

	it('la barre de cellule montre l’adresse et le contenu brut, et sert à modifier', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1/6' });
		const { container } = await openData(atelier);
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		await userEvent.click(cellAt(container, 'A1')!);
		await settle();
		expect(container.querySelector('.adresse')?.textContent?.trim()).toBe('A1');
		expect(bar.value).toBe('1/6');

		await userEvent.clear(bar);
		await userEvent.type(bar, '0,5{Enter}');
		await settle();

		expect(valuesOf(atelier, 'L')).toEqual([0.5]);
	});

	it('un refus se dit, et la frappe reste', async () => {
		const { container } = await openData();
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.click(bar);
		await userEvent.fill(bar, 'x'.repeat(201));
		await userEvent.keyboard('{Enter}');
		await settle();

		expect(container.querySelector('.refus')?.textContent).toContain('200 caractères');
		expect(bar.value).toHaveLength(201);
	});

	// Revue : la frappe refusée suivait la sélection dans une autre cellule
	it('cliquer ailleurs après un refus abandonne la frappe refusée', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.click(bar);
		await userEvent.fill(bar, 'x'.repeat(201));
		await userEvent.keyboard('{Enter}');
		await settle();
		await userEvent.click(cellAt(container, 'B3')!);
		await settle();

		expect(cellAt(container, 'B3')?.textContent?.trim()).toBe('');
		expect(cellAt(container, 'B3')?.querySelector('input')).toBeNull();
		expect(bar.value).toBe('');
	});
});

describe('nommer une colonne (§1)', () => {
	it('« Nommer » une colonne remplie en fait une liste', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 1, row: 1, text: '3' },
			{ column: 1, row: 2, text: '4' }
		]);
		const { container } = await openData(atelier);

		await userEvent.click(headerOf(container, 'B')!.querySelector('button')!);
		await userEvent.keyboard('M{Enter}');
		await settle();

		expect(valuesOf(atelier, 'M')).toEqual([3, 4]);
		expect(headerOf(container, 'B')?.textContent).toContain('M');
	});

	it('un nom refusé le dit, rien ne change', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });
		const { container } = await openData(atelier);

		await userEvent.click(headerOf(container, 'B')!.querySelector('button')!);
		await userEvent.keyboard('a{Enter}');
		await settle();

		expect(container.querySelector('.refus')?.textContent?.trim()).not.toBe('');
		expect(atelier.listAt(1)).toBeUndefined();
	});

	it('retirer le nom garde les cellules', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '5 ; 6' });
		const { container } = await openData(atelier);

		await userEvent.click(
			container.querySelector('button[aria-label="Retirer le nom L de la colonne A"]')!
		);
		await settle();

		expect(atelier.get('L')).toBeUndefined();
		expect(cellAt(container, 'A2')?.textContent?.trim()).toBe('6');
	});
});

// =============================================================================
// Lot 5 (outils statistiques) : diagramme vivant, sous la grille
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

	it('« Diagramme en bâtons » : bascule sur Données, barres de la bonne liste', async () => {
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
		expect(chartOf(container, 'L')?.querySelectorAll('.stat-barre').length).toBe(3);
		expect(chartOf(container, 'M')).toBeNull();
		expect(chartOf(container, 'L')?.querySelector('.stat-indicateurs')).not.toBeNull();
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
		expect(chartOf(container, 'L')?.querySelectorAll('.stat-secteur').length).toBe(2);
		expect(live()).toBe('Diagramme de L affiché dans l’onglet Données.');
	});

	// Audit a11y du lot 5 (WCAG 4.1.3)
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

		expect(chartOf(container, 'L')?.querySelector('figcaption')?.textContent).toBe(
			'Diagramme de L, effectifs M'
		);
	});

	it('l’en-tête de la colonne est décrit par son aperçu et par le message du diagramme', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '' });
		atelier.toggleChart('L', null);
		const { container } = await openData(atelier);
		const header = headerOf(container, 'A')!;
		const described = (header.getAttribute('aria-describedby') ?? '')
			.split(' ')
			.map((id) => document.getElementById(id)?.textContent ?? '')
			.join(' ');

		expect(described).toMatch(/n['’]a pas encore de valeurs/);
	});

	it('vivant : une cellule validée redessine le diagramme', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 1' });
		atelier.toggleChart('L', null);
		const { container } = await openData(atelier);
		expect(chartOf(container, 'L')?.querySelectorAll('.stat-barre').length).toBe(1);

		await userEvent.click(cellAt(container, 'A3')!);
		await userEvent.keyboard('2{Enter}');
		await settle();

		expect(chartOf(container, 'L')?.querySelectorAll('.stat-barre').length).toBe(2);
	});

	it('un diagramme impossible dit pourquoi', async () => {
		const atelier = new Atelier();
		atelier.create({
			kind: 'list',
			name: 'L',
			definition: Array.from({ length: 31 }, (_, i) => i).join(' ; ')
		});
		atelier.toggleChart('L', null);
		const { container } = await openData(atelier);

		expect(chartOf(container, 'L')?.textContent).toMatch(/30/);
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
