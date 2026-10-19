/**
 * Revue de la PR « 60° » (2026-10-19) : les régressions et les écritures
 * relevées par le relecteur, chacune avec la valeur de main en référence.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

// =============================================================================
// Outils
// =============================================================================

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

function typed(...lines: string[]): CalcResult {
	const s = session();
	let result: CalcResult = { kind: 'vide' };
	for (const line of lines) result = runInput(s, line);
	return result;
}

function answer(...lines: string[]): string {
	const result = typed(...lines);
	if (result.kind !== 'calcul' && result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return result.output;
}

function latex(...lines: string[]): string {
	const result = typed(...lines);
	if (result.kind !== 'calcul' && result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return result.latex ?? '';
}

// =============================================================================
// 1. Une conversion VERS les degrés : le ° de la cible ne se réécrit pas
// =============================================================================

describe('convertir en degrés (main : 1 rad = 180/π °)', () => {
	it('1[rad] en ° : 1 rad = (180/π)°', () => {
		expect(answer('1[rad] en °')).toBe('1 rad = (180/\\pi)°');
	});

	it('(π/2)[rad] en ° : 90°', () => {
		expect(answer('(π/2)[rad] en °')).toBe('\\pi/2 rad = 90°');
	});

	it('1[rad] puis .convertir ° : la même conversion', () => {
		expect(answer('1[rad]', '.convertir °')).toBe('1 rad = (180/\\pi)°');
	});

	it('90° en rad se convertit (main : refus)', () => {
		expect(answer('90° en rad')).toBe('90° = {1/2}\\pi rad');
	});
});

// =============================================================================
// 2. Les commandes d'écriture montrent l'expression, pas sa valeur
// =============================================================================

describe('.latex, .texte : l’écriture telle quelle (main : \\cos\\left( 60~\\unit{°} \\right))', () => {
	it.each([
		['.latex cos(60[°])', '\\cos\\left( 60~\\unit{°} \\right)'],
		['.latex cos(60°)', '\\cos\\left( 60~\\unit{°} \\right)'],
		['.texte cos(60[°])', 'cos(60[°])'],
		['.latex sin(30[°])*x', '\\sin\\left( 30~\\unit{°} \\right) \\times x']
	])('%s', (line, expected) => {
		expect(answer(line)).toBe(expected);
	});
});

// =============================================================================
// 3. .variations d'un cosinus en degrés : pas de tableau faux
// =============================================================================

describe('.variations d’une fonction périodique sur ℝ', () => {
	it('f(x) = cos(x°) : sens indéterminé, pas « croissante sur ]-∞ ; 0[ »', () => {
		const output = answer('f(x) = cos(x°)', '.variations f');
		expect(output).not.toContain('croissante');
		expect(output).not.toContain('Maximum local');
		expect(output).toContain('indéterminé');
	});

	it('f(x) = cos(π*x/180) : pareil (déjà faux sur main)', () => {
		const output = answer('f(x) = cos(π*x/180)', '.variations f');
		expect(output).not.toContain('croissante');
		expect(output).toContain('indéterminé');
	});

	it('cos(x) ne change pas : décroissante sur ]0 ; π[', () => {
		const output = answer('f(x) = cos(x)', '.variations f');
		expect(output).toContain(']0 ; π[  : -  (f décroissante)');
	});
});

// =============================================================================
// 4. La grille écrit 60°
// =============================================================================

describe('une cellule qui vaut un angle s’écrit en degrés, comme Calcul', () => {
	it.each([
		['=60°', '60°', '60{}^{\\circ}'],
		['=2*30°', '60°', '60{}^{\\circ}'],
		['=60[°]', '60°', '60{}^{\\circ}']
	])('%s → %s', (formula, shown, expectedLatex) => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: formula }]);
		const cell = atelier.cellValue(0, 1);
		expect(cell.kind === 'number' && cell.shown).toBe(shown);
		expect(cell.kind === 'number' && cell.latex).toBe(expectedLatex);
	});

	it('=(π/3)[rad], écrit en radians, reste en radians', () => {
		const atelier = new Atelier();
		atelier.editCells([{ column: 0, row: 1, text: '=(π/3)[rad]' }]);
		const cell = atelier.cellValue(0, 1);
		expect(cell.kind === 'number' && cell.shown).toBe('≈ 1,0472');
	});
});

// =============================================================================
// 5, 6. Une fraction de degré, et son écriture
// =============================================================================

describe('une fraction de degré', () => {
	it('1/2° est un demi-degré, pas un message anglais', () => {
		expect(answer('1/2°')).toBe('(1/2)°');
		expect(answer('cos(1/2°)')).toBe(answer('cos((1/2)[°])'));
	});

	it('100° / 3 s’écrit (100/3)°, pas 100/3° (qui se lirait 100/(3°))', () => {
		expect(answer('100° / 3')).toBe('(100/3)°');
		expect(latex('100° / 3')).toBe('\\left(\\dfrac{100}{3}\\right){}^{\\circ}');
	});

	it('π° : \\pi°, collé', () => {
		expect(answer('π°')).toBe('\\pi°');
	});
});

// =============================================================================
// 9. .évaluer avec une valeur en degrés
// =============================================================================

describe('.évaluer sin(x) en x=30° (main : sin((π/6)[rad]) non calculé)', () => {
	it.each(['.évaluer sin(x) en x=30°', '.évaluer sin(x) en x=30[°]'])('%s → 1/2', (line) => {
		expect(answer(line)).toBe('1/2');
	});
});

// =============================================================================
// 10. La puissance d'un angle : refusée, comme pour une mesure
// =============================================================================

describe('(60°)^2 : refus, la décision de David pour les mesures', () => {
	it.each(['(60°)^2', '(60[°])^2'])('%s', (line) => {
		const result = typed(line);
		expect(result.kind === 'refus' && result.message).toContain('Une puissance d’un angle');
	});
});
