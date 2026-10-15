/**
 * La vue Données, vue depuis l'écran : la grille (tableur intégré, lot 1).
 *
 * Phase 0 : `docs/wip/atelier-tableur-phase0.md` §1 à §3. Une liste est une
 * colonne NOMMÉE ; une cellule se lit comme une entrée de liste (`1,5`, `1/6`,
 * sinon un mot). La virgule reste décimale (§4 E2 de la v1).
 */

import { describe, it, expect, vi } from 'vitest';
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
// PR 2 : coller, copier, télécharger, titres (§4, T4)
// =============================================================================

/** Un vrai `ClipboardEvent`, comme le navigateur l'envoie à la cellule qui a le focus. */
function clipboard(target: Element, type: 'paste' | 'copy', text = ''): DataTransfer {
	const data = new DataTransfer();
	if (text !== '') data.setData('text/plain', text);
	target.dispatchEvent(
		new ClipboardEvent(type, { clipboardData: data, bubbles: true, cancelable: true })
	);
	return data;
}

describe('coller et copier (§4)', () => {
	it('un tableau collé se pose à partir de la cellule, la ligne de mots devient les titres', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'B1')!);
		clipboard(cellAt(container, 'B1')!, 'paste', 'Taille\tMasse\n152\t41,5\n160\t48\n');
		await settle();

		expect(cellAt(container, 'B2')?.textContent?.trim()).toBe('160');
		expect(cellAt(container, 'C1')?.textContent?.trim()).toBe('41,5');
		expect(atelier.titleOf(1)).toBe('Taille');
		const title = headerOf(container, 'C')?.querySelector('input.titre') as HTMLInputElement;
		expect(title.value).toBe('Masse');
	});

	it('un collage qui déborde est refusé entier, et le dit', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const tall = Array.from({ length: 250 }, (_, i) => `${i}`).join('\n');

		await userEvent.click(cellAt(container, 'A1')!);
		clipboard(cellAt(container, 'A1')!, 'paste', tall);
		await settle();

		expect(container.querySelector('.refus')?.textContent).toContain('250 lignes');
		expect(atelier.cell(0, 1)).toBe('');
	});

	it('Maj + flèche étend la sélection ; copier écrit des décimaux à virgule', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '1/4' },
			{ column: 0, row: 2, text: '7' },
			{ column: 1, row: 1, text: 'fille' }
		]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowRight}{/Shift}');
		await settle();
		expect(cellAt(container, 'B2')?.getAttribute('aria-selected')).toBe('true');
		expect(cellAt(container, 'A1')?.getAttribute('aria-selected')).toBe('true');

		const data = clipboard(cellAt(container, 'B2')!, 'copy');

		expect(data.getData('text/plain')).toBe('0,25\tfille\n7\t');
	});

	// Le vrai chemin du clavier : Ctrl+C / Ctrl+V passent par le relais (Safari)
	it('Ctrl+C puis Ctrl+V au clavier recopient la zone ailleurs', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '12' },
			{ column: 0, row: 2, text: '15' }
		]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}{ControlOrMeta>}c{/ControlOrMeta}');
		await settle();
		await userEvent.click(cellAt(container, 'C3')!);
		await userEvent.keyboard('{ControlOrMeta>}v{/ControlOrMeta}');
		await settle();

		expect(atelier.cell(2, 3)).toBe('12');
		expect(atelier.cell(2, 4)).toBe('15');
		expect(document.activeElement).toBe(cellAt(container, 'C3'));
	});

	// Revue de la PR 2 (bloquant) : la frappe était perdue en cliquant ailleurs
	it('taper puis cliquer une autre cellule garde la valeur', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('12');
		await userEvent.click(cellAt(container, 'B3')!);
		await settle();
		expect(atelier.cell(0, 1)).toBe('12');

		await userEvent.click(cellAt(container, 'A2')!);
		await userEvent.click(bar);
		await userEvent.keyboard('7');
		await userEvent.click(cellAt(container, 'B3')!);
		await settle();
		expect(atelier.cell(0, 2)).toBe('7');
	});

	it('coller une valeur dans la barre l’insère au curseur, comme un champ', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '12' }]);
		const { container } = await openData(atelier);
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.click(bar);
		const data = clipboard(bar, 'paste', '5');
		await settle();

		expect(atelier.cell(0, 1)).toBe('12');
		expect(data.getData('text/plain')).toBe('5');
	});

	// Revue : copier puis coller DANS la grille gardait le décimal (1/3 → 0,333…)
	it('copier puis coller dans la grille garde le texte exact', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '1/3' }]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('{ControlOrMeta>}c{/ControlOrMeta}');
		await userEvent.click(cellAt(container, 'B1')!);
		await userEvent.keyboard('{ControlOrMeta>}v{/ControlOrMeta}');
		await settle();

		expect(atelier.cell(1, 1)).toBe('1/3');
	});

	// Lot 2 §5 : vers un autre logiciel partent les VALEURS ; dans la grille, la formule
	it('copier une formule : sa valeur pour les tableurs, la formule pour la grille', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '2' },
			{ column: 0, row: 2, text: '=A1/4' }
		]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A2')!);
		const data = clipboard(cellAt(container, 'A2')!, 'copy');

		expect(data.getData('text/plain')).toBe('0,5');
		// La formule exacte, et la case d'où elle part (Q-L2-4 : le collage la décale)
		expect(JSON.parse(data.getData('application/x-chiphre-grille'))).toEqual({
			origin: { column: 0, row: 2 },
			cells: [['=A1/4']]
		});
	});

	it('Suppr vide toute la zone sélectionnée', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '1' },
			{ column: 0, row: 2, text: '2' },
			{ column: 0, row: 3, text: '3' }
		]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}{Delete}');
		await settle();

		expect(atelier.cell(0, 1)).toBe('');
		expect(atelier.cell(0, 2)).toBe('');
		expect(atelier.cell(0, 3)).toBe('3');
	});

	it('le titre d’une colonne se tape dans son en-tête', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const title = headerOf(container, 'A')!.querySelector('input.titre') as HTMLInputElement;

		await userEvent.click(title);
		await userEvent.keyboard('Taille{Enter}');
		await settle();

		expect(atelier.titleOf(0)).toBe('Taille');
	});

	it('« Télécharger en CSV » : « ; », virgule décimale, titres en tête', async () => {
		const atelier = new Atelier();
		atelier.setTitle(0, 'Taille');
		atelier.editCells([
			{ column: 0, row: 1, text: '1/2' },
			{ column: 1, row: 1, text: 'fille' }
		]);
		const { container } = await openData(atelier);
		let written: Blob | null = null;
		const create = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
			written = blob as Blob;
			return 'blob:grille';
		});

		const button = [...container.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Télécharger en CSV'
		) as HTMLButtonElement;
		button.click();
		await settle();
		create.mockRestore();

		const blob = written as Blob | null;
		// La marque UTF-8 en tête (EF BB BF), pour qu'Excel lise les accents ;
		// `text()` la retire au décodage
		const bytes = new Uint8Array((await blob?.arrayBuffer()) ?? new ArrayBuffer(0));
		expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
		expect(await blob?.text()).toBe('Taille;\r\n0,5;fille\r\n');
	});

	it('« Télécharger en CSV » est désactivé, avec sa raison, quand la grille est vide', async () => {
		const { container } = await openData();

		const button = [...container.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Télécharger en CSV'
		) as HTMLButtonElement;

		expect(button.disabled).toBe(true);
		expect(button.title).toContain('vide');
	});

	// Lot 2 : une formule se calcule ; la case montre la valeur, la barre la formule
	it('une formule montre sa valeur, la barre montre la formule', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('3{Enter}');
		await userEvent.keyboard('=a1/6+1/6{Enter}');
		await userEvent.click(cellAt(container, 'A2')!);
		await settle();

		// Un nombre s'écrit en texte, comme un nombre tapé ; l'étiquette lue en français
		expect(cellAt(container, 'A2')?.textContent?.trim()).toBe('2/3');
		expect(cellAt(container, 'A2')?.getAttribute('aria-label')).toBe('A2 : 2/3');
		expect(bar.value).toBe('=A1/6+1/6');
	});

	// Lot 2 PR 2 : la valeur exacte en écriture mathématique
	it('une racine s’écrit en écriture mathématique dans la case', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '=sqrt(8)' }]);
		const { container } = await openData(atelier);

		const cell = cellAt(container, 'A1')!;
		expect(cell.querySelector('.ML__latex')).not.toBeNull();
		expect(cell.getAttribute('aria-label')).toContain('A1');
	});

	it('une case ≈ dont la valeur est exacte : l’écriture exacte sous la barre', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '=1/123456789+1/7' }]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await settle();

		expect(cellAt(container, 'A1')?.textContent).toContain('≈');
		expect(container.querySelector('.valeur-exacte')?.textContent).toContain('Valeur exacte');
		expect(container.querySelector('.valeur-exacte .ML__latex')).not.toBeNull();
	});

	// Q-L3-2 (lot 3) : la case écrit le décimal, la fraction se voit à la sélection
	it('un décimal fini dans la case : sa fraction sous la barre', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '=509/128' }]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await settle();

		expect(cellAt(container, 'A1')?.textContent).toContain('3,9765625');
		expect(container.querySelector('.valeur-exacte')?.textContent).toContain('Valeur exacte');
	});

	it('une valeur exacte déjà écrite dans la case : pas de « Valeur exacte » en double', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '=1/3' },
			{ column: 0, row: 2, text: '=2' }
		]);
		const { container } = await openData(atelier);

		for (const cell of ['A1', 'A2']) {
			await userEvent.click(cellAt(container, cell)!);
			await settle();
			expect(container.querySelector('.valeur-exacte'), cell).toBeNull();
		}
	});

	it('la carte d’une liste à formules montre ses valeurs, « calculée dans la grille »', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '1' },
			{ column: 0, row: 2, text: '=A1*2' }
		]);
		atelier.nameColumn(0, 'L');
		const { container } = await openData(atelier);

		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'L'
		);
		expect(carte?.textContent).toContain('1 ; 2');
		expect(carte?.textContent).toContain('calculée dans la grille');
		expect(carte?.textContent).not.toContain('=A1');
	});

	// Revue : la carte montre ce que montre la grille, jamais 0,3333333333333333
	it('la carte d’une liste à formules écrit ses valeurs comme la grille', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '=1/3' },
			{ column: 0, row: 2, text: '=k' }
		]);
		atelier.nameColumn(0, 'L');
		const { container } = await openData(atelier);

		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'L'
		);
		expect(carte?.textContent).toContain('1/3 ; erreur');
		expect(carte?.textContent).not.toContain('0,333');
	});

	it('supprimer une liste citée par des cellules demande confirmation, et le dit', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '3 ; 4' });
		atelier.editCells([{ column: 1, row: 1, text: '=A1*2' }]);
		const { container } = await openData(atelier);
		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'L'
		);
		(carte?.querySelector('button') as HTMLButtonElement).click();
		await settle();
		const supprimer = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Supprimer'
		) as HTMLButtonElement;
		supprimer.click();
		await settle();

		expect(atelier.get('L')).toBeDefined();
		expect(document.body.textContent).toContain('1 cellule de la grille la cite');
	});

	// Q-L2-1 : un mot court dans la case, la phrase sous la barre
	it('une formule en erreur : « erreur » dans la case, la phrase sous la barre', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 1, row: 1, text: '=k*2' }]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'B1')!);
		await settle();

		expect(cellAt(container, 'B1')?.textContent?.trim()).toBe('erreur');
		expect(container.querySelector('.note')?.textContent).toContain(
			'k n’est pas défini dans l’atelier'
		);
	});
});

