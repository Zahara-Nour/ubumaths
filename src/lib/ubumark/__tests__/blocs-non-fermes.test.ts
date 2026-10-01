/**
 * Blocs ```courbe, ```figure et statistiques NON FERMÉS (décision Q25/Q47 du
 * chantier outils statistiques, 2026-10-02).
 *
 * Deux défauts hérités de ```courbe, trouvés par la revue du lot 2 :
 * - un bloc non fermé suivi, plus loin, d'un ``` seul était pris pour fermé :
 *   il avalait le texte intermédiaire, et le ``` restant ouvrait un bloc de
 *   code jamais refermé ;
 * - dans un item de liste, un bloc non fermé s'affichait en texte brut.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import { generateTypst } from '../generators/typst-generator';

// =============================================================================
// Helpers
// =============================================================================

const types = (children: BlockNode[]) => children.map((c) => c.type);

/** Les erreurs d'un nœud courbe / figure / stat-chart */
function errorsOf(node: BlockNode | undefined): string[] {
	const errors = (node as { errors?: { message: string }[] } | undefined)?.errors ?? [];
	return errors.map((e) => e.message);
}

const indent = (lines: string[]) => lines.map((l) => `   ${l}`);

const FIGURE = ['```figure', 'fenetre: -1 ; 6 ; -1 ; 5', '---', 'A = point(0, 0)'];

// =============================================================================
// Bloc non fermé suivi plus loin d'un ``` seul
// =============================================================================

describe('un ``` plus loin ne ferme pas un bloc dont il est séparé par du texte', () => {
	it('```barres : bloc non fermé, paragraphe, puis vrai bloc de code', () => {
		const doc = parseMarkdown(
			['```barres', 'A = 1', '', 'Un paragraphe.', '', '```', 'code', '```'].join('\n')
		);

		expect(types(doc.children)).toEqual(['stat-chart', 'paragraph', 'code-block']);
		expect(errorsOf(doc.children[0]).join(' ')).toMatch(/non fermé/);
		expect(doc.children[2]).toMatchObject({ type: 'code-block', code: 'code' });
	});

	it('```courbe : même découpage', () => {
		const doc = parseMarkdown(
			['```courbe', 'x: -1 ; 1', 'y: -1 ; 1', '', 'Un paragraphe.', '', '```', 'code', '```'].join(
				'\n'
			)
		);

		expect(types(doc.children)).toEqual(['courbe', 'paragraph', 'code-block']);
		expect(errorsOf(doc.children[0]).join(' ')).toMatch(/non fermé/);
	});

	it('```figure : un paragraphe de texte arrête le bloc', () => {
		const doc = parseMarkdown(
			[...FIGURE, '', 'Un paragraphe de texte.', '', '```', 'code', '```'].join('\n')
		);

		expect(types(doc.children)).toEqual(['figure', 'paragraph', 'code-block']);
		expect(errorsOf(doc.children[0]).join(' ')).toMatch(/non fermé/);
	});

	it('témoin : un bloc fermé qui contient une ligne vide reste fermé et intact', () => {
		const stat = parseMarkdown(['```barres', 'A = 1', '', 'B = 2', '```'].join('\n'));
		const courbe = parseMarkdown(['```courbe', 'x: -1 ; 1', '', 'y: -1 ; 1', '```'].join('\n'));
		const figure = parseMarkdown([...FIGURE, '', 'B = point(4, 0)', '```'].join('\n'));

		expect(types(stat.children)).toEqual(['stat-chart']);
		expect(errorsOf(stat.children[0])).toEqual([]);
		expect(types(courbe.children)).toEqual(['courbe']);
		expect(errorsOf(courbe.children[0])).toEqual([]);
		expect(types(figure.children)).toEqual(['figure']);
		expect(errorsOf(figure.children[0])).toEqual([]);
	});
});

// =============================================================================
// Revue de la PR : une ligne FAUTIVE dans un bloc FERMÉ ne doit rien changer
// =============================================================================

describe('un bloc fermé avec une ligne fautive reste fermé, la suite du document intacte', () => {
	const after = ['```', '', 'Texte après.'];

	it.each([
		['courbe : clé inconnue', ['```courbe', 'x: -1 ; 1', 'y: -1 ; 1', 'point: A(1;2)'], 'courbe'],
		['barres : « Vélo : 3 »', ['```barres', 'Vélo : 3', 'B = 2'], 'stat-chart'],
		['barres : option mal orthographiée', ['```barres', 'legend: x', 'B = 2'], 'stat-chart'],
		[
			'figure : commentaire « ## »',
			[...FIGURE, '', '## Construction du cercle', 'c = cercle(A, 2)'],
			'figure'
		],
		['figure : « ) » seul après une ligne vide', [...FIGURE, 'p = polygone(', '', ')'], 'figure'],
		['figure : identifiant seul', [...FIGURE, '', 'A'], 'figure']
	])('%s', (_name, block, type) => {
		const doc = parseMarkdown([...block, ...after].join('\n'));

		expect(types(doc.children)).toEqual([type, 'paragraph']);
		expect(errorsOf(doc.children[0]).join(' ')).not.toMatch(/non fermé/);
		expect(JSON.stringify(doc.children[1])).toContain('Texte après.');
	});
});

// =============================================================================
// Bloc non fermé dans un item de liste
// =============================================================================

describe('un bloc non fermé dans un item de liste devient un nœud en erreur', () => {
	const inItem = (block: string[]) => {
		const md = ['1. Lire :', '', ...indent(block)].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;
		return list.items[0].children as BlockNode[];
	};

	it.each([
		['courbe', ['```courbe', 'x: -1 ; 1', 'y: -1 ; 1']],
		['figure', FIGURE],
		['stat-chart', ['```barres', 'A = 1', 'B = 2']]
	])('%s', (type, block) => {
		const children = inItem(block);
		const node = children.find((c) => c.type === type);

		// La séquence COMPLÈTE : le texte de l'item, puis le nœud, rien d'autre
		expect(types(children)).toEqual(['paragraph', type]);
		expect(errorsOf(node).join(' ')).toMatch(/non fermé/);
		// Plus de texte brut : aucun PARAGRAPHE ne contient ``` (le message
		// d'erreur du nœud, lui, dit « ``` manquant »)
		const paragraphs = children.filter((c) => c.type === 'paragraph');
		expect(JSON.stringify(paragraphs)).not.toContain('```');
	});

	it('PDF : « Figure indisponible », plus de ``` écrit en texte', () => {
		const md = ['1. Lire :', '', ...indent(['```barres', 'A = 1'])].join('\n');
		const typst = generateTypst(parseMarkdown(md));

		expect(typst).toContain('Figure indisponible');
		expect(typst).not.toContain('```');
	});

	it('témoin : un bloc fermé dans une liste est inchangé', () => {
		const children = inItem(['```barres', 'A = 1', '```']);

		expect(errorsOf(children.find((c) => c.type === 'stat-chart'))).toEqual([]);
	});
});
