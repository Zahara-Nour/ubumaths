/**
 * Bloc ```figure — corrections de relecture (2026-10-01)
 *
 * 1. Une couleur non hexadécimale (`couleur="red"`) passait telle quelle dans
 *    `rgb("…")` : toute la fiche PDF échouait ; `couleur="\"` sortait de la
 *    chaîne Typst ; à l'écran, `couleur="red;mask-image:url(…)"` injectait du
 *    CSS (traçage d'IP d'élèves dans le chat).
 * 2. Un nombre non fini (`point(10^400, 0)`, `0/0`) écrivait `NaN` / `inf` dans
 *    le Typst : toute la fiche échouait.
 * 5. `point(2,5 ; 1)` : virgule décimale, message dédié.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';
import { resolveStyle } from '$lib/geometry-core/rendering/svg-primitives';
import { resolveMarkdownContent } from '$lib/questions/generator/content-resolver';
import { resolveNamedColor } from '$lib/theme/named-colors';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function scene(body: string) {
	return buildFigureScene(parseFigureContent(`fenetre: -1 ; 8 ; -1 ; 6\n---\n${body}`));
}

/** Toutes les couleurs de la scène (trait et remplissage), objets visibles. */
function colors(body: string): string[] {
	const result = scene(body);
	expect(result.errors).toEqual([]);
	const { figure, elements } = result.scene!;
	return elements.flatMap((el) => {
		const sty = resolveStyle(el, figure.defaults);
		return sty.fillColor ? [sty.color, sty.fillColor] : [sty.color];
	});
}

describe('figure — couleurs (point 1)', () => {
	it.each([
		['point(0, 0, couleur="red")'],
		['A = point(0, 0)\nstyle(A, couleur="red")'],
		[
			'A = point(0, 0)\nB = point(2, 0)\nC = point(0, 2)\np = polygone(A, B, C, remplissage="blue")'
		],
		['A = point(0, 0, couleur="rouge")'],
		['A = point(0, 0, couleur="Bleu")'],
		['A = point(0, 0, couleur="#2563eb")']
	])('%s → couleur sûre : nom de la palette ou hexadécimal', (body) => {
		for (const c of colors(body)) expect(HEX.test(c) || resolveNamedColor(c) === c).toBe(true);
	});

	it.each([
		['A = point(0, 0)\nB = point(1, 0, couleur="\\\\")', 4],
		['A = point(0, 0)\nB = point(1, 0, couleur="red;mask-image:url(https://x.supabase.co/a)")', 4],
		['A = point(0, 0)\nB = point(1, 0, couleur="#12345")', 4],
		[
			'A = point(0, 0)\nB = point(1, 0)\nC = point(0, 1)\np = polygone(A, B, C, remplissage="chartreuse-fluo")',
			6
		]
	])('%s → erreur située', (body, line) => {
		const result = scene(body);
		expect(result.scene).toBeNull();
		expect(result.errors[0].message).toMatch(/couleur/i);
		expect(result.errors[0].line).toBe(line);
	});

	it('jamais de couleur hostile dans le Typst', () => {
		const typst = generateFigureTypst(
			parseFigureContent('fenetre: 0 ; 4 ; 0 ; 3\n---\nA = point(1, 1, couleur="red\\")')
		);
		expect(typst).toContain('Figure indisponible');
	});
});

describe('figure — nombres non finis (point 2)', () => {
	it.each([
		['A = point(10^400, 0)', 3],
		['A = point(0/0, 0)', 3],
		['x = 2^9999999\nA = point(1, x)', 4],
		['A = point(0, 0)\nc = cercle(A, rayon=10^400)', 4],
		['A = point(0, 0)\nB = point(1, 0)\ns = segment(A, B, epaisseur=10^400)', 5]
	])('%s → erreur située, rien de dessiné', (body, line) => {
		const result = scene(body);
		expect(result.scene).toBeNull();
		expect(result.errors[0].message).toMatch(/fini|nombre/i);
		expect(result.errors[0].line).toBe(line);
	});

	it('variante tirée qui donne NaN : cadre neutre au PDF, pas de NaN', () => {
		const md = String(
			resolveMarkdownContent(
				'```figure\nfenetre: -1 ; 8 ; -1 ; 6\n---\nA = point({{a}}/{{b}}, 0)\n```',
				[
					{ name: 'a', value: '0' },
					{ name: 'b', value: '0' }
				]
			)
		);
		const typst = generateFigureTypst(parseFigureContent(md.split('\n').slice(1, -1).join('\n')));
		expect(typst).toContain('Figure indisponible');
		expect(typst).not.toMatch(/NaN|inf/);
	});

	it('une figure valide n’écrit aucun nombre non fini', () => {
		const result = scene('A = point(0, 0)\nB = point(5, 0)\nC = point(0, 4)\nangle(B, A, C)');
		const svg = figureToSvg(result.scene!, 'moyenne');
		expect(JSON.stringify(svg)).not.toMatch(/NaN|Infinity/);
	});
});

describe('figure — virgule décimale (point 5)', () => {
	it('`point(2,5 ; 1)` : message sur la virgule décimale, situé', () => {
		const result = scene('A = point(0, 0)\nB = point(2,5 ; 1)');
		expect(result.scene).toBeNull();
		expect(result.errors[0].line).toBe(4);
		expect(result.errors[0].message).toMatch(/virgule d[ée]cimale/);
		expect(result.errors[0].message).toContain('2.5');
		expect(result.errors[0].message).toContain('2{,}5');
	});

	it('`point(2, 5)` (virgules seules) reste valide', () => {
		expect(scene('A = point(2, 5)').errors).toEqual([]);
	});
});
