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

// =============================================================================
// Revues du lot 6
// =============================================================================

import { openLink } from '../grapheur-link';
import { encodeAtelier } from '../url';
import { Atelier } from '../atelier.svelte';
import { keepReceived } from '../merge';
import { loadAtelier, saveAtelier, ATELIER_STORAGE_KEY } from '../persistence';

function memoryStorage(): Storage {
	const data = new Map<string, string>();
	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (k) => data.get(k) ?? null,
		key: (i) => [...data.keys()][i] ?? null,
		removeItem: (k) => void data.delete(k),
		setItem: (k, v) => void data.set(k, v)
	};
}

describe('revue du lot 6', () => {
	// B1 (bloquant) : « Partager » depuis /grapheur fabrique /grapheur?a=…
	it('un lien `?a=` est relu, sur /grapheur comme sur /atelier', async () => {
		const shared = new Atelier();
		shared.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const encoded = await encodeAtelier(shared.serialize());

		const opened = await openLink(new URLSearchParams(`a=${encoded.payload}`));

		expect(opened.kind).toBe('received');
		if (opened.kind === 'received') expect(opened.atelier.names).toEqual(['f']);
	});

	it('un lien `?a=` abîmé le dit', async () => {
		const opened = await openLink(new URLSearchParams('a=nimportequoi'));

		expect(opened.kind).toBe('invalid');
	});

	it('`?f=` passe par la même porte', async () => {
		const opened = await openLink(new URLSearchParams('f=x%5E2'));

		expect(opened.kind).toBe('received');
	});

	it('sans paramètre : rien à ouvrir', async () => {
		expect((await openLink(new URLSearchParams(''))).kind).toBe('none');
	});

	// C4 : `y=2x` ou `a*x+b` donnaient une carte en attente, sans courbe ni message
	it.each([['y=2x'], ['a*x+b'], ["f'(x)"]])('refuse une courbe en attente : %s', (definition) => {
		const result = atelierFromCurves([definition]);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain(definition);
	});

	it('une courbe peut citer la suivante', () => {
		expect(atelierFromCurves(['g(x)+1', 'x^2']).ok).toBe(true);
	});

	// C1 : « Garder » versait dans l'atelier ÉPHÉMÈRE, et rien n'était enregistré
	it('« Garder » verse dans l’atelier PERSONNEL, et l’enregistre', () => {
		const storage = memoryStorage();
		const personal = new Atelier();
		personal.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');
		saveAtelier(storage, personal.serialize());
		const received = new Atelier();
		received.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');

		const report = keepReceived(storage, received.serialize());

		expect(report.ok).toBe(true);
		const loaded = loadAtelier(storage);
		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		expect(loaded.state.objects.map((o) => o.definition)).toEqual(['x', 'x^2']);
		expect(storage.getItem(ATELIER_STORAGE_KEY)).not.toBeNull();
	});
});
