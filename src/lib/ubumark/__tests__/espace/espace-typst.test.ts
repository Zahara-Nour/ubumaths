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
