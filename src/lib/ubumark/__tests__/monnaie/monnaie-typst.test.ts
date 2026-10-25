/**
 * Bloc ```monnaie au PDF (texte Typst produit ; compilation réelle :
 * `monnaie-typst-compilation.test.ts`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateMonnaieTypst } from '$lib/ubumark/generators/monnaie-typst';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { buildMonnaieScene, MONNAIE_VIEW } from '$lib/ubumark/utils/monnaie-scene';
import { MONNAIE_UNAVAILABLE } from '$lib/ubumark/types/monnaie';

const node = (...lines: string[]) => parseMonnaieContent(lines.join('\n'));
const typst = (...lines: string[]) => generateMonnaieTypst(node(...lines));
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
const CAPTION =
	/box\(width: [\d.]+cm, \{ set par\(justify: false\); align\(center, text\(size: 9pt/g;
const captionWidths = (text: string) =>
	[...text.matchAll(/box\(width: ([\d.]+)cm, \{ set par/g)].map((m) => Number(m[1]));
const FRAME = /#box\(width: [\d.]+cm, height: [\d.]+cm, stroke:/g;

describe('bloc ```monnaie au PDF', () => {
	it('un ensemble dans son cadre, à l’échelle de 8 cm pleine largeur', () => {
		const n = node('billets: 20 10', 'pièces: 2 1');
		const scene = buildMonnaieScene(n.spec!, 0);
		const width = Number(((scene.width * 8) / MONNAIE_VIEW.fullWidth).toFixed(4));
		const out = generateMonnaieTypst(n);
		expect(count(out, FRAME)).toBe(1);
		expect(out).toContain(`#box(width: ${width}cm`);
		expect(out).not.toContain(MONNAIE_UNAVAILABLE);
	});

	it('la taille demandée change l’échelle', () => {
		const n = node('billets: 20 10', 'taille: 3cm');
		const scene = buildMonnaieScene(n.spec!, 0);
		const width = Number(((scene.width * 3) / MONNAIE_VIEW.fullWidth).toFixed(4));
		expect(generateMonnaieTypst(n)).toContain(`#box(width: ${width}cm`);
	});

	it('chaque coupure dessinée et sa valeur écrite (billet : aussi dans deux coins)', () => {
		const out = typst('billets: 20 10 10', 'pièces: 2 2 2 1');
		// 3 billets arrondis ; 4 pièces, plus le cœur de chaque pièce de 2 €
		expect(count(out, /rect\(width: [\d.]+cm, height: [\d.]+cm, radius:/g)).toBe(3);
		expect(count(out, /circle\(/g)).toBe(4 + 3);
		expect(count(out, /"20 €"/g)).toBe(1);
		expect(count(out, /"10 €"/g)).toBe(2);
		expect(count(out, /"20"\)/g)).toBe(2);
		expect(count(out, /"2 €"/g)).toBe(3);
		expect(count(out, /"1 €"/g)).toBe(1);
	});

	it('le total n’est écrit nulle part', () => {
		const texts = typst('billets: 20 20 5', 'pièces: 2 1').match(/"[^"]*"/g) ?? [];
		expect(texts.length).toBeGreaterThan(0);
		expect(texts.filter((t) => t.includes('48'))).toEqual([]);
	});

	it('plusieurs ensembles, légendes d’office ou données, en chaînes littérales', () => {
		const out = typst('pièces: 1 ; 2 ; 2 1');
		expect(count(out, FRAME)).toBe(3);
		for (const caption of ['"A"', '"B"', '"C"']) expect(out).toContain(caption);
		const named = typst('pièces: 1 ; 2', 'légendes: "Léa" ; #x [y]');
		expect(named).toContain('"\\"Léa\\""');
		expect(named).toContain('"#x [y]"');
	});

	it('une légende ne sort pas de la page (elle passe à la ligne dans sa colonne)', () => {
		const long = 'a'.repeat(40);
		const out = typst('pièces: 1 ; 2 ; 1', `légendes: ${long} ; ${long} ; ${long}`);
		expect(count(out, CAPTION)).toBe(3);
		const row = captionWidths(out).reduce((sum, w) => sum + w, 0) + 2 * 0.6;
		expect(row).toBeLessThanOrEqual(16);
	});

	it('légende plus large qu’un petit dessin : au moins 3 cm, non justifiée (recette)', () => {
		// « Le porte-monnaie de la grand-mère de Léa » au-dessus d'un billet de 5 € se coupait
		// mot à mot, avec de grands blancs (justification du document)
		const out = typst(
			'billets: 5 ; 10',
			'légendes: Le porte-monnaie de la grand-mère de Léa ; Tom'
		);
		for (const w of captionWidths(out)) expect(w).toBeGreaterThanOrEqual(3);
		expect(count(out, /par\(justify: false\)/g)).toBe(2);
	});

	it('légende d’un grand dessin : aussi large que lui', () => {
		const out = typst('billets: 50 20 20 10 ; 5', 'légendes: Léa ; Tom');
		const k = 8 / MONNAIE_VIEW.fullWidth;
		const scene = buildMonnaieScene(node('billets: 50 20 20 10 ; 5').spec!, 0);
		expect(captionWidths(out)[0]).toBeCloseTo(scene.width * k, 2);
	});

	it('ensemble vide : un cadre vide', () => {
		const out = typst('billets: ; 10');
		expect(count(out, FRAME)).toBe(2);
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		expect(typst('pièces: 3')).toContain(MONNAIE_UNAVAILABLE);
	});

	it('branché dans generateTypst, aussi dans une liste', () => {
		const out = generateTypst(
			parseMarkdown('1. Combien ?\n\n   ```monnaie\n   billets: 50\n   ```')
		);
		expect(out).toContain('"50 €"');
	});
});
