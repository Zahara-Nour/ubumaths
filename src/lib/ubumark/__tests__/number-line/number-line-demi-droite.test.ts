/**
 * Demi-droite et crochets sur la droite graduée (chantier `docs/archive/wip/demi-droite-progress.md`)
 *
 * `segments: [2, +inf[` : borne infinie, trait jusqu'au bout de la droite ; extrémités
 * dessinées en crochets (notation française), plus en disques.
 */
import { describe, it, expect } from 'vitest';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { bracketDirection, segmentLevels } from '$lib/ubumark/utils/number-line-render';

const WINDOW = ['start: -5', 'end: 5', 'step: 1', 'arrows: true'];

function parse(segments: string) {
	return parseNumberLineContent([...WINDOW, `segments: ${segments}`]);
}

function segmentsOf(segments: string) {
	const { node, errors } = parse(segments);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node.segments;
}

describe('Demi-droite — lecture de segments:', () => {
	it('[2, +inf[ : borne de droite infinie, exclue', () => {
		const [seg] = segmentsOf('[2, +inf[ vert');
		expect(seg.start.expression).toBe('2');
		expect(seg.startOpen).toBe(false);
		expect(seg.startInfinite).toBeFalsy();
		expect(seg.endInfinite).toBe(true);
		expect(seg.endOpen).toBe(true);
		expect(seg.color).toBe('vert');
	});

	it(']-inf, 3] : borne de gauche infinie', () => {
		const [seg] = segmentsOf(']-inf, 3]');
		expect(seg.startInfinite).toBe(true);
		expect(seg.startOpen).toBe(true);
		expect(seg.end.expression).toBe('3');
		expect(seg.endOpen).toBe(false);
		expect(seg.endInfinite).toBeFalsy();
	});

	it(']-inf, +inf[ : toute la droite', () => {
		const [seg] = segmentsOf(']-inf, +inf[');
		expect(seg.startInfinite).toBe(true);
		expect(seg.endInfinite).toBe(true);
	});

	it('∞ et \\infty sont lus comme inf', () => {
		expect(segmentsOf(']-∞, 1]')[0].startInfinite).toBe(true);
		expect(segmentsOf('[1, +\\infty[')[0].endInfinite).toBe(true);
		expect(segmentsOf('[1, inf[')[0].endInfinite).toBe(true);
	});

	it('borne en fraction ou en racine', () => {
		expect(segmentsOf('[2/3, +inf[')[0].start.expression).toBe('2/3');
		expect(segmentsOf(']-inf, sqrt(2)]')[0].end.expression).toBe('sqrt(2)');
	});

	it('une demi-droite à côté d’un segment fini', () => {
		const segs = segmentsOf(']-inf, -1] orange, [2, 4[ vert');
		expect(segs).toHaveLength(2);
		expect(segs[0].startInfinite).toBe(true);
		expect(segs[1].startInfinite).toBeFalsy();
		expect(segs[1].endInfinite).toBeFalsy();
	});

	it('une borne infinie ne déclenche pas l’avertissement « hors de la fenêtre »', () => {
		const { warnings } = parse(']-inf, 3]');
		expect(warnings.filter((w) => w.message.includes('outside'))).toEqual([]);
	});

	it('borne finie hors de la fenêtre : averti, l’infini écrit tel quel', () => {
		const { warnings } = parse('[12, +inf[');
		expect(warnings.some((w) => w.message.includes('Segment [12, +inf]'))).toBe(true);
	});
});

describe('Demi-droite — erreurs de l’auteur', () => {
	it('crochet fermé sur +inf : refusé', () => {
		const { node, errors } = parse('[3, +inf]');
		expect(node).toBeNull();
		expect(errors.some((e) => e.message.includes("l'infini est toujours exclu"))).toBe(true);
		// Une seule erreur : pas de « Could not parse any segments » en plus
		expect(errors).toHaveLength(1);
	});

	it('crochet fermé sur -inf : refusé', () => {
		const { node, errors } = parse('[-inf, 2]');
		expect(node).toBeNull();
		expect(errors.some((e) => e.message.includes("l'infini est toujours exclu"))).toBe(true);
	});

	it('-inf à droite ou +inf à gauche : refusé', () => {
		for (const s of ['[2, -inf[', ']+inf, 2]']) {
			const { node, errors } = parse(s);
			expect(node, s).toBeNull();
			expect(
				errors.some((e) => e.message.includes('la borne de gauche')),
				s
			).toBe(true);
		}
	});
});

describe('Crochets — sens des becs', () => {
	// +1 : becs tournés vers la droite ; −1 : vers la gauche
	it('borne de gauche : [ fermé vers la droite, ] ouvert vers la gauche', () => {
		expect(bracketDirection('start', false)).toBe(1);
		expect(bracketDirection('start', true)).toBe(-1);
	});

	it('borne de droite : ] fermé vers la gauche, [ ouvert vers la droite', () => {
		expect(bracketDirection('end', false)).toBe(-1);
		expect(bracketDirection('end', true)).toBe(1);
	});
});

describe('Segments — étage (sur l’axe, plus haut s’ils se chevauchent)', () => {
	it('une réunion d’intervalles disjoints reste sur l’axe', () => {
		expect(segmentLevels(segmentsOf(']-inf, -1[, ]2, +inf['))).toEqual([0, 0]);
	});

	it('deux intervalles qui se chevauchent : le second monte d’un étage', () => {
		expect(segmentLevels(segmentsOf('[-3, 2], [0, +inf['))).toEqual([0, 1]);
	});

	it('un bout commun compte comme un chevauchement (crochets superposés)', () => {
		expect(segmentLevels(segmentsOf('[-2, 1], [1, 3]'))).toEqual([0, 1]);
	});

	it('un troisième segment reprend le premier étage libre', () => {
		expect(segmentLevels(segmentsOf('[-4, 0], [-1, 2], [1, 4]'))).toEqual([0, 1, 0]);
	});
});
