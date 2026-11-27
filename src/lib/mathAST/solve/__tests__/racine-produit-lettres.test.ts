/**
 * V92 (registre des écarts) : `x² − ab = 0` rendait ±√a·√b « si 4ab ⩾ 0 ».
 *
 * √(ab) = √a·√b n'est vrai que pour a, b ⩾ 0 : avec a = b = −1, √a√b n'existe
 * pas alors que ab = 1 ⩾ 0 et S = {−1 ; 1}. La racine d'un produit de lettres
 * de signe inconnu ne se découpe jamais (phase 0 validée par David le
 * 2026-11-24, docs/wip/ecarts-valeurs-fausses-progress.md).
 *
 * Sonde : le chemin de l'Atelier (`runInput`), le rendu LaTeX affiché.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { WebReplEngine } from '#lib/mathAST/cli/web/web-repl-engine.ts';
import { runInput, type CalcResult } from '#lib/atelier/calcul.ts';
import { solve } from '#lib/mathAST/solve/solve.ts';
import { parseLatex } from '#lib/mathAST/parser/index.ts';
import { toLatex } from '#lib/mathAST/latex-generator.ts';
import type { RelationNode } from '#lib/mathAST/types.ts';

/** Des saisies de l'Atelier dans une même session ; la réponse de la dernière. */
function run(...inputs: string[]): CalcResult {
	const session = { atelier: new Atelier(), engine: new WebReplEngine() };
	let result: CalcResult | null = null;
	for (const input of inputs) result = runInput(session, input);
	if (result === null) throw new Error('aucune saisie');
	return result;
}

/** Le solveur appelé directement, pour les saisies que l'Atelier refuse. */
function solveByApi(equation: string) {
	return solve(parseLatex(equation) as RelationNode, { variable: 'x' });
}

/** Le LaTeX d'une réponse de l'Atelier (vide pour un refus). */
function latexOf(result: CalcResult): string {
	return 'latex' in result && result.latex ? result.latex : '';
}

describe('V92 — la racine d’un produit de lettres n’est pas découpée', () => {
	it('x² − ab = 0 : S = {√(ab) ; −√(ab)} si ab ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-ab=0'))).toBe(
			'S = \\left\\{ \\sqrt{a b} \\,;\\, -\\sqrt{a b} \\right\\} \\quad \\text{si } a b \\geqslant 0'
		);
	});

	it('x² − 4ab = 0 : ±2√(ab) si ab ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-4ab=0'))).toBe(
			'S = \\left\\{ 2 \\sqrt{a b} \\,;\\, -2 \\sqrt{a b} \\right\\} \\quad \\text{si } a b \\geqslant 0'
		);
	});

	it('x² − abc = 0 : ±√(abc) si abc ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-abc=0'))).toBe(
			'S = \\left\\{ \\sqrt{a b c} \\,;\\, -\\sqrt{a b c} \\right\\} \\quad \\text{si } a b c \\geqslant 0'
		);
	});

	it('x³ − abx = 0 (degré 3, même formule) : 0 et ±√(ab)', () => {
		const latex = latexOf(run('.résoudre x^3-abx=0'));

		expect(latex).toContain('\\sqrt{a b}');
		expect(latex).not.toContain('\\sqrt{a} \\sqrt{b}');
	});
});

