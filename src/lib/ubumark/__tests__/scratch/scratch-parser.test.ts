/**
 * Bloc ```scratch — repérage et lecture (chantier `bloc-scratch`, palier 1)
 *
 * Le parseur reste LÉGER : il garde le programme tel quel (le dessin et la
 * vérification des instructions sont faits à la demande, hors du parseur).
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import { parseScratchContent } from '$lib/ubumark/parser/scratch-parser';
import type { ScratchNode } from '$lib/ubumark/types/scratch';

const children = (markdown: string) => parseMarkdown(markdown).children as BlockNode[];
const scratchOf = (markdown: string) =>
	children(markdown).find((n) => n.type === 'scratch') as ScratchNode | undefined;

const PROGRAMME = [
	'quand le drapeau vert pressé',
	'mettre [a v] à (5)',
	"répéter jusqu'à ce que <(a) > [20]>",
	'mettre [a v] à ((a) * (2))',
	'fin',
	'dire (a)'
].join('\n');

describe('bloc ```scratch au premier niveau', () => {
	it('donne un nœud scratch qui garde le programme tel quel', () => {
		const md = `Que dit le lutin ?\n\n\`\`\`scratch\n${PROGRAMME}\n\`\`\`\n\nRéponds.`;
		const nodes = children(md);
		expect(nodes.map((n) => n.type)).toEqual(['paragraph', 'scratch', 'paragraph']);
		const node = nodes[1] as ScratchNode;
		expect(node.source).toBe(PROGRAMME);
		expect(node.errors).toEqual([]);
	});

	it('garde les lignes vides entre deux scripts (bloc personnalisé à côté)', () => {
		const source =
			'définir dessine carré (côté)\nrépéter (4) fois\navancer de (côté) pas\nfin\n\nquand le drapeau vert pressé\ndessine carré (10)';
		const node = scratchOf(`\`\`\`scratch\n${source}\n\`\`\``);
		expect(node?.source).toBe(source);
		expect(node?.errors).toEqual([]);
	});

	it('les signes < et > du programme ne sont pas lus comme du HTML ni des formules', () => {
		const node = scratchOf(
			'```scratch\nsi <<(x) > [3]> et <(x) < [8]>> alors\ndire [oui]\nfin\n```'
		);
		expect(node?.source).toBe('si <<(x) > [3]> et <(x) < [8]>> alors\ndire [oui]\nfin');
	});
});

describe('erreurs de l’auteur', () => {
	it('bloc vide : message situé', () => {
		expect(parseScratchContent('').errors).toEqual([
			{ message: 'Ligne 1 : programme vide (écris une instruction par ligne)', line: 1 }
		]);
		expect(parseScratchContent('  \n ').errors).toHaveLength(1);
	});

	it('bloc non fermé : s’arrête à la première ligne vide, la suite est lue', () => {
		const nodes = children('```scratch\ndire [Bonjour]\n\nLa suite du texte');
		expect(nodes.map((n) => n.type)).toEqual(['scratch', 'paragraph']);
		const node = nodes[0] as ScratchNode;
		expect(node.source).toBe('dire [Bonjour]');
		expect(node.errors.map((e) => e.message)).toEqual([
			'Ligne 2 : bloc non fermé (``` manquant après la dernière ligne)'
		]);
	});

	it('un autre bloc ouvert plus loin ne ferme pas le programme', () => {
		const nodes = children('```scratch\ndire [Bonjour]\n\n```horloge\nheure: 9 h\n```');
		expect(nodes.map((n) => n.type)).toEqual(['scratch', 'horloge']);
		expect((nodes[0] as ScratchNode).errors).toHaveLength(1);
	});
});

describe('bloc ```scratch ailleurs que dans le corps', () => {
	it('dans un item de liste', () => {
		const md = ['1. Que dit le lutin ?', '', '   ```scratch', '   dire [Bonjour]', '   ```'].join(
			'\n'
		);
		const list = parseMarkdown(md).children[0] as ListNode;
		const node = (list.items[0].children as BlockNode[]).find((n) => n.type === 'scratch') as
			ScratchNode | undefined;
		expect(node?.source).toBe('dire [Bonjour]');
	});

	it('dans un choix de case « choix » : le choix est un programme', () => {
		const md = [
			'````choix',
			'- ```scratch',
			'  mettre [c v] à (a)',
			'  mettre [a v] à (b)',
			'  mettre [b v] à (c)',
			'  ```',
			'- ```scratch',
			'  mettre [a v] à (b)',
			'  mettre [b v] à (a)',
			'  ```',
			'````'
		].join('\n');
		const choice = children(md)[0] as BlockNode & { choices?: string[] };
		expect(choice.type).toBe('choice');
		const first = choice.choices?.[0] ?? '';
		expect(scratchOf(first)?.source).toBe(
			'mettre [c v] à (a)\nmettre [a v] à (b)\nmettre [b v] à (c)'
		);
	});
});
