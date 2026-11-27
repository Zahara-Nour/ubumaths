/**
 * Étiquettes à ranger dans un item de liste, à l'écran (écart L89).
 *
 * Avant : l'analyseur laissait un ```ranger en retrait dans une liste en bloc de
 * code (« signe: < », « - 12 »… affichés bruts). Le reconnaître ne suffisait pas :
 * `ListNode` doit aussi savoir l'afficher, sinon le bloc disparaît sans message
 * (même piège que la droite graduée, E56).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';

const block = (indent: string) =>
	['```ranger', 'signe: <', '- 12', '- 7', '- 30', '```'].map((l) => `${indent}${l}`);

describe('ListNode — étiquettes à ranger dans un item', () => {
	it.each([
		['numérotée', ['1. Range ces nombres :', '', ...block('   '), '', '2. Suite du cours.']],
		['à puces', ['- Range ces nombres :', '', ...block('  ')]]
	])('liste %s : les étiquettes, pas leur source', async (_, lines) => {
		const screen = await render(MarkdownRenderer, { content: lines.join('\n') });

		await expect.element(screen.getByText('30', { exact: true }).first()).toBeInTheDocument();
		expect(screen.container.textContent).toContain('12');
		expect(screen.container.textContent).not.toContain('signe:');
		expect(screen.container.querySelector('pre')).toBeNull();
	});
});