// =============================================================================
// PR 3a : annuler dans la grille (T6)
// =============================================================================

describe('annuler dans la grille (T6)', () => {
	it('Ctrl/⌘+Z annule la saisie, Ctrl/⌘+Maj+Z la rétablit', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('12{Enter}');
		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
		await settle();
		expect(atelier.cell(0, 1)).toBe('');

		await userEvent.keyboard('{ControlOrMeta>}{Shift>}z{/Shift}{/ControlOrMeta}');
		await settle();
		expect(atelier.cell(0, 1)).toBe('12');
	});

	// Revue de la PR 3a : le geste le plus RÉCENT s'annule d'abord — une
	// suppression de carte faite après une saisie passe avant la saisie
	it('saisie puis suppression de carte : Ctrl+Z annule la suppression, pas la saisie', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });
		atelier.editCells([{ column: 1, row: 1, text: '5' }]);
		const { container } = await openData(atelier);
		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'a'
		);
		(carte?.querySelector('button') as HTMLButtonElement).click();
		await settle();
		const supprimer = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Supprimer'
		) as HTMLButtonElement;
		supprimer.click();
		await settle();
		expect(atelier.get('a')).toBeUndefined();

		await userEvent.click(cellAt(container, 'B1')!);
		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
		await settle();

		expect(atelier.get('a')).toBeDefined();
		expect(atelier.cell(1, 1)).toBe('5');
	});

	// Suppression PUIS saisie : Ctrl+Z annule la saisie, et l'atelier ne tente
	// pas en plus d'annuler la suppression (refusée, elle afficherait un
	// avertissement hors sujet)
	it('suppression puis saisie : Ctrl+Z annule la saisie, la carte reste supprimée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });
		const { container } = await openData(atelier);
		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'a'
		);
		(carte?.querySelector('button') as HTMLButtonElement).click();
		await settle();
		const supprimer = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Supprimer'
		) as HTMLButtonElement;
		supprimer.click();
		await settle();
		const undoRemoval = vi.spyOn(atelier, 'undoRemoval');

		await userEvent.click(cellAt(container, 'B1')!);
		await userEvent.keyboard('5{Enter}');
		await userEvent.click(cellAt(container, 'B1')!);
		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
		await settle();

		expect(atelier.cell(1, 1)).toBe('');
		expect(atelier.get('a')).toBeUndefined();
		expect(undoRemoval).not.toHaveBeenCalled();
		undoRemoval.mockRestore();
	});

	// Revue : avec un historique vide, Ctrl+Z sur une cellule doit laisser
	// l'atelier annuler la dernière suppression de carte, comme avant la grille
	it('historique de la grille vide : Ctrl+Z sur une cellule annule la suppression de carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });
		const { container } = await openData(atelier);
		const carte = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'a'
		);
		(carte?.querySelector('button') as HTMLButtonElement).click();
		await settle();
		const supprimer = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Supprimer'
		) as HTMLButtonElement;
		supprimer.click();
		await settle();

		await userEvent.click(cellAt(container, 'B1')!);
		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
		await settle();

		expect(atelier.get('a')).toBeDefined();
	});

	it('les boutons « Annuler » et « Rétablir » : désactivés avec leur raison quand il n’y a rien', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const button = (label: string) =>
			[...container.querySelectorAll('.outils button')].find(
				(b) => b.textContent?.trim() === label
			) as HTMLButtonElement;

		expect(button('Annuler').disabled).toBe(true);
		expect(button('Annuler').title).toContain('Rien à annuler');

		atelier.editCells([{ column: 0, row: 1, text: '3' }]);
		await settle();
		button('Annuler').click();
		await settle();

		expect(atelier.cell(0, 1)).toBe('');
		expect(button('Rétablir').disabled).toBe(false);
	});
});

