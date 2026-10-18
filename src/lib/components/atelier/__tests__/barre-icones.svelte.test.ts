/**
 * La barre d'icônes de l'atelier — lot 1 de
 * `docs/wip/atelier-refonte-interface-phase0.md` (validé par David le 2026-10-18).
 *
 * À gauche Repartir de zéro, Charger, Enregistrer ; à droite Partager, Réglages.
 * Icônes seules : le nom est dans `aria-label` et dans l'infobulle. Un bouton
 * indisponible reste focalisable, et dit pourquoi.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { CalcDesk } from '$lib/atelier/desk.svelte';
import {
	MAX_ATELIER_FILE_BYTES,
	MAX_ATELIER_FILE_LENGTH,
	atelierFileToJson
} from '$lib/atelier/atelier-file';
import { CALC_HISTORY_STORAGE_KEY } from '$lib/atelier/history-storage';

// =============================================================================
// Décor
// =============================================================================

const KEY = 'chiphre-atelier';

const settle = () => new Promise((r) => setTimeout(r, 50));

afterEach(() => localStorage.removeItem(KEY));
beforeEach(() => {
	localStorage.removeItem(KEY);
	localStorage.removeItem(CALC_HISTORY_STORAGE_KEY);
});

function toolbar(container: HTMLElement): HTMLElement {
	const found = container.querySelector('[role="toolbar"]');
	if (!(found instanceof HTMLElement)) throw new Error('pas de barre d’icônes');
	return found;
}

function tool(container: HTMLElement, label: string): HTMLButtonElement | undefined {
	return [...toolbar(container).querySelectorAll('button')].find(
		(b) => b.getAttribute('aria-label') === label
	) as HTMLButtonElement | undefined;
}

/** La raison d'un bouton indisponible, telle qu'un lecteur d'écran la lit. */
function reasonOf(button: HTMLButtonElement): string | null {
	const id = button.getAttribute('aria-describedby');
	return id === null ? null : (document.getElementById(id)?.textContent ?? null);
}

/** Les fichiers que la page a lancés en téléchargement, sans rien enregistrer. */
function watchDownloads() {
	const files: { name: string; blob: Blob }[] = [];
	const blobs = new Map<string, Blob>();
	const create = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
		const url = `blob:test-${blobs.size}`;
		blobs.set(url, blob as Blob);
		return url;
	});
	const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
		this: HTMLAnchorElement
	) {
		const blob = blobs.get(this.href);
		if (blob) files.push({ name: this.download, blob });
	});
	return {
		files,
		restore() {
			create.mockRestore();
			click.mockRestore();
		}
	};
}

