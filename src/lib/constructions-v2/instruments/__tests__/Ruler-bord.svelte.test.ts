/**
 * Règle posée sur un trait : le crayon trace le long du bord, le trait reste
 * visible à côté de la règle. Le contour du corps (2 px) ne doit pas
 * recouvrir la ligne y = 0 du repère de la règle, où se dessine le trait.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InstrumentHarness from '$lib/components/geometry/__tests__/InstrumentHarness.svelte';

describe('Ruler — bord le long du trait', () => {
	it('le contour du corps commence sous le trait (y = 100), sans le couvrir', async () => {
		const screen = await render(InstrumentHarness, { props: { instrument: 'ruler' } });
		const svg = screen.container.querySelector('svg.instrument-harness') as SVGSVGElement;
		const body = screen.container.querySelector('.ruler-instrument rect') as SVGRectElement;
		expect(body).not.toBeNull();
		const top = body.getBoundingClientRect().top - svg.getBoundingClientRect().top;
		// Trait de 2 px centré sur y = 100 (99 → 101) ; contour de 2 px centré
		// sur le haut du corps : il doit commencer à 101 au plus tôt.
		const strokeHalf = Number(body.getAttribute('stroke-width')) / 2;
		expect(top - strokeHalf).toBeGreaterThanOrEqual(101 - 1e-6);
	});

	it('les graduations partent du bord du corps', async () => {
		const screen = await render(InstrumentHarness, { props: { instrument: 'ruler' } });
		const body = screen.container.querySelector('.ruler-instrument rect') as SVGRectElement;
		const tick = screen.container.querySelector(
			'.ruler-instrument .graduations line'
		) as SVGLineElement;
		expect(tick.getBoundingClientRect().top).toBeCloseTo(body.getBoundingClientRect().top, 1);
	});
});
