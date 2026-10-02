/**
 * Détails d'une correction dans ubumark (ADR 0017) : encadrés typés
 * `> [!type]` et détails en ligne `[texte]{.type}`.
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import type { BlockquoteNode, InlineNode, ParagraphNode } from '$lib/ubumark';

function firstBlock(md: string) {
	return parseMarkdown(md).children[0];
}

function paragraphChildren(md: string): InlineNode[] {
	const block = firstBlock(md) as ParagraphNode;
	expect(block.type).toBe('paragraph');
	return block.children;
}

describe('encadré typé > [!type]', () => {
	it('> [!rappel] texte : citation de type rappel, marqueur retiré du contenu', () => {
		const node = firstBlock('> [!rappel] $(a+b)^2 = a^2 + 2ab + b^2$') as BlockquoteNode;
		expect(node.type).toBe('blockquote');
		expect(node.callout).toBe('reminder');
		const para = node.children[0] as ParagraphNode;
		expect(para.type).toBe('paragraph');
		const text = para.children.map((c) => (c.type === 'text' ? c.content : '')).join('');
		expect(text).not.toContain('[!rappel]');
		expect(para.children.some((c) => c.type === 'math-inline')).toBe(true);
	});

	it('marqueur seul sur sa ligne, contenu sur les suivantes', () => {
		const node = firstBlock('> [!méthode]\n> On isole $x$.') as BlockquoteNode;
		expect(node.callout).toBe('method');
		expect(JSON.stringify(node.children)).toContain('On isole');
		expect(JSON.stringify(node.children)).not.toContain('[!');
	});

	it('methode sans accent, attention', () => {
		expect((firstBlock('> [!methode] x') as BlockquoteNode).callout).toBe('method');
		expect((firstBlock('> [!Attention] x') as BlockquoteNode).callout).toBe('warning');
	});

	it('type inconnu : citation normale, texte intact', () => {
		const node = firstBlock('> [!truc] x') as BlockquoteNode;
		expect(node.callout).toBeUndefined();
		expect(JSON.stringify(node.children)).toContain('[!truc]');
	});

	it('citation ordinaire : pas de type', () => {
		expect((firstBlock('> Une citation') as BlockquoteNode).callout).toBeUndefined();
	});
});

describe('détail en ligne [texte]{.type}', () => {
	it('[x]{.rappel} : nœuds marqués rappel, sans crochets ni accolades', () => {
		const children = paragraphChildren('On factorise [car $a^2-b^2$ se factorise]{.rappel} puis.');
		const tagged = children.filter((c) => 'detail' in c && c.detail === 'reminder');
		expect(tagged.length).toBeGreaterThanOrEqual(2);
		expect(tagged.some((c) => c.type === 'math-inline')).toBe(true);
		const all = children.map((c) => (c.type === 'text' ? c.content : '')).join('');
		expect(all).not.toContain('{.rappel}');
		expect(all).not.toContain('[car');
		expect(all).toContain('On factorise');
		const untagged = children.filter((c) => c.type === 'text' && !c.detail);
		expect(untagged.map((c) => (c.type === 'text' ? c.content : '')).join('')).toContain(
			'On factorise'
		);
	});

	it('les quatre types', () => {
		const cases: [string, string][] = [
			['calcul', 'calculation'],
			['méthode', 'method'],
			['methode', 'method'],
			['attention', 'warning']
		];
		for (const [word, kind] of cases) {
			const children = paragraphChildren(`A [x]{.${word}} B`);
			const x = children.find((c) => c.type === 'text' && c.content === 'x');
			expect(x && 'detail' in x ? x.detail : undefined, word).toBe(kind);
		}
	});

	it('mise en forme conservée dans le détail', () => {
		const children = paragraphChildren('A [**gras**]{.rappel} B');
		const bold = children.find((c) => c.type === 'text' && c.bold);
		expect(bold && bold.type === 'text' ? bold.detail : undefined).toBe('reminder');
	});

	it('type inconnu : texte littéral', () => {
		const children = paragraphChildren('A [x]{.truc} B');
		const all = children.map((c) => (c.type === 'text' ? c.content : '')).join('');
		expect(all).toContain('[x]{.truc}');
	});

	it('un lien reste un lien', () => {
		const children = paragraphChildren('Voir [le cours](https://exemple.fr).');
		expect(children.some((c) => c.type === 'link')).toBe(true);
	});
});
