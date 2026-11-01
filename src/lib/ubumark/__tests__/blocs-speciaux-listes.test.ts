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
		['variation', 'variation-table', ['```variation', 'variable: x', 'domain: -inf, +inf']],
		['probtree', 'probability-tree', ['```probtree', 'Rouge:1/2', 'Bleue:1/2']],
		['trig', 'trig-circle', ['```trig', 'preset: quarters']],
		['line', 'number-line', ['```line', 'start: 0', 'end: 5', 'step: 1']],
		['horloge', 'horloge', ['```horloge', 'heure: 9 h']],
		['partage', 'partage', ['```partage', 'forme: bande 8']],
		['cubes', 'espace', ['```cubes', 'hauteurs: 2 1']],
		['operation', 'operation', ['```operation', 'calcul: 45 + 37']],
		['collection', 'collection', ['```collection', 'unités: 9']],
		['monnaie', 'monnaie', ['```monnaie', 'billets: 10']]
	])('%s : le bloc, puis le texte intermédiaire en paragraphe', (_, type, block) => {
		const nodes = inItem([...block, '', 'Voici le texte qui suit le bloc', '', '```']);

		expect(nodes.map((n) => n.type)).toContain(type);
		expect(paragraphWith(nodes, 'Voici le texte qui suit le bloc')).toBeDefined();
		const codes = nodes.filter((n) => n.type === 'code-block');
		expect(JSON.stringify(codes)).not.toContain('Voici le texte');
	});
});

describe('bloc spécial non fermé, sans ``` plus loin (Q63 en liste)', () => {
	it('un cercle, puis le texte — plus de ```trig affiché brut', () => {
		const nodes = inItem(['```trig', 'preset: quarters', '', 'Voici la suite']);

		expect(nodes.map((n) => n.type)).toEqual(['paragraph', 'trig-circle', 'paragraph']);
		expect(JSON.stringify(nodes)).not.toContain('```trig');
	});

	it('repli « source » : formules exactement écrites (Q62)', () => {
		const nodes = inItem(['```probtree', 'zz $ x  +  1 $', '', 'Voici la suite', '', '```']);
		const code = nodes.find((n) => n.type === 'code-block') as { code: string } | undefined;

		expect(code?.code).toBe('zz $ x  +  1 $');
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

/**
 * Bloc ouvert sur la ligne même de l'item (`- ```cubes`, `1. ```horloge`) :
 * l'ouverture et le corps finissaient dans deux paragraphes séparés, le bloc
 * était lu vide (« bloc non fermé »). La forme « - texte » puis le bloc en
 * retrait marchait déjà.
 */
describe('bloc ouvert sur la ligne de l’item', () => {
	const itemNodes = (md: string) => (parseMarkdown(md).children[0] as ListNode).items[0].children;

	it.each([
		['cubes', 'espace', ['- ```cubes', '  hauteurs: 2 1', '  ```']],
		['horloge', 'horloge', ['- ```horloge', '  heure: 9 h', '  ```']],
		['partage', 'partage', ['1. ```partage', '   forme: bande 8', '   ```']],
		['solide', 'espace', ['- ```solide', '  forme: pyramide carree 4 3', '  ```']],
		['python', 'code-block', ['- ```python', '  print(1)', '  ```']]
	])('%s : un seul nœud, sans erreur', (_, type, lines) => {
		const nodes = itemNodes(lines.join('\n'));

		expect(nodes.map((n) => n.type)).toEqual([type]);
		expect(JSON.stringify(nodes)).not.toContain('non fermé');
		expect(JSON.stringify(nodes)).not.toContain('```');
	});

	it('ligne vide dans le bloc, texte en retrait après, item suivant', () => {
		const md = [
			'- ```variation',
			'  variable: x',
			'  domain: -inf, 0, +inf',
			'',
			'  sign: f(x)',
			'    -inf,0: +',
			'    0: z',
			'    0,+inf: -',
			'  ```',
			'',
			'  Voici la suite',
			'- Second item'
		].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;

		expect(list.items).toHaveLength(2);
		expect(list.items[0].children.map((n) => n.type)).toEqual(['variation-table', 'paragraph']);
		expect(paragraphWith(list.items[0].children as BlockNode[], 'Voici la suite')).toBeDefined();
	});

	it('vraiment non fermé : un seul bloc en erreur, le texte de l’item suivant intact', () => {
		const md = ['- ```horloge', '  heure: 9 h', '- Second item'].join('\n');
		const list = parseMarkdown(md).children[0] as ListNode;

		expect(list.items).toHaveLength(2);
		expect(paragraphWith(list.items[1].children as BlockNode[], 'Second item')).toBeDefined();
	});

	it('code en ligne ```x``` sur la ligne de l’item : reste du texte', () => {
		const nodes = itemNodes('- le code ```x``` ici');

		expect(nodes.map((n) => n.type)).toEqual(['paragraph']);
	});
});

/**
 * Corps de bloc fait de lignes `- …` (```ranger, ```choix) dans un item : ces
 * lignes ne sont pas des sous-items tant que le bloc est ouvert (revue #2065).
 */
describe('bloc dans un item, corps en lignes « - »', () => {
	const firstItem = (lines: string[]) =>
		(parseMarkdown(lines.join('\n')).children[0] as ListNode).items[0].children as BlockNode[];

	it('ouvert sur la ligne de l’item : un seul bloc, pas de sous-liste', () => {
		const nodes = firstItem(['- ```ranger', '  - 3', '  - 1', '  - 2', '  ```']);

		// ```ranger n'est pas lu dans une liste (absent de SPECIAL_BLOCK_KINDS) : un seul
		// bloc, jamais une sous-liste ni un ``` affiché en paragraphe
		expect(nodes).toHaveLength(1);
		expect(nodes[0].type).not.toBe('list');
	});

	it('en retrait sous « - texte » : texte puis un seul bloc', () => {
		const nodes = firstItem(['- Range :', '', '  ```ranger', '  - 3', '  - 1', '  ```']);

		expect(nodes).toHaveLength(2);
		expect(nodes.map((n) => n.type)).not.toContain('list');
	});

	it('bloc python dont le code a une ligne « - x » : un seul bloc de code', () => {
		const nodes = firstItem(['- ```python', '  - x', '  ```']);

		expect(nodes.map((n) => n.type)).toEqual(['code-block']);
	});

	it('vraiment non fermé : l’item suivant, à la marge, reste un item', () => {
		const list = parseMarkdown(['- ```python', '  x = 1', '- Second item'].join('\n'))
			.children[0] as ListNode;

		expect(list.items).toHaveLength(2);
	});

	it('`- ~~~ x` (texte, pas une langue) : reste du texte', () => {
		const nodes = firstItem(['- ~~~ x', '  suite']);

		expect(nodes.map((n) => n.type)).not.toContain('code-block');
	});
});
