/**
 * Étiquettes indicées de l'arbre pondéré, à l'écran (2026-11-05)
 *
 * `G_1` sortait « G_1 » brut (mis entier dans `\text{}`) au lieu de G indice 1.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProbabilityTree from '../ProbabilityTree.svelte';
import { parseProbTreeContent } from '$lib/ubumark/parser/probability-tree-parser';

async function mathSpans(lines: string[]): Promise<string[]> {
	const { node } = parseProbTreeContent(lines);
	if (!node) throw new Error('arbre non analysé');
	const screen = await render(ProbabilityTree, { props: { node } });
	return [...screen.container.querySelectorAll('math-span')].map((el) => el.textContent ?? '');
}

describe('arbre pondéré — étiquettes indicées à l’écran', () => {
	it('G_1 en maths (G indice 1), jamais en texte brut', async () => {
		const spans = await mathSpans(['G_1:0.4', '  D:0.1', 'G_2:0.6', '  D:0.2']);
		expect(spans).toContain('G_1');
		expect(spans).toContain('G_2');
		expect(spans.some((s) => s.includes('\\text{G_'))).toBe(false);
	});

	it('mot indicé : le mot en texte, l’indice en maths', async () => {
		expect(await mathSpans(['Malade_1:0.5', 'Sain:0.5'])).toContain('\\text{Malade}_1');
	});
});
