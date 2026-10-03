/**
 * Trous dans une cellule de tableau — logique pure de FillBlanksInput
 *
 * Une cellule est une chaîne (`TableCellNode.content`) : on la relit en éléments
 * en ligne pour y retrouver les trous (`\placeholder[N]{}` et `{{blank:N}}`).
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import type { TableNode } from '$lib/ubumark';
import { cellHasBlanks, tableCellInlineNodes, tableHasBlanks } from '../fill-blanks-utils';

function tableOf(markdown: string): TableNode {
	const node = parseMarkdown(markdown).children.find((child) => child.type === 'table');
	if (node?.type !== 'table') throw new Error('pas de tableau');
	return node;
}

describe('tableCellInlineNodes', () => {
	it('cellule à trou math : un nœud math-inline portant le placeholder', () => {
		const nodes = tableCellInlineNodes('$\\placeholder[3]{}$');
		expect(nodes).toHaveLength(1);
		expect(nodes[0]).toMatchObject({ type: 'math-inline', expression: '\\placeholder[3]{}' });
	});

	it('cellule à trou texte : un nœud blank avec son index', () => {
		const nodes = tableCellInlineNodes('environ {{blank:2}} km');
		expect(nodes.map((node) => node.type)).toEqual(['text', 'blank', 'text']);
		expect(nodes[1]).toMatchObject({ type: 'blank', index: 2 });
	});

	it('cellule vide : aucun nœud', () => {
		expect(tableCellInlineNodes('')).toEqual([]);
	});
});

describe('cellHasBlanks', () => {
	it('vrai pour un placeholder ou un {{blank:N}}', () => {
		expect(cellHasBlanks('$\\placeholder[0]{}$')).toBe(true);
		expect(cellHasBlanks('{{blank:0}}')).toBe(true);
	});

	it('faux pour une formule ou un texte sans trou', () => {
		expect(cellHasBlanks('$P(X=x_k)$')).toBe(false);
		expect(cellHasBlanks('mot')).toBe(false);
		expect(cellHasBlanks('')).toBe(false);
	});
});

describe('tableHasBlanks', () => {
	it('trou dans une ligne du corps', () => {
		const table = tableOf('| $x$ | $1$ |\n|---|---|\n| $2x$ | $\\placeholder[0]{}$ |');
		expect(tableHasBlanks(table)).toBe(true);
	});

	it('trou dans l’en-tête', () => {
		const table = tableOf('| $x$ | {{blank:0}} |\n|---|---|\n| $2x$ | $2$ |');
		expect(tableHasBlanks(table)).toBe(true);
	});

	it('tableau sans trou', () => {
		const table = tableOf('| $x$ | $1$ |\n|---|---|\n| $2x$ | $2$ |');
		expect(tableHasBlanks(table)).toBe(false);
	});
});
