/**
 * Les liens `/grapheur?f=…` — lot 6 du passage de `/grapheur` par l'atelier
 * (phase 0 `docs/wip/atelier-grapheur-phase0.md` §6 B4 à B6).
 *
 * L'entrée « projection » : le prof prépare ses liens, un par courbe ; le lien
 * ouvre un écran propre avec ces seules courbes, sans lire ni écrire l'atelier
 * personnel (même mécanisme éphémère que `/atelier?a=`).
 */

import { describe, it, expect } from 'vitest';
import { curvesFromLink, atelierFromCurves, MAX_LINK_CURVES } from '../grapheur-link';

function params(query: string): URLSearchParams {
	return new URLSearchParams(query);
}

describe('lire un lien /grapheur', () => {
	it('sans `f` : pas de courbe à afficher', () => {
		expect(curvesFromLink(params(''))).toEqual({ kind: 'none' });
	});

	it('une courbe', () => {
		expect(curvesFromLink(params('f=x%5E2-3x%2B1'))).toEqual({
			kind: 'curves',
			definitions: ['x^2-3x+1']
		});
	});

	it('plusieurs courbes, dans l’ordre (B5)', () => {
		expect(curvesFromLink(params('f=x&f=2x&f=x%5E2'))).toEqual({
			kind: 'curves',
			definitions: ['x', '2x', 'x^2']
		});
	});

	it.each([
		['trop de courbes', Array.from({ length: MAX_LINK_CURVES + 1 }, () => 'f=x').join('&')],
		['une courbe trop longue', `f=${'x%2B'.repeat(200)}1`],
		['une courbe vide', 'f=']
	])('refuse %s, en français', (_, query) => {
		const result = curvesFromLink(params(query));

		expect(result.kind).toBe('invalid');
		if (result.kind === 'invalid') expect(result.message).not.toBe('');
	});
});

describe('l’atelier d’un lien', () => {
	it('chaque courbe devient une fonction tracée : f, g, h', () => {
		const result = atelierFromCurves(['x^2', '2x+1', 'sqrt(x)']);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const names = result.atelier.objects.map((o) => o.name);
		expect(names).toEqual(['f', 'g', 'h']);
		expect(result.atelier.objects.every((o) => o.plotted && o.status === 'ok')).toBe(true);
	});

	// B6 : un lien abîmé ne donne pas une page morte
	it('une courbe illisible : on le dit', () => {
		const result = atelierFromCurves(['x^2', '2 + * 3']);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain('2 + * 3');
	});
});
