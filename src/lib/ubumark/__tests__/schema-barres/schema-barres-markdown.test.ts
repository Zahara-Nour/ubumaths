/**
 * Bloc ```schema-barres reconnu par `parseMarkdown` : premier niveau, liste,
 * variables déjà résolues (`{{a}}`), erreurs qui ne font pas disparaître le bloc
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import type { SchemaBarresNode } from '$lib/ubumark/types/schema-barres';

const children = (...lines: string[]) => parseMarkdown(lines.join('\n')).children as BlockNode[];

describe('bloc ```schema-barres dans parseMarkdown', () => {
	it('premier niveau : un nœud schema-barres entre deux paragraphes', () => {
		const nodes = children('Avant', '', '```schema-barres', 'A : ? (4)', '```', '', 'Après');
		expect(nodes.map((n) => n.type)).toEqual(['paragraph', 'schema-barres', 'paragraph']);
		const node = nodes[1] as SchemaBarresNode;
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars[0].name).toBe('A');
		expect(node.source).toBe('A : ? (4)');
	});

	it('premier niveau : bloc en erreur = nœud avec ses phrases, pas un bloc de code', () => {
		const nodes = children('```schema-barres', 'sans deux-points', '```');
		expect(nodes.map((n) => n.type)).toEqual(['schema-barres']);
		expect((nodes[0] as SchemaBarresNode).errors[0]).toMatch(/^Ligne 1 : /);
	});

	it('10. dans un item de liste (en retrait)', () => {
		const list = children(
			'1. Voir le schéma :',
			'',
			'   ```schema-barres',
			'   Or : ? (4) ; 70 (2)',
			'   total : 320 €',
			'   ```'
		)[0] as ListNode;
		const nodes = list.items[0].children as BlockNode[];
		const node = nodes.find((n) => n.type === 'schema-barres') as SchemaBarresNode;
		expect(node).toBeDefined();
		expect(node.spec?.total).toBe('320 €');
	});

	it('10. ouvert sur la ligne même de l’item', () => {
		const list = children('- ```schema-barres', '  A : ?', '  ```')[0] as ListNode;
		expect(list.items[0].children.map((n) => n.type)).toEqual(['schema-barres']);
	});

	it('7. une formule `$…$` dans une étiquette garde sa source intacte', () => {
		const node = children('```schema-barres', 'A : $x$ (2) ; ? (1)', '```')[0] as SchemaBarresNode;
		expect(node.spec?.bars[0].segments[0].label).toBe('$x$');
	});

	it('une variable déjà résolue se lit comme un nombre (7)', () => {
		const node = children('```schema-barres', 'A : 7 (3) ; ? (2)', '```')[0] as SchemaBarresNode;
		expect(node.spec?.bars[0].segments[0]).toEqual({ label: '7', length: 3, missing: false });
	});

	it('les lignes du bloc ne sont pas lues comme du markdown (`=`, `;`, tirets)', () => {
		const nodes = children('```schema-barres', 'A : ? (2) ; -5 (1) = 9', '```', '', 'suite');
		expect(nodes.map((n) => n.type)).toEqual(['schema-barres', 'paragraph']);
	});
});
