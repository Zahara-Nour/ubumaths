import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CurveHover from '../CurveHover.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import type { Viewport } from '$lib/grapheur/types';

const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const WIDTH = 800;
const HEIGHT = 800;

function hoverAt(x: number, y: number) {
	grapheurStore.setViewport(viewport);
	grapheurStore.setCursor({ x, y });

	return render(CurveHover, {
		transformer: createTransformer(viewport, WIDTH, HEIGHT),
		width: WIDTH,
		height: HEIGHT
	});
}

/**
 * Un zéro ou un extremum trouvé symboliquement connaît sa valeur exacte.
 * Afficher « 1,414 » à sa place jetterait ce que le solveur a calculé.
 */
describe('CurveHover — valeurs exactes', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
		grapheurStore.setInteracting(false);
	});

	it('affiche √2 rendu en maths sur le zéro de x²−2', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = hoverAt(Math.SQRT2, 0);

		const math = container.querySelector('.tooltip-math');

		expect(math).not.toBeNull();
		expect(math?.textContent).toContain('Racine');
		// MathLive a bien rendu la formule, ce n'est pas du texte brut.
		expect(math?.querySelector('.ML__latex')).not.toBeNull();
		// Le texte rendu porte le radical, pas « 1,414 ».
		expect(math?.textContent).not.toContain('1.41');
	});

	it('affiche l’ordonnée simplifiée du sommet de x²−2', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = hoverAt(0, -2);

		const math = container.querySelector('.tooltip-math');
		expect(math).not.toBeNull();
		expect(math?.textContent).toContain('Min');
		// L'ordonnée est réduite : −2, et non « 0² − 2 ».
		expect(math?.textContent).toContain('2');
		expect(math?.textContent).not.toContain('^');
	});

	it('retombe sur le texte quand aucune valeur exacte n’est connue', () => {
		grapheurStore.addFunction('e^x-x-2');
		const { container } = hoverAt(1.146, 0);

		expect(container.querySelector('.tooltip-math')).toBeNull();
		expect(container.querySelector('text.tooltip-text')?.textContent).toContain('Racine');
	});

	it('n’affiche rien quand le curseur est loin de tout', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = hoverAt(4.5, 4.5);

		expect(container.querySelector('.tooltip-math')).toBeNull();
		expect(container.querySelector('text.tooltip-text')).toBeNull();
	});
});
