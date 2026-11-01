/**
 * Bloc ```cubes au PDF (texte Typst produit ; compilation réelle :
 * `espace-typst-compilation.test.ts`)
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateEspaceTypst } from '$lib/ubumark/generators/espace-typst';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { ESPACE_UNAVAILABLE } from '$lib/ubumark/types/espace';

const typst = (...lines: string[]) => generateEspaceTypst(parseEspaceContent(lines.join('\n')));
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

describe('bloc ```cubes au PDF', () => {
	it('un polygone par face, la perspective de 2 1 1 / 1 0 1 en a 13', () => {
		const out = typst('hauteurs: 2 1 1 / 1 0 1');
		expect(count(out, /polygon\(/g)).toBe(13);
		expect(out).not.toContain(ESPACE_UNAVAILABLE);
	});

	it('trois gris : dessus le plus clair, côté le plus foncé', () => {
		const out = typst('hauteurs: 1');
		const lumas = [...out.matchAll(/fill: luma\((\d+)\)/g)].map((m) => Number(m[1]));
		expect(new Set(lumas).size).toBe(3);
		expect(out).not.toMatch(/rgb|#[0-9a-f]{6}/i);
	});

	it('une vue : un polygone par carré', () => {
		expect(count(typst('hauteurs: 2 1 1 / 1 0 1', 'vue: dessus'), /polygon\(/g)).toBe(5);
		expect(count(typst('hauteurs: 2 1 1 / 1 0 1', 'vue: face'), /polygon\(/g)).toBe(4);
	});

	it('même ordre de dessin que l’écran', () => {
		const out = typst('hauteurs: 3 / 1');
		const first = out.indexOf('polygon(');
		expect(first).toBeGreaterThan(0);
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		const out = typst('hauteurs: 9');
		expect(out).toContain(ESPACE_UNAVAILABLE);
		expect(out).not.toContain('polygon(');
	});

	it('branché dans le générateur de document, en liste aussi', () => {
		const md =
			'```cubes\nhauteurs: 1 1\n```\n\n1. Combien ?\n\n   ```cubes\n   hauteurs: 2\n   ```';
		const out = generateTypst(parseMarkdown(md));
		expect(count(out, /polygon\(/g)).toBe(5 + 5);
	});
});

describe('gestes au PDF (dessiner:, retrouver:)', () => {
	const solved = (...lines: string[]) =>
		generateEspaceTypst(parseEspaceContent(lines.join('\n')), { solved: true });

	it('dessiner: la perspective et un quadrillage vide de 5 × 4, titré', () => {
		const out = typst('hauteurs: 2 1 1 / 1 0 1', 'dessiner: face');
		// 13 faces de la perspective + 20 carreaux
		expect(count(out, /polygon\(/g)).toBe(13 + 20);
		expect(out).toContain('Vue de face');
		expect(count(out, /fill: luma\(150\)/g)).toBe(0);
	});

	it('dessiner:, corrigé : la vue coloriée dans le quadrillage', () => {
		const out = solved('hauteurs: 2 1 1 / 1 0 1', 'dessiner: face');
		expect(count(out, /fill: luma\(150\)/g)).toBe(4);
	});

	it('retrouver: pas de perspective ; la vue de dessus vide et les vues données', () => {
		const out = typst('hauteurs: 2 1 1 / 1 0 1', 'retrouver: face, droite');
		// dessus 5 carreaux + face 4 + droite 3
		expect(count(out, /polygon\(/g)).toBe(5 + 4 + 3);
		expect(out).toContain('Vue de dessus');
		expect(out).toContain('Vue de face');
		expect(out).toContain('Vue de droite');
		expect(out).not.toMatch(/\[2\]/);
	});

	it('retrouver:, corrigé : les hauteurs du bloc dans la vue de dessus', () => {
		const out = solved('hauteurs: 2 1 1 / 1 0 1', 'retrouver: face');
		expect(count(out, /align\(center \+ horizon\)\[\d\]/g)).toBe(5);
	});
});
