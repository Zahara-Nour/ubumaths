/**
 * Structure d'une expression — virgule décimale à l'affichage
 * ==========================================================
 *
 * Tout le LaTeX affiché par le module (formule marquée, sous-expressions,
 * formules de la lecture, messages) écrit les décimaux à la française,
 * `2{,}5` (écriture de MathLive), comme la vue Calcul de l'atelier.
 * L'AST garde le point.
 */
import { describe, expect, it } from 'vitest';
import {
	parenthesesAdvice,
	readingOf,
	readingPlainText,
	stripMarkers,
	structureFromLatex
} from '..';
import type { ExpressionStructure } from '..';

// Fonctions
function structureOf(latex: string): ExpressionStructure {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`${latex} : ${result.status}`);
	return result.structure;
}

describe('virgule décimale', () => {
	it('2,5 + 1,2 : formule marquée et sous-expressions', () => {
		const structure = structureOf('2{,}5+1{,}2');
		expect(stripMarkers(structure.latex)).toBe('2{,}5 + 1{,}2');
		expect(structure.nodes.map((n) => stripMarkers(n.latex))).toEqual([
			'2{,}5 + 1{,}2',
			'2{,}5',
			'1{,}2'
		]);
	});

	it('2,5 + 1,2 : formules de la lecture', () => {
		const formulas = readingOf(structureOf('2{,}5+1{,}2'))
			.segments.filter((s) => s.kind === 'formula')
			.map((s) => (s.kind === 'formula' ? s.latex : ''));
		expect(formulas).toEqual(['2{,}5', '1{,}2']);
	});

	it('2,5 + 1,2 : texte brut de la lecture, virgule nue', () => {
		expect(readingPlainText(readingOf(structureOf('2{,}5+1{,}2')))).toBe('la somme de 2,5 et 1,2');
	});

	it('0,5x² : décimal dans un produit et une puissance', () => {
		expect(stripMarkers(structureOf('0{,}5x^2').latex)).toBe('0{,}5 x^{2}');
	});

	it('message : 2,5 − 1,2 + 3', () => {
		const advice = parenthesesAdvice(structureOf('2{,}5-1{,}2+3'));
		expect(advice?.reason === 'chain' && advice.proposals?.[0]).toBe(
			'\\left( 2{,}5 - 1{,}2 \\right) + 3'
		);
	});

	it('l’AST garde le point', () => {
		const structure = structureOf('2{,}5+1{,}2');
		const term = structure.nodes[1].ast;
		expect(term.type === 'number' && term.value).toBe('2.5');
	});
});