/** Choisir un fichier comme le ferait l'élève : `files` posé, puis `change`. */
async function choose(container: HTMLElement, file: File) {
	const input = toolbar(container).querySelector('input[type="file"]') as HTMLInputElement;
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

/** Un fichier `.atelier.json` écrit par un vrai atelier. */
function atelierFile(build: (atelier: Atelier, desk: CalcDesk) => void): File {
	const atelier = new Atelier();
	const desk = new CalcDesk(atelier);
	build(atelier, desk);
	const text = atelierFileToJson(atelier.serialize(), desk.entries, desk.typedInputs, new Date());
	return new File([text], 'atelier.atelier.json', { type: 'application/json' });
}

// =============================================================================
// La barre
// =============================================================================

describe('la barre d’icônes', () => {
	it('des icônes seules, nommées : à gauche les fichiers, à droite partager et régler', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier });

		const groups = [...toolbar(container).querySelectorAll('.outils')].map((group) =>
			[...group.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
		);
		expect(groups).toEqual([
			['Repartir de zéro', 'Charger un atelier', 'Enregistrer l’atelier'],
			['Partager', 'Réglages']
		]);
		// Icône seule : aucun texte visible, l'infobulle porte le nom
		for (const button of toolbar(container).querySelectorAll('button')) {
			expect(button.textContent?.trim()).toBe('');
			expect(button.getAttribute('title')).toContain(button.getAttribute('aria-label'));
		}
	});

	it('motif « barre d’outils » : un seul arrêt de tabulation, les flèches pour s’y déplacer', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier });
		const buttons = [...toolbar(container).querySelectorAll('button')];
		const press = (key: string) =>
			document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

		// Un seul bouton dans l'ordre de tabulation : le premier
		expect(buttons.filter((b) => b.tabIndex === 0)).toEqual([buttons[0]]);

		buttons[0].focus();
		press('ArrowRight');
		expect(document.activeElement).toBe(buttons[1]);
		// L'arrêt de tabulation suit le focus : Maj+Tab puis Tab revient ici
		expect(buttons.filter((b) => b.tabIndex === 0)).toEqual([buttons[1]]);

		press('End');
		expect(document.activeElement).toBe(buttons.at(-1));
		press('ArrowRight');
		expect(document.activeElement).toBe(buttons[0]);
		press('ArrowLeft');
		expect(document.activeElement).toBe(buttons.at(-1));
		press('Home');
		expect(document.activeElement).toBe(buttons[0]);
	});

	it('ni Annuler ni Rétablir avant le lot 5', async () => {
		const { container } = await render(AtelierContainer, { atelier: new Atelier() });

		const labels = [...toolbar(container).querySelectorAll('button')].map((b) =>
			b.getAttribute('aria-label')
		);
		expect(labels).not.toContain('Annuler');
		expect(labels).not.toContain('Rétablir');
	});

	it('atelier vide : Repartir de zéro, Enregistrer et Partager indisponibles, avec leur raison', async () => {
		const { container } = await render(AtelierContainer, { atelier: new Atelier() });

		const reset = tool(container, 'Repartir de zéro')!;
		const save = tool(container, 'Enregistrer l’atelier')!;
		const share = tool(container, 'Partager')!;
		for (const button of [reset, save, share]) {
			// Focalisable : `aria-disabled`, pas `disabled`
			expect(button.disabled).toBe(false);
			expect(button.getAttribute('aria-disabled')).toBe('true');
		}
		expect(reasonOf(reset)).toBe('L’atelier est déjà vide.');
		expect(reasonOf(save)).toBe('Ton atelier est vide : il n’y a rien à enregistrer.');
		expect(reasonOf(share)).toBe('Ton atelier est vide : il n’y a rien à partager.');
		expect(save.getAttribute('title')).toContain('rien à enregistrer');
		// Charger reste disponible : c'est justement le moment de charger
		expect(tool(container, 'Charger un atelier')?.getAttribute('aria-disabled')).toBeNull();
	});

	it('un bouton indisponible ne fait rien', async () => {
		const downloads = watchDownloads();
		try {
			const { container } = await render(AtelierContainer, { atelier: new Atelier() });

			tool(container, 'Enregistrer l’atelier')!.click();
			tool(container, 'Repartir de zéro')!.click();
			await settle();

			expect(downloads.files).toEqual([]);
			expect(document.querySelector('[role="alertdialog"], [role="dialog"]')).toBeNull();
		} finally {
			downloads.restore();
		}
	});

	it('sur un atelier reçu par lien : ni Repartir de zéro, ni Charger, ni Partager', async () => {
		const received = new Atelier();
		received.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, {
			atelier: received,
			ephemeral: true,
			received: received.serialize()
		});

		const labels = [...toolbar(container).querySelectorAll('button')].map((b) =>
			b.getAttribute('aria-label')
		);
		expect(labels).toEqual(['Enregistrer l’atelier', 'Réglages']);
		// Le bandeau et « Garder dans mon atelier » restent
		expect(container.textContent).toContain('Le tien n’a pas été modifié.');
		expect(container.textContent).toContain('Garder dans mon atelier');
	});
});

// =============================================================================
// Enregistrer
// =============================================================================

describe('enregistrer', () => {
	it('télécharge l’atelier entier et sa console dans un fichier .atelier.json', async () => {
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		const input = container.querySelector(
			'input[aria-label="Calcul, définition ou commande"]'
		) as HTMLInputElement;
		input.value = 'f(x)=x^2';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		(input.form as HTMLFormElement).requestSubmit();
		await vi.waitFor(() => expect(atelier.names).toEqual(['f']));
		// Une définition changée sur la carte, sans ligne dans la console
		atelier.update('f', 'x^3');
		await settle();

		const downloads = watchDownloads();
		try {
			tool(container, 'Enregistrer l’atelier')!.click();

			expect(downloads.files).toHaveLength(1);
			const [file] = downloads.files;
			expect(file.name).toMatch(/^atelier-\d{4}-\d{2}-\d{2}\.atelier\.json$/);
			const content = JSON.parse(await file.blob.text());
			expect(content.format).toBe('chiphre-atelier');
			expect(content.atelier.objects[0]).toMatchObject({ name: 'f', definition: 'x^3' });
			expect(content.history.lines.map((l: { label: string }) => l.label)).toEqual(['f(x)=x^2']);
		} finally {
			downloads.restore();
		}
	});
});

