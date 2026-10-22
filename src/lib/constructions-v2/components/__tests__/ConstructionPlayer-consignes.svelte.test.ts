/**
 * Consignes des sous-étapes — lot 2 de `docs/wip/constructions-progress.md`.
 *
 * Décision de David (2026-10-23) : deux lignes. La consigne `@instruction`
 * de l'auteur reste en haut ; celle de la sous-étape chorégraphiée
 * (`SubStep.instruction`) s'affiche dessous et disparaît au pas suivant.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ConstructionPlayer from '../ConstructionPlayer.svelte';

// =============================================================================
// Décor
// =============================================================================

const SCRIPT = [
	'@instruction("Trace la médiatrice de [AB]")',
	'A = point(0, 0)',
	'B = point(4, 0)',
	'd = mediatrice(A, B) @euclide',
	'C = point(0, 3)'
].join('\n');

function authorInstruction(container: HTMLElement): string | null {
	return container.querySelector('[data-testid="consigne-auteur"]')?.textContent?.trim() ?? null;
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

async function previous(container: HTMLElement): Promise<void> {
	const button = container.querySelector<HTMLButtonElement>('button[title="Etape precedente"]');
	if (!button) throw new Error('bouton « étape précédente » introuvable');
	await userEvent.click(button);
}

// =============================================================================
// Tests
// =============================================================================

describe('ConstructionPlayer — consignes des sous-étapes', () => {
	it('affiche la consigne de la sous-étape sous celle de l’auteur', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT,
			width: 400,
			height: 300
		});
		// @instruction, A, B, puis 1re sous-étape de la médiatrice
		await next(container, 4);
		await expect.poll(() => subStepInstruction(container)).toBe("Compas en A, petit arc d'un côté");
		expect(authorInstruction(container)).toBe('Trace la médiatrice de [AB]');
	});

	it('suit le curseur : sous-étape suivante, puis retour en arrière', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT,
			width: 400,
			height: 300
		});
		await next(container, 5);
		await expect
			.poll(() => subStepInstruction(container))
			.toBe("Petit arc de l'autre côté, même ouverture");
		await previous(container);
		await expect.poll(() => subStepInstruction(container)).toBe("Compas en A, petit arc d'un côté");
	});

	it('rien sous la consigne de l’auteur hors d’une instruction chorégraphiée', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT,
			width: 400,
			height: 300
		});
		await next(container, 3); // @instruction, A, B
		await expect.poll(() => authorInstruction(container)).toBe('Trace la médiatrice de [AB]');
		expect(subStepInstruction(container)).toBeNull();
	});

	it('la consigne de sous-étape disparaît au pas suivant non chorégraphié', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT,
			width: 400,
			height: 300
		});
		// @instruction, A, B, 6 sous-étapes de la médiatrice, puis C
		await next(container, 10);
		await expect.poll(() => authorInstruction(container)).toBe('Trace la médiatrice de [AB]');
		expect(subStepInstruction(container)).toBeNull();
	});
});
