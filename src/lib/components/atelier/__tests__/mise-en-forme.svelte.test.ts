/**
 * La mise en forme des cases, vue depuis l'écran : la barre d'outils au-dessus
 * de la grille et ce que montrent les cases.
 *
 * Phase 0 : `docs/wip/atelier-tableur-mise-en-forme-phase0.md` (Q-MF-1 à Q-MF-5).
 * Le modèle (zones, annulation, sauvegarde, lien) est testé en node :
 * `src/lib/atelier/__tests__/mise-en-forme.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
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

const cellAt = (container: HTMLElement, address: string) =>
	container.querySelector(`[data-cell="${address}"]`) as HTMLElement;

const toolbar = (container: HTMLElement) =>
	container.querySelector('[role="group"][aria-label="Mise en forme"]') as HTMLElement;

const button = (container: HTMLElement, label: string) =>
	toolbar(container).querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

/** Le déclencheur d'un choix de la barre, par le début de son nom (« Couleur du fond »). */
const trigger = (container: HTMLElement, name: string) =>
	Array.from(toolbar(container).querySelectorAll<HTMLElement>('[aria-label]')).find((el) =>
		el.getAttribute('aria-label')?.startsWith(`${name} :`)
	) as HTMLElement;

/** Choisir dans un `MySelect` : un vrai clic, bits-ui écoute le pointeur. */
async function choose(container: HTMLElement, name: string, option: string) {
	await userEvent.click(trigger(container, name));
	await settle();
	const item = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
		(el) => el.textContent?.trim() === option
	);
	if (item === undefined) throw new Error(`option « ${option} » absente`);
	await userEvent.click(item);
	await settle();
}

/** Le texte d'une case ; les espaces insécables (`Intl` : fine ou non, selon le moteur) en espaces. */
const shown = (container: HTMLElement, address: string) =>
	cellAt(container, address)
		.textContent?.trim()
		.replace(/[\u00a0\u202f]/g, ' ');

describe('la barre de mise en forme', () => {
	it('met en gras toute la zone sélectionnée, et le bouton le dit (aria-pressed)', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '12' },
			{ column: 0, row: 2, text: '15' }
		]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1'));
		await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
		await settle();
		expect(button(container, 'Gras').getAttribute('aria-pressed')).toBe('false');

		await userEvent.click(button(container, 'Gras'));
		await settle();

		expect(cellAt(container, 'A1').classList.contains('gras')).toBe(true);
		expect(cellAt(container, 'A2').classList.contains('gras')).toBe(true);
		expect(cellAt(container, 'A3').classList.contains('gras')).toBe(false);
		expect(button(container, 'Gras').getAttribute('aria-pressed')).toBe('true');
		// Le focus revient à la grille : Ctrl+Z y défait le geste (leçon de « Relancer »)
		expect(document.activeElement).toBe(cellAt(container, 'A2'));
	});

	it('Ctrl+B et Ctrl+I basculent gras et italique ; Ctrl+Z défait', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 1, row: 2, text: 'note' }]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'B2'));
		await userEvent.keyboard('{Control>}b{/Control}');
		await settle();
		expect(cellAt(container, 'B2').classList.contains('gras')).toBe(true);

		await userEvent.keyboard('{Control>}i{/Control}');
		await settle();
		expect(cellAt(container, 'B2').classList.contains('italique')).toBe(true);
		expect(button(container, 'Italique').getAttribute('aria-pressed')).toBe('true');

		await userEvent.keyboard('{Control>}b{/Control}');
		await settle();
		expect(cellAt(container, 'B2').classList.contains('gras')).toBe(false);

		await userEvent.keyboard('{Control>}z{/Control}');
		await settle();
		expect(cellAt(container, 'B2').classList.contains('gras')).toBe(true);
		// La case n'a pas été vidée par une frappe : seul l'affichage a changé
		expect(atelier.cell(1, 2)).toBe('note');
	});

	it('un alignement choisi remplace celui de la grille ; appuyé de nouveau, il est retiré', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '12' }]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1'));
		await userEvent.click(button(container, 'Centrer'));
		await settle();
		expect(cellAt(container, 'A1').style.textAlign).toBe('center');
		expect(button(container, 'Centrer').getAttribute('aria-pressed')).toBe('true');

		await userEvent.click(button(container, 'Centrer'));
		await settle();
		// De retour à la règle de la grille : un nombre à droite
		expect(cellAt(container, 'A1').style.textAlign).toBe('');
		expect(getComputedStyle(cellAt(container, 'A1')).textAlign).toBe('right');
	});

	it('couleurs du texte et du fond, du thème ; « Effacer la mise en forme » les retire', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '3' }]);
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'A1'));

		await choose(container, 'Couleur du texte', 'Bleu');
		await choose(container, 'Couleur du fond', 'Jaune');

		const cell = cellAt(container, 'A1');
		expect(cell.getAttribute('style')).toContain('--texte: light-dark(');
		expect(cell.getAttribute('style')).toContain('var(--color-fig-bleu)');
		expect(cell.getAttribute('style')).toContain('var(--color-fig-jaune)');
		// Le choix annonce la couleur CHOISIE (audit a11y de MySelect)
		expect(trigger(container, 'Couleur du fond').getAttribute('aria-label')).toBe(
			'Couleur du fond : jaune'
		);

		await userEvent.click(toolbar(container).querySelector('.effacer') as HTMLElement);
		await settle();
		expect(cellAt(container, 'A1').getAttribute('style')).toBeNull();
		expect(trigger(container, 'Couleur du fond').getAttribute('aria-label')).toBe(
			'Couleur du fond : aucune'
		);
		expect(atelier.formats).toEqual([]);
	});
});

