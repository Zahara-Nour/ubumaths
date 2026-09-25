/**
 * Listes en colonnes (`:colonnes N`) à l'écran (2026-09-25)
 *
 * Même ordre de lecture que le PDF : en LIGNES (a) b) / c) d)) — la grille CSS
 * remplit ligne par ligne. Numérotation inchangée.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListNode from '../ListNode.svelte';
import { parseMarkdown, type ListNode as ListAst } from '$lib/ubumark';

async function rendre(markdown: string) {
	const list = parseMarkdown(markdown).children[0] as ListAst;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(ListNode as any, {
		props: { ordered: list.ordered, start: list.start, items: list.items, columns: list.columns }
	});
	return screen.container;
}

/** Position (colonne, ligne) de chaque item, par sa boîte à l'écran. */
function positions(el: HTMLElement) {
	const items = [...el.querySelectorAll('li')] as HTMLElement[];
	return items
		.map((li) => li.getBoundingClientRect())
		.map((r) => ({ x: Math.round(r.left), y: Math.round(r.top) }));
}

describe('ListNode — colonnes', () => {
	it('2 colonnes, lues en lignes : a) b) sur la même ligne, c) en dessous de a)', async () => {
		const el = await rendre(':colonnes 2\n1. a\n2. b\n3. c');
		await expect.poll(() => positions(el).length).toBe(3);
		const [a, b, c] = positions(el);
		expect(b.y).toBe(a.y);
		expect(b.x).toBeGreaterThan(a.x);
		expect(c.x).toBe(a.x);
		expect(c.y).toBeGreaterThan(a.y);
	});

	it('3 colonnes : les trois premiers items sur la même ligne', async () => {
		const el = await rendre(':colonnes 3\n- a\n- b\n- c\n- d');
		await expect.poll(() => positions(el).length).toBe(4);
		const [a, b, c, d] = positions(el);
		expect(new Set([a.y, b.y, c.y]).size).toBe(1);
		expect(d.y).toBeGreaterThan(a.y);
	});

	it('sans colonnes : un item par ligne', async () => {
		const el = await rendre('1. a\n2. b');
		await expect.poll(() => positions(el).length).toBe(2);
		const [a, b] = positions(el);
		expect(b.y).toBeGreaterThan(a.y);
	});

	it('numérotation inchangée (départ à 3)', async () => {
		const el = await rendre(':colonnes 2\n3. a\n4. b');
		await expect.poll(() => el.querySelector('ol')).not.toBeNull();
		expect(el.querySelector('ol')?.getAttribute('start')).toBe('3');
	});
});
