/**
 * Bloc ```courbe dans un document : analyseur markdown et éditeur riche
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import type { CourbeNode } from '../../types/courbe';
import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';

const BLOCK = ['```courbe', 'x: -4 ; 6', 'y: -8 ; 12', 'f(x) = x^2 - 2', '```'];

function courbes(children: BlockNode[]): CourbeNode[] {
	return children.filter((c): c is CourbeNode => c.type === 'courbe');
}

describe('courbe — reconnu par parseMarkdown', () => {
	it('bloc au premier niveau', () => {
		const doc = parseMarkdown(['Avant.', '', ...BLOCK, '', 'Après.'].join('\n'));
		const found = courbes(doc.children);
		expect(found).toHaveLength(1);
		expect(found[0].spec?.functions[0].name).toBe('f');
		expect(doc.children.map((c) => c.type)).toEqual(['paragraph', 'courbe', 'paragraph']);
	});

	it('un bloc en erreur reste dans le document, avec son message (Q48)', () => {
		const doc = parseMarkdown(
			['```courbe', 'x: -4 ; 6', 'y: 3 ; 1', '```', '', 'Après.'].join('\n')
		);
		const [node] = courbes(doc.children);
		expect(node).toBeDefined();
		expect(node.spec).toBeNull();
		expect(node.errors[0].line).toBe(2);
		expect(node.errors[0].message).toMatch(/^Ligne 2 :/);
	});

	it('bloc en retrait sous un item de liste (comportement 8)', () => {
		const md = [
			'1. Lire le graphique :',
			'',
			...BLOCK.map((l) => `   ${l}`),
			'   Donc f(0) = -2.',
			'2. Suite.'
		].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;
		expect(list.type).toBe('list');
		const inItem = courbes(list.items[0].children as BlockNode[]);
		expect(inItem).toHaveLength(1);
		expect(inItem[0].spec?.window.xMax).toBe(6);
	});

	it('après une formule centrée sur plusieurs lignes (décalage des indices)', () => {
		const md = ['$$', 'a = 1', '$$', '', ...BLOCK, '', 'Fin.'].join('\n');
		const doc = parseMarkdown(md);
		expect(courbes(doc.children)).toHaveLength(1);
		expect(doc.children[doc.children.length - 1].type).toBe('paragraph');
	});

	it('une description avec une formule garde son texte brut', () => {
		const md = ['```courbe', 'x: -1 ; 1', 'y: -1 ; 1', 'description: Droite $y=x$.', '```'].join(
			'\n'
		);
		const [node] = courbes(parseMarkdown(md).children);
		expect(node.spec?.description).toBe('Droite $y=x$.');
	});
});

describe('courbe — aller-retour de l’éditeur riche', () => {
	it('le bloc devient un bloc de code `courbe` et revient intact', () => {
		const md = BLOCK.join('\n');
		const json = markdownToTipTap(md);
		expect(json.content?.[0]).toMatchObject({ type: 'codeBlock', attrs: { language: 'courbe' } });
		expect(tipTapToMarkdown(json).trim()).toBe(md);
	});

	it('même en erreur, le texte n’est pas perdu', () => {
		const md = ['```courbe', 'x: 6 ; -4', '```'].join('\n');
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('dans un item de liste aussi', () => {
		const md = ['1. Voir :', '', ...BLOCK.map((l) => `   ${l}`)].join('\n');
		const back = tipTapToMarkdown(markdownToTipTap(md));
		expect(back).toContain('```courbe');
		expect(back).toContain('f(x) = x^2 - 2');
	});
});
