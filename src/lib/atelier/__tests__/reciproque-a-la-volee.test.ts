/**
 * `f⁻¹` tapé dans Calcul = la réciproque, calculée À LA VOLÉE comme `f'`
 * (décision (1) de David, 2026-10-13, `docs/archive/wip/atelier-reciproque-phase0.md`).
 *
 * Aucune carte requise ; la carte, si elle existe, donne le même résultat.
 * f non bijective → le refus de `.réciproque f` ; hors de l'ensemble de départ
 * → le refus de `f(5)` hors intervalle. L'inverse 1/f s'écrit `1/f(x)`, et
 * `x^-1`, `2^-1`, `a^-1`, `f(x)^-1` restent des puissances (défaut 4 compris :
 * `g(x) = f(x)^-1` puis `g(2)` répondait « Fonction inconnue : g »).
 *
 * Tous les gestes passent par les vrais chemins (`CalcDesk.submit`, `runInput`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { runInput } from '../calcul';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

// =============================================================================
// Décor
// =============================================================================

function deskWith(...lines: string[]): CalcDesk {
	const desk = new CalcDesk(new Atelier());
	for (const line of lines) desk.submit(line);
	return desk;
}

function last(desk: CalcDesk) {
	return desk.entries.at(-1)!;
}

/** Les quatre écritures que l'élève peut taper. */
const WRITINGS = ['f^-1', 'f^{-1}', 'f^(-1)', 'f⁻¹'];

// =============================================================================
// Une valeur
// =============================================================================

describe('f⁻¹(5) : la valeur de la réciproque, sans carte', () => {
	it.each(WRITINGS)('%s(5) avec f(x) = 2x + 3 → 1', (written) => {
		const desk = deskWith('f(x) = 2x+3', `${written}(5)`);
		expect(last(desk)).toMatchObject({ failed: false, text: '1' });
		// À la volée : aucune carte créée
		expect(desk.atelier.names).toEqual(['f']);
	});

	it('dans une expression : 2f⁻¹(5) + f(1) → 7', () => {
		const desk = deskWith('f(x) = 2x+3', '2f⁻¹(5) + f(1)');
		expect(last(desk)).toMatchObject({ failed: false, text: '7' });
	});

	it('la carte f⁻¹, si elle existe, donne le même résultat', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f', 'f^-1(5)');
		expect(last(desk)).toMatchObject({ failed: false, text: '1' });
		expect(desk.image('f^-1', '5')).toEqual({ text: '1', failed: false });
	});

	it('avec l’intervalle de f : x² sur [0 ; +∞[ → f⁻¹(9) = 3', () => {
		const desk = deskWith('f(x) = x^2 sur [0;+∞[', 'f⁻¹(9)');
		expect(last(desk)).toMatchObject({ failed: false, text: '3' });
	});

	it('avec un curseur : f(x) = a x + b, a = 2, b = 3 → f⁻¹(5) = 1', () => {
		const desk = deskWith('a = 2', 'b = 3', 'f(x) = a x + b', 'f⁻¹(5)');
		expect(last(desk)).toMatchObject({ failed: false, text: '1' });
	});

	it('écrit dans un champ de maths (LaTeX) : f^{-1}\\left(5\\right) → 1', () => {
		const session = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(session, 'f(x) = 2x+3');
		const result = runInput(session, 'f^{-1}\\left(5\\right)', 'mathfield');
		expect(result).toMatchObject({ kind: 'calcul', output: '1' });
	});
});

// =============================================================================
// Les commandes
// =============================================================================

describe('les commandes travaillent sur la réciproque', () => {
	// La même ligne que `.dériver` de sa formule (qui écrit aujourd'hui 2/4, constat hors lot)
	it('.dériver f⁻¹ avec f(x) = 2x + 3 : la dérivée de (x − 3)/2', () => {
		const desk = deskWith('f(x) = 2x+3', '.dériver f^-1', '.dériver (x-3)/2');
		const [reciprocal, formula] = desk.entries.slice(-2);
		expect(reciprocal.failed).toBe(false);
		expect(reciprocal.text).toBe(formula.text);
	});

	it('.résoudre f⁻¹(x) = 2 avec f(x) = 2x + 3 → x = 7', () => {
		const desk = deskWith('f(x) = 2x+3', '.résoudre f^(-1)(x)=2');
		expect(last(desk).failed).toBe(false);
		expect(last(desk).text).toContain('7');
	});

	it('.variations f⁻¹ sur son ensemble de départ (e^(2x+1) → ]0 ; +∞[)', () => {
		const desk = deskWith('f(x) = e^(2x+1)', '.variations f⁻¹');
		const line = last(desk);
		expect(line.failed).toBe(false);
		const written = [line.latex, ...(line.steps ?? []).map((s) => s.expressionLatex)].join(' ');
		expect(written).toContain(']0 ; +\\infty[');
	});

	it('.réciproque f⁻¹ : la réciproque de f⁻¹, c’est f', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f⁻¹');
		expect(last(desk)).toMatchObject({ failed: true, text: "La réciproque de f⁻¹, c'est f." });
	});
});

