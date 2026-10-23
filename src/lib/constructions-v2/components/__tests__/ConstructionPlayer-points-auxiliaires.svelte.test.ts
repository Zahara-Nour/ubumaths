/**
 * Points auxiliaires nommés — lot 9 de `docs/wip/constructions-progress.md`.
 *
 * Rendu dans le lecteur : la lettre que cite la consigne (« Les arcs se
 * croisent en Q ») s'écrit à côté du point sur la figure.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ConstructionPlayer from '../ConstructionPlayer.svelte';

// =============================================================================
// Décor
// =============================================================================

function subStepInstruction(container: HTMLElement): string | null {
	return (
		container.querySelector('[data-testid="consigne-sous-etape"]')?.textContent?.trim() ?? null
	);
}

/** Étiquettes écrites sur la figure. */
function labels(container: HTMLElement): string[] {
	return [...container.querySelectorAll('svg text.label')].map((t) => t.textContent?.trim() ?? '');
}

async function next(container: HTMLElement, times = 1): Promise<void> {
	const button = container.querySelector<HTMLButtonElement>(
		'button[title="Etape suivante (instantane)"]'
	);
	if (!button) throw new Error('bouton « étape suivante » introuvable');
	for (let i = 0; i < times; i++) await userEvent.click(button);
}

// =============================================================================
// Tests
// =============================================================================

describe('ConstructionPlayer — points auxiliaires nommés', () => {
	it('parallèle @squelette : Q est écrit sur la figure', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: [
				'A = point(0, 0)',
				'B = point(4, 1)',
				'P = point(1, 3)',
				'd = parallele(P, A, B) @euclide @parallelogramme @squelette'
			].join('\n'),
			width: 400,
			height: 300
		});
		// A, B, P, puis les 5 premières sous-étapes : Q apparaît
		await next(container, 3 + 5);
		await expect.poll(() => subStepInstruction(container)).toBe('Les arcs se croisent en Q');
		await expect.poll(() => labels(container)).toContain('Q');
	});

	it('Q déjà dans le script : le point auxiliaire s’écrit Q′', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: [
				'A = point(0, 0)',
				'B = point(4, 1)',
				'P = point(1, 3)',
				'Q = point(6, 5)',
				'd = parallele(P, A, B) @euclide @parallelogramme @squelette'
			].join('\n'),
			width: 400,
			height: 300
		});
		await next(container, 4 + 5);
		await expect.poll(() => subStepInstruction(container)).toBe('Les arcs se croisent en Q′');
		await expect.poll(() => labels(container)).toContain('Q′');
		expect(labels(container).filter((l) => l === 'Q')).toHaveLength(1);
	});

	it('double perpendiculaire @squelette : e (droite) et R écrits sur la figure', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: [
				'A = point(0, 0)',
				'B = point(4, 1)',
				'P = point(1, 3)',
				'd = parallele(P, A, B) @euclide @double_perpendiculaire @squelette'
			].join('\n'),
			width: 400,
			height: 300
		});
		// A, B, P, puis les 16 sous-étapes
		await next(container, 3 + 16);
		await expect
			.poll(() => subStepInstruction(container))
			.toBe('Règle par P et R : on trace la parallèle à (AB)');
		await expect.poll(() => labels(container)).toContain('e');
		expect(labels(container)).toContain('R');
	});
});
