/**
 * `factoriser` met au propre, et sort les facteurs numériques et monômes.
 *
 * ## Deux manques distincts, mesurés sur `main` à `eff054fd7`
 *
 * **1. Rien ne met au propre.** L'intention `factoriser` coupe `normalize`, à
 * juste titre puisqu'il défferait la factorisation — mais rien ne le remplace,
 * et les coefficients restent bruts :
 *
 * | entrée | `factoriser` rendait |
 * | --- | --- |
 * | `(2/4)x + x` | `(2/4 + 1)x` au lieu de `(3/2)x` |
 *
 * `tidy` est exactement l'outil qui manque : il met au propre **sans jamais
 * développer**, donc sans défaire ce que la phase A vient de factoriser.
 *
 * **2. La mise en facteur commun ignore le numérique et le monôme.** Le module
 * `common-factor.ts` le disait en tête : le facteur purement numérique était
 * « laissé de côté » parce qu'il paraissait ambigu. Conséquence :
 *
 * | entrée | `factoriser` rendait | attendu |
 * | --- | --- | --- |
 * | `2x + 4` | inchangé | `2(x+2)` |
 * | `x² + 2x` | inchangé | `x(x+2)` |
 * | `3x² + 6x + 3` | inchangé | `3(x+1)²` |
 *
 * Un élève à qui on demande de factoriser `2x + 4` attend `2(x+2)`. Décision de
 * David, 2026-09-21.
 */

import { describe, it, expect } from 'vitest';
import { toLatex } from '../../index';
import { parseLatex } from '../../parser';
import { generatePedagogicalSimplifySteps } from '../pipeline';

const factoriser = (source: string) =>
	toLatex(generatePedagogicalSimplifySteps(parseLatex(source), { intent: 'factoriser' }).result);

describe('le facteur numérique sort', () => {
	it.each([
		['2x+4', '2 \\left( x + 2 \\right)'],
		['3x+6', '3 \\left( x + 2 \\right)'],
		['6x+9', '3 \\left( 2 x + 3 \\right)'],
		['2x-4', '2 \\left( x - 2 \\right)']
	])('%s → %s', (source, attendu) => {
		expect(factoriser(source)).toBe(attendu);
	});
});

describe('le facteur monôme sort', () => {
	it.each([
		['x^2+2x', 'x \\left( x + 2 \\right)'],
		['x^2-x', 'x \\left( x - 1 \\right)'],
		// L'ordre est celui de la regle symbolique, qui ecrit (somme)xfacteur —
		// le meme que pour (x+1)e^x.
		['xy+x', '\\left( y + 1 \\right) x'],
		['x^3+x^2', 'x^2 \\left( x + 1 \\right)']
	])('%s → %s', (source, attendu) => {
		expect(factoriser(source)).toBe(attendu);
	});
});

describe('les deux ensemble', () => {
	it.each([
		['2x^2+4x', '2 x \\left( x + 2 \\right)'],
		// Le contenu sort, PUIS l'identité voit la somme intérieure.
		['3x^2+6x+3', '3 \\left( x + 1 \\right)^2']
	])('%s → %s', (source, attendu) => {
		expect(factoriser(source)).toBe(attendu);
	});
});

describe('la mise au propre ne défait pas la factorisation', () => {
	it('un coefficient brut est réduit', () => {
		expect(factoriser('\\frac{2}{4}x+x')).not.toContain('\\dfrac{2}{4}');
	});

	it.each([
		['x^2-1', '\\left( x + 1 \\right) \\left( x - 1 \\right)'],
		['x^2+2x+1', '\\left( x + 1 \\right)^2']
	])('%s reste factorisé : %s', (source, attendu) => {
		expect(factoriser(source)).toBe(attendu);
	});

	it('une factorisation déjà obtenue n’est pas développée', () => {
		const rendu = factoriser('(x+1)(x-1)');
		expect(rendu).not.toContain('x^2 - 1');
	});
});

describe('ce qui marchait continue', () => {
	it('la dérivée de x·eˣ reste factorisable', () => {
		expect(factoriser('e^{x}+xe^{x}')).toContain('x + 1');
	});

	it('une somme sans facteur commun ne bouge pas', () => {
		expect(factoriser('x+y')).toBe('x + y');
		expect(factoriser('2x+3y')).toBe('2 x + 3 y');
	});
});

// =============================================================================
// Le signe sort quand tous les termes sont négatifs
// =============================================================================

/**
 * Le pgcd est un pgcd d'entiers **positifs**, donc le signe ne sortait pas :
 * `−2x − 4` rendait `2(−x − 2)`, ce qui est juste mais laid, et ce n'est pas ce
 * qu'on enseigne. Quand **tous** les termes sont négatifs, le signe sort avec
 * le contenu. Décision de David, 2026-09-21.
 *
 * ⚠️ Seulement quand ils le sont **tous** : `−x + 1` garde sa forme, sinon on
 * déplacerait un signe sans rien factoriser.
 */
describe('le signe sort quand tous les termes sont négatifs', () => {
	it.each([
		['-2x-4', '-2 \\left( x + 2 \\right)'],
		['-3x^2-6x', '-3 x \\left( x + 2 \\right)'],
		['-x-1', '-\\left( x + 1 \\right)'],
		['-2x^2-4x', '-2 x \\left( x + 2 \\right)']
	])('%s → %s', (source, attendu) => {
		expect(factoriser(source)).toBe(attendu);
	});

	it('mais pas quand les signes sont mélangés', () => {
		expect(factoriser('-x+1')).toBe('-x + 1');
		expect(factoriser('-2x+4')).toBe('2 \\left( -x + 2 \\right)');
	});

	it('et le positif n’est pas touché', () => {
		expect(factoriser('2x+4')).toBe('2 \\left( x + 2 \\right)');
		expect(factoriser('x^2+2x')).toBe('x \\left( x + 2 \\right)');
	});
});
