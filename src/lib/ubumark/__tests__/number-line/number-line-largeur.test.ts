/**
 * Droite graduée dessinée à la largeur réelle (téléphone : `docs/wip/reponses-a-placer-progress.md` § 8)
 *
 * Chiffres, points et traits gardent leur taille ; seul l'écart entre graduations se resserre.
 */
import { describe, it, expect } from 'vitest';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import {
	NL_LAYOUT,
	NL_PHONE_WIDTH,
	computeGraduations,
	computeLineExtents,
	minGraduationGap,
	phoneGapWarning,
	valueToX,
	xToValue
} from '$lib/ubumark/utils/number-line-render';

function config(...lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node.config;
}

describe('Droite graduée — largeur réelle', () => {
	it('sans largeur : la mise en page de toujours (600)', () => {
		expect(valueToX(0, 0, 20)).toBe(NL_LAYOUT.MARGIN_LEFT);
		expect(valueToX(20, 0, 20)).toBe(NL_LAYOUT.SVG_WIDTH - NL_LAYOUT.MARGIN_RIGHT);
	});

	it('320 px : les marges restent, la ligne se resserre', () => {
		expect(valueToX(0, 0, 20, 'linear', 320)).toBe(40);
		expect(valueToX(20, 0, 20, 'linear', 320)).toBe(280);
		expect(valueToX(10, 0, 20, 'linear', 320)).toBe(160);
		expect(computeLineExtents(true, 320)).toEqual({ lineStartX: 30, lineEndX: 290 });
	});

	it('xToValue retrouve la valeur à la même largeur', () => {
		expect(xToValue(160, 0, 20, 320)).toBe(10);
		expect(xToValue(280, 0, 20, 320)).toBe(20);
	});

	it('les graduations suivent la largeur', () => {
		const xs = computeGraduations(config('start: 0', 'end: 20', 'step: 1'), 320).map((g) => g.x);
		expect(xs[0]).toBe(40);
		expect(xs.at(-1)).toBe(280);
		expect(xs[1] - xs[0]).toBeCloseTo(12);
	});

	it('écart minimal entre graduations, échelle log comprise', () => {
		expect(minGraduationGap(config('start: 0', 'end: 10', 'step: 1'), 320)).toBeCloseTo(24);
		const log = config('start: 1', 'end: 10', 'step: 1', 'scale: log');
		// le plus petit écart d'une échelle log : entre 9 et 10
		expect(minGraduationGap(log, 320)).toBeCloseTo(240 * Math.log10(10 / 9));
	});
});

describe('Droite graduée — avertissement téléphone', () => {
	it('le téléphone de référence fait 320 px', () => {
		expect(NL_PHONE_WIDTH).toBe(320);
	});

	it('0 à 20, pas de 1 : 12 px sur téléphone → avertir', () => {
		const message = phoneGapWarning(config('start: 0', 'end: 20', 'step: 1'));
		expect(message).toContain('12 px');
		expect(message).toContain('20 px');
	});

	it('0 à 10, pas de 1 : 24 px → rien', () => {
		expect(phoneGapWarning(config('start: 0', 'end: 10', 'step: 1'))).toBeNull();
	});
});