describe('V92 — revue : constante dans le coefficient, lettres au carré', () => {
	// Une constante (π, e) faisait retomber sur √π √a √b « si 4πab ⩾ 0 »
	it.each([
		['x^2-\\pi ab=0', '\\sqrt{\\pi} \\sqrt{a b}'],
		['x^2-eab=0', '\\sqrt{\\exponentialE} \\sqrt{a b}'],
		['x^2-2\\pi ab=0', '\\sqrt{2} \\sqrt{\\pi} \\sqrt{a b}']
	])('%s : ±%s si ab ⩾ 0', (equation, root) => {
		expect(latexOf(run(`.résoudre ${equation}`))).toBe(
			`S = \\left\\{ ${root} \\,;\\, -${root} \\right\\} \\quad \\text{si } a b \\geqslant 0`
		);
	});

	// La condition est celle sous laquelle la racine ÉCRITE existe : avec
	// « 4a²bc ⩾ 0 », a = 0, b = 1, c = −1 la vérifiait et √(bc) n'existe pas.
	// Depuis V124 elle est portée par chaque solution (cf. plus bas)
	it.each([
		['x^2-a^2bc=0', '\\sqrt{b c} \\left| a \\right|', 'b c'],
		['x^2-ab^2c=0', '\\sqrt{a c} \\left| b \\right|', 'a c'],
		['x^2-a^2b=0', '\\sqrt{b} \\left| a \\right|', 'b']
	])('%s : ±%s, chacune si %s ⩾ 0', (equation, root, radicand) => {
		const latex = latexOf(run(`.résoudre ${equation}`));

		expect(latex).toContain(
			`\\left\\{ ${root} \\text{ si } ${radicand} \\geqslant 0 \\,;\\, -${root} \\text{ si } ${radicand} \\geqslant 0 \\,;`
		);
	});
});

describe('V92 — inchangés', () => {
	it('x² − a = 0 : ±√a si a ⩾ 0', () => {
		expect(latexOf(run('.résoudre x^2-a=0'))).toBe(
			'S = \\left\\{ \\sqrt{a} \\,;\\, -\\sqrt{a} \\right\\} \\quad \\text{si } a \\geqslant 0'
		);
	});

	it('x² − a²b = 0 : ±|a|√b (√(a²) = |a| est juste)', () => {
		const latex = latexOf(run('.résoudre x^2-a^2b=0'));

		expect(latex).toContain('\\sqrt{b}');
		expect(latex).toContain('\\left| a \\right|');
	});

	it('avec a = −1 et b = −1 : S = {−1 ; 1}', () => {
		expect(latexOf(run('a=-1', 'b=-1', '.résoudre x^2-ab=0'))).toBe(
			'S = \\left\\{ -1 \\,;\\, 1 \\right\\}'
		);
	});
});

/**
 * V124 (registre des écarts) : `x² − a²bc = 0` rendait ±|a|√(bc) « si bc ⩾ 0 »
 * et rien pour a = 0 avec bc < 0, où 0 est pourtant solution. Une lettre sortie
 * en entier de la racine annule Δ quand elle est nulle : la racine double de ce
 * cas s'écrit à part, avec sa condition (phase 0 du 2026-11-27,
 * docs/wip/ecarts-v124-progress.md).
 */
