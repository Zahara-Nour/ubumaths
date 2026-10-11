/**
 * Carnet d'ÉLÈVE lu par quelqu'un d'autre (le prof) — décision de David, 2026-10-04.
 *
 * Audit du 2026-10-04 : le markdown des cellules, les sorties `text/plain`
 * (rendues en formule MathLive) et `text/html` (DOMPurify laisse `style` et
 * `img src`) permettaient à un élève de recouvrir l'écran du prof ou de lui
 * faire charger une URL. Et le bouton « Exécuter » faisait tourner le code de
 * l'élève avec la session du prof.
 *
 * Rendu restreint (même moteur que le chat : `MarkdownRenderer restricted`,
 * `hasUnsafeMathCommand`) et aucune exécution. L'auteur, lui, garde tout.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownCell from '../MarkdownCell.svelte';
import CellOutputs from '../CellOutputs.svelte';
import NotebookCell from '../NotebookCell.svelte';
import NotebookToolbar from '../NotebookToolbar.svelte';
import NotebookCodeSlide from '../presentation/NotebookCodeSlide.svelte';
import NotebookCheckpointSlide from '../presentation/NotebookCheckpointSlide.svelte';
import { NotebookStore } from '$lib/stores/notebookStore.svelte';
import type {
	CellOutput,
	CheckpointCell as CheckpointCellType,
	NotebookCell as NotebookCellType
} from '$lib/types/notebook';

const HOTE = 'exemple.invalid';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

/** Tous les éléments, shadow DOM des formules compris */
function allElements(root: Element | ShadowRoot): Element[] {
	const out: Element[] = [];
	for (const el of root.querySelectorAll('*')) {
		out.push(el);
		if (el.shadowRoot) out.push(...allElements(el.shadowRoot));
	}
	return out;
}

/** Les attributs qui feraient une requête vers l'hôte hostile */
function hostileAttributes(root: Element): string[] {
	return allElements(root).flatMap((el) =>
		['src', 'srcset', 'href', 'style']
			.map((a) => el.getAttribute(a))
			.filter((v): v is string => v !== null && v.includes(HOTE))
	);
}

/** Styles posés par le contenu (recouvrement d'écran) */
function styleAttributesContaining(root: Element, needle: string): string[] {
	return allElements(root)
		.map((el) => el.getAttribute('style'))
		.filter((v): v is string => v !== null && v.includes(needle));
}

function markdownCell(source: string): NotebookCellType {
	return {
		id: 'm1',
		type: 'markdown',
		source,
		execution_count: null,
		outputs: [],
		state: 'idle'
	} as NotebookCellType;
}

function codeCell(): NotebookCellType {
	return {
		id: 'c1',
		type: 'code',
		source: 'print(1)',
		execution_count: null,
		outputs: [],
		state: 'idle'
	} as NotebookCellType;
}

const MARKDOWN_HOSTILE = [
	'Bonjour',
	'',
	`$\\htmlStyle{position:fixed;inset:0;background-image:url(https://${HOTE}/a.png)}{x}$`,
	'',
	`$\\colorbox{zz;position:fixed;background-image:url(https://${HOTE}/b.png)}{y}$`,
	'',
	`![piège](https://${HOTE}/c.png)`
].join('\n');

async function shownMarkdown(source: string, restricted: boolean): Promise<HTMLElement> {
	const screen = await render(MarkdownCell, {
		target: mainElement(),
		props: { cell: markdownCell(source), isReadonly: true, restricted }
	});
	return screen.container as HTMLElement;
}

async function shownOutputs(outputs: CellOutput[], restricted: boolean): Promise<HTMLElement> {
	const screen = await render(CellOutputs, {
		target: mainElement(),
		props: { outputs, restricted }
	});
	return screen.container as HTMLElement;
}

describe('Cellule markdown d’élève vue par le prof (restreint)', () => {
	it('ni \\htmlStyle, ni \\colorbox, ni image externe', async () => {
		const el = await shownMarkdown(MARKDOWN_HOSTILE, true);
		await expect.poll(() => el.textContent).toContain('Bonjour');
		// Les formules dangereuses ne passent pas par MathLive
		expect(el.querySelector('math-span')).toBeNull();
		expect(el.querySelector('img')).toBeNull();
		expect(hostileAttributes(el)).toEqual([]);
		expect(styleAttributesContaining(el, 'fixed')).toEqual([]);
	});
});

describe('Cellule markdown vue par son auteur (rendu complet, non-régression)', () => {
	it('formule et image rendues', async () => {
		const el = await shownMarkdown(`Bonjour $x^2$\n\n![dessin](https://${HOTE}/c.png)`, false);
		await expect.poll(() => el.querySelector('img')?.getAttribute('src')).toContain(HOTE);
		expect(el.querySelector('math-span')).not.toBeNull();
	});
});

describe('Sorties de cellule, vues par le prof (restreint)', () => {
	it('text/plain avec \\htmlStyle : pas de formule MathLive, du texte', async () => {
		const latex = `\\htmlStyle{position:fixed;inset:0;background:red}{x}`;
		const el = await shownOutputs(
			[{ output_type: 'display_data', data: { 'text/plain': latex } }],
			true
		);
		await expect.poll(() => el.querySelector('pre')).not.toBeNull();
		expect(el.querySelector('math-span')).toBeNull();
		expect(styleAttributesContaining(el, 'fixed')).toEqual([]);
	});

	it('text/plain sans commande dangereuse : la formule reste rendue', async () => {
		const el = await shownOutputs(
			[{ output_type: 'display_data', data: { 'text/plain': '\\frac{1}{2}' } }],
			true
		);
		await expect.poll(() => el.querySelector('math-span')).not.toBeNull();
	});

	it('text/html avec style= et <img src=https://…> : neutralisé', async () => {
		const html = `<div style="position:fixed;inset:0;background:red">Recouvrement</div><img src="https://${HOTE}/d.png">`;
		const el = await shownOutputs(
			[{ output_type: 'display_data', data: { 'text/html': html } }],
			true
		);
		await expect.poll(() => el.textContent).toContain('Recouvrement');
		expect(el.querySelector('img')).toBeNull();
		expect(styleAttributesContaining(el, 'fixed')).toEqual([]);
		expect(hostileAttributes(el)).toEqual([]);
	});
});

