/**
 * Blocs ```barres et ```circulaire dans un document : analyseur markdown,
 * PDF (generateTypst) et aller-retour de l'éditeur riche.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import type { StatChartNode } from '../../types/stat-chart';
import { generateTypst } from '../../generators/typst-generator';
import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';

// =============================================================================
// Helpers
// =============================================================================

const BARS = ['```barres', 'titre: Sports', 'Football = 12', 'Danse = 7', '```'];
const PIE = ['```circulaire', 'Bus = 14', 'Vélo = 6', '```'];

function charts(children: BlockNode[]): StatChartNode[] {
	return children.filter((c): c is StatChartNode => c.type === 'stat-chart');
}

const indent = (lines: string[]) => lines.map((l) => `   ${l}`);

// =============================================================================
// Analyseur
// =============================================================================

describe('reconnus par parseMarkdown', () => {
	it('barres et circulaire au premier niveau, avec leur genre', () => {
		const doc = parseMarkdown(['Avant.', '', ...BARS, '', ...PIE, '', 'Après.'].join('\n'));

		expect(doc.children.map((c) => c.type)).toEqual([
			'paragraph',
			'stat-chart',
			'stat-chart',
			'paragraph'
		]);
		expect(charts(doc.children).map((c) => c.kind)).toEqual(['barres', 'circulaire']);
	});

	it('un bloc en erreur reste dans le document, avec son message (Q48)', () => {
		const doc = parseMarkdown(['```barres', 'A = -1', '```', '', 'Après.'].join('\n'));
		const [node] = charts(doc.children);

		expect(node.spec).toBeNull();
		expect(node.errors[0].message).toMatch(/^Ligne 1 :/);
		expect(doc.children[doc.children.length - 1].type).toBe('paragraph');
	});

	it('un bloc non fermé n’avale pas la suite', () => {
		const doc = parseMarkdown(['```barres', 'A = 1', '', 'Un paragraphe.'].join('\n'));

		expect(charts(doc.children)).toHaveLength(1);
		expect(doc.children[doc.children.length - 1].type).toBe('paragraph');
	});

	it('en retrait sous un item de liste', () => {
		const md = ['1. Lire :', '', ...indent(PIE), '2. Suite.'].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;

		const inItem = charts(list.items[0].children as BlockNode[]);
		expect(inItem).toHaveLength(1);
		expect(inItem[0].kind).toBe('circulaire');
	});

	// Lot 3 : le langage d'un bloc de code en liste était lu par `\w*`, sans tiret
	it('```frequences-cumulees en retrait sous un item de liste', () => {
		const block = ['```frequences-cumulees', '[0 ; 10[ = 12', '[10 ; 20[ = 18', '```'];
		const md = ['1. Lire :', '', ...indent(block), '2. Suite.'].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;

		expect(charts(list.items[0].children as BlockNode[]).map((c) => c.kind)).toEqual([
			'frequences-cumulees'
		]);
	});

	it('un bloc de code ordinaire dont le langage a un tiret reste un bloc de code', () => {
		const md = ['1. Code :', '', ...indent(['```objective-c', 'int x = 1;', '```'])].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;
		const [code] = (list.items[0].children as BlockNode[]).filter((c) => c.type === 'code-block');

		expect(code).toMatchObject({ type: 'code-block', language: 'objective-c', code: 'int x = 1;' });
	});

	it('après une formule centrée sur plusieurs lignes (décalage des indices)', () => {
		const doc = parseMarkdown(['$$', 'a = 1', '$$', '', ...BARS, '', 'Fin.'].join('\n'));

		expect(charts(doc.children)).toHaveLength(1);
		expect(doc.children[doc.children.length - 1].type).toBe('paragraph');
	});

	it('dans une liste aussi, un nom avec une formule garde son texte brut', () => {
		const md = ['1. Voir :', '', ...indent(['```barres', '$x$ positif = 3', '```'])].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;
		const [node] = charts(list.items[0].children as BlockNode[]);

		expect(node.spec?.data[0].label).toBe('$x$ positif');
	});

	it('un nom de catégorie avec une formule garde son texte brut', () => {
		const md = ['```barres', '$x$ positif = 3', '```'].join('\n');
		const [node] = charts(parseMarkdown(md).children);

		expect(node.spec?.data[0].label).toBe('$x$ positif');
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('branchés dans generateTypst', () => {
	it('au premier niveau et dans un item de liste', () => {
		const md = [...BARS, '', '1. Voir :', '', ...indent(PIE)].join('\n');
		const out = generateTypst(parseMarkdown(md));

		expect(out.split('// barre').length - 1).toBe(2);
		expect(out.split('// secteur').length - 1).toBe(2);
	});
});

// =============================================================================
// Éditeur riche
// =============================================================================

describe('aller-retour de l’éditeur riche', () => {
	it('le bloc devient un bloc de code de son genre et revient intact', () => {
		const histogram = ['```histogramme', '[0 ; 10[ = 12', '```'];
		const polygon = ['```frequences-cumulees', 'lecture: médiane', '[0 ; 10[ = 12', '```'];
		for (const block of [BARS, PIE, histogram, polygon]) {
			const md = block.join('\n');
			const json = markdownToTipTap(md);

			expect(json.content?.[0]).toMatchObject({
				type: 'codeBlock',
				attrs: { language: block[0].slice(3) }
			});
			expect(tipTapToMarkdown(json).trim()).toBe(md);
		}
	});

	it('même en erreur, le texte n’est pas perdu', () => {
		const md = ['```circulaire', 'A = 50 %', '```'].join('\n');

		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('dans un item de liste aussi', () => {
		const md = ['1. Voir :', '', ...indent(BARS)].join('\n');
		const back = tipTapToMarkdown(markdownToTipTap(md));

		expect(back.trim()).toBe(md);
	});
});