describe('le format de nombre (Q-MF-1)', () => {
	it('arrondit l’affichage, jamais la valeur ; la valeur exacte reste sous la barre', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '=1/3' },
			{ column: 1, row: 1, text: '=A1*3' }
		]);
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'A1'));

		await choose(container, 'Format de nombre', 'Nombre');

		expect(shown(container, 'A1')).toBe('0,33');
		expect(cellAt(container, 'A1').getAttribute('aria-label')).toBe('A1 : 0,33');
		// La formule qui la cite calcule avec 1/3, pas avec 0,33
		expect(shown(container, 'B1')).toBe('1');
		expect(container.querySelector('.valeur-exacte')?.textContent).toContain('Valeur exacte');
		expect((container.querySelector('#atelier-barre-cellule') as HTMLInputElement).value).toBe(
			'=1/3'
		);

		await choose(container, 'Décimales', '4 décimales');
		expect(shown(container, 'A1')).toBe('0,3333');
	});

	it('pourcentage et monnaie ; un mot n’est pas touché', async () => {
		const atelier = new Atelier();
		atelier.editCells([
			{ column: 0, row: 1, text: '0,125' },
			{ column: 0, row: 2, text: '12,5' },
			{ column: 0, row: 3, text: 'absent' }
		]);
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1'));
		await choose(container, 'Format de nombre', 'Pourcentage');
		// V4 : un pourcentage sans décimale ; on en ajoute une
		expect(shown(container, 'A1')).toBe('13 %');
		await choose(container, 'Décimales', '1 décimale');
		expect(shown(container, 'A1')).toBe('12,5 %');

		await userEvent.click(cellAt(container, 'A2'));
		await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
		await choose(container, 'Format de nombre', 'Monnaie (€)');
		expect(shown(container, 'A2')).toBe('12,50 €');
		expect(shown(container, 'A3')).toBe('absent');

		await choose(container, 'Format de nombre', 'Écriture exacte');
		expect(shown(container, 'A2')).toBe('12,5');
		expect(trigger(container, 'Décimales')).toBeUndefined();
	});
});

describe('copier-coller dans la grille (Q-MF-4)', () => {
	function clipboard(target: Element, type: 'paste' | 'copy', data = new DataTransfer()) {
		target.dispatchEvent(
			new ClipboardEvent(type, { clipboardData: data, bubbles: true, cancelable: true })
		);
		return data;
	}

	it('la mise en forme suit la copie ; un collage venu d’ailleurs n’apporte que les valeurs', async () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '2' }]);
		atelier.applyStyle({ left: 0, right: 0, top: 1, bottom: 1 }, { bold: true, fill: 'vert' });
		const { container } = await openData(atelier);

		await userEvent.click(cellAt(container, 'A1'));
		const copied = clipboard(cellAt(container, 'A1'), 'copy');
		await userEvent.click(cellAt(container, 'C3'));
		clipboard(cellAt(container, 'C3'), 'paste', copied);
		await settle();

		expect(atelier.cell(2, 3)).toBe('2');
		expect(atelier.styleAt(2, 3)).toEqual({ bold: true, fill: 'vert' });
		expect(cellAt(container, 'C3').classList.contains('gras')).toBe(true);

		// Un texte venu d'un autre logiciel : la valeur seule, la mise en forme d'avant reste
		const outside = new DataTransfer();
		outside.setData('text/plain', '7\t8');
		await userEvent.click(cellAt(container, 'C3'));
		clipboard(cellAt(container, 'C3'), 'paste', outside);
		await settle();
		expect(atelier.cell(3, 3)).toBe('8');
		expect(atelier.styleAt(3, 3)).toEqual({});
	});

	it('des styles forgés dans le presse-papiers sont ignorés, le collage passe', async () => {
		const atelier = new Atelier();
		const { container } = await openData(atelier);
		await userEvent.click(cellAt(container, 'B2'));

		const data = new DataTransfer();
		data.setData('text/plain', '5');
		data.setData(
			'application/x-chiphre-grille',
			JSON.stringify({
				origin: { column: 0, row: 1 },
				cells: [['5']],
				styles: [[{ color: 'url(javascript:alert(1))' }]]
			})
		);
		clipboard(cellAt(container, 'B2'), 'paste', data);
		await settle();

		expect(atelier.cell(1, 2)).toBe('5');
		expect(atelier.styleAt(1, 2)).toEqual({});
		expect(cellAt(container, 'B2').getAttribute('style')).toBeNull();
	});
});