// =============================================================================
// Une fonction définie par f⁻¹
// =============================================================================

describe('g(x) = f⁻¹(x) : g suit f', () => {
	it('g(5) = 1, puis f modifiée : g suit', () => {
		const desk = deskWith('f(x) = 2x+3', 'g(x) = f⁻¹(x)', 'g(5)');
		expect(desk.atelier.get('g')?.status).toBe('ok');
		expect(last(desk)).toMatchObject({ failed: false, text: '1' });
		desk.submit('f(x) = 3x');
		desk.submit('g(6)');
		expect(last(desk)).toMatchObject({ failed: false, text: '2' });
	});

	it('f devenue non bijective : g passe en erreur avec le refus, puis revient', () => {
		const desk = deskWith('f(x) = 2x+3', 'g(x) = f^-1(x)', 'f(x) = x^2');
		const g = desk.atelier.get('g')!;
		expect(g.status).toBe('error');
		expect(g.message).toContain("n'est pas bijective");
		desk.submit('f(x) = x^3');
		expect(desk.atelier.get('g')?.status).toBe('ok');
	});

	it('renommer f en h : g cite h⁻¹', () => {
		const desk = deskWith('f(x) = 2x+3', 'g(x) = f⁻¹(x)');
		expect(desk.atelier.rename('f', 'h').ok).toBe(true);
		desk.submit('g(5)');
		expect(last(desk)).toMatchObject({ failed: false, text: '1' });
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('les refus', () => {
	it('f non bijective : le même refus que .réciproque f', () => {
		const desk = deskWith('f(x) = x^2', '.réciproque f');
		const expected = last(desk);
		desk.submit('f⁻¹(4)');
		expect(last(desk)).toMatchObject({
			failed: true,
			text: expected.text,
			formulas: true
		});
	});

	// Décision (5) de David : la vérité, sans proposer `.réciproque f sur …`
	it.each([
		['sin(x)', '[−π/2 ; π/2]', 'arcsin'],
		['cos(x)', '[0 ; π]', 'arccos'],
		['tan(x)', ']−π/2 ; π/2[', 'arctan']
	])('f(x) = %s : bijective sur %s, réciproque %s pas encore calculée', (definition, on, arc) => {
		const desk = deskWith(`f(x) = ${definition}`, '.réciproque f', 'f⁻¹(0.5)');
		const [command, value] = desk.entries.slice(-2);
		expect(command.failed).toBe(true);
		expect(command.text).toContain(`par exemple ${on}. Sa réciproque y est la fonction ${arc}`);
		expect(command.text).not.toContain('.réciproque');
		expect(value).toMatchObject({ failed: true, text: command.text });
	});

	it.each(['.variations f^-1', 'g(x) = f⁻¹(x)'])(
		'f non bijective, %s : le même refus, et rien n’est créé',
		(input) => {
			const desk = deskWith('f(x) = x^2', input);
			expect(last(desk).failed).toBe(true);
			expect(last(desk).text).toContain("n'est pas bijective");
			expect(desk.atelier.names).toEqual(['f']);
		}
	);

	it('hors de l’ensemble de départ : refusé comme f(5) hors intervalle', () => {
		const desk = deskWith('f(x) = sqrt(x+2)', 'f⁻¹(-1)');
		expect(last(desk)).toMatchObject({
			failed: true,
			text: "-1 n'est pas dans l'ensemble de définition de f⁻¹, [0 ; +∞[."
		});
	});

	it('a^-1 avec a une valeur : la puissance 1/a', () => {
		const desk = deskWith('a = 3', 'a^-1');
		// a n'est pas une fonction : a^-1 reste la puissance 1/3
		expect(last(desk)).toMatchObject({ failed: false, text: '1/3' });
	});
});

// =============================================================================
// Les puissances restent des puissances
// =============================================================================

describe('x^-1, 2^-1, a^-1, f(x)^-1 restent des puissances', () => {
	it.each([
		['x^-1', 'x^{-1}'],
		['2^-1', '1/2']
	])('%s → %s', (input, text) => {
		const desk = deskWith('f(x) = 2x+3', input);
		expect(last(desk)).toMatchObject({ failed: false, text });
	});

	it('1/f(x) et f(x)^-1 : l’inverse, jamais la réciproque', () => {
		const desk = deskWith('f(x) = 2x+3', '.simplifier f(x)^-1');
		expect(last(desk).failed).toBe(false);
		expect(last(desk).text).not.toContain('x - 3');
	});

	// Défaut 4 (constat du lot 3) : la définition ne se lisait pas
	it.each([
		['g(x) = f(x)^-1', 'g(2)', '1/7'],
		['g(x) = 1/f(x)', 'g(2)', '1/7'],
		['g(x) = x^-1', 'g(2)', '1/2'],
		['b = 2^-1', 'b', '1/2'],
		['g(x) = e^-x', 'g(0)', '1']
	])('%s puis %s → %s', (definition, call, text) => {
		const desk = deskWith('f(x) = 2x+3', definition);
		expect(desk.atelier.objects.every((o) => o.status === 'ok')).toBe(true);
		desk.submit(call);
		expect(last(desk)).toMatchObject({ failed: false, text });
	});
});

// =============================================================================
// Revue de la PR
// =============================================================================

describe('revue : argument hors du départ, noms à indice, définition, coût', () => {
	it.each(['f⁻¹((-1))', 'f^-1 (-1)', 'f⁻¹(g(2))'])(
		'%s avec f(x) = √(x + 2) : refusé, jamais −1',
		(input) => {
			const desk = deskWith('f(x) = sqrt(x+2)', 'g(x) = x-3', input);
			expect(last(desk).failed).toBe(true);
			expect(last(desk).text).toContain("n'est pas dans l'ensemble de définition de f⁻¹");
		}
	);

	it('dans un champ de maths : f^{-1}\\left(-1\\right) refusé aussi', () => {
		const session = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(session, 'f(x) = sqrt(x+2)');
		const result = runInput(session, 'f^{-1}\\left(-1\\right)', 'mathfield');
		expect(result.kind).toBe('refus');
	});

	it.each(['f_1^-1(5)', '.dériver f_1^-1'])('%s (nom à indice) : refus honnête', (input) => {
		const desk = deskWith('f_1(x) = 2x+3', input);
		expect(last(desk).failed).toBe(true);
		expect(last(desk).text).toContain('f_1⁻¹');
	});

	it('f^-1(x) = 5x : f⁻¹ se calcule, elle ne se définit pas', () => {
		const desk = deskWith('f(x) = 2x+3', 'f^-1(x) = 5x');
		expect(last(desk)).toMatchObject({
			failed: true,
			text: "f⁻¹ est la réciproque de f : elle se calcule, elle ne se définit pas. Pour l'obtenir : .réciproque f"
		});
	});

	it('g(x) = 2^-sin(x) : pas lue 2^(-s)·in(x)', () => {
		const desk = deskWith('g(x) = 2^-sin(x)');
		expect(desk.atelier.get('g')?.status).not.toBe('pending');
	});

	it('cinq réciproques citées : le calcul reste rapide', () => {
		const names = ['f', 'h', 'k', 'p', 'q'];
		const desk = deskWith(...names.map((n) => `${n}(x) = 2x+3`));
		const started = performance.now();
		['a', 'b', 'c', 'd', 'm'].forEach((g, i) => desk.submit(`${g}(x) = ${names[i]}⁻¹(x)`));
		desk.submit('f(x) = 3x');
		expect(performance.now() - started).toBeLessThan(3000);
		desk.submit('a(6)');
		expect(last(desk)).toMatchObject({ failed: false, text: '2' });
	});
});

// =============================================================================
// Revue ciblée de #1338
// =============================================================================

describe('revue ciblée : ensembles, exposants enchaînés, message de g', () => {
	it('f change d’ensemble : g(x) = f⁻¹(x) suit (B1)', () => {
		const desk = deskWith('f(x) = x^2 sur [0;+∞[', 'g(x) = f⁻¹(x)', 'g(4)');
		expect(last(desk)).toMatchObject({ failed: false, text: '2' });
		desk.submit('f(x) = x^2 sur ]-∞;0]');
		desk.submit('f⁻¹(4)');
		expect(last(desk)).toMatchObject({ failed: false, text: '-2' });
		desk.submit('g(4)');
		expect(last(desk)).toMatchObject({ failed: false, text: '-2' });
	});

	it.each(['e^-x^2', 'x^-1^2'])(
		'g(x) = %s : la carte ne lit pas autrement que Calcul (B2)',
		(body) => {
			const desk = deskWith(`g(x) = ${body}`);
			expect(desk.atelier.get('g')?.status).toBe('error');
		}
	);

	it('g citant f⁻¹, f non bijective : g(4) dit pourquoi, pas « Fonction inconnue »', () => {
		const desk = deskWith('f(x) = 2x+3', 'g(x) = f⁻¹(x)', 'f(x) = x^2', 'g(4)');
		expect(last(desk).failed).toBe(true);
		expect(last(desk).text).toContain("n'est pas bijective");
	});

	it('g(x) = f⁻¹(x) hérite de l’ensemble de départ de f⁻¹, pas de celui de f', () => {
		const desk = deskWith('f(x) = x^2+1 sur [0;+∞[', 'g(x) = f⁻¹(x)', 'g(5)');
		expect(last(desk)).toMatchObject({ failed: false, text: '2' });
		desk.submit('g(0.5)');
		expect(last(desk).failed).toBe(true);
	});
});
