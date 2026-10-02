/**
 * Restes signalés par la revue de #635 (Q62-Q65, 2026-10-02).
 *
 * - Q62 : le code d'un bloc dans un item de liste affichait `§M:0§` à la place
 *   de toute formule (`$a$`, `~x~`, `$$b$$`) → le code exactement écrit.
 * - Q63 : un ```variation / ```probtree / ```line non fermé faisait
 *   disparaître TOUT le document → il s'arrête à la première ligne vide.
 * - Q64 : un bloc spécial invalide disparaissait sans un mot → sa source en
 *   bloc de code.
 * - Q65 : la garde des fences indentées (#630) comptait un `$$` situé dans un
 *   bloc de code, pourtant plus extrait depuis #635.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, type BlockNode } from '$lib/ubumark';

const children = (markdown: string) => parseMarkdown(markdown).children as BlockNode[];
const types = (markdown: string) => children(markdown).map((c) => c.type);
const all = (markdown: string) => JSON.stringify(children(markdown));
const codeOf = (node: BlockNode | undefined) => (node as { code?: string } | undefined)?.code;

const VARIATION = [
	'```variation',
	'variable: x',
	'domain: -inf, 0, +inf',
	'',
	'sign: f(x)',
	'  -inf,0: +',
	'  0: z',
	'  0,+inf: -',
	'```'
];

describe('Q62 — le code d’un item de liste, exactement écrit', () => {
	it('formules simples, custom et bloc', () => {
		const md = '- item\n\n  ```py\n  v = $ a $ et ~x~ et $$b$$\n  ```';
		const item = JSON.parse(all(md))[0].items[0].children as BlockNode[];

		expect(codeOf(item.find((n) => n.type === 'code-block'))).toBe('v = $ a $ et ~x~ et $$b$$');
	});

	// Limite connue : un `\$` ÉCHAPPÉ y devient `$` — l'échappement est résolu
	// pour tout le texte avant le découpage en blocs (voulu pour la prose)
});

describe('Q63 — un bloc spécial non fermé s’arrête à la première ligne vide', () => {
	it.each([
		['variation', '```variation\nvariable: x'],
		['probtree', '```probtree\nA 0.5'],
		['line', '```line\nmin: 0'],
		['trig', '```trig\npoint: pi/3']
	])('%s : la suite du document est lue, formule comprise', (_, block) => {
		const md = `${block}\n\ntexte $x^2$ suite`;
		const nodes = children(md);
		const last = JSON.stringify(nodes.at(-1));

		expect(nodes.length).toBeGreaterThanOrEqual(2);
		expect(last).toContain('suite');
		expect(last).not.toContain('$x^2$');
	});
});

describe('Q64 — un bloc spécial invalide montre sa source', () => {
	it('```variation fermé mais invalide : sa source en bloc de code, la suite intacte', () => {
		const nodes = children('avant\n\n```variation\nn importe quoi\n```\n\naprès');

		expect(nodes.map((n) => n.type)).toEqual(['paragraph', 'code-block', 'paragraph']);
		expect(nodes[1]).toMatchObject({ language: 'variation', code: 'n importe quoi' });
	});
});

describe('Q64 — dans un item de liste aussi', () => {
	it('```variation invalide dans une liste : sa source', () => {
		const md = '- item\n\n  ```variation\n  n importe quoi\n  ```';
		const item = JSON.parse(all(md))[0].items[0].children as BlockNode[];

		expect(item.find((n) => n.type === 'code-block')).toMatchObject({
			language: 'variation',
			code: 'n importe quoi'
		});
	});
});

describe('ce qui ne change pas', () => {
	it('un tableau de variations valide (avec sa ligne vide interne)', () => {
		expect(types(['avant', '', ...VARIATION, '', 'après'].join('\n'))).toEqual([
			'paragraph',
			'variation-table',
			'paragraph'
		]);
	});

	it('un ```variation non fermé valide jusqu’à la ligne vide reste un tableau', () => {
		const md = '```variation\nvariable: x\ndomain: -inf, +inf\n\naprès';

		expect(types(md)).toEqual(['variation-table', 'paragraph']);
	});
});

describe('Q65 — un `$$` dans un bloc de code ne bloque plus les fences indentées', () => {
	it('```sql avec `$$`, puis une fence indentée : un bloc de code', () => {
		const md = '```sql\nDO $$\nx\nEND $$;\n```\n\ntexte\n\n  ```ts\n  y\n  ```';
		const codes = children(md)
			.filter((n) => n.type === 'code-block')
			.map(codeOf);

		expect(codes).toEqual(['DO $$\nx\nEND $$;', 'y']);
	});
});