// =============================================================================
// Lot 2 PR 3 : recopier (§5, Q-L2-2, Q-L2-4)
// =============================================================================

// Lot 5 PR 2 : « Relancer » (Q-L5-2, Q-L5-3)
describe('Relancer', () => {
	function dice() {
		const atelier = new Atelier();
		atelier.editCells(
			Array.from({ length: 20 }, (_, i) => ({
				column: 0,
				row: i + 1,
				text: '=ALEA.ENTRE.BORNES(1;6)'
			}))
		);
		return atelier;
	}
	const faces = (atelier: Atelier) =>
		Array.from({ length: 20 }, (_, i) => {
			const v = atelier.cellValue(0, i + 1);
			return v.kind === 'number' ? v.value : 0;
		});
	const relaunchButton = (container: HTMLElement) =>
		[...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Relancer');

	it('le bouton n’apparaît que s’il y a du hasard', async () => {
		const { container } = await openData(new Atelier());
		expect(relaunchButton(container)).toBeUndefined();

		const other = await openData(dice());
		expect(relaunchButton(other.container)).toBeDefined();
	});

	it('cliquer tire de nouveau, l’annonce compte les cases ; Ctrl+Z revient', async () => {
		const atelier = dice();
		const { container } = await openData(atelier);
		const before = faces(atelier);

		await userEvent.click(relaunchButton(container)!);
		await settle();

		expect(faces(atelier)).not.toEqual(before);
		expect(container.querySelector('.annonce-tirage')?.textContent).toContain(
			'Nouveaux tirages : 20 cases.'
		);
		await userEvent.click(cellAt(container, 'C1')!);
		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
		await settle();
		expect(faces(atelier)).toEqual(before);
	});

	// Revue : le focus restait sur le bouton, hors de la grille — Ctrl+Z n'y
	// annulait rien (et annulait une suppression de carte si un toast était là)
	it('Ctrl+Z juste après le clic, sans toucher une case : les tirages d’avant', async () => {
		const atelier = dice();
		const { container } = await openData(atelier);
		const before = faces(atelier);

		await userEvent.click(relaunchButton(container)!);
		await settle();
		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
		await settle();

		expect(faces(atelier)).toEqual(before);
	});

	it('F9 maintenu (répétition) ou avec Ctrl : rien de plus', async () => {
		const atelier = dice();
		await openData(atelier);
		const press = (init: KeyboardEventInit) =>
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', cancelable: true, ...init }));

		press({});
		press({ repeat: true });
		press({ repeat: true });
		press({ ctrlKey: true });
		await settle();

		expect(atelier.gridHistory.undo).toBe(2);
	});

	it('F9 relance aussi, depuis une case', async () => {
		const atelier = dice();
		const { container } = await openData(atelier);
		const before = faces(atelier);

		await userEvent.click(cellAt(container, 'C1')!);
		await userEvent.keyboard('{F9}');
		await settle();

		expect(faces(atelier)).not.toEqual(before);
	});
});

// Lot 4 PR 2 : l'aide sous la barre (§5)
describe('l’aide des fonctions sous la barre', () => {
	it('pendant la frappe d’une fonction, sa forme ; rien après Échap', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('=MOYENNE(A1');
		await settle();

		const hint = container.querySelector('.aide-formule');
		expect(hint?.textContent).toContain('MOYENNE(plage ; …) — la moyenne des nombres');
		expect(bar.getAttribute('aria-describedby')).toBe(hint?.id);

		await userEvent.keyboard('{Escape}');
		await settle();
		expect(container.querySelector('.aide-formule')).toBeNull();
	});

	it('une saisie qui n’est pas une fonction : pas d’aide', async () => {
		const { container } = await openData(new Atelier());

		await userEvent.click(cellAt(container, 'A1')!);
		await userEvent.keyboard('=A2+1');
		await settle();

		expect(container.querySelector('.aide-formule')).toBeNull();
	});
});

