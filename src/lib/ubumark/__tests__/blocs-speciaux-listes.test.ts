/**
 * Q66 dans les items de liste (2026-10-02) — Q52 avait aligné les listes sur
 * le premier niveau pour ```courbe / ```figure / statistiques seulement.
 *
 * Avant : dans un item de liste, un ```variation / ```probtree / ```trig /
 * ```line non fermé, suivi plus loin d'un ``` seul, se fermait dessus ; le
 * texte intermédiaire était perdu ou affiché en bloc de code brut.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';

const indent = (lines: string[]) => lines.map((l) => (l ? `   ${l}` : l));

/** Les enfants du premier item de la liste */
const inItem = (block: string[]) => {
	const md = ['1. Question :', '', ...indent(block)].join('\n');
	const list = parseMarkdown(md).children[0] as ListNode;
	return list.items[0].children as BlockNode[];
};

const paragraphWith = (nodes: BlockNode[], text: string) =>
	nodes.find((n) => n.type === 'paragraph' && JSON.stringify(n).includes(text));

describe('Q66 dans une liste — un ``` lointain ne ferme pas un bloc séparé par du texte', () => {
	it.each([
		['variation', ['```variation', 'variable: x', 'domain: -inf, +inf']],
		['probtree', ['```probtree', 'Rouge:1/2', 'Bleue:1/2']],
		['trig', ['```trig', 'preset: quarters']],
		['line', ['```line', 'start: 0', 'end: 5']]
	])('%s : le texte intermédiaire est un paragraphe', (_, block) => {
		const nodes = inItem([...block, '', 'Voici le texte qui suit le bloc', '', '```']);

		expect(paragraphWith(nodes, 'Voici le texte qui suit le bloc')).toBeDefined();
		const codes = nodes.filter((n) => n.type === 'code-block');
		expect(JSON.stringify(codes)).not.toContain('Voici le texte');
	});
});

describe('ce qui ne change pas dans une liste', () => {
	it('tableau de variations fermé, lignes vides et sections', () => {
		const nodes = inItem([
			'```variation',
			'variable: x',
			'domain: -inf, 0, +inf',
			'',
			'sign: f(x)',
			'  -inf,0: +',
			'  0: z',
			'  0,+inf: -',
			'```'
		]);

		expect(nodes.map((n) => n.type)).toEqual(['paragraph', 'variation-table']);
	});

	it('faute de frappe dans un cercle fermé : pas de texte avalé', () => {
		const nodes = inItem(['```trig', 'preset: quarters', '', 'preset all', '```']);

		expect(nodes.map((n) => n.type)).toContain('trig-circle');
		expect(JSON.stringify(nodes)).not.toContain('"code-block"');
	});

	it('arbre fermé suivi d’un bloc python : deux blocs', () => {
		const nodes = inItem([
			'```probtree',
			'Rouge:1/2',
			'Bleue:1/2',
			'```',
			'',
			'```python',
			'print(1)',
			'```'
		]);

		expect(nodes.map((n) => n.type)).toEqual(['paragraph', 'probability-tree', 'code-block']);
	});
});
