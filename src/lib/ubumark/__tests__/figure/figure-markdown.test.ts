/**
 * Bloc ```figure dans un document : analyseur markdown et éditeur riche
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import type { FigureNode } from '../../types/figure';
import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';

const BLOCK = [
	'```figure',
	'fenetre: -1 ; 6 ; -1 ; 5',
	'---',
	'A = point(0, 0)',
	'B = point(4, 0)',
	's = segment(A, B)',
	'```'
];

function figures(children: BlockNode[]): FigureNode[] {
	return children.filter((c): c is FigureNode => c.type === 'figure');
}

describe('figure — reconnu par parseMarkdown', () => {
	it('bloc au premier niveau', () => {
		const doc = parseMarkdown(['Avant.', '', ...BLOCK, '', 'Après.'].join('\n'));
		expect(doc.children.map((c) => c.type)).toEqual(['paragraph', 'figure', 'paragraph']);
		expect(figures(doc.children)[0].script).toContain('s = segment(A, B)');
	});

	it('un bloc en erreur reste dans le document, avec son message (Q48)', () => {
		const doc = parseMarkdown(
			['```figure', 'fenetre: 4 ; 0 ; 0 ; 3', '---', '```', '', 'Après.'].join('\n')
		);
		const [node] = figures(doc.children);
		expect(node.errors[0].line).toBe(1);
		expect(doc.children[doc.children.length - 1].type).toBe('paragraph');
	});

	it('bloc en retrait sous un item de liste', () => {
		const md = ['1. Observer la figure :', '', ...BLOCK.map((l) => `   ${l}`), '2. Suite.'].join(
			'\n'
		);
		const list = parseMarkdown(md).children[0] as ListNode;
		expect(list.type).toBe('list');
		const inItem = figures(list.items[0].children as BlockNode[]);
		expect(inItem).toHaveLength(1);
		expect(inItem[0].header.window?.xMax).toBe(6);
	});

	it('après une formule centrée sur plusieurs lignes (décalage des indices)', () => {
		const md = ['$$', 'a = 1', '$$', '', ...BLOCK, '', 'Fin.'].join('\n');
		const doc = parseMarkdown(md);
		expect(figures(doc.children)).toHaveLength(1);
		expect(doc.children[doc.children.length - 1].type).toBe('paragraph');
	});

	it('un texte avec `$` dans le script garde son contenu brut', () => {
		const md = [
			'```figure',
			'fenetre: 0 ; 4 ; 0 ; 3',
			'---',
			'texte(1, 1, "prix : 3 $")',
			'```'
		].join('\n');
		const [node] = figures(parseMarkdown(md).children);
		expect(node.script).toBe('texte(1, 1, "prix : 3 $")');
	});
});

describe('figure — aller-retour de l’éditeur riche', () => {
	it('le bloc devient un bloc de code `figure` et revient intact', () => {
		const md = BLOCK.join('\n');
		const json = markdownToTipTap(md);
		expect(json.content?.[0]).toMatchObject({ type: 'codeBlock', attrs: { language: 'figure' } });
		expect(tipTapToMarkdown(json).trim()).toBe(md);
	});

	it('même en erreur, le texte n’est pas perdu', () => {
		const md = ['```figure', 'fenetre: 6 ; -4', '---', 'A = point(', '```'].join('\n');
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('dans un item de liste aussi', () => {
		const md = ['1. Voir :', '', ...BLOCK.map((l) => `   ${l}`)].join('\n');
		const back = tipTapToMarkdown(markdownToTipTap(md));
		expect(back).toContain('```figure');
		expect(back).toContain('s = segment(A, B)');
	});
});
