/**
 * Couleurs d'auteur dans le PDF : droite graduée et cercle trigo (lot 3).
 *
 * Avant : `points: A=1 bleu` produisait `fill: bleu` — identifiant inconnu de
 * Typst, et toute la fiche refusait de compiler (typst.ts 0.6.1-rc5 en prod).
 * Après : toujours `rgb("#rrggbb")`, variante CLAIRE de la palette.
 */
import { describe, expect, it } from 'vitest';
import { parseNumberLineContent } from '../../parser/number-line-parser';
import { parseTrigCircleContent } from '../../parser/trig-circle-parser';
import { generateNumberLineTypst } from '../../generators/number-line-typst';
import { generateTrigCircleTypst } from '../../generators/trig-circle-typst';
import { resolveNumberLineColors } from '../../utils/number-line-render';

function numberLine(lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors[0]?.message);
	return node;
}

function trig(block: string) {
	const { node } = parseTrigCircleContent(block.trim().split('\n'));
	if (!node) throw new Error('bloc trig non analysé');
	return node;
}

/** Toutes les couleurs écrites dans le code Typst (fill / stroke / paint) */
function paints(code: string): string[] {
	return [...code.matchAll(/(?:fill|stroke|paint): ([a-z]+(?:\("[^"]*"\))?)/g)].map((m) => m[1]);
}

const VALID_TYPST_PAINT = /^(?:rgb\("#[0-9a-f]{6}"\)|white|black|gray|none)$/;

describe('Droite graduée — PDF', () => {
	it('`bleu` produit le rgb exact de la palette claire, jamais `bleu` brut', () => {
		const code = generateNumberLineTypst(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'points: A=3 bleu'])
		);
		expect(code).toContain(
			'circle((3.6, 0.4), radius: 0.08, fill: rgb("#2563eb"), stroke: rgb("#2563eb"))'
		);
		expect(code).toContain('text(fill: rgb("#2563eb"))[A]');
		expect(code).not.toMatch(/\bbleu\b/);
		expect(code).not.toContain('rgb("bleu")');
	});

	it('noms français et anglais donnent le même rgb', () => {
		const fr = generateNumberLineTypst(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'segments: [1, 3] vert'])
		);
		const en = generateNumberLineTypst(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'segments: [1, 3] green'])
		);
		expect(fr).toBe(en);
		expect(fr).toContain('stroke: (paint: rgb("#018639"), thickness: 2pt)');
	});

	it('chaque couleur écrite est une forme Typst valide (inconnue, hex, défauts)', () => {
		const code = generateNumberLineTypst(
			numberLine([
				'start: 0',
				'end: 10',
				'step: 1',
				'points: A=1 magenta, B=2 #000080, C=3',
				'segments: ]1, 3[ violet, [4, 5]'
			])
		);
		const all = paints(code);
		expect(all.length).toBeGreaterThan(5);
		for (const p of all) expect(p).toMatch(VALID_TYPST_PAINT);
		// Inconnue → défaut des points (rouge) ; hex tel quel ; segment sans couleur → bleu
		expect(code).toContain('text(fill: rgb("#dc2626"))[A]');
		expect(code).toContain('text(fill: rgb("#000080"))[B]');
		expect(code).toContain('stroke: (paint: rgb("#2563eb"), thickness: 2pt)');
	});

	it('points ouverts : fond blanc du papier', () => {
		const code = generateNumberLineTypst(
			numberLine(['start: 0', 'end: 10', 'step: 1', 'segments: ]1, 3[ rouge'])
		);
		expect(code).toMatch(/radius: [\d.]+, fill: white, stroke: rgb\("#dc2626"\)/);
	});
});

describe('Droite graduée — avertissements à l’auteur', () => {
	it('couleur inconnue : avertissement, couleur par défaut, pas d’exception', () => {
		const node = numberLine(['start: 0', 'end: 10', 'step: 1', 'points: A=1 magenta']);
		const colors = resolveNumberLineColors(node);
		expect(colors.points[0].screen).toBe('var(--color-fig-rouge)');
		expect(colors.warnings).toHaveLength(1);
		expect(colors.warnings[0]).toMatch(/Point A/);
		expect(colors.warnings[0]).toMatch(/couleur inconnue « magenta »/);
	});

	it('hex trop sombre : avertissement avec suggestion ; hex lisible : rien', () => {
		const node = numberLine([
			'start: 0',
			'end: 10',
			'step: 1',
			'points: A=1 #1a1a1a, B=2 #ff9900',
			'segments: [3, 4] #000080'
		]);
		const { warnings } = resolveNumberLineColors(node);
		expect(warnings).toHaveLength(2);
		expect(warnings[0]).toMatch(/Point A.*« noir »/);
		expect(warnings[1]).toMatch(/Segment 1.*« bleu »/);
	});
});

describe('Cercle trigo — PDF et avertissements', () => {
	it('`rouge` et `red` donnent le même rgb de la palette claire', () => {
		const fr = generateTrigCircleTypst(trig('preset: quarters\ncolor: rouge'));
		const en = generateTrigCircleTypst(trig('preset: quarters\ncolor: red'));
		expect(fr).toBe(en);
		expect(fr).toContain('fill: rgb("#dc2626")');
		for (const p of paints(fr)) expect(p).toMatch(VALID_TYPST_PAINT);
	});

	it('`bleu` (nom français) ne retombe plus sur le bleu natif de Typst', () => {
		const code = generateTrigCircleTypst(trig('preset: quarters\ncolor: violet'));
		expect(code).toContain('fill: rgb("#9333ea")');
		expect(code).not.toMatch(/fill: blue\b/);
	});

	it('couleur inconnue : bleu de la palette, sans exception', () => {
		const code = generateTrigCircleTypst(trig('preset: quarters\ncolor: magenta'));
		expect(code).toContain('fill: rgb("#2563eb")');
		for (const p of paints(code)) expect(p).toMatch(VALID_TYPST_PAINT);
	});
});
