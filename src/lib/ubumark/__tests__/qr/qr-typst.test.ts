/**
 * Bloc ```qr → Typst : la matrice dessinée par Typst, carré par carré
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { encodeQr } from '$lib/qr/qr-code';

const typst = (...lines: string[]) => generateTypst(parseMarkdown(lines.join('\n')));

/** Les rectangles noirs dessinés : `[dx, dy, largeur, hauteur]` en cm */
function rects(out: string): number[][] {
	return [
		...out.matchAll(
			/#place\(dx: ([\d.]+)cm, dy: ([\d.]+)cm, rect\(width: ([\d.]+)cm, height: ([\d.]+)cm/g
		)
	].map((m) => m.slice(1, 5).map(Number));
}

/** Les modules couverts par les rectangles, en coordonnées de la matrice */
function coveredModules(out: string, moduleCm: number): Set<string> {
	const cells = new Set<string>();
	for (const [dx, dy, width] of rects(out)) {
		const x0 = Math.round(dx / moduleCm);
		const y = Math.round(dy / moduleCm);
		for (let k = 0; k < Math.round(width / moduleCm); k++) cells.add(`${x0 + k},${y}`);
	}
	return cells;
}

describe('bloc ```qr au PDF', () => {
	it('dessine exactement les modules sombres de la matrice, à la taille demandée', () => {
		const out = typst('```qr', '/glossaire', 'taille: 4cm', '```');
		const qr = encodeQr('https://www.chiph.re/glossaire');
		expect(qr).not.toBeNull();
		const expected = new Set<string>();
		qr?.data.forEach((row, y) => row.forEach((dark, x) => dark && expected.add(`${x},${y}`)));
		expect(expected.size).toBeGreaterThan(0);

		expect(coveredModules(out, 4 / (qr?.size ?? 1))).toEqual(expected);
		expect(out).toContain('#box(width: 4cm, height: 4cm');
	});

	it('imprime la légende sous le QR', () => {
		const out = typst('```qr', '/glossaire', 'légende: Le glossaire en ligne', '```');
		expect(out).toContain('Le glossaire en ligne');
	});

	it('imprime l’adresse quand il n’y a pas de légende', () => {
		const out = typst('```qr', '/glossaire', '```');
		expect(out).toContain('www.chiph.re/glossaire');
	});

	it('imprime une légende à balisage Typst en chaîne littérale, guillemets échappés', () => {
		const out = typst('```qr', '/a', 'légende: #pas [un] *code* "ici" \\x', '```');
		expect(out).toContain('#text(size: 8pt, "#pas [un] *code* \\"ici\\" \\\\x")');
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		const out = typst('```qr', 'javascript:alert(1)', '```');
		expect(out).toContain('QR code indisponible');
		expect(rects(out)).toEqual([]);
	});

	it('adresse trop longue : cadre neutre', () => {
		const out = typst('```qr', `https://example.com/${'a'.repeat(600)}`, '```');
		expect(out).toContain('QR code indisponible');
	});
});