// =============================================================================
// Charger
// =============================================================================

describe('charger', () => {
	it('atelier vide : charge tout de suite, objets et console', async () => {
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			atelierFile((a, d) => {
				d.submit('f(x)=x^2');
				d.submit('a = 3');
				a.update('f', 'x^3');
			})
		);

		expect(atelier.names).toEqual(['f', 'a']);
		expect(atelier.get('f')?.definition).toBe('x^3');
		expect(container.querySelectorAll('.historique > li').length).toBe(2);
	});

	it('atelier non vide : demande avant de tout remplacer', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			atelierFile((_, d) => d.submit('f(x)=x^2'))
		);

		expect(atelier.names).toEqual(['g']);
		expect(document.body.textContent).toContain('Charger remplace l’atelier actuel');

		const confirm = dialogButton('Charger');
		expect(confirm).toBeDefined();
		confirm!.click();
		await settle();

		expect(atelier.names).toEqual(['f']);
	});

	it('renoncer garde l’atelier tel quel', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			atelierFile((_, d) => d.submit('f(x)=x^2'))
		);
		const cancel = dialogButton('Renoncer');
		expect(cancel).toBeDefined();
		cancel!.click();
		await settle();

		expect(atelier.names).toEqual(['g']);
		expect(document.querySelector('[role="alertdialog"]')).toBeNull();
	});

	it('un fichier trop gros est refusé avant d’être lu, rien ne change', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		const { container } = await render(AtelierContainer, { atelier });
		// Revue de #1479 : « avant d'être lu » se PROUVE, le contenu n'est jamais demandé
		const read = vi.spyOn(File.prototype, 'text');
		try {
			await choose(container, new File([' '.repeat(MAX_ATELIER_FILE_BYTES + 1)], 'enorme.json'));

			expect(read).not.toHaveBeenCalled();
			expect(atelier.names).toEqual(['g']);
			expect(container.textContent).toContain('Ce fichier est trop gros pour être un atelier.');
		} finally {
			read.mockRestore();
		}
	});

	it('un atelier riche en accents, plus lourd en octets qu’en caractères, se charge', async () => {
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		// 1 800 cellules de 200 « € » (3 octets chacun) : sous la limite en
		// caractères, au-dessus d'un million d'OCTETS (revue de #1479)
		const text = '€'.repeat(200);
		const file = atelierFile((a) => {
			const edits = [];
			for (let column = 0; column < 9; column++) {
				for (let row = 1; row <= 200; row++) edits.push({ column, row, text });
			}
			expect(a.editCells(edits).ok).toBe(true);
		});
		const content = await file.text();
		expect(content.length).toBeLessThanOrEqual(MAX_ATELIER_FILE_LENGTH);
		expect(file.size).toBeGreaterThan(MAX_ATELIER_FILE_LENGTH);

		await choose(container, file);

		expect(atelier.cell(8, 200)).toBe(text);
		expect(container.textContent).not.toContain('trop gros');
	});

	it('une console perdue se dit, l’atelier est chargé quand même', async () => {
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		const content = JSON.parse(await atelierFile((_, d) => d.submit('f(x)=x^2')).text());
		content.history.version = 99;

		await choose(container, new File([JSON.stringify(content)], 'recent.atelier.json'));

		expect(atelier.names).toEqual(['f']);
		expect(container.textContent).toContain(
			'La console de ce fichier vient d’une version plus récente de Chiphre'
		);
	});

	it('un objet illisible est écarté, et on le dit', async () => {
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		const content = JSON.parse(await atelierFile((_, d) => d.submit('f(x)=x^2')).text());
		content.atelier.objects.push({ name: '', kind: 'licorne' });

		await choose(container, new File([JSON.stringify(content)], 'abime.atelier.json'));

		expect(atelier.names).toEqual(['f']);
		expect(container.textContent).toContain('1 élément(s) du fichier étaient illisibles.');
	});
});
