/**
 * Tests des étiquettes laissées à l'écran par un clic.
 *
 * Le survol montre déjà la valeur exacte : le premier clic apporte donc
 * l'autre lecture — la décimale — et garde l'étiquette ; le deuxième revient
 * à l'exacte, le troisième referme.
 */

import { describe, it, expect } from 'vitest';
import { clearLabelsOf, cyclePinnedLabels, findPinnedLabel } from '$lib/grapheur/pinned-labels';

const u3 = { functionId: 'u', rank: 3 };
const u5 = { functionId: 'u', rank: 5 };
const v3 = { functionId: 'v', rank: 3 };

describe('cyclePinnedLabels', () => {
	it('fige la valeur décimale au premier clic', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(labels).toEqual([{ functionId: 'u', rank: 3, showsExact: false }]);
	});

	it('revient à la valeur exacte au deuxième', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels([], u3), u3);

		expect(labels).toEqual([{ functionId: 'u', rank: 3, showsExact: true }]);
	});

	it('referme au troisième', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels(cyclePinnedLabels([], u3), u3), u3);

		expect(labels).toEqual([]);
	});

	it('laisse les autres étiquettes tranquilles', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels(cyclePinnedLabels([], u3), u5), u3);

		expect(labels).toEqual([
			{ functionId: 'u', rank: 3, showsExact: true },
			{ functionId: 'u', rank: 5, showsExact: false }
		]);
	});

	// Deux suites peuvent porter un terme de même rang : c'est le couple qui
	// identifie une étiquette, pas le rang seul.
	it('distingue le même rang sur deux suites', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels([], u3), v3);

		expect(labels).toHaveLength(2);
		expect(findPinnedLabel(labels, v3)?.showsExact).toBe(false);
	});
});

describe('findPinnedLabel', () => {
	it('retrouve une étiquette par suite et rang', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(findPinnedLabel(labels, u3)?.showsExact).toBe(false);
		expect(findPinnedLabel(labels, u5)).toBeUndefined();
	});
});

describe('clearLabelsOf', () => {
	it('retire les étiquettes d’une suite supprimée', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels([], u3), v3);

		expect(clearLabelsOf(labels, 'u')).toEqual([{ functionId: 'v', rank: 3, showsExact: false }]);
	});

	it('rend la même liste quand rien ne correspond', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(clearLabelsOf(labels, 'w')).toEqual(labels);
	});
});
