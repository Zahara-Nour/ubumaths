/**
 * Éditeurs des blocs droite graduée et tableau de variations : leur habillage lisait
 * `hsl(var(--border))`, `hsl(var(--ring))`… qui n'existent pas. La déclaration était
 * jetée en silence : pas de bordure du tout (`border-style: none`), couleur retombée
 * sur `currentColor`. On lit la couleur RENDUE en sombre (cf. docs/pratiques/css-color-tokens.md).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NumberLineExtension, NUMBER_LINE_TEMPLATE } from '../number-line-extension';
import { VariationTableExtension, VARIATION_TABLE_TEMPLATE } from '../variation-table-extension';

// --color-border en sombre (app.css)
const BORDER_DARK = 'rgb(61, 61, 58)';

let editors: Editor[] = [];
let mains: HTMLElement[] = [];

afterEach(() => {
	for (const e of editors) e.destroy();
	for (const m of mains) m.remove();
	editors = [];
	mains = [];
	const root = document.documentElement;
	root.style.colorScheme = '';
	root.classList.remove('dark');
});

/** Décor de mode-watcher en sombre : `color-scheme` (tokens light-dark()) ET `.dark` */
function darkMode(): void {
	const root = document.documentElement;
	root.style.colorScheme = 'dark';
	root.classList.add('dark');
}

async function editorWith(type: 'numberLine' | 'variationTable', content: string) {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	const editor = new Editor({
		element: main,
		extensions: [StarterKit, NumberLineExtension, VariationTableExtension],
		content: { type: 'doc', content: [{ type, attrs: { content } }] }
	});
	editors.push(editor);
	// Laisse svelte-tiptap monter la vue du nœud
	await new Promise((r) => requestAnimationFrame(() => r(null)));
	return main;
}

async function waitFor<T extends Element>(root: Element, selector: string): Promise<T> {
	for (let i = 0; i < 50; i++) {
		const found = root.querySelector<T>(selector);
		if (found) return found;
		await new Promise((r) => setTimeout(r, 20));
	}
	throw new Error(`aucun élément ${selector} `);
}

/**
 * Un bloc tout juste inséré s'ouvre en édition Markdown. Le champ porte la couleur
 * de son statut (vert/rouge) ; la bordure NEUTRE se lit sur les touches de l'aide.
 */
async function editBorders(main: HTMLElement) {
	const input = getComputedStyle(await waitFor<HTMLElement>(main, '.markdown-input'));
	const key = getComputedStyle(await waitFor<HTMLElement>(main, '.markdown-hint kbd'));
	return {
		input: input.borderTopStyle,
		key: { style: key.borderTopStyle, color: key.borderTopColor }
	};
}

const EXPECTED = { input: 'solid', key: { style: 'solid', color: BORDER_DARK } };

describe('Éditeurs de blocs en sombre : bordure sur --color-border', () => {
	it('droite graduée : bordures du mode édition présentes, sur --color-border', async () => {
		darkMode();
		const main = await editorWith('numberLine', NUMBER_LINE_TEMPLATE);
		expect(await editBorders(main)).toEqual(EXPECTED);
	});

	it('tableau de variations : bordures du mode édition présentes, sur --color-border', async () => {
		darkMode();
		const main = await editorWith('variationTable', VARIATION_TABLE_TEMPLATE);
		expect(await editBorders(main)).toEqual(EXPECTED);
	});
});
