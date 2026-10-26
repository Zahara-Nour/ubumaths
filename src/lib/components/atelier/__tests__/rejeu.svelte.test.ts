/**
 * Rejouer un historique depuis la vue Calcul — lot C2 de
 * `docs/archive/wip/atelier-suppression-export-phase0.md` (R1, R2, E1).
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { CalcDesk } from '$lib/atelier/desk.svelte';
import { historyToJson } from '$lib/atelier/history-export';
import { CALC_HISTORY_STORAGE_KEY } from '$lib/atelier/history-storage';

// =============================================================================
// Décor
// =============================================================================

const KEY = 'chiphre-atelier';

const settle = () => new Promise((r) => setTimeout(r, 50));

/** Un fichier d'historique, exporté par un vrai pupitre. */
function historyFile(build: (d: CalcDesk) => void): File {
	const d = new CalcDesk(new Atelier());
	build(d);
	return new File([historyToJson(d.entries, new Date())], 'calcul.json', {
		type: 'application/json'
	});
}

/** Choisir un fichier comme le ferait l'élève : `files` posé, puis `change`. */
async function choose(container: HTMLElement, file: File) {
	const input = container.querySelector('input[type="file"]') as HTMLInputElement;
	const transfer = new DataTransfer();
	transfer.items.add(file);
	input.files = transfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	await settle();
}

function dialogButton(label: string): HTMLButtonElement | undefined {
	const dialog = document.querySelector('[role="alertdialog"], [role="dialog"]');
	return [...(dialog?.querySelectorAll('button') ?? [])].find(
		(b) => b.textContent?.trim() === label
	) as HTMLButtonElement | undefined;
}

afterEach(() => localStorage.removeItem(KEY));
// Les lignes de Calcul rangées par le test d'avant (rangées au démontage, qui
// précède ce `beforeEach`) : sans ça, le rejeu demanderait confirmation
beforeEach(() => localStorage.removeItem(CALC_HISTORY_STORAGE_KEY));

// =============================================================================
// Comportements
// =============================================================================

describe('rejouer un historique', () => {
	it('il se charge par « Charger un atelier », dans la barre d’icônes (lot 1 de la refonte)', async () => {
		localStorage.removeItem(KEY);
		const { container } = await render(AtelierContainer, { atelier: new Atelier() });

		const labels = [...container.querySelectorAll('[role="toolbar"] button')].map((b) =>
			b.getAttribute('aria-label')
		);
		expect(labels).toContain('Charger un atelier');
	});

	it('atelier vide : rejoue tout de suite (R1)', async () => {
		localStorage.removeItem(KEY);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			historyFile((d) => {
				d.submit('f(x)=x^2');
				d.runFromPanel('derive', 'f');
			})
		);

		await vi.waitFor(() =>
			expect(container.textContent).toContain('Historique rejoué : 2 lignes.')
		);
		expect(atelier.names).toEqual(['f', "f'"]);
	});

	it('atelier non vide : demande avant de tout remplacer (R2)', async () => {
		localStorage.removeItem(KEY);
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			historyFile((d) => d.submit('f(x)=x^2'))
		);

		await vi.waitFor(() => expect(document.body.textContent).toContain('ton objet sera remplacé'));
		expect(atelier.names).toEqual(['g']);

		dialogButton('Rejouer')?.click();

		await vi.waitFor(() => expect(atelier.names).toEqual(['f']));
	});

	// Revue des écarts du lot 9 de verifs-auto (2026-10-26) : le rejeu vide aussi la
	// grille, mais ne demandait que s'il y avait des objets ou des lignes
	it('une grille seule : demande avant de la remplacer, et le dit', async () => {
		localStorage.removeItem(KEY);
		const atelier = new Atelier();
		atelier.editCells([{ column: 1, row: 1, text: '5' }]);
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			historyFile((d) => d.submit('f(x)=x^2'))
		);

		await vi.waitFor(() => expect(document.body.textContent).toContain('ta grille sera remplacée'));
		expect(atelier.names).toEqual([]);
		expect(atelier.isBlank).toBe(false);
	});

	it('un fichier qui n’est ni un atelier ni un historique est refusé, rien ne change (E1)', async () => {
		localStorage.removeItem(KEY);
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		const { container } = await render(AtelierContainer, { atelier });

		await choose(container, new File(['{"bonjour": 1}'], 'autre.json'));

		await vi.waitFor(() =>
			expect(container.textContent).toContain('Ce fichier n’est pas un atelier Chiphre.')
		);
		expect(atelier.names).toEqual(['g']);
	});

	it('un historique abîmé est refusé avec le message de l’historique (E1)', async () => {
		localStorage.removeItem(KEY);
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			new File(['{"format": "chiphre-calcul", "version": 1, "entries": 3}'], 'abime.json')
		);

		await vi.waitFor(() =>
			expect(container.textContent).toContain('Ce fichier n’est pas un historique de Calcul.')
		);
		expect(atelier.names).toEqual(['g']);
	});
});

// =============================================================================
// Audit de sécurité du lot C2 : un fichier venu d'un autre élève
// =============================================================================

describe('un historique piégé', () => {
	it('ne glisse ni lien javascript: ni attribut on* dans la page', async () => {
		localStorage.removeItem(KEY);
		const { container } = await render(AtelierContainer, { atelier: new Atelier() });

		await choose(
			container,
			historyFile((d) => {
				d.submit('\\href{javascript:alert(1)}{x}');
				d.submit('<img src=x onerror=alert(1)>');
				d.submit('f(x)=x^2');
			})
		);

		// Le TEXTE affiché peut contenir « javascript: » (Svelte l'échappe) : le
		// danger est dans les éléments et les attributs, c'est là qu'on regarde
		const historique = container.querySelector('.historique') as HTMLElement;
		await vi.waitFor(() => expect(historique.textContent).toContain('f(x)'));
		const elements = [...historique.querySelectorAll('*')];
		expect(historique.textContent).toContain('javascript:');
		expect(historique.querySelectorAll('img, script, iframe').length).toBe(0);
		const attributes = elements.flatMap((el) => [...el.attributes]);
		expect(attributes.filter((a) => /^on/i.test(a.name)).map((a) => a.name)).toEqual([]);
		expect(attributes.filter((a) => /javascript:/i.test(a.value)).map((a) => a.value)).toEqual([]);
	});
});
