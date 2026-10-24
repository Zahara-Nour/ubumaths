/**
 * « Comment ? » sur une ligne de Calcul sans lettre (phase 0 de
 * `docs/wip/retrait-calc-progress.md`, validée par David le 2026-10-24) : ce
 * que `/calc` montrait, avant son retrait.
 *
 * - **C1** : un calcul sans lettre ni nom de l'atelier, avec au moins une
 *   opération, porte des étapes.
 * - **C2** : celles de `.évaluer` sans « On remplace » : une opération par
 *   étape, rédaction collège ; `1/2` tapé s'écrit en fraction.
 * - **C3** : rien à montrer (un nombre seul, une fraction irréductible) →
 *   pas d'étapes.
 * - **C4** : mêmes gardes que `.évaluer` (réponse arrondie, fonction
 *   transcendante, décimaux passés par des fractions).
 * - **C5** : une erreur (division par zéro) → la ligne d'avant, sans étapes.
 * - **Q1** : une valeur ou une fonction de l'atelier citée → pas d'étapes.
 * - **Q2** : pas de résumé.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

// =============================================================================
// Décor
// =============================================================================

function session(setup: readonly string[] = []): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const typed of setup) runInput(s, typed);
	return s;
}

function calcul(result: CalcResult) {
	if (result.kind !== 'calcul') throw new Error(`attendu un calcul, reçu ${result.kind}`);
	return result;
}

function line(input: string, setup: readonly string[] = []) {
	return calcul(runInput(session(setup), input));
}

/** Les étapes de la ligne, qui doivent exister. */
function steps(input: string, setup: readonly string[] = []): readonly RenderedStep[] {
	const found = line(input, setup).steps;
	if (found === undefined) throw new Error(`pas d'étapes pour ${input}`);
	return found;
}

/** Le LaTeX d'une étape, sans espaces, sans couleur, sans `\left`/`\right`. */
function flat(step: RenderedStep): string {
	return (step.expressionLatex ?? '')
		.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
		.replace(/\\textcolor\{blue\}/g, '')
		.replace(/\\left|\\right/g, '')
		.replace(/[{}\s&]/g, '');
}

/** La dernière ligne écrite par les étapes : la valeur conclue. */
function concluded(found: readonly RenderedStep[]): string {
	const last = flat(found[found.length - 1]).split('\\\\');
	return last[last.length - 1].replace(/^=/, '');
}

// =============================================================================
// C1, C2 — une opération par étape
// =============================================================================

describe('C1, C2 : un calcul sans lettre explique ses opérations', () => {
	it('2+3*4 : la multiplication d’abord, puis l’addition', () => {
		const found = steps('2+3*4');
		expect(found.map((s) => s.title)).toEqual(['Multiplication', 'Addition']);
		expect(flat(found[0])).toContain('=2+12');
		expect(concluded(found)).toBe('14');
	});

	it('(2+3)*4 : les parenthèses d’abord', () => {
		const found = steps('(2+3)*4');
		expect(found[0].title).toContain('parenthèses');
		expect(concluded(found)).toBe('20');
	});

	it('10-2*3+4 : de gauche à droite après la multiplication', () => {
		const found = steps('10-2*3+4');
		expect(found).toHaveLength(3);
		expect(concluded(found)).toBe('8');
	});

	it('1/2+1/3 : écrit en fractions, mises au même dénominateur', () => {
		const found = steps('1/2+1/3');
		expect(found[0].title).toContain('même dénominateur');
		expect(flat(found[0])).toContain('\\dfrac12+\\dfrac13');
		expect(flat(found[0])).not.toContain('\\div');
		expect(concluded(found)).toBe('\\dfrac56');
	});

	it('5-(-3) : soustraire un négatif, c’est ajouter son opposé', () => {
		const found = steps('5-(-3)');
		expect(found[0].title).toContain('Soustraire');
		expect(concluded(found)).toBe('8');
	});

	it('-3*(4-7) : le négatif entre parenthèses, jamais « -3 × -3 »', () => {
		const found = steps('-3*(4-7)');
		const all = found.map(flat).join(' ');
		expect(all).toContain('(-3)\\times(-3)');
		expect(concluded(found)).toBe('9');
	});

	it('3*(2+5)^2 : parenthèses, puissance, produits', () => {
		expect(concluded(steps('3*(2+5)^2'))).toBe('147');
	});

	it('sqrt(16)+1 : la racine d’un carré parfait', () => {
		expect(concluded(steps('sqrt(16)+1'))).toBe('5');
	});

	it('la réponse de la ligne ne change pas', () => {
		const shown = line('2+3*4');
		expect(shown.output).toBe('14');
		expect(shown.latex).toBe('14');
	});

	it('aucun astérisque dans les étapes', () => {
		for (const typed of ['2+3*4', '-3*(4-7)', '3*(2+5)^2', '2*3+4*5']) {
			const all = steps(typed)
				.map((s) => s.expressionLatex ?? '')
				.join(' ');
			expect(all, typed).not.toContain('*');
		}
	});

	it('Q2 : pas de résumé', () => {
		const shown = line('10-2*3+4') as Record<string, unknown>;
		expect(shown.summary).toBeUndefined();
	});
});

