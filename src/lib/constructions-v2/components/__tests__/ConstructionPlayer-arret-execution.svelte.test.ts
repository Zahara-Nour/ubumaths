/**
 * Arrêt d'exécution signalé dans les consignes — lot 6 de
 * `docs/wip/constructions-progress.md`.
 *
 * Décision de David (2026-10-23) : au dernier pas de la frise, si
 * l'exécution s'est arrêtée ensuite, une ligne « ⚠ Arrêt à la ligne N : … »
 * s'ajoute sous les consignes ; la consigne du dernier pas joué reste ;
 * curseur reculé → la ligne disparaît.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ConstructionPlayer from '../ConstructionPlayer.svelte';

// =============================================================================
// Décor
// =============================================================================

// P est sur (AB) : la ligne 5 échoue avant toute sous-étape.
const SCRIPT_EN_ERREUR = [
	'@instruction("Trace la parallèle à (AB) par P")',
	'A = point(0, 0)',
	'B = point(4, 0)',
	'P = point(2, 0)',
	'd = parallele(P, A, B) @euclide @double_perpendiculaire'
].join('\n');

// La consigne finale marque le dernier pas de la frise.
const SCRIPT_SANS_ERREUR = [
	'A = point(0, 0)',
	'B = point(4, 0)',
	'P = point(1, 3)',
	'd = parallele(P, A, B)',
	'@instruction("Fin")'
].join('\n');

// La première instruction échoue : la frise n'a aucun pas.
const SCRIPT_EN_ERREUR_DES_LE_DEBUT = 'd = droite(X, Y)';

function stopLine(container: HTMLElement): string | null {
	return container.querySelector('[data-testid="arret-execution"]')?.textContent?.trim() ?? null;
}

function authorInstruction(container: HTMLElement): string | null {
	return container.querySelector('[data-testid="consigne-auteur"]')?.textContent?.trim() ?? null;
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

describe('ConstructionPlayer — arrêt d’exécution signalé', () => {
	it('au dernier pas, signale l’arrêt sous la consigne qui reste', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT_EN_ERREUR,
			width: 400,
			height: 300
		});
		// @instruction, A, B, P : la frise s'arrête là
		await next(container, 4);
		await expect
			.poll(() => stopLine(container))
			.toBe(
				'⚠ Arrêt à la ligne 5 : `parallele(P, A, B) @double_perpendiculaire` : P est sur la droite (AB) : la parallèle est (AB) elle-même, il n’y a rien à construire.'
			);
		expect(authorInstruction(container)).toBe('Trace la parallèle à (AB) par P');
	});

	it('avant le dernier pas, rien n’est signalé', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT_EN_ERREUR,
			width: 400,
			height: 300
		});
		await next(container, 2);
		await expect.poll(() => authorInstruction(container)).toBe('Trace la parallèle à (AB) par P');
		expect(stopLine(container)).toBeNull();
	});

	it('curseur reculé depuis le dernier pas : la ligne disparaît', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT_EN_ERREUR,
			width: 400,
			height: 300
		});
		await next(container, 4);
		await expect.poll(() => stopLine(container)).not.toBeNull();
		await previous(container);
		await expect.poll(() => stopLine(container)).toBeNull();
	});

	it('script sans erreur : rien n’est signalé à la fin', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT_SANS_ERREUR,
			width: 400,
			height: 300
		});
		await next(container, 5);
		await expect.poll(() => authorInstruction(container)).toBe('Fin');
		expect(stopLine(container)).toBeNull();
	});

	it('première instruction en erreur : la ligne s’affiche dès le chargement', async () => {
		const { container } = await render(ConstructionPlayer, {
			script: SCRIPT_EN_ERREUR_DES_LE_DEBUT,
			width: 400,
			height: 300
		});
		await expect.poll(() => stopLine(container)).toMatch(/^⚠ Arrêt à la ligne 1 : /);
	});

	it('script corrigé : la ligne disparaît', async () => {
		const { container, rerender } = await render(ConstructionPlayer, {
			script: SCRIPT_EN_ERREUR,
			width: 400,
			height: 300
		});
		await next(container, 4);
		await expect.poll(() => stopLine(container)).not.toBeNull();
		await rerender({ script: SCRIPT_SANS_ERREUR });
		await next(container, 5);
		await expect.poll(() => authorInstruction(container)).toBe('Fin');
		expect(stopLine(container)).toBeNull();
	});
});
