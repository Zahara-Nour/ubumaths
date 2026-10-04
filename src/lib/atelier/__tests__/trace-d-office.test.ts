/**
 * Ce que Calcul crée se voit — décision de David (2026-10-04).
 *
 * Une fonction tapée dans Calcul était déjà tracée (#813) ; David a étendu la
 * règle aux suites et à ce que « Garder… » crée depuis une ligne de calcul.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { runInput, promote } from '../calcul';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('tracé d’office depuis Calcul', () => {
	it('une suite explicite tapée est tracée', () => {
		const s = session();

		runInput(s, 'u(n) = 2n + 1');

		expect(s.atelier.get('u')?.plotted).toBe(true);
	});

	it('une suite récurrente tapée est tracée', () => {
		const s = session();

		runInput(s, 'u(n+1) = 0,5u(n) + 3');

		expect(s.atelier.get('u')?.plotted).toBe(true);
	});

	it('une fonction gardée avec « Garder… » est tracée', () => {
		const s = session();
		const line = runInput(s, '(x+1)^2 - 1');

		const kept = promote(s, line);

		expect(kept.ok).toBe(true);
		if (kept.ok) expect(s.atelier.get(kept.object.name)?.plotted).toBe(true);
	});

	it('une suite gardée est tracée', () => {
		const s = session();
		const line = runInput(s, '2n + 1');

		const kept = promote(s, line);

		expect(kept.ok).toBe(true);
		if (kept.ok) expect(s.atelier.get(kept.object.name)?.plotted).toBe(true);
	});

	it('une valeur gardée n’est pas « tracée »', () => {
		const s = session();
		const line = runInput(s, '2 + 3');

		const kept = promote(s, line);

		expect(kept.ok).toBe(true);
		if (kept.ok) expect(s.atelier.get(kept.object.name)?.plotted).toBeFalsy();
	});

	it('une suite redéfinie, retirée du graphique, n’y revient pas', () => {
		const s = session();
		runInput(s, 'u(n) = 2n');
		s.atelier.setPlotted('u', false);

		runInput(s, 'u(n) = 3n');

		expect(s.atelier.get('u')?.plotted).toBeFalsy();
	});

	it('une récurrence retapée, retirée du graphique, n’y revient pas', () => {
		const s = session();
		runInput(s, 'u(n+1) = 2u(n) + 1');
		s.atelier.setPlotted('u', false);

		runInput(s, 'u(n+1) = 3u(n) - 2');

		expect(s.atelier.get('u')?.plotted).toBeFalsy();
	});
});
