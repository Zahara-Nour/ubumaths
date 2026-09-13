/**
 * Tests des étiquettes laissées à l'écran par un clic.
 *
 * Le survol montre déjà la valeur exacte : le premier clic apporte donc
 * l'autre lecture — la décimale — et garde l'étiquette ; le deuxième revient
 * à l'exacte, le troisième referme.
 */

import { describe, it, expect } from 'vitest';
import { clearLabelsOf, cyclePinnedLabels, findPinnedLabel } from '$lib/grapheur/pinned-labels';

const u3 = { kind: 'term', functionId: 'u', rank: 3 } as const;
const u5 = { kind: 'term', functionId: 'u', rank: 5 } as const;
const v3 = { kind: 'term', functionId: 'v', rank: 3 } as const;
const root = { kind: 'point', functionId: 'f', pointType: 'root', x: 1.4142135 } as const;

describe('cyclePinnedLabels', () => {
	it('fige la valeur décimale au premier clic', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(labels).toEqual([{ kind: 'term', functionId: 'u', rank: 3, showsExact: false }]);
	});

	it('revient à la valeur exacte au deuxième', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels([], u3), u3);

		expect(labels).toEqual([{ kind: 'term', functionId: 'u', rank: 3, showsExact: true }]);
	});

	it('referme au troisième', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels(cyclePinnedLabels([], u3), u3), u3);

		expect(labels).toEqual([]);
	});

	it('laisse les autres étiquettes tranquilles', () => {
		const labels = cyclePinnedLabels(cyclePinnedLabels(cyclePinnedLabels([], u3), u5), u3);

		expect(labels).toEqual([
			{ kind: 'term', functionId: 'u', rank: 3, showsExact: true },
			{ kind: 'term', functionId: 'u', rank: 5, showsExact: false }
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

		expect(clearLabelsOf(labels, 'u')).toEqual([
			{ kind: 'term', functionId: 'v', rank: 3, showsExact: false }
		]);
	});

	it('rend la même liste quand rien ne correspond', () => {
		const labels = cyclePinnedLabels([], u3);

		expect(clearLabelsOf(labels, 'w')).toEqual(labels);
	});
});

// =============================================================================
// Points spéciaux d'une courbe
// =============================================================================

describe('cyclePinnedLabels — point spécial', () => {
	it('épingle une racine comme un terme', () => {
		const labels = cyclePinnedLabels([], root);

		expect(findPinnedLabel(labels, root)?.showsExact).toBe(false);
	});

	// Les solveurs retournent une abscisse très légèrement différente à chaque
	// recadrage : l'étiquette doit survivre à ce déplacement d'un cheveu.
	it('retrouve le point malgré une abscisse recalculée', () => {
		const labels = cyclePinnedLabels([], root);
		const moved = { ...root, x: root.x + 1e-9 };

		expect(findPinnedLabel(labels, moved)).toBeDefined();
		expect(cyclePinnedLabels(labels, moved)).toHaveLength(1);
	});

	it('distingue deux racines différentes', () => {
		const other = { ...root, x: -root.x };
		const labels = cyclePinnedLabels(cyclePinnedLabels([], root), other);

		expect(labels).toHaveLength(2);
	});

	it('distingue un extremum d’une racine de même abscisse', () => {
		const extremum = { ...root, pointType: 'max' } as const;
		const labels = cyclePinnedLabels(cyclePinnedLabels([], root), extremum);

		expect(labels).toHaveLength(2);
	});

	it('ne confond jamais un terme et un point', () => {
		const term = { kind: 'term', functionId: 'f', rank: 1 } as const;
		const labels = cyclePinnedLabels(cyclePinnedLabels([], root), term);

		expect(labels).toHaveLength(2);
	});
});
