import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

describe('demo page DSL scripts', () => {
	it('hyperbola: asymptotes + axes + foyers', () => {
		expect(() =>
			run(`c = courbe("x^2 - 4*y^2 - 4 = 0", couleur="bleu")
(a1, a2) = asymptotes(c)
style(a1, couleur="rouge", trait="pointille")
style(a2, couleur="rouge", trait="pointille")
(ax1, ax2) = axes(c)
style(ax1, couleur="vert", trait="tirets")
style(ax2, couleur="vert", trait="tirets")
(F1, F2) = foyers(c)
style(F1, couleur="orange")
style(F2, couleur="orange")`)
		).not.toThrow();
	});

	it('parabola: axes + directrice + foyers + tangente', () => {
		expect(() =>
			run(`c = courbe("y^2 - 4*x = 0", couleur="bleu")
(a) = axes(c)
style(a, couleur="vert", trait="tirets")
d = directrice(c)
style(d, couleur="rouge", trait="pointille")
(F) = foyers(c)
style(F, couleur="orange")
P = point_sur(c, 2)
style(P, couleur="violet")
t = tangente(c, P)
style(t, couleur="violet", trait="tirets")`)
		).not.toThrow();
	});

	it('ellipse: axes + foyers', () => {
		expect(() =>
			run(`c = courbe("4*x^2 + 9*y^2 - 36 = 0", couleur="bleu")
(ax1, ax2) = axes(c)
style(ax1, couleur="vert", trait="tirets")
style(ax2, couleur="vert", trait="tirets")
(F1, F2) = foyers(c)
style(F1, couleur="orange")
style(F2, couleur="orange")`)
		).not.toThrow();
	});

	it('polaire: interactive', () => {
		expect(() =>
			run(`c = courbe("x^2 + y^2 - 9 = 0", couleur="bleu")
P = point(5, 2, couleur="rouge")
p = polaire(P, c)
style(p, couleur="rouge", trait="tirets")`)
		).not.toThrow();
	});
});