describe('V124 — la solution du cas où une lettre sortie de la racine est nulle', () => {
	it.each([
		['x^2-a^2bc=0', '\\sqrt{b c} \\left| a \\right|', 'b c', 'a'],
		['x^2-a^2b=0', '\\sqrt{b} \\left| a \\right|', 'b', 'a'],
		['x^2-4a^2bc=0', '2 \\sqrt{b c} \\left| a \\right|', 'b c', 'a'],
		['x^2-a^4b=0', 'a^2 \\sqrt{b}', 'b', 'a'],
		// Plusieurs lettres au carré : l'une ou l'autre nulle suffit
		['x^2-a^2d^2bc=0', '\\sqrt{b c} \\left| a d \\right|', 'b c', 'a d']
	])('%s : ±%s si %s ⩾ 0, et 0 si %s = 0', (equation, root, radicand, vanishing) => {
		expect(latexOf(run(`.résoudre ${equation}`))).toBe(
			`S = \\left\\{ ${root} \\text{ si } ${radicand} \\geqslant 0 \\,;\\, -${root} \\text{ si } ${radicand} \\geqslant 0 \\,;\\, 0 \\text{ si } ${vanishing} = 0 \\right\\}`
		);
	});

	it('(x − 1)² = a²b : la racine double du cas a = 0 est 1, pas 0', () => {
		expect(latexOf(run('.résoudre (x-1)^2=a^2b'))).toBe(
			'S = \\left\\{ \\sqrt{b} \\left| a \\right| + 1 \\text{ si } b \\geqslant 0 \\,;\\, 1 - \\sqrt{b} \\left| a \\right| \\text{ si } b \\geqslant 0 \\,;\\, 1 \\text{ si } a = 0 \\right\\}'
		);
	});

	it('avec a = 0 : S = {0}', () => {
		expect(latexOf(run('a=0', '.résoudre x^2-a^2bc=0'))).toBe('S = \\left\\{ 0 \\right\\}');
	});

	// 0 est déjà solution sans condition : ni écrit deux fois, ni remplacé par « 0 si a = 0 »
	it.each(['x^3-a^2bx=0', 'x(x^2-a^2b)=0'])('%s : 0 une seule fois, sans condition', (equation) => {
		expect(latexOf(run(`.résoudre ${equation}`))).toBe(
			'S = \\left\\{ 0 \\,;\\, \\sqrt{b} \\left| a \\right| \\text{ si } b \\geqslant 0 \\,;\\, -\\sqrt{b} \\left| a \\right| \\text{ si } b \\geqslant 0 \\right\\}'
		);
	});

	it('x⁴ − a²bx² = 0 : 0 reste solution sans condition', () => {
		expect(latexOf(run('.résoudre x^4-a^2bx^2=0'))).toBe(
			'S = \\left\\{ \\sqrt{b} \\left| a \\right| \\text{ si } b \\geqslant 0 \\,;\\, -\\sqrt{b} \\left| a \\right| \\text{ si } b \\geqslant 0 \\,;\\, 0 \\right\\}'
		);
	});

	it('(x − 1)(x² − a²b) = 0 : le 0 du cas a = 0 reste annoncé à côté de 1', () => {
		expect(latexOf(run('.résoudre (x-1)(x^2-a^2b)=0'))).toContain('0 \\text{ si } a = 0');
	});

	it('(x² − a²b)(x² − c²d) = 0 : un 0 par facteur, chacun avec sa condition', () => {
		const latex = latexOf(run('.résoudre (x^2-a^2b)(x^2-c^2d)=0'));

		expect(latex).toContain('0 \\text{ si } a = 0');
		expect(latex).toContain('0 \\text{ si } c = 0');
	});

	// L'Atelier ne lit pas cette saisie : sonde par l'API
	it('x² + 2ax + a² − a²b = 0 : la racine double du cas a = 0 s’écrit 0, pas −a', () => {
		const added = solveByApi('x^2+2ax+a^2-a^2b=0').solutions[2];

		expect(toLatex(added.value)).toBe('0');
		expect(added.condition && toLatex(added.condition)).toBe('a = 0');
	});

	// La lettre est aussi dans le coefficient de x² : nulle, elle ne laisse plus
	// une équation du second degré, 0 n'en est pas solution (−bc = 0). L'Atelier
	// refuse ces saisies : sonde par l'API
	it.each(['a^2x^2-bc=0', 'a^2bx^2-c=0'])('%s : pas de « 0 si a = 0 »', (equation) => {
		const result = solveByApi(equation);

		expect(result.solutions).toHaveLength(2);
	});

	it('b²x² + 2b²x + b² − a²c = 0 : −1 si a = 0, sans b dans la condition', () => {
		const result = solveByApi('b^2x^2+2b^2x+b^2-a^2c=0');
		const added = result.solutions[2];

		expect(toLatex(added.value)).toBe('-1');
		expect(added.condition && toLatex(added.condition)).toBe('a = 0');
	});

	// Pas de lettre sortie en entier : rien à ajouter, la condition reste commune
	it.each([
		['x^2-ab=0', '\\sqrt{a b}', 'a b'],
		['x^2-a^3b=0', '\\sqrt{a b} \\left| a \\right|', 'a b']
	])('%s : inchangé, ±%s si %s ⩾ 0', (equation, root, radicand) => {
		expect(latexOf(run(`.résoudre ${equation}`))).toBe(
			`S = \\left\\{ ${root} \\,;\\, -${root} \\right\\} \\quad \\text{si } ${radicand} \\geqslant 0`
		);
	});

	it('x² − a² = 0 : ±|a|, sans condition (a = 0 y donne déjà 0)', () => {
		expect(latexOf(run('.résoudre x^2-a^2=0'))).toBe(
			'S = \\left\\{ \\left| a \\right| \\,;\\, -\\left| a \\right| \\right\\}'
		);
	});
});
