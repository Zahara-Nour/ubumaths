/**
 * Les titres d'un contenu Markdown (énoncé, cours, chat) sont décalés d'un niveau :
 * `#` → `<h2>`, `##` → `<h3>`… Le seul `<h1>` d'une page est son titre propre.
 *
 * L'apparence ne change pas : chaque titre garde la taille de son niveau d'origine
 * (les règles globales `main hN` imposent leur taille en !important).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';

const mains: HTMLElement[] = [];

afterEach(() => {
	mains.splice(0).forEach((m) => m.remove());
});

/** Rend le Markdown dans un <main>, comme dans l'application, avec un hN de référence */
async function renderInMain(content: string) {
	const screen = await render(MarkdownRenderer, { props: { content } });
	const main = document.createElement('main');
	mains.push(main);
	document.body.appendChild(main);
	main.appendChild(screen.container);
	const reference = (tag: string) => {
		const el = document.createElement(tag);
		el.textContent = 'référence';
		main.appendChild(el);
		return getComputedStyle(el).fontSize;
	};
	return { container: screen.container, reference };
}

describe('titres Markdown décalés d’un niveau', () => {
	it('`#` devient un <h2>, `##` un <h3>, jamais un <h1>', async () => {
		const { container } = await renderInMain('# Exercice 1\n\n## Partie A\n\nTexte.');
		expect(container.querySelectorAll('h1')).toHaveLength(0);
		expect(container.querySelector('h2')?.textContent).toContain('Exercice 1');
		expect(container.querySelector('h3')?.textContent).toContain('Partie A');
	});

	it('`######` reste un <h6>', async () => {
		const { container } = await renderInMain('###### Note');
		expect(container.querySelector('h6')?.textContent).toContain('Note');
	});

	it('chaque titre garde la taille de son niveau d’origine', async () => {
		const { container, reference } = await renderInMain('# Un\n\n## Deux\n\n### Trois');
		const size = (sel: string) => getComputedStyle(container.querySelector(sel)!).fontSize;
		expect(size('h2')).toBe(reference('h1'));
		expect(size('h3')).toBe(reference('h2'));
		expect(size('h4')).toBe(reference('h3'));
	});
});
