/**
 * Bloc ```courbe — couleurs et nombres déjà bornés ? (relecture du bloc figure,
 * 2026-10-01). Une couleur hors liste ou un nombre non fini écrit dans le Typst
 * ferait échouer toute la fiche ; à l'écran, une couleur libre injecterait du CSS.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import { COURBE_COLORS } from '../../types/courbe';

const HEADER = 'x: -4 ; 6\ny: -8 ; 12\n';

describe('courbe — couleurs', () => {
	it('couleur hors liste : erreur située, rien de dessiné', () => {
		for (const c of ['red', 'red;mask-image:url(https://x)', '#ff0000', '"']) {
			const node = parseCourbeContent(`${HEADER}f(x) = x   ${c}`);
			const colors = node.spec?.functions.map((f) => f.color) ?? [];
			for (const color of colors) expect(COURBE_COLORS).toContain(color);
			expect(JSON.stringify(node.spec ?? {})).not.toMatch(/mask-image|#ff0000/);
		}
	});
});

describe('courbe — nombres non finis', () => {
	it.each([
		'f(x) = 1/0',
		'f(x) = sqrt(-1-x^2)',
		'f(x) = 10^400*x',
		'f(x) = 0/0',
		'f(x) = x^9999999'
	])('%s : aucun NaN/Infinity à l’écran ni dans le Typst', (fn) => {
		const node = parseCourbeContent(`${HEADER}${fn}\naire: f ; 0 ; 1`);
		if (node.spec) {
			expect(JSON.stringify(buildCourbeScene(node.spec))).not.toMatch(/NaN|Infinity/);
		}
		expect(generateCourbeTypst(node)).not.toMatch(/NaN|Infinity/);
	});

	it.each(['points: A(0/0 ; 0)', 'points: A(10^400 ; 0)', 'asymptotes: x=1/0'])(
		'%s : erreur située',
		(line) => {
			const node = parseCourbeContent(`${HEADER}f(x) = x\n${line}`);
			expect(node.spec).toBeNull();
			expect(node.errors[0].line).toBe(4);
		}
	);
});
