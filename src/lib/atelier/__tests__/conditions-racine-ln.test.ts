/**
 * Lot 3 des écarts (`ecarts-conditions`, 2026-11-01) : les conditions de
 * l'Atelier lues aussi dans les arguments de `\sqrt` et de `\ln` / `\log`.
 *
 * Avant : `.intégrer \sqrt{a} x de 0 à 1` répondait ½√a sans « (a ⩾ 0) » —
 * seuls les dénominateurs étaient lus.
 *
 * Décisions de David (2026-11-01) :
 * - Q1 : règle de Q3 / V61 — une intégrale BORNÉE dit les conditions de son
 *   intégrande (il n'est plus sur la ligne) ; une primitive ne redit pas ce
 *   que la saisie montre ;
 * - Q2 : « a ⩾ 0 » et « a ≠ 0 » ensemble → « a > 0 » ;
 * - Q3 : `\log`, `\log_b` comme `\ln` (argument > 0) ;
 * - Q4 : `1/\ln(a)` reste « ln(a) ≠ 0 » (hors lot).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

// =============================================================================
// Décor
// =============================================================================

function run(input: string): CalcResult {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	return runInput(s, input);
}

/** Les conditions écrites en fin de ligne (texte), `''` s'il n'y en a pas. */
function conditions(input: string): string {
	const result = run(input);
	if (result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	// La dernière ligne finit par « (a > 0, ln(a) ≠ 0) » : depuis le dernier « ( »
	// précédé d'une espace
	const line = result.output.split('\n').at(-1) ?? '';
	const start = line.lastIndexOf(' (');
	if (start === -1 || !line.endsWith(')')) return '';
	const inside = line.slice(start + 2, -1);
	return /[≠⩾>⩽<]/.test(inside) ? inside : '';
}

/** Le LaTeX de la ligne, sans espaces. */
function latex(input: string): string {
	const result = run(input);
	if (result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return (result.latex ?? '').replace(/\s/g, '');
}

// =============================================================================
// Nominal : l'intégrale bornée dit la condition de son intégrande
// =============================================================================

describe('intégrale bornée : la condition de √ et ln', () => {
	it.each([
		['.intégrer \\sqrt{a} x de 0 à 1', 'a ⩾ 0'],
		['.intégrer \\ln(a) x de 0 à 1', 'a > 0'],
		['.intégrer \\sqrt{a-1} x de 0 à 1', 'a ⩾ 1'],
		['.intégrer \\sqrt{a+3} x de 0 à 1', 'a ⩾ -3'],
		['.intégrer \\sqrt{3+a} x de 0 à 1', 'a ⩾ -3'],
		['.intégrer \\sqrt{3-a} x de 0 à 1', 'a ⩽ 3'],
		['.intégrer \\ln(1-a) x de 0 à 1', 'a < 1'],
		['.intégrer \\ln(a+2) x de 0 à 1', 'a > -2'],
		['.intégrer \\ln(a-1) x de 0 à 1', 'a > 1'],
		// Q3 : log comme ln
		['.intégrer \\log(a) x de 0 à 1', 'a > 0'],
		['.intégrer \\log_2(a) x de 0 à 1', 'a > 0'],
		// racine d'indice pair
		['.intégrer \\sqrt[4]{a} x de 0 à 1', 'a ⩾ 0']
	])('%s → (%s)', (input, expected) => {
		expect(conditions(input)).toBe(expected);
	});

	it('LaTeX : (a ⩾ 0) écrit \\geqslant', () => {
		expect(latex('.intégrer \\sqrt{a} x de 0 à 1')).toMatch(/\\quad\(a\\geqslant0\)$/);
	});

	it('LaTeX : (a > 0) écrit >', () => {
		expect(latex('.intégrer \\ln(a) x de 0 à 1')).toMatch(/\\quad\(a>0\)$/);
	});

	it('argument non reconnu : la forme brute', () => {
		expect(conditions('.intégrer \\sqrt{a^3-a} x de 0 à 1')).toBe('a^3-a ⩾ 0');
	});
});

// =============================================================================
// Limite
// =============================================================================

describe('limites', () => {
	it.each([
		['.intégrer \\sqrt{a^2+1} x de 0 à 1'],
		['.intégrer \\ln(a^2+1) x de 0 à 1'],
		// racine cubique : toujours définie
		['.intégrer \\sqrt[3]{a} x de 0 à 1']
	])('toujours vraie, rien dit : %s', (input) => {
		expect(conditions(input)).toBe('');
	});

	it('ln(a²) de 0 à 1 → ln|a| (a ≠ 0)', () => {
		expect(conditions('.intégrer \\ln(a^2) x de 0 à 1')).toBe('a ≠ 0');
	});

	it('Q2 : √a et ln a ensemble → (a > 0), pas « a ⩾ 0, a > 0 »', () => {
		expect(conditions('.intégrer \\sqrt{a}\\ln(a) x de 0 à 1')).toBe('a > 0');
	});

	it('Q2 : √a au dénominateur → (a > 0)', () => {
		expect(conditions('.intégrer \\dfrac{x}{\\sqrt{a}} de 0 à 1')).toBe('a > 0');
	});

	it('Q2, miroir : √(1−a) au dénominateur → (a < 1)', () => {
		expect(conditions('.intégrer \\dfrac{x}{\\sqrt{1-a}} de 0 à 1')).not.toMatch(/a ⩽ 1|a ≠ 1/);
		expect(conditions('.intégrer \\dfrac{x}{\\sqrt{1-a}} de 0 à 1')).toContain('a < 1');
	});

	it('Q2 : e^{√a x} de 0 à 1 → (a > 0)', () => {
		expect(conditions('.intégrer e^{\\sqrt{a} x} de 0 à 1')).toBe('a > 0');
	});

	it('Q1 : la primitive ne redit pas √a, visible sur la ligne', () => {
		expect(conditions('.intégrer \\sqrt{a} x')).toBe('');
		expect(conditions('.intégrer \\ln(a) x')).toBe('');
	});

	it('Q1 : primitive de e^{√a x} : la division introduite, (a ≠ 0)', () => {
		expect(conditions('.intégrer e^{\\sqrt{a} x}')).toBe('a ≠ 0');
	});

	it('Q4 : 1/ln(a) de 0 à 1 reste « ln(a) ≠ 0 », avec a > 0', () => {
		expect(conditions('.intégrer \\dfrac{x}{\\ln(a)} de 0 à 1')).toBe('a > 0, ln(a) ≠ 0');
	});
});

// =============================================================================
// Inchangé
// =============================================================================

describe('inchangé', () => {
	it('la variable dans l’argument : la condition porte sur x, rien sur a', () => {
		expect(conditions('.intégrer \\sqrt{x+a}')).toBe('');
	});

	it('les refus « dépend de a » restent', () => {
		expect(run('.intégrer \\sqrt{a x} de 0 à 1').kind).toBe('refus');
		expect(run('.intégrer \\ln(a x) de 1 à 2').kind).toBe('refus');
	});

	it('le paramètre posé : plus de condition', () => {
		const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'a = 4');
		const result = runInput(s, '.intégrer \\sqrt{a} x de 0 à 1');
		expect(result.kind === 'commande' && result.output).not.toMatch(/[⩾≠]/);
	});
});
