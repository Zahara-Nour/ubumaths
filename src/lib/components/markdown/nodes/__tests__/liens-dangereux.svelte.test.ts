/**
 * Un lien `javascript:` écrit dans un paragraphe ou un titre est neutralisé.
 *
 * `ParagraphNode` et `HeadingNode` posaient `href={child.url}` brut, alors
 * qu'`InlineRenderer` passait par `sanitizeUrl`. Le chat élève rend ces
 * paragraphes : un élève pouvait y poster un lien piégé (audit 2026-10-03).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

async function hrefsOf(content: string): Promise<string[]> {
	const screen = await render(MarkdownRenderer, { target: mainElement(), props: { content } });
	return [...screen.container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
}

describe('liens dangereux dans le contenu', () => {
	it('paragraphe : un lien javascript: est neutralisé', async () => {
		expect(await hrefsOf('Voir [ici](javascript:alert(1)) pour la suite.')).toEqual(['#']);
	});

	it('titre : un lien javascript: est neutralisé', async () => {
		expect(await hrefsOf('## Titre [ici](javascript:alert(1))')).toEqual(['#']);
	});

	it('un lien https reste intact', async () => {
		expect(await hrefsOf('Voir [le cours](https://chiph.re/cours).')).toEqual([
			'https://chiph.re/cours'
		]);
	});
});
