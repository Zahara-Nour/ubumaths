/**
 * Droite graduée dans un item de liste, à l'écran (écart E56).
 *
 * 2026-11-24 : depuis que l'analyseur reconnaît un ```line fermé en retrait dans
 * une liste (#2462), l'item contient un nœud `number-line` que `ListNode` ne
 * savait pas afficher : la droite disparaissait sans message, l'élève ne pouvait
 * pas répondre (le PDF, lui, la dessinait).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ListNode from '../ListNode.svelte';
import { parseMarkdown, type ListNode as ListAst } from '#lib/ubumark/index.ts';

const numbered = `
1. Lis l'abscisse du point A :

   \`\`\`line
   start: -3
   end: -1
   step: 1/10
   major: 10
   points: A=-11/10
   \`\`\`
2. Place le nombre 2,5 :

   \`\`\`line
   start: 0
   end: 5
   step: 1
   \`\`\`
   Texte après la droite.
`;

const bulleted = `
- Sur la droite :

  \`\`\`line
  start: 0
  end: 5
  step: 1
  points: B=2
  \`\`\`
`;

describe('ListNode — droite graduée dans un item', () => {
	it('liste numérotée : chaque droite est dessinée dans son item, avec ses points', async () => {
		const list = parseMarkdown(numbered).children[0] as ListAst;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const screen = await render(ListNode as any, {
			props: { ordered: true, items: list.items }
		});
		const el = screen.container;
		await expect.poll(() => el.querySelectorAll('li .number-line-container').length).toBe(2);
		const items = el.querySelectorAll('ol > li');
		expect(items[0].querySelectorAll('.nl-point').length).toBe(1);
		expect(items[0].querySelectorAll('.nl-tick').length).toBeGreaterThan(3);
		expect(items[1].querySelectorAll('.nl-point').length).toBe(0);
		expect(items[1].querySelectorAll('.nl-tick').length).toBeGreaterThan(3);
		expect(el.textContent).toContain('Texte après la droite.');
		expect(el.textContent).not.toContain('start:');
	});

	it('liste à puces : la droite est dessinée aussi', async () => {
		const list = parseMarkdown(bulleted).children[0] as ListAst;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const screen = await render(ListNode as any, {
			props: { ordered: false, items: list.items }
		});
		const el = screen.container;
		await expect.poll(() => el.querySelectorAll('li .number-line-container').length).toBe(1);
		expect(el.querySelectorAll('.nl-point').length).toBe(1);
	});
});
