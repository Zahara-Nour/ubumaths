/**
 * Tests des étiquettes laissées à l'écran par un clic.
 *
 * Le geste tient en trois clics : le premier fige la valeur exacte, le
 * deuxième montre la décimale, le troisième referme.
 */

import { describe, it, expect } from 'vitest';
import { clearLabelsOf, cyclePinnedLabels, findPinnedLabel } from '$lib/grapheur/pinned-labels';

const u3 = { functionId: 'u', rank: 3 };
const u5 = { functionId: 'u', rank: 5 };
const v3 = { functionId: 'v', rank: 3 };

describe('cyclePinnedLabels', () => {
	it('fige la valeur exacte au premier clic', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(labels).toEqual([{ functionId: 'u', rank: 3, showsExact: true }]);
	});

	it('passe à la décimale au deuxième', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels([], u3), u3);

		expect(labels).toEqual([{ functionId: 'u', rank: 3, showsExact: false }]);
	});

	it('referme au troisième', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels(cyclePinnedLabels([], u3), u3), u3);

		expect(labels).toEqual([]);
	});

	it('laisse les autres étiquettes tranquilles', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels(cyclePinnedLabels([], u3), u5), u3);

		expect(labels).toEqual([
			{ functionId: 'u', rank: 3, showsExact: false },
			{ functionId: 'u', rank: 5, showsExact: true }
		]);
	});

	// Deux suites peuvent porter un terme de même rang : c'est le couple qui
	// identifie une étiquette, pas le rang seul.
	it('distingue le même rang sur deux suites', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels([], u3), v3);

		expect(labels).toHaveLength(2);
		expect(findPinnedLabel(labels, v3)?.showsExact).toBe(true);
	});
});

describe('findPinnedLabel', () => {
	it('retrouve une étiquette par suite et rang', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(findPinnedLabel(labels, u3)?.showsExact).toBe(true);
		expect(findPinnedLabel(labels, u5)).toBeUndefined();
	});
});

describe('clearLabelsOf', () => {
	it('retire les étiquettes d’une suite supprimée', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels([], u3), v3);

		expect(clearLabelsOf(labels, 'u')).toEqual([{ functionId: 'v', rank: 3, showsExact: true }]);
	});

	it('rend la même liste quand rien ne correspond', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(clearLabelsOf(labels, 'w')).toEqual(labels);
	});
});
