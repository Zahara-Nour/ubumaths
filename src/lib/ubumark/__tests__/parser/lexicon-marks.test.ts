/**
 * Marquage à la main des mots du lexique (lot 2, spécification validée par David
 * le 2026-10-09) : `[mot]{.def}`, `[mot]{.def=carré (géométrie)}`, `[mot]{.nodef}`.
 * Même syntaxe que les détails en ligne de la correction (ADR 0017).
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import type { InlineNode, ParagraphNode, TextNode } from '$lib/ubumark';
import { splitCorrectionDetail } from '$lib/questions/correction-detail';

function paragraphChildren(md: string): InlineNode[] {
	const block = parseMarkdown(md).children[0] as ParagraphNode;
	expect(block.type).toBe('paragraph');
	return block.children;
}

function textNodes(md: string): TextNode[] {
	return paragraphChildren(md).filter((n): n is TextNode => n.type === 'text');
}

describe('marquage du lexique', () => {
	it('[mot]{.def} : le mot est forcé, sans les crochets', () => {
		const nodes = textNodes('Le [nombre]{.def} est pair.');
		expect(nodes.map((n) => n.content).join('')).toBe('Le nombre est pair.');
		const marked = nodes.find((n) => n.content === 'nombre');
		expect(marked?.lexicon).toEqual({ mode: 'force' });
	});

	it('[mot]{.def=…} : l’entrée visée est gardée telle quelle', () => {
		const nodes = textNodes('Deux [carrés]{.def=carré (géométrie)} identiques.');
		const marked = nodes.find((n) => n.content === 'carrés');
		expect(marked?.lexicon).toEqual({ mode: 'force', target: 'carré (géométrie)' });
	});

	it('[mot]{.nodef} : le mot est bloqué', () => {
		const nodes = textNodes('Une [aire]{.nodef} de jeux.');
		expect(nodes.find((n) => n.content === 'aire')?.lexicon).toEqual({ mode: 'block' });
	});

	it('le mot marqué garde sa mise en forme', () => {
		const nodes = textNodes('[**médiane**]{.def}');
		expect(nodes).toEqual([
			{ type: 'text', content: 'médiane', bold: true, lexicon: { mode: 'force' } }
		]);
	});

	it('un marquage dans un détail de correction garde les deux marques', () => {
		const nodes = textNodes('[on calcule l’[aire]{.def}]{.rappel}');
		const marked = nodes.find((n) => n.content === 'aire');
		expect(marked).toMatchObject({ detail: 'reminder', lexicon: { mode: 'force' } });
	});

	it('jamais dans du code en ligne', () => {
		const nodes = textNodes('`[x]{.def}`');
		expect(nodes[0].code).toBe(true);
		expect(nodes[0].content).toBe('[x]{.def}');
		expect(nodes[0].lexicon).toBeUndefined();
	});

	it('un mot du lexique n’est pas un détail de correction : aucun message d’erreur', () => {
		const versions = splitCorrectionDetail(
			'On calcule l’[aire]{.def} du [carré]{.def=carré (géométrie)}.'
		);
		expect(versions.errors).toEqual([]);
		expect(versions.concise).toContain('[aire]{.def}');
	});
});

// L16 : un marquage au milieu d'une mise en forme ne la coupe plus.
describe('marquage au milieu d’une mise en forme (L16)', () => {
	it('**gras avec un [mot]{.def}** : tout est en gras, le mot est marqué', () => {
		const nodes = textNodes('Un **nombre [pair]{.def} positif** ici.');
		expect(nodes.map((n) => n.content).join('')).toBe('Un nombre pair positif ici.');
		expect(nodes.filter((n) => n.content.includes('**'))).toEqual([]);
		const marked = nodes.find((n) => n.content === 'pair');
		expect(marked).toMatchObject({ bold: true, lexicon: { mode: 'force' } });
		expect(nodes.find((n) => n.content === 'nombre ')?.bold).toBe(true);
		expect(nodes.find((n) => n.content === ' positif')?.bold).toBe(true);
		expect(nodes.find((n) => n.content === 'Un ')?.bold).toBeUndefined();
	});

	it('*italique* et ==surligné== autour d’un [mot]{.nodef}', () => {
		const italic = textNodes('*une [aire]{.nodef} de jeux*');
		expect(italic.every((n) => n.italic)).toBe(true);
		expect(italic.find((n) => n.content === 'aire')?.lexicon).toEqual({ mode: 'block' });
		const highlight = textNodes('==une [aire]{.def} ici==');
		expect(highlight.every((n) => n.highlight)).toBe(true);
	});

	it('marquage dans un lien : le texte du lien ne garde aucun caractère interne', () => {
		const children = paragraphChildren('[un [mot]{.def} lié](https://chiph.re)');
		const all = JSON.stringify(children);
		expect(all).not.toMatch(/[\uE000-\uF8FF]/u);
	});
});
