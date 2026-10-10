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
	it.each(['x^2+1', '3[m]'])(
		'`~%s~` est rendue comme dans un paragraphe, sans tilde visible',
		async (expr) => {
			const el = await cellules(`~${expr}~\n\n| a |\n| --- |\n| ~${expr}~ |`);
			const cell = el.querySelector('td');
			await expect.poll(() => cell?.querySelectorAll('math-span').length).toBe(1);
			const paragraphMath = el.querySelector('p math-span')?.textContent;
			expect(paragraphMath).toBeTruthy();
			expect(cell?.querySelector('math-span')?.textContent).toBe(paragraphMath);
			// Texte HORS formule (le LaTeX d'une unité contient un `~` d'espace insécable)
			const outside = [...(cell?.childNodes ?? [])]
				.filter((node) => !(node instanceof Element && node.querySelector('math-span')))
				.filter((node) => !(node instanceof Element && node.matches('math-span')))
				.map((node) => node.textContent ?? '')
				.join('');
			expect(outside).not.toContain('~');
		}
	);

	it('cellule `$…$` : inchangée (une formule)', async () => {
		const el = await cellules('| a |\n| --- |\n| $x+1$ |');
		const cell = el.querySelector('td');
		await expect.poll(() => cell?.querySelectorAll('math-span').length).toBe(1);
	});
});
