/**
 * Bloc ```qr → Typst : le SVG stylé du QR (le même qu'à l'écran) posé en image
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { encodeQr, qrSvg } from '$lib/qr/qr-code';

const typst = (...lines: string[]) => generateTypst(parseMarkdown(lines.join('\n')));

/** Le SVG passé à `#image(bytes(…))`, chaîne Typst décodée */
function embeddedSvg(out: string): string | null {
	const match = /#image\(bytes\("((?:[^"\\]|\\.)*)"\), format: "svg", width: ([\d.]+)cm\)/.exec(
		out
	);
	return match ? match[1].replace(/\\(.)/g, '$1') : null;
}

describe('bloc ```qr au PDF', () => {
	it('pose le SVG stylé de la matrice en image, à la taille demandée', () => {
		const out = typst('```qr', '/glossaire', 'taille: 4cm', '```');
		const qr = encodeQr('https://www.chiph.re/glossaire');
		if (!qr) throw new Error('QR attendu');

		expect(embeddedSvg(out)).toBe(qrSvg(qr, 'QR code vers https://www.chiph.re/glossaire'));
		expect(out).toContain('format: "svg", width: 4cm)');
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
		expect(embeddedSvg(out)).toBeNull();
	});

	it('adresse trop longue : cadre neutre', () => {
		const out = typst('```qr', `https://example.com/${'a'.repeat(600)}`, '```');
		expect(out).toContain('QR code indisponible');
	});
});
