/**
 * Listes en colonnes (`:colonnes N`) dans l'éditeur riche (2026-09-25)
 *
 * Spécification n° 11 : le marqueur survit import → édition → export. Deux
 * risques distincts : la conversion markdown ↔ JSON TipTap (le marqueur doit
 * devenir un attribut de la liste et revenir juste avant elle), et le SCHÉMA de
 * l'éditeur, qui efface en silence tout attribut qu'il ne déclare pas — la
 * conversion seule passerait, l'édition réelle perdrait les colonnes.
 */
import { describe, it, expect } from 'vitest';
import { getSchema, type JSONContent } from '@tiptap/core';
import { Node as PMNode } from '@tiptap/pm/model';
import { parseMarkdown, type ListNode } from '$lib/ubumark';
import { tipTapToMarkdown } from '../markdown-export';
import { markdownToTipTap } from '../markdown-import';
import { createEditorExtensions } from '../editor-config';

const roundtrip = (md: string) => tipTapToMarkdown(markdownToTipTap(md));

function colonnes(md: string): (number | undefined)[] {
	const out: (number | undefined)[] = [];
	const visit = (nodes: unknown[]) => {
		for (const n of nodes as { type: string; items?: { children: unknown[] }[] }[]) {
			if (n.type === 'list') {
				out.push((n as unknown as ListNode).columns);
				for (const item of n.items ?? []) visit(item.children);
			}
		}
	};
	visit(parseMarkdown(md).children);
	return out;
}

describe('aller-retour markdown ↔ TipTap', () => {
	it.each([
		['liste numérotée', ':colonnes 2\n1. a\n2. b\n3. c', [2]],
		['liste à puces', ':colonnes 3\n- a\n- b', [3]],
		['départ à 3', ':colonnes 2\n3. a\n4. b', [2]],
		['sous-liste', '1. Calculer :\n   :colonnes 4\n   a. x\n   b. y\n2. Fin.', [undefined, 4]],
		['sans marqueur', '1. a\n2. b', [undefined]]
	])('%s : colonnes conservées', (_nom, md, attendu) => {
		const retour = roundtrip(md);
		expect(colonnes(retour)).toEqual(attendu);
	});

	it('stable au second passage', () => {
		const md =
			'Calculer :\n\n:colonnes 2\n1. a\n2. b\n\n1. Suite :\n   :colonnes 3\n   a. x\n   b. y';
		const premier = roundtrip(md);
		expect(roundtrip(premier)).toBe(premier);
	});

	it('le marqueur n’apparaît qu’une fois, juste avant sa liste', () => {
		const retour = roundtrip(':colonnes 2\n1. a\n2. b');
		expect(retour.match(/:colonnes 2/g)).toHaveLength(1);
		expect(retour.indexOf(':colonnes 2')).toBeLessThan(retour.indexOf('1. a'));
	});
});

describe('schéma de l’éditeur', () => {
	it('l’attribut `columns` des listes survit au schéma (sinon perdu à la première édition)', () => {
		const schema = getSchema(createEditorExtensions());
		const json = markdownToTipTap(':colonnes 2\n1. a\n2. b\n\n:colonnes 3\n- c\n- d');
		const relu = PMNode.fromJSON(schema, json).toJSON() as JSONContent;
		const listes = (relu.content ?? []).filter((n) => /list/i.test(n.type ?? ''));
		expect(listes.map((l) => l.attrs?.columns)).toEqual([2, 3]);
	});
});

describe('marqueur resté texte : l’aller-retour ne casse pas la liste', () => {
	it('`- a` + marqueur sans sous-liste + ligne vide + texte : toujours une seule liste de 2 items', () => {
		const md = '- a\n  :colonnes 2\n\n  texte\n- b';
		const retour = roundtrip(md);
		const listes = parseMarkdown(retour).children.filter((c) => c.type === 'list') as ListNode[];
		expect(listes).toHaveLength(1);
		expect(listes[0].items).toHaveLength(2);
	});
});
