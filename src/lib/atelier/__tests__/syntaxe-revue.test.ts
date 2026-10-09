/**
 * Revue de #962 (≈150 saisies) : résultats faux silencieux et refus
 * « pas su lire » des nouvelles écritures à mots-clés (2026-10-08).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult } from '../calcul';

const UNREADABLE = 'Je n’ai pas su lire';

function run(input: string, setup: readonly string[] = []): CalcResult {
	const s = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return runInput(s, input);
}

function latex(input: string, setup: readonly string[] = []): string {
	const r = run(input, setup);
	expect(r, input).toMatchObject({ kind: 'commande' });
	return r.kind === 'commande' ? (r.latex ?? '').replace(/\s/g, '') : '';
}

function output(input: string, setup: readonly string[] = []): string {
	const r = run(input, setup);
	expect(r, input).toMatchObject({ kind: 'commande' });
	return r.kind === 'commande' ? r.output : '';
}

function refusal(input: string, setup: readonly string[] = []): string {
	const r = run(input, setup);
	expect(r, input).toMatchObject({ kind: 'refus' });
	const message = r.kind === 'refus' ? r.message : '';
	expect(message, input).not.toContain(UNREADABLE);
	return message;
}

describe('bloquant 1 : identité / impossible avec « dans »', () => {
	it('x=x dans [0;1] : S = [0 ; 1]', () => {
		expect(latex('.résoudre x=x dans [0;1]')).toBe('S=\\left[0;1\\right]');
	});

	it('0=0 dans ]0;1] : S = ]0 ; 1]', () => {
		expect(latex('.résoudre 0=0 dans ]0;1]')).toBe('S=\\left]0;1\\right]');
	});

	it('x=x+1 dans [0;1] : S = ∅', () => {
		expect(latex('.résoudre x=x+1 dans [0;1]')).toBe('S=\\emptyset');
	});
});

describe('bloquant 2 : variable tapée ≠ lettre de la fonction', () => {
	it('f(t)=t^3, .dériver f pour x : 3x² (f lue en x, pas de réécriture)', () => {
		expect(latex('.dériver f pour x', ['f(t) = t^3'])).toBe('3x^2');
	});

	it('f(t)=t^3, .intégrer f de 0 à 2 pour x : 4', () => {
		expect(latex('.intégrer f de 0 à 2 pour x', ['f(t) = t^3'])).toBe('4');
	});

	it('f(t)=t^3, .dériver f pour t : 3t²', () => {
		expect(latex('.dériver f pour t', ['f(t) = t^3'])).toBe('3t^2');
	});
});

describe('virgule décimale dans les valeurs et les bornes', () => {
	it('.évaluer 2x en x=1,5 → 3', () => {
		expect(output('.évaluer 2x en x=1,5')).toContain('Result: 3');
	});

	it('.résoudre x^2=1/4 dans [0,1;1] → 1/2', () => {
		expect(latex('.résoudre x^2=1/4 dans [0,1;1]')).toBe('x=\\dfrac{1}{2}');
	});

	it('.intégrer x de 0 à 0,5 → 1/8', () => {
		expect(latex('.intégrer x de 0 à 0,5')).toBe('\\dfrac{1}{8}');
	});
});

describe('.évaluer : lettre de la fonction, refus clairs', () => {
	it('f(t)=t^2, .évaluer f en t=2 → 4', () => {
		expect(output('.évaluer f en t=2', ['f(t) = t^2'])).toContain('Result: 4');
	});

	it('.évaluer x^2 sans valeur : propose « en x=3 »', () => {
		expect(refusal('.évaluer x^2')).toContain('en x=');
	});

	it('.évaluer x^2+y en x=1 : il reste y', () => {
		expect(refusal('.évaluer x^2+y en x=1')).toContain('y');
	});

	it('.évaluer x^2+a en a=2 : il reste x', () => {
		expect(refusal('.évaluer x^2+a en a=2')).toContain('x');
	});

	it('.évaluer x^2 en t=3 : t absent', () => {
		expect(refusal('.évaluer x^2 en t=3')).toContain('t');
	});

	it('.évaluer 2x en x=a : la valeur doit être un nombre', () => {
		expect(refusal('.évaluer 2x en x=a')).toContain('nombre');
	});

	it('.évaluer 2+3 sans lettre : 5, comme avant', () => {
		expect(output('.évaluer 2+3')).toContain('Result: 5');
	});

	it('proposition sans « ; » résiduel', () => {
		expect(refusal('.évaluer x^2 ; x=3')).toContain('.évaluer x^2 en x=3');
	});
});

describe('.résoudre … dans : refus clairs', () => {
	it('pour t absent : refus clair', () => {
		expect(refusal('.résoudre x^2=4 pour t dans [0;3]')).toContain('t');
	});

	it('intervalle inversé', () => {
		expect(refusal('.résoudre x=1 dans [2;1]')).toContain('inversé');
	});
});

describe('.taylor : ambiguïté et point', () => {
	it('.taylor 2 x 3 : ambigu, la nouvelle forme proposée', () => {
		expect(refusal('.taylor 2 x 3')).toContain('.taylor 2 x ordre 3');
	});

	it('.taylor e^x ordre 3 en \\pi : refus clair', () => {
		expect(refusal('.taylor e^x ordre 3 en \\pi')).toContain('π');
	});

	it('.taylor e^x 3 (ancienne écriture) reste accepté', () => {
		expect(latex('.taylor e^x 3')).toContain('x^3');
	});
});
