/**
 * « Ouvrir un CSV… », vu depuis l'écran : le fichier se pose comme un collage,
 * à partir de la case choisie, et Ctrl+Z le défait.
 *
 * Phase 0 `docs/wip/atelier-tableur-reste-et-ou-csv-phase0.md` §3, Q-RE-4.
 * La lecture du fichier (encodage, séparateurs) : `src/lib/atelier/__tests__/ouvrir-csv.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { MAX_CSV_BYTES } from '$lib/atelier/grid';

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
	container.querySelector(`[data-cell="${address}"]`) as HTMLElement;

/** Choisir un fichier, comme le fait la fenêtre du système, puis attendre sa lecture. */
async function chooseFile(container: HTMLElement, file: File) {
	const input = container.querySelector('input[type="file"]') as HTMLInputElement;
	const files = new DataTransfer();
	files.items.add(file);
	input.files = files.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	// `arrayBuffer()` est asynchrone
	await new Promise((r) => setTimeout(r, 50));
	await settle();
}

const csv = (text: string, name = 'classe.csv') => new File([text], name, { type: 'text/csv' });

const refusal = (container: HTMLElement) => container.querySelector('.refus')?.textContent ?? '';

describe('Ouvrir un CSV…', () => {
	it('un bouton à côté de « Télécharger en CSV », qui ouvre le choix d’un fichier', async () => {
		const { container } = await openData();
		const button = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Ouvrir un CSV…'
		);
		expect(button).toBeDefined();
		const input = container.querySelector('input[type="file"]') as HTMLInputElement;
		expect(input.accept).toContain('.csv');
		let opened = false;
		input.addEventListener('click', (event) => {
			opened = true;
			event.preventDefault();
		});
		button?.click();
		expect(opened).toBe(true);
	});

	it('le fichier se pose à partir de la case choisie, titres compris ; Ctrl+Z le défait', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'B2'));
		// Le focus sur le bouton, comme après un clic : il doit revenir à la grille (revue)
		const button = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Ouvrir un CSV…'
		) as HTMLButtonElement;
		button.focus();

		await chooseFile(container, csv('Prénom;Taille\r\nÉlodie;1,52\r\nNoé;1,48\r\n'));
		expect(document.activeElement).toBe(cellAt(container, 'B2'));

		expect(refusal(container)).toBe('');
		expect(atelier.titleOf(1)).toBe('Prénom');
		expect(atelier.titleOf(2)).toBe('Taille');
		expect(atelier.cell(1, 2)).toBe('Élodie');
		expect(atelier.cell(2, 3)).toBe('1,48');
		expect(cellAt(container, 'C3').textContent?.trim()).toBe('1,48');

		// Le focus est revenu à la grille : Ctrl+Z y défait l'ouverture entière
		await userEvent.keyboard('{Control>}z{/Control}');
		await settle();
		expect(atelier.cell(1, 2)).toBe('');
		expect(atelier.titleOf(1)).toBe('');
	});

	it('trop grand pour la grille : refusé entier, la raison est dite', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const lines = Array.from({ length: 201 }, (_, i) => String(i + 1)).join('\n');

		await chooseFile(container, csv(lines));

		expect(refusal(container)).toContain('200');
		expect(atelier.cell(0, 1)).toBe('');
	});

	it('un fichier de plus de 1 Mo n’est pas lu', async () => {
		const { container } = await openData();
		const read = vi.spyOn(File.prototype, 'arrayBuffer');
		await chooseFile(container, new File([new Uint8Array(MAX_CSV_BYTES + 1)], 'gros.csv'));
		expect(refusal(container)).toBe('Ce fichier est trop gros pour la grille (1 Mo au plus).');
		// Jamais chargé en mémoire (revue : le même message ne le prouvait pas)
		expect(read).not.toHaveBeenCalled();
		read.mockRestore();
	});

	it('une case avec « ; » : refus qui dit la case et la ligne, rien n’est posé', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);

		await chooseFile(container, csv('Nom;Remarque\nAlice;"bien; à revoir"\n'));

		expect(refusal(container)).toContain('(ligne 2 du fichier)');
		expect(atelier.cell(0, 1)).toBe('');
	});

	it('un fichier qui n’est pas un CSV (un classeur .xlsx)', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		const xlsx = new File([Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])], 'notes.xlsx');

		await chooseFile(container, xlsx);

		expect(refusal(container)).toBe(
			'Ce fichier n’est pas un tableau CSV : enregistre ton tableau au format CSV.'
		);
		expect(atelier.cell(0, 1)).toBe('');
	});
});