describe('Sorties de cellule vues par l’auteur (rendu complet, non-régression)', () => {
	it('text/plain rendu en formule, text/html assaini mais avec son image', async () => {
		const el = await shownOutputs(
			[
				{ output_type: 'display_data', data: { 'text/plain': '\\frac{1}{2}' } },
				{
					output_type: 'display_data',
					data: { 'text/html': `<p>Tableau</p><img src="https://${HOTE}/e.png">` }
				}
			],
			false
		);
		await expect.poll(() => el.querySelector('math-span')).not.toBeNull();
		expect(el.querySelector('img')?.getAttribute('src')).toContain(HOTE);
	});
});

describe('Exécution : aucun bouton pour le lecteur non auteur', () => {
	it('cellule de code verrouillée : pas de bouton « Exécuter la cellule »', async () => {
		const screen = await render(NotebookCell, {
			target: mainElement(),
			// isReadonly: false — sinon la lecture seule masque déjà le bouton et le
			// test ne prouve rien du verrou
			props: { cell: codeCell(), isActive: true, isReadonly: false, executionLocked: true }
		});
		const el = screen.container as HTMLElement;
		// PythonEditor charge six modules CodeMirror à la demande : à froid sur la CI,
		// plus que la seconde par défaut de expect.poll (échec vu deux fois sur #1014)
		await expect.poll(() => el.textContent, { timeout: 10_000 }).toContain('print');
		expect(el.querySelector('[aria-label="Exécuter la cellule"]')).toBeNull();
	});

	it('cellule de code non verrouillée (élève, son carnet) : bouton présent', async () => {
		const screen = await render(NotebookCell, {
			target: mainElement(),
			props: { cell: codeCell(), isActive: true, isReadonly: false }
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.querySelector('[aria-label="Exécuter la cellule"]')).not.toBeNull();
	});

	it('barre d’outils verrouillée : ni « Tout exécuter » ni « Arrêter »', async () => {
		const screen = await render(NotebookToolbar, {
			target: mainElement(),
			props: { notebook: new NotebookStore(), isReadonly: true, executionLocked: true }
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent).toContain('Lecture seule');
		expect(el.textContent).not.toContain('Tout exécuter');
		expect(el.textContent).not.toContain('Arrêter');
	});

	it('barre d’outils non verrouillée : « Tout exécuter » présent', async () => {
		const screen = await render(NotebookToolbar, {
			target: mainElement(),
			props: { notebook: new NotebookStore(), isReadonly: false }
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent).toContain('Tout exécuter');
	});
});

function checkpointCell(): CheckpointCellType {
	return {
		id: 'k1',
		type: 'checkpoint',
		source: '',
		execution_count: null,
		outputs: [],
		state: 'idle',
		checkpoint: { mode: 'assert', code: 'assert x == 1' }
	} as CheckpointCellType;
}

/** Store verrouillé dont on espionne les points d'entrée de l'exécution */
function lockedStore(): {
	store: NotebookStore;
	executeCell: ReturnType<typeof vi.spyOn>;
	runCheckpoint: ReturnType<typeof vi.spyOn>;
} {
	const store = new NotebookStore();
	store.lockExecution();
	return {
		store,
		executeCell: vi.spyOn(store, 'executeCell'),
		runCheckpoint: vi.spyOn(store, 'runCheckpoint')
	};
}

function clickAllButtons(el: HTMLElement): void {
	for (const button of el.querySelectorAll('button')) button.click();
}

describe('Présentation (/present) : le ▶ d’un carnet d’élève lu par le prof', () => {
	it('diapositive de code verrouillée : « Lecture seule » à la place du ▶, aucun appel', async () => {
		const { store, executeCell } = lockedStore();
		const screen = await render(NotebookCodeSlide, {
			target: mainElement(),
			props: { cell: codeCell(), notebook: store }
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent).toContain('Lecture seule');
		expect(el.textContent).not.toContain('Exécuter');
		clickAllButtons(el);
		expect(executeCell).not.toHaveBeenCalled();
	});

	it('diapositive de code non verrouillée : le ▶ « Exécuter » est là', async () => {
		const screen = await render(NotebookCodeSlide, {
			target: mainElement(),
			props: { cell: codeCell(), notebook: new NotebookStore() }
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent).toContain('Exécuter');
		expect(el.textContent).not.toContain('Lecture seule');
	});

	it('diapositive de checkpoint verrouillée : pas de « Vérifier », aucun appel', async () => {
		const { store, runCheckpoint } = lockedStore();
		const screen = await render(NotebookCheckpointSlide, {
			target: mainElement(),
			props: { cell: checkpointCell(), notebook: store }
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent?.length ?? 0).toBeGreaterThan(0);
		expect(el.textContent).not.toContain('Vérifier');
		clickAllButtons(el);
		expect(runCheckpoint).not.toHaveBeenCalled();
	});

	it('diapositive de checkpoint non verrouillée : « Vérifier » est là', async () => {
		const screen = await render(NotebookCheckpointSlide, {
			target: mainElement(),
			props: { cell: checkpointCell(), notebook: new NotebookStore() }
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent).toContain('Vérifier');
	});
});
