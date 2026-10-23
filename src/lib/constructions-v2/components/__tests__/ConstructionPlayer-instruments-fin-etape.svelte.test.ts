/**
 * Instruments posés automatiquement, à l'arrêt entre deux étapes : ceux de
 * l'étape qui vient de finir restent affichés dans leur position de fin de
 * geste ; ils disparaissent à la fin de toute la construction, sauf si elle
 * s'est arrêtée sur une erreur.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ConstructionPlayer from '../ConstructionPlayer.svelte';

// =============================================================================
// Décor
// =============================================================================

// A, B, [AB], @pause, C, [AC] : 6 pas
const SCRIPT = [
	'A = point(0, 0)',
	'B = point(4, 0)',
	'segment(A, B)',
	'@pause(500)',
	'C = point(0, 3)',
	'segment(A, C)'
].join('\n');

// La 4e instruction échoue : la frise s'arrête après [AB]
const SCRIPT_EN_ERREUR = [
	'A = point(0, 0)',
	'B = point(4, 0)',
	'segment(A, B)',
	'd = droite(X, Y)'
].join('\n');

function shownInstruments(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[data-instrument]')]
		.map((el) => el.getAttribute('data-instrument') ?? '')
		.sort();
}

/** Abscisse SVG de la translation d'un instrument affiché. */
function instrumentX(container: HTMLElement, type: string): number {
	const el = container.querySelector(`[data-instrument="${type}"]`);
	const match = el?.getAttribute('transform')?.match(/translate\(\s*([-\d.e]+)/);
	if (!match) throw new Error(`instrument ${type} introuvable`);
	return Number(match[1]);
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

describe('ConstructionPlayer — instruments à l’arrêt entre deux étapes', () => {
	it('avant la première étape : aucun instrument', async () => {
		const { container } = await render(ConstructionPlayer, { script: SCRIPT });
		await expect.poll(() => container.querySelector('svg')).not.toBeNull();
		expect(shownInstruments(container)).toEqual([]);
	});

	it('fin du tracé de [AB] : règle et crayon, crayon au bout du trait', async () => {
		const { container } = await render(ConstructionPlayer, { script: SCRIPT });
		await next(container, 3);
		await expect.poll(() => shownInstruments(container)).toEqual(['pencil', 'ruler']);
		// Règle posée en A, crayon en B : 4 unités plus loin
		expect(instrumentX(container, 'pencil') - instrumentX(container, 'ruler')).toBeGreaterThan(100);
	});

	it('pendant le @pause qui suit : règle et crayon toujours là, crayon en B', async () => {
		const { container } = await render(ConstructionPlayer, { script: SCRIPT });
		await next(container, 3);
		await expect.poll(() => shownInstruments(container)).toEqual(['pencil', 'ruler']);
		const pencilX = instrumentX(container, 'pencil');
		await next(container);
		await expect.poll(() => container.textContent).toContain('Etape 4 / 6');
		expect(shownInstruments(container)).toEqual(['pencil', 'ruler']);
		expect(instrumentX(container, 'pencil')).toBeCloseTo(pencilX);
	});

	it('étape suivante qui crée un point : les instruments disparaissent', async () => {
		const { container } = await render(ConstructionPlayer, { script: SCRIPT });
		await next(container, 5);
		await expect.poll(() => container.textContent).toContain('Etape 5 / 6');
		expect(shownInstruments(container)).toEqual([]);
	});

	it('fin de toute la construction : figure finale sans instrument', async () => {
		const { container } = await render(ConstructionPlayer, { script: SCRIPT });
		await next(container, 6);
		await expect.poll(() => container.textContent).toContain('Etape 6 / 6');
		expect(shownInstruments(container)).toEqual([]);
	});

	it('arrêt sur une erreur : les instruments de la dernière étape restent', async () => {
		const { container } = await render(ConstructionPlayer, { script: SCRIPT_EN_ERREUR });
		await next(container, 3);
		await expect
			.poll(() => container.querySelector('[data-testid="arret-execution"]'))
			.not.toBeNull();
		expect(shownInstruments(container)).toEqual(['pencil', 'ruler']);
	});
});
