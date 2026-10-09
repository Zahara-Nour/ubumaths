/**
 * Revue des lois retenues et de `.normale` (2026-10-09) : la valeur absolue
 * P(|Y| ⩽ 1,96), le refus d'une variable sans loi, les événements hors forme
 * (`P(x ⩽ 3)`, `P(2X ⩽ 3)`), et un petit σ qui ne s'arrondit plus à 0.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '$lib/ubumark/utils/stat-chart-scene';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** Les lignes du bloc ```loi */
function lines(source: string): string[] {
	const node = parseStatChartContent('loi', source);
	expect(node.errors).toEqual([]);
	return (buildStatChartScene(node.spec!, { locale: 'fr' }) as LawScene).indicators;
}

function scene(source: string): LawScene {
	return buildStatChartScene(parseStatChartContent('loi', source).spec!, {
		locale: 'fr'
	}) as LawScene;
}

/** Ce qui suit l'événement : « ≈ 0,700 », « = 1/2 = 0,5 » */
const value = (line: string) => /(?:≈|=) [^=≈]*$/.exec(line)?.[0] ?? line;

function after(commands: string[], input: string) {
	const s = session();
	for (const command of commands) runInput(s, command);
	return runInput(s, input);
}

function output(commands: string[], input: string): string {
	const result = after(commands, input);
	expect(result.kind, JSON.stringify(result)).toBe('commande');
	return result.kind === 'commande' ? result.output : '';
}

function refusal(commands: string[], input: string): string {
	const result = after(commands, input);
	expect(result.kind, JSON.stringify(result)).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
}

describe('valeur absolue dans le bloc ```loi : |…| n’est pas « sachant que »', () => {
	it('loi normale : P(|Y| ⩽ 1,96), P(|Y| > 1,96), P(|T − 100| ⩽ 15)', () => {
		expect(
			lines('Y ~ N(0 ; 1)\nindicateurs: aucun\nprobabilités: P(|Y| ⩽ 1,96) ; P(|Y| > 1,96)')
		).toEqual(['P(|Y| ⩽ 1,96) ≈ 0,950', 'P(|Y| > 1,96) ≈ 0,050']);
		expect(
			lines(
				'T ~ N(100 ; 225)\nindicateurs: aucun\nprobabilités: P(|T - 100| ⩽ 15) ; P(|T − 100| < 15)'
			)
		).toEqual(['P(|T − 100| ⩽ 15) ≈ 0,683', 'P(|T − 100| < 15) ≈ 0,683']);
	});

	it('loi binomiale : P(|X − 3| ⩽ 1) = P(2 ⩽ X ⩽ 4), P(|X − 3| > 1) = 1 − …', () => {
		const [abs, interval, complement] = lines(
			'X ~ B(10 ; 0,3)\nindicateurs: aucun\nprobabilités: P(|X - 3| ⩽ 1) ; P(2 ⩽ X ⩽ 4) ; P(|X - 3| > 1)'
		);
		expect(abs.startsWith('P(|X − 3| ⩽ 1) ')).toBe(true);
		expect(value(abs)).toBe(value(interval));
		expect(value(interval)).toBe('≈ 0,700');
		expect(complement).toBe('P(|X − 3| > 1) ≈ 0,300');
	});

	it('lois uniforme discrète et géométrique, exponentielle, uniforme à densité', () => {
		const [u1, u2] = lines(
			'X ~ U(1 ; 6)\nindicateurs: aucun\nprobabilités: P(|X - 3| ⩽ 1) ; P(2 ⩽ X ⩽ 4)'
		);
		expect(value(u1)).toBe(value(u2));
		const [g1, g2] = lines(
			'X ~ G(0,2)\nindicateurs: aucun\nprobabilités: P(|X - 3| < 2) ; P(2 ⩽ X ⩽ 4)'
		);
		expect(value(g1)).toBe(value(g2));
		const [e1, e2] = lines(
			'T ~ E(0,5)\nindicateurs: aucun\nprobabilités: P(|T - 2| > 1) ; P(1 ⩽ T ⩽ 3)'
		);
		expect(Number(value(e1).slice(2).replace(',', '.'))).toBeCloseTo(
			1 - Number(value(e2).slice(2).replace(',', '.')),
			2
		);
		expect(lines('X ~ U([0 ; 10])\nindicateurs: aucun\nprobabilités: P(|X - 5| ⩽ 2)')).toEqual([
			'P(|X − 5| ⩽ 2) = 2/5 = 0,4'
		]);
	});

	it('l’aire hachurée de P(|Y| > 1,96) : les deux queues', () => {
		const chart = scene('Y ~ N(0 ; 1)\ndiagramme: oui\nprobabilités: P(|Y| > 1,96)').densityChart!;
		const xs = chart.area!.map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(chart.xMin, 6);
		expect(Math.max(...xs)).toBeCloseTo(chart.xMax, 6);
	});

	it('la conditionnelle reste la conditionnelle', () => {
		expect(lines('X ~ G(0,2)\nindicateurs: aucun\nprobabilités: P(X > 5 | X > 2)')).toEqual([
			'P(X > 5 | X > 2) = 0,512'
		]);
	});

	it('P(|X − 3| = 1) : refusé en français', () => {
		const node = parseStatChartContent('loi', 'X ~ B(10 ; 0,3)\nprobabilités: P(|X - 3| = 1)');
		expect(node.errors[0]?.message).toContain('|X − m| ⩽ a');
	});
});

