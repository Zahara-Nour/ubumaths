import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SpecialPoints from '../SpecialPoints.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import type { Viewport } from '$lib/grapheur/types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function renderPoints() {
	grapheurStore.setViewport(viewport);

	return render(SpecialPoints, {
		transformer: createTransformer(viewport, 800, 800)
	});
}

function titles(container: Element, selector: string): string[] {
	return [...container.querySelectorAll(selector)].map(
		(el) => el.querySelector('title')?.textContent ?? ''
	);
}

/**
 * `analyzeFunction()` sait passer par l'analyse exacte de mathAST, mais le
 * composant ne lui donnait que l'évaluateur compilé : le chemin exact était
 * écrit, testé, et jamais emprunté par l'application.
 */
describe('SpecialPoints', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
	});

	it('affiche le sommet d’une parabole', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = renderPoints();

		const markers = container.querySelectorAll('path.extremum-marker');
		expect(markers).toHaveLength(1);
		expect(titles(container, 'path.extremum-marker')[0]).toContain('Min');
	});

	it('affiche les deux zéros de x²−2', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = renderPoints();

		expect(container.querySelectorAll('path.root-marker')).toHaveLength(2);
	});

	it('n’invente pas de zéro pour (x-1)²', () => {
		grapheurStore.addFunction('(x-1)^2');
		const { container } = renderPoints();

		const labels = titles(container, 'path.root-marker');
		expect(labels).toHaveLength(1);
		expect(labels[0]).toContain('1.000');
	});

	it('n’analyse rien pendant une interaction', () => {
		grapheurStore.addFunction('x^2-2');
		grapheurStore.setInteracting(true);
		const { container } = renderPoints();

		expect(container.querySelectorAll('path.root-marker')).toHaveLength(0);
		grapheurStore.setInteracting(false);
	});
});
