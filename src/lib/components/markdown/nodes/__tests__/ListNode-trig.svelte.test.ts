/**
 * Cercle trigonométrique dans un item de liste, à l'écran.
 *
 * 2026-09-25 : depuis que l'analyseur reconnaît un ```trig en retrait dans une
 * liste (#427), l'item contient un nœud `trig-circle` que `ListNode` ne savait
 * pas afficher : le cercle disparaissait sans message.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListNode from '../ListNode.svelte';
import { parseMarkdown, type ListNode as ListAst } from '$lib/ubumark';

const markdown = `
1. Sur le cercle :

   \`\`\`trig
   preset: custom
   angles: pi/3, -pi/3
   equation: cos(x) >= 1/2
   mode: arc
   \`\`\`
   Donc l'arc de droite.
2. Suite.
`;

describe('ListNode — cercle trigonométrique dans un item', () => {
	it('affiche le cercle et son arc', async () => {
		const list = parseMarkdown(markdown).children[0] as ListAst;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const screen = render(ListNode as any, {
			props: { ordered: true, items: list.items }
		});
		const el = screen.container;
		await expect.poll(() => el.querySelectorAll('.trig-unit-circle').length).toBe(1);
		expect(el.querySelectorAll('.trig-solution-arc').length).toBe(1);
		expect(el.textContent).toContain("Donc l'arc de droite.");
	});
});