describe('recopier (§5)', () => {
	function grid() {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '1' },
			{ column: 0, row: 2, text: '=A1*2' }
		]);
		return atelier;
	}

	it('Ctrl/⌘+D recopie la première ligne de la zone vers le bas', async () => {
		const atelier = grid();
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A2')!);
		await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowDown}{ArrowDown}{/Shift}');
		await userEvent.keyboard('{ControlOrMeta>}d{/ControlOrMeta}');
		await settle();

		expect(atelier.cell(0, 5)).toBe('=A4*2');
		expect(atelier.cellValue(0, 5)).toMatchObject({ kind: 'number', value: 16 });
	});

	it('la poignée tirée vers le bas recopie jusqu’à la case lâchée', async () => {
		const atelier = grid();
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'A2')!);
		await settle();

		const handle = container.querySelector('.poignee') as HTMLElement;
		handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }));
		cellAt(container, 'A4')!.dispatchEvent(new PointerEvent('pointerenter', { buttons: 1 }));
		window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
		await settle();

		expect(atelier.cell(0, 4)).toBe('=A3*2');
		expect(atelier.cell(0, 5)).toBe('');
	});

	it('« Recopier vers le bas… » demande jusqu’à quelle ligne (tablette, Q-L2-2)', async () => {
		const atelier = grid();
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'A2')!);

		const button = [...container.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Recopier vers le bas…'
		) as HTMLButtonElement;
		await userEvent.click(button);
		const field = container.querySelector('input.recopie') as HTMLInputElement;
		await userEvent.fill(field, '6');
		await userEvent.keyboard('{Enter}');
		await settle();

		expect(atelier.cell(0, 6)).toBe('=A5*2');
	});

	it('copier-coller une formule dans la grille décale ses références (Q-L2-4)', async () => {
		const atelier = grid();
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A2')!);
		await userEvent.keyboard('{ControlOrMeta>}c{/ControlOrMeta}');
		await userEvent.click(cellAt(container, 'C5')!);
		await userEvent.keyboard('{ControlOrMeta>}v{/ControlOrMeta}');
		await settle();

		expect(atelier.cell(2, 5)).toBe('=C4*2');
	});

	// Revue de la PR 3 : un `pointerup` perdu (relâché hors du navigateur)
	// laissait une recopie en attente, lancée au clic suivant
	it('une poignée relâchée hors de la fenêtre ne recopie rien au clic suivant', async () => {
		const atelier = grid();
		atelier.editCells([{ column: 2, row: 1, text: '9' }]);
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'A2')!);
		await settle();

		const handle = container.querySelector('.poignee') as HTMLElement;
		handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }));
		cellAt(container, 'A4')!.dispatchEvent(new PointerEvent('pointerenter', { buttons: 1 }));
		await userEvent.click(cellAt(container, 'C1')!);
		await settle();

		expect(atelier.cell(2, 2)).toBe('');
		expect(atelier.cell(0, 4)).toBe('');
	});

	it('un geste annulé (pointercancel) abandonne la recopie', async () => {
		const atelier = grid();
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'A2')!);
		await settle();

		const handle = container.querySelector('.poignee') as HTMLElement;
		handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }));
		cellAt(container, 'A4')!.dispatchEvent(new PointerEvent('pointerenter', { buttons: 1 }));
		window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
		window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
		await settle();

		expect(atelier.cell(0, 4)).toBe('');
	});

	it('Ctrl/⌘+D pendant une frappe n’ouvre pas les favoris du navigateur', async () => {
		const atelier = grid();
		const { container } = await openData(atelier);
		await userEvent.dblClick(cellAt(container, 'A3')!);
		await settle();
		const field = cellAt(container, 'A3')!.querySelector('input') as HTMLInputElement;
		const bar = container.querySelector('#atelier-barre-cellule') as HTMLInputElement;

		for (const target of [field, bar]) {
			const key = new KeyboardEvent('keydown', {
				key: 'd',
				ctrlKey: true,
				bubbles: true,
				cancelable: true
			});
			target.dispatchEvent(key);
			expect(key.defaultPrevented).toBe(true);
		}
		expect(atelier.cell(0, 3)).toBe('');
	});

	it('une origine forgée dans le presse-papiers est ignorée', async () => {
		const atelier = grid();
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'C5')!);
		await settle();

		const data = new DataTransfer();
		data.setData('text/plain', '=A1*2');
		data.setData(
			'application/x-chiphre-grille',
			JSON.stringify({ origin: { column: 0.5, row: 2 }, cells: [['=A1*2']] })
		);
		cellAt(container, 'C5')!.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
		);
		await settle();

		expect(atelier.cell(2, 5)).toBe('=A1*2');
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

	// P1 : le diagramme avec effectifs dit les lignes qu'il écarte
	it('avec effectifs : la ligne sans effectif est écartée, et c’est écrit sous le diagramme', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '2 ; 3 ; 3' });
		atelier.create({ kind: 'list', name: 'M', definition: '1 ;  ; 4' });
		atelier.toggleChart('L', 'M');
		const { container } = await openData(atelier);

		expect(chartOf(container, 'L')?.textContent).toContain('1 ligne incomplète écartée');
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
