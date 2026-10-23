/**
 * Parallèle par double perpendiculaire — lot 5 de `docs/wip/constructions-progress.md`.
 *
 * Rendu dans le lecteur : la construction se joue jusqu'au bout sans
 * interruption et les consignes des sous-étapes s'affichent.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ConstructionPlayer from '../ConstructionPlayer.svelte';

// =============================================================================
// Décor
// =============================================================================

function script(voie: string): string {
	return [
		'A = point(0, 0)',
		'B = point(4, 1)',
		'P = point(1, 3)',
		`d = parallele(P, A, B) ${voie}`
	].join('\n');
}

function subStepInstruction(container: HTMLElement): string | null {
	return (
		container.querySelector('[data-testid="consigne-sous-etape"]')?.textContent?.trim() ?? null
	);
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

describe('ConstructionPlayer — parallèle par double perpendiculaire', () => {
	it('@euclide : e apparaît, puis la construction va au bout', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: script('@euclide @double_perpendiculaire'),
			width: 400,
			height: 300
		});
		// A, B, P, puis les 7 sous-étapes de la perpendiculaire et l'apparition de e
		await next(container, 3 + 8);
		await expect
			.poll(() => subStepInstruction(container))
			.toBe('La perpendiculaire e à (AB) passant par P apparaît');
		await next(container, 8);
		await expect
			.poll(() => subStepInstruction(container))
			.toBe('Règle par P et R : on trace la parallèle à (AB)');
		expect(container.textContent).not.toContain('Exécution interrompue');
	});

	it('@equerre : la construction va au bout', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: script('@equerre @double_perpendiculaire'),
			width: 400,
			height: 300
		});
		await next(container, 3 + 10);
		await expect
			.poll(() => subStepInstruction(container))
			.toBe('On prolonge le tracé le long de la règle : c’est la parallèle à (AB)');
		expect(container.textContent).not.toContain('Exécution interrompue');
	});

	it('P sur (AB) : exécution interrompue, pas de sous-étape jouée', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: [
				'A = point(0, 0)',
				'B = point(4, 1)',
				'P = point(8, 2)',
				'd = parallele(P, A, B) @euclide @double_perpendiculaire'
			].join('\n'),
			width: 400,
			height: 300
		});
		// Seuls les 3 points sont jouables : la frise s'arrête avant la parallèle
		await next(container, 3);
		await expect.poll(() => container.textContent).toContain('Exécution interrompue');
		expect(subStepInstruction(container)).toBeNull();
	});
});
