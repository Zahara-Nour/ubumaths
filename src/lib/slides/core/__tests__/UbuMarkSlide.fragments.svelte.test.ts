/**
 * Marqueur « -> » en fin de ligne d'une diapositive UbuMark : la ligne devient un fragment,
 * le marqueur disparaît. Une ligne qui finit par une formule rend « -> » dans un nœud de
 * texte à part, sans espace devant (chantier demo-debug, 6i-c).
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import UbuMarkDeckHarness from './UbuMarkDeckHarness.svelte';

async function renderFragments(content: string) {
	const { container } = await render(UbuMarkDeckHarness, { content });
	await expect
		.poll(() => container.querySelector<HTMLElement>('.ubumark-slide')?.style.visibility)
		.toBe('visible');
	return container;
}

describe('UbuMarkSlide, marqueur de fragment', () => {
	it('une ligne de texte terminée par « -> » devient un fragment', async () => {
		const container = await renderFragments('Première étape ->\n\nToujours visible');

		const fragments = [...container.querySelectorAll('.fragment')];
		expect(fragments.map((f) => f.textContent?.trim())).toEqual(['Première étape']);
	});

	it('une ligne terminée par une formule puis « -> » devient un fragment', async () => {
		const container = await renderFragments('$x^2 = 4$ ->\n\n$x = 2$ ->');

		const fragments = [...container.querySelectorAll('.fragment')];
		expect(fragments).toHaveLength(2);
		expect(fragments.every((f) => !f.textContent?.includes('->'))).toBe(true);
	});

	it('une flèche au milieu d’une ligne reste une flèche', async () => {
		const container = await renderFragments('$a$ -> $b$');

		expect(container.querySelectorAll('.fragment')).toHaveLength(0);
		expect(container.querySelector('.ubumark-slide')?.textContent).toContain('->');
	});
});
