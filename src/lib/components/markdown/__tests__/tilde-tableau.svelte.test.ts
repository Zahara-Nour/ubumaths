/**
 * Formule `~…~` dans une cellule de tableau, à l'écran (écart V10, 2026-10-10)
 *
 * `TableNode` ne reconnaissait que `$…$` : `~x^2+1~` s'affichait en clair.
 * La formule doit être rendue comme dans un paragraphe.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';

async function cellules(content: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(MarkdownRenderer as any, { props: { content } });
	const el = screen.container;
	await expect.poll(() => el.querySelectorAll('td').length).toBeGreaterThan(0);
	return el;
}

describe('TableNode — formule ~…~ en cellule', () => {
	it('`~x^2+1~` est rendue en formule, sans tilde visible', async () => {
		const el = await cellules('| a |\n| --- |\n| ~x^2+1~ |');
		const cell = el.querySelector('td');
		await expect.poll(() => cell?.querySelectorAll('math-span').length).toBe(1);
		expect(cell?.querySelector('math-span')?.textContent).toContain('x^{2}');
		expect(cell?.textContent).not.toContain('~');
	});

	it('cellule `$…$` : inchangée (une formule)', async () => {
		const el = await cellules('| a |\n| --- |\n| $x+1$ |');
		const cell = el.querySelector('td');
		await expect.poll(() => cell?.querySelectorAll('math-span').length).toBe(1);
	});
});
