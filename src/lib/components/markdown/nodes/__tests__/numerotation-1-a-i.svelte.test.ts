/**
 * Numéros des questions à l'écran : 1) a) i), comme le PDF (choix de David,
 * 2026-10-18). Une liste à un seul niveau est numérotée 1) 2) 3).
 *
 * Le numéro est un `::before` posé par `list-numbering.css` : on lit son
 * contenu calculé, c'est-à-dire ce que l'élève voit.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import '$lib/styles/list-numbering.css';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';

/**
 * Le style du numéro affiché de chaque item, dans l'ordre du document. Le
 * navigateur rend `content` non résolu (« counter(enum2, lower-alpha) ") " ») :
 * on en lit le style du compteur, suivi du séparateur.
 */
async function numbers(content: string): Promise<string[]> {
	const screen = await render(MarkdownRenderer, { props: { content } });
	await expect.poll(() => screen.container.querySelectorAll('ol > li').length).toBeGreaterThan(0);
	return [...screen.container.querySelectorAll('ol > li')].map((li) => {
		const before = getComputedStyle(li, '::before').content;
		const style = /counter\(\w+(?:, ([\w-]+))?\)/.exec(before)?.[1] ?? 'decimal';
		return before.includes(')') ? `${style})` : before;
	});
}

describe('numérotation des listes à l’écran', () => {
	it('liste imbriquée : 1) puis a) puis i)', async () => {
		expect(await numbers('1. Un\n   1. Deux\n      1. Trois\n2. Quatre')).toEqual([
			'decimal)',
			'lower-alpha)',
			'lower-roman)',
			'decimal)'
		]);
	});

	it('liste à un seul niveau : 1) 2) 3)', async () => {
		expect(await numbers('1. Un\n2. Deux\n3. Trois')).toEqual(['decimal)', 'decimal)', 'decimal)']);
	});
});
