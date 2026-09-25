/**
 * Colonnes d'une liste dans l'éditeur riche (2026-09-25)
 *
 * Constat : un `:colonnes N` tapé au-dessus d'une liste devenait, au rechargement,
 * un attribut invisible de la liste — impossible à voir, changer ou retirer. D'où
 * la commande `setListColumns` (liste la plus proche du curseur ; 1 = retirer) et
 * l'affichage en grille dans l'éditeur lui-même.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { createEditorExtensions } from '$lib/components/rich-text/editor-config';
import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';
import { getListColumns } from '../list-columns-extension';

let editor: Editor | null = null;

afterEach(() => {
	editor?.destroy();
	editor = null;
});

function creer(markdown: string): Editor {
	const element = document.createElement('div');
	document.body.appendChild(element); // styles calculés : l'élément doit être dans la page
	editor = new Editor({
		element,
		extensions: createEditorExtensions(),
		content: markdownToTipTap(markdown)
	});
	return editor;
}

/** Place le curseur dans le texte `mot` (première occurrence). */
function curseurDans(e: Editor, mot: string): void {
	let pos: number | null = null;
	e.state.doc.descendants((node, p) => {
		if (pos === null && node.isText && node.text?.includes(mot)) {
			pos = p + node.text.indexOf(mot) + 1;
		}
	});
	if (pos === null) throw new Error(`« ${mot} » introuvable`);
	e.commands.setTextSelection(pos);
}

const exporter = (e: Editor) => tipTapToMarkdown(e.getJSON());

describe('setListColumns', () => {
	it('curseur dans une liste : 3 colonnes → marqueur `:colonnes 3` à l’export', () => {
		const e = creer('1. alpha\n2. beta\n3. gamma');
		curseurDans(e, 'beta');
		expect(e.commands.setListColumns(3)).toBe(true);
		expect(exporter(e)).toContain(':colonnes 3\n1. alpha');
		expect(getListColumns(e)).toBe(3);
	});

	it('1 retire les colonnes', () => {
		const e = creer(':colonnes 2\n1. alpha\n2. beta');
		curseurDans(e, 'alpha');
		expect(getListColumns(e)).toBe(2);
		e.commands.setListColumns(1);
		expect(exporter(e)).not.toContain(':colonnes');
		expect(getListColumns(e)).toBe(1);
	});

	it('liste à puces', () => {
		const e = creer('- alpha\n- beta');
		curseurDans(e, 'alpha');
		e.commands.setListColumns(4);
		expect(exporter(e)).toContain(':colonnes 4\n- alpha');
	});

	it('curseur dans une sous-liste : seule la sous-liste change', () => {
		const e = creer('1. Calculer :\n   a. xa\n   b. xb\n2. Fin.');
		curseurDans(e, 'xb');
		e.commands.setListColumns(2);
		const md = exporter(e);
		expect(md).toContain('   :colonnes 2\n   1. xa');
		expect(md.startsWith('1. Calculer')).toBe(true);
	});

	it('hors d’une liste : commande refusée, rien ne change', () => {
		const e = creer('Un paragraphe.\n\n1. alpha');
		curseurDans(e, 'paragraphe');
		expect(getListColumns(e)).toBeNull();
		expect(e.commands.setListColumns(2)).toBe(false);
		expect(exporter(e)).not.toContain(':colonnes');
	});
});

describe('affichage dans l’éditeur', () => {
	it('une liste en colonnes est une grille de N colonnes, visible pendant l’édition', () => {
		const e = creer(':colonnes 3\n1. alpha\n2. beta\n3. gamma');
		const ol = e.view.dom.querySelector('ol') as HTMLElement;
		expect(ol.getAttribute('data-columns')).toBe('3');
		expect(getComputedStyle(ol).display).toBe('grid');
		expect(getComputedStyle(ol).gridTemplateColumns.split(' ')).toHaveLength(3);
	});

	it('sans colonnes : pas de grille', () => {
		const e = creer('1. alpha\n2. beta');
		const ol = e.view.dom.querySelector('ol') as HTMLElement;
		expect(ol.hasAttribute('data-columns')).toBe(false);
		expect(getComputedStyle(ol).display).not.toBe('grid');
	});
});