describe('valeur absolue tapée seule dans Calcul', () => {
	it.each(['P(|Y| ⩽ 1,96)', 'P(\\left|Y\\right|\\leqslant1{,}96)', 'P(\\vert Y\\vert\\le 1{,}96)'])(
		'%s ≈ 0,950',
		(input) => {
			expect(output(['.normale Y 0 1'], input)).toBe('P(|Y| ⩽ 1,96) ≈ 0,950');
		}
	);

	it('P(|T − 100| ⩽ 15) ≈ 0,683', () => {
		expect(output(['.normale T 100 15'], 'P(|T−100| ⩽ 15)')).toBe('P(|T − 100| ⩽ 15) ≈ 0,683');
	});

	it('loi discrète : P(|X − 3| ⩽ 1) = P(2 ⩽ X ⩽ 4)', () => {
		expect(value(output(['.binomiale X 10 0,3'], 'P(|X-3|<=1)'))).toBe('≈ 0,700');
	});
});

describe('refus pertinents', () => {
	it('variable sans loi : toutes les commandes de loi, un exemple qui marche', () => {
		const message = refusal([], 'P(Y ⩽ 3)');
		expect(message).toBe(
			'Y n’a pas de loi : définis-la avec une commande de loi (.binomiale, .geometrique, .uniforme, .exponentielle, .normale), par exemple .normale Y 0 1'
		);
		const example = message.slice(message.indexOf('.normale Y'));
		expect(after([], example).kind).toBe('commande');
	});

	it('P(x ⩽ 3) : la minuscule expliquée, jamais « facteur »', () => {
		const message = refusal(['.binomiale X 10 0,3'], 'P(x ⩽ 3)');
		expect(message).toContain('x n’a pas de loi');
		expect(message).toContain('majuscule');
		expect(message).not.toContain('facteur');
	});

	it('P(2X ⩽ 3) : les formes prises en charge, jamais « facteur »', () => {
		const message = refusal(['.binomiale X 10 0,3'], 'P(2X ⩽ 3)');
		expect(message).toContain('Seuls les événements de la forme');
		expect(message).not.toContain('facteur');
	});

	it.each(['P(2)', 'P(x+1)', 'P(x)<3'])('%s n’est pas un événement : pas ces refus', (input) => {
		const result = after([], input);
		const message = result.kind === 'refus' ? result.message : '';
		expect(message).not.toContain('pas de loi');
		expect(message).not.toContain('Seuls les événements');
	});
});

describe('petit σ : des chiffres significatifs', () => {
	it('.normale Y 1000 0,001 : σ et V ne valent pas « ≈ 0 »', () => {
		const result = after([], '.normale Y 1000 0,001');
		if (result.kind !== 'commande') throw new Error(JSON.stringify(result));
		const indicators = (result.chart as LawScene).indicators;
		expect(indicators).toContain('V(Y) = 0,000001');
		const sigma = indicators.find((l) => l.startsWith('σ('))!;
		expect(sigma).toMatch(/0,001$/);
		expect(sigma).not.toMatch(/≈ 0$/);
	});
});
