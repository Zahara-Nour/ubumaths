import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CurveHover from '../CurveHover.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import type { Viewport } from '$lib/grapheur/types';

const viewport: Viewport = { xMin: -1, xMax: 6, yMin: -4, yMax: 4 };
const WIDTH = 800;
const HEIGHT = 800;

async function hoverAt(x: number, y: number) {
	grapheurStore.setViewport(viewport);
	grapheurStore.setCursor({ x, y });

	return await render(CurveHover, {
		transformer: createTransformer(viewport, WIDTH, HEIGHT),
		width: WIDTH,
		height: HEIGHT
	});
}

/**
 * Le nuage de points dit où est le terme ; l'étiquette dit sa valeur. Elle la
 * dit exactement — u₃ = −3/8, pas −0,375 — sans quoi le calcul exact du
 * moteur ne sert à rien.
 */
describe('CurveHover — termes de suite', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
		grapheurStore.setInteracting(false);
	});

	it('affiche la valeur exacte du terme survolé', async () => {
		const id = grapheurStore.addSequence('explicit', '3\\cdot\\left(-\\frac12\\right)^n');
		grapheurStore.updateSequence(id, { firstIndex: 0 });

		const { container } = await hoverAt(3, -0.375);
		const math = container.querySelector('.tooltip-math');

		expect(math).not.toBeNull();
		expect(math?.textContent).toContain('u');
		// MathLive a rendu la fraction, et ce n'est pas la décimale.
		expect(math?.querySelector('.ML__latex')).not.toBeNull();
		expect(math?.textContent).not.toContain('0.375');
	});

	it('nomme le rang survolé', async () => {
		const id = grapheurStore.addSequence('explicit', '2n');
		grapheurStore.updateSequence(id, { firstIndex: 0 });

		const { container } = await hoverAt(2, 4);

		// u₂ = 4 : le rang comme la valeur sont dans l'étiquette.
		expect(container.querySelector('.tooltip-math')?.textContent).toContain('2');
		expect(container.querySelector('.tooltip-math')?.textContent).toContain('4');
	});

	it('n’affiche rien loin de tout terme', async () => {
		grapheurStore.addSequence('explicit', '2n');

		const { container } = await hoverAt(2.5, -3.5);

		expect(container.querySelector('.tooltip-math')).toBeNull();
		expect(container.querySelector('text.tooltip-text')).toBeNull();
	});
});