// =============================================================================
// C3, C4 — rien à montrer, gardes
// =============================================================================

describe('C3 : rien à montrer → pas d’étapes', () => {
	it.each(['14', '-5', '7/3', '0'])('%s', (typed) => {
		expect(line(typed).steps).toBeUndefined();
	});

	// Lu `((3/4)·2)/9` : des étapes écriraient `× 2 ÷ 9`, pas le produit de deux fractions tapé
	it.each(['3/4*2/9', '1/2*3/4'])('%s : un produit de fractions sans parenthèses', (typed) => {
		expect(line(typed).steps).toBeUndefined();
	});
});

describe('revue du 2026-10-24', () => {
	it('un angle en degrés : pas d’étapes (elles concluaient en radians)', () => {
		for (const typed of ['2*30°', '2*30° + 1°']) {
			expect(line(typed).steps, typed).toBeUndefined();
		}
	});

	it('2:0,5 : la division de décimaux reste « ÷ », jamais une fraction à virgule', () => {
		const found = line('2:0,5').steps ?? [];
		expect(found.map(flat).join(' ')).not.toMatch(/frac/);
	});
});

describe('C4 : les gardes de .évaluer', () => {
	it('fonction transcendante (cos, ln)', () => {
		expect(line('cos(0)+1').steps).toBeUndefined();
		expect(line('ln(1)+2').steps).toBeUndefined();
	});

	it('réponse décimale dont les étapes passent par des fractions', () => {
		expect(line('0.5+1.25').steps).toBeUndefined();
	});

	it('des étapes, quand il y en a, concluent la réponse de la ligne', () => {
		for (const typed of ['2+3*4', '1/2+1/3', '2^3-5', '(-2)^3', '5-(-3)', '12/4']) {
			const shown = line(typed);
			if (shown.steps === undefined) continue;
			expect(concluded(shown.steps), typed).toBe((shown.latex ?? '').replace(/[{}\s]/g, ''));
		}
	});
});

// =============================================================================
// C5 — erreurs
// =============================================================================

describe('C5 : une erreur garde la ligne d’avant', () => {
	it('division par zéro : le message, sans étapes', () => {
		const shown = line('1/(2-2)');
		expect(shown.output).toContain('Division par zéro');
		expect(shown.steps).toBeUndefined();
	});
});

// =============================================================================
// Q1 — l'atelier cité
// =============================================================================

describe('Q1 : une valeur ou une fonction de l’atelier → pas d’étapes', () => {
	it('a+2 avec a = 3', () => {
		const shown = line('a+2', ['a = 3']);
		expect(shown.output).toBe('5');
		expect(shown.steps).toBeUndefined();
	});

	it('f(2)+1 avec f(x) = x^2', () => {
		const shown = line('f(2)+1', ['f(x) = x^2']);
		expect(shown.output).toBe('5');
		expect(shown.steps).toBeUndefined();
	});

	it('u_3 + 1 avec une suite', () => {
		const shown = line('u_3 + 1', ['u(n) = 2n']);
		expect(shown.steps).toBeUndefined();
	});

	it('une expression en x reste sans étapes', () => {
		expect(line('2x+3x').steps).toBeUndefined();
	});
});
