/**
 * Écart V53 (2026-10-13) : un pôle IRRATIONNEL dans [a ; b] échappait au
 * contrôle de la primitive. ∫₁² 3x²/(x³ − 2) dx rendait ln 2 + ln 3, alors
 * que x³ − 2 s'annule en ∛2 ≈ 1,26 : l'intégrale diverge.
 *
 * Cause : le zoom qui cherche une divergence logarithmique (ln|·| → −∞) de F
 * visait l'échantillon le plus éloigné de la MOYENNE des extrémités du
 * segment — les deux extrémités sont alors à égalité, et le zoom partait du
 * mauvais côté. Deux filets désormais : le zoom vise le minimum puis le
 * maximum de F, et un dénominateur de f qui change de signe dans [a ; b]
 * (racine localisée par bissection, jamais calculée exactement) est un pôle
 * dès que |f| y croît comme un ordre ≳ 0,85 ; 1/√(2 − x) en 2 reste intégrable.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrateDefinite } from '../integrate';
import { antiderivativeDiscontinuity, denominatorPole } from '../singularity';
import { compile } from '../../eval/compile';

// =============================================================================
// Outils
// =============================================================================

function definite(latex: string, lower: string, upper: string) {
	return integrateDefinite(parseLatex(latex), parseLatex(lower), parseLatex(upper), {
		variable: 'x'
	});
}

// =============================================================================
// Refus : pôle irrationnel dans [a ; b]
// =============================================================================

describe('intégrale définie : pôle irrationnel dans [a ; b] → refus', () => {
	it.each([
		// racine cubique, quatrième, cinquième : primitive ln|·|
		['\\frac{3x^2}{x^3-2}', '1', '2', '1,26'],
		['\\frac{3x^2}{x^3-2}', '0', '2', '1,26'],
		['\\frac{3x^2}{x^3-2}', '1', '3', '1,26'],
		['\\frac{3x^2}{x^3-2}', '1.1', '1.9', '1,26'],
		['\\frac{3x^2}{x^3-2}', '1', '5', '1,26'],
		['\\frac{2x}{x^2-2}', '0.9', '2', '1,414'],
		['\\frac{4x^3}{x^4-3}', '1.1', '1.9', '1,316'],
		['\\frac{5x^4}{x^5-3}', '1', '2', '1,246'],
		// racine double (pôle d'ordre 2) et racine irrationnelle simple sans primitive
		['\\frac{3x^2}{(x^3-2)^2}', '1', '2', '1,26'],
		['\\frac{1}{(x-\\sqrt{2})^2}', '1', '2', '1,414'],
		['\\frac{1}{x^3-2}', '1', '2', '1,26'],
		// pôles de fonctions non rationnelles
		['\\frac{1}{\\ln x}', '0.5', '2', '1'],
		['\\frac{1}{e^x-3}', '0', '2', '1,099'],
		['\\frac{e^x}{e^x-3}', '0', '2', '1,099'],
		['\\tan x', '0', '2', '1,571'],
		// revue : pôle double sans primitive, pôle à 10⁻⁶ d'une borne, grand intervalle
		['\\frac{1}{(x^3-2)^2}', '1', '2', '1,26'],
		['\\frac{1}{x-1.000001}', '1', '2', '1'],
		['\\frac{1}{x-0.999999}', '0', '1', '1'],
		['\\frac{3x^2}{x^3-2}', '-1000', '1000', '1,26'],
		['\\frac{1}{x^3-2}', '-1000', '1000', '1,26']
	])('%s sur [%s ; %s] : aucune valeur, pôle en x ≈ %s', (latex, lower, upper, pole) => {
		const result = definite(latex, lower, upper);
		expect(result.status).toBe('unsupported');
		expect(result.value).toBeNull();
		expect(result.approximate).toBeUndefined();
		expect(result.error).toMatch(/^L'intégrale diverge ou n'est pas définie sur \[/);
		expect(result.error).toContain(`x ≈ ${pole}`);
	});

	it('pôle exactement sur une borne (∛2) : refus', () => {
		const result = definite('\\frac{3x^2}{x^3-2}', '\\sqrt[3]{2}', '2');
		expect(result.status).toBe('unsupported');
		expect(result.value).toBeNull();
		expect(result.error).toMatch(/diverge/);
	});

	it('la valeur approchée du pôle est lisible (pas 1.2599210498948732)', () => {
		const result = definite('\\frac{3x^2}{x^3-2}', '1', '2');
		expect(result.error).not.toMatch(/\d\.\d{4,}|\d,\d{4,}/);
	});
});

describe('contrôle de la primitive : divergence logarithmique irrationnelle', () => {
	it.each([
		['\\ln|x^3-2|', 1, 2],
		['\\ln|x^2-2|', 0.9, 2],
		['\\ln|x^4-3|', 1.1, 1.9]
	])('%s sur [%s ; %s] : discontinuité signalée', (latex, lower, upper) => {
		expect(antiderivativeDiscontinuity(parseLatex(latex), 'x', lower, upper)).not.toBeNull();
	});
});

// =============================================================================
// Non-régressions : aucun pôle dans [a ; b]
// =============================================================================

describe('intégrale définie : aucun pôle dans [a ; b] → valeur juste', () => {
	it.each([
		['\\frac{3x^2}{x^3+2}', '1', '2', Math.log(10 / 3)],
		['\\frac{3x^2}{x^3-2}', '2', '3', Math.log(25 / 6)],
		['\\frac{2x}{x^2-2}', '2', '3', Math.log(7 / 2)],
		['\\frac{1}{x-\\sqrt{3}}', '0.5', '1.5', Math.log((1.5 - Math.sqrt(3)) / (0.5 - Math.sqrt(3)))],
		['\\frac{e^x}{e^x-3}', '1.1', '1.9', Math.log((Math.exp(1.9) - 3) / (Math.exp(1.1) - 3))],
		// dénominateur qui s'annule, mais singularité prolongeable : x² − 1 = (x − 1)(x + 1)
		['\\frac{x^2-1}{x-1}', '0', '2', 4],
		// pôle d'ordre 1/3, intégrable : le dénominateur change de signe en 0
		['\\frac{1}{\\sqrt[3]{x}}', '-1', '8', 4.5],
		// singularités d'ordre 1/2 ou 0,4, intégrables (revue : refusées à tort par un
		// seuil de croissance égal à 10, celle d'un ordre 1/2 exactement)
		['\\frac{1}{\\sqrt{2-x}}', '0', '2', 2 * Math.SQRT2],
		['\\frac{1}{\\sqrt{3-x}}', '0', '3', 2 * Math.sqrt(3)],
		['\\frac{x}{\\sqrt{1-x^2}}', '0', '1', 1],
		['\\frac{x}{\\sqrt{4-x^2}}', '0', '2', 2],
		['\\frac{\\cos x}{\\sqrt{\\sin x}}', '0', '1', 2 * Math.sqrt(Math.sin(1))],
		// NaN à gauche de 0 (compilé), borné à droite : pas un pôle
		['\\frac{1}{x^{0.4}}', '-1', '1', 10 / 3],
		['\\frac{1}{\\sqrt{x}}', '0', '1', 2],
		['\\frac{1}{\\sqrt{x-1}}', '1', '2', 2],
		['\\frac{1}{\\sqrt{4-x^2}}', '0', '2', Math.PI / 2],
		['x^{-\\frac{1}{2}}', '0', '1', 2]
	])('%s sur [%s ; %s] ≈ %f', (latex, lower, upper, expected) => {
		const result = definite(latex, lower, upper);
		expect(result.status).not.toBe('unsupported');
		const value =
			result.approximate ?? (result.value === null ? Number.NaN : compile(result.value)({}));
		expect(value).toBeCloseTo(expected, 6);
	});
});

describe('repli numérique : singularité intégrable de f → valeur approchée gardée', () => {
	// Valeurs de main avant V53 (Simpson adaptatif) : non-régression, l'ordre
	// 1/2 et 0,6 est sous le seuil de pôle (≈ 0,85)
	it.each([
		['\\frac{1}{\\sqrt{|x^3-2|}}', '1', '2', 1.203743795088617],
		['\\frac{1}{|x^3-2|^{0.6}}', '1', '2', 1.3792424108916688]
	])('%s sur [%s ; %s] ≈ %f', (latex, lower, upper, expected) => {
		const result = definite(latex, lower, upper);
		expect(result.status).toBe('approximate');
		expect(result.approximate ?? Number.NaN).toBeCloseTo(expected, 6);
	});
});

// =============================================================================
// Second filet : dénominateur de f qui change de signe
// =============================================================================

describe('denominatorPole : racine du dénominateur localisée par bissection', () => {
	it.each([
		['\\frac{3x^2}{x^3-2}', 1, 2, '1,26'],
		['\\frac{1}{x^5-3}', 1, 2, '1,246'],
		['\\frac{x}{e^x-3}', 0, 2, '1,099'],
		['\\frac{2}{\\ln x}', 0.5, 2, '1'],
		['(x^3-2)^{-1}', 1, 2, '1,26']
	])('%s sur [%s ; %s] : pôle en x ≈ %s', (latex, lower, upper, pole) => {
		expect(denominatorPole(parseLatex(latex), 'x', lower, upper)).toBe(
			`la fonction a une singularité en x ≈ ${pole}`
		);
	});

	it.each([
		// aucun zéro du dénominateur dans [a ; b]
		['\\frac{3x^2}{x^3+2}', 1, 2],
		['\\frac{3x^2}{x^3-2}', 2, 3],
		// zéro prolongeable, zéro intégrable (ordre 1/3)
		['\\frac{x^2-1}{x-1}', 0, 2],
		['\\frac{\\sin(x-\\sqrt{2})}{x-\\sqrt{2}}', 1, 2],
		['\\frac{1}{\\sqrt[3]{x}}', -1, 8],
		// zéro du dénominateur à une borne, ordre 1/2 : intégrable
		['\\frac{1}{\\sqrt{2-x}}', 0, 2],
		['\\frac{x}{\\sqrt{1-x^2}}', 0, 1],
		// paramètre libre : contrôle impossible, pas de refus
		['\\frac{1}{x-a}', 0, 2]
	])('%s sur [%s ; %s] : aucun pôle', (latex, lower, upper) => {
		expect(denominatorPole(parseLatex(latex), 'x', lower, upper)).toBeNull();
	});
});
