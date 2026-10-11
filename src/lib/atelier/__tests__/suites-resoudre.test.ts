/**
 * `.résoudre` sur les écritures des SUITES (1re / Tle) : une inconnue indicée
 * (`u_n`, `x_1`, `u_{n+1}`) et l'inconnue en exposant (`2^n = 1024`).
 *
 * Mesuré sur main (2026-10-08) : toutes ces saisies répondaient « Type
 * d'equation non supporte: unknown » ou un refus — la variable était devinée
 * sur l'arbre où l'indice est réécrit en nom (`u_n`), mais le solveur recevait
 * l'arbre brut, où `u_n` est un INDICE de base `u`. Et `aⁿ = b` n'était résolu
 * que pour a = e.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** Le rendu LaTeX de la réponse, sans espaces (`u_{n + 1}` → `u_{n+1}`). */
function answer(result: CalcResult): string {
	if (result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return (result.latex ?? '').replace(/\s+/g, '');
}

function solve(input: string): CalcResult {
	return runInput(session(), `.résoudre ${input}`);
}

describe('une inconnue indicée est une inconnue ordinaire', () => {
	it.each([
		['u_n+1=3', 'u_n=2'],
		['2u_n-5=7', 'u_n=6'],
		['x_1+2=5', 'x_1=3'],
		['0.5u_n+3=1', 'u_n=-4'],
		['u_{n+1}=3', 'u_{n+1}=3']
	])('%s → %s', (input, expected) => {
		expect(answer(solve(input))).toBe(expected);
	});

	it('u_n^2=4 → u_n = −2 ou 2', () => {
		expect(answer(solve('u_n^2=4'))).toBe('S=\\left\\{-2\\,;\\,2\\right\\}');
	});

	it('u_n>3 → S = ]3 ; +∞[', () => {
		expect(answer(solve('u_n>3'))).toContain(']3;+\\infty[');
	});

	// Comportement correct à garder : deux lettres, il faut préciser
	it.each(['u_0*1.5^n=10', 'x_1+x_2=3'])('%s reste un refus « plusieurs lettres »', (input) => {
		const result = solve(input);
		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toMatch(/Plusieurs lettres/);
	});
});

describe('l’inconnue en exposant : aⁿ = b', () => {
	it.each([
		['2^n=1024', 'n=10'],
		['3*2^n=96', 'n=5'],
		// Le décimal tapé reste décimal dans le ln, valeur approchée comprise
		// (décision de David, 2026-10-09 — voir `seuils-ecriture.test.ts`)
		['1.5^n=10', 'n=\\dfrac{\\ln\\left(10\\right)}{\\ln\\left(1{,}5\\right)}\\approx5{,}68'],
		['2^{n+1}=32', 'n=4'],
		['e^n=5', 'n=\\ln\\left(5\\right)\\approx1{,}61']
	])('%s → %s', (input, expected) => {
		expect(answer(solve(input))).toBe(expected);
	});

	it('2^n>1000 → n > ln 1000 / ln 2', () => {
		expect(answer(solve('2^n>1000'))).toBe(
			'n>\\dfrac{\\ln\\left(1000\\right)}{\\ln\\left(2\\right)}\\approx9{,}97'
		);
	});

	// Base < 1 : la fonction décroît, le sens de l'inégalité change
	it('0.8^n<0.1 → n > ln 0,1 / ln 0,8', () => {
		expect(answer(solve('0.8^n<0.1'))).toBe(
			'n>\\dfrac{\\ln\\left(0{,}1\\right)}{\\ln\\left(0{,}8\\right)}\\approx10{,}32'
		);
	});

	it('0.5^n<=0.25 → S = [2 ; +∞[ (exposant exact, sens changé)', () => {
		expect(answer(solve('0.5^n<=0.25'))).toBe('S=[2;+\\infty[');
	});

	it('2^n=-3 → pas de solution', () => {
		expect(answer(solve('2^n=-3'))).toBe('S=\\emptyset');
	});
});

describe('ce que le moteur ne sait pas résoudre : un refus en français', () => {
	// Mesuré (revue, 2026-10-09) : texte brut « Equation inconnue … Type
	// d'equation non supporte: unknown », de genre `commande`
	it.each([
		['u_0*0.5^n=1 pour n', 'u_0'],
		['u_0*q^n=10 pour n', 'q, u_0']
	])('%s → la solution dépend de %s', (input, letters) => {
		const result = solve(input);
		expect(result).toMatchObject({
			kind: 'refus',
			message: `La solution dépend de ${letters} : je ne sais pas encore résoudre avec un paramètre.`
		});
	});

	it('le coefficient numérique, lui, se résout : 2*0.5^n=1 → n = 1', () => {
		expect(answer(solve('2*0.5^n=1'))).toBe('n=1');
	});

	it('sans paramètre : « Je ne sais pas encore résoudre cette équation. »', () => {
		expect(solve('x^5+x+1=0')).toMatchObject({
			kind: 'refus',
			message: 'Je ne sais pas encore résoudre cette équation.'
		});
	});
});
