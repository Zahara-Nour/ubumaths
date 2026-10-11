/**
 * Syntaxe des commandes de Calcul par mots-clés (décisions de David,
 * 2026-10-08 — `docs/systeme/atelier-syntaxe.md`).
 *
 * L'expression s'arrête au PREMIER mot-clé ; ordre des mots-clés libre ;
 * `à` s'écrit aussi `a` ; une borne est un seul bloc sans espace.
 * Tests de RÉSULTAT, par `runInput` : la valeur rendue, pas la lecture.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function run(input: string, setup: readonly string[] = []): CalcResult {
	const s = session();
	for (const line of setup) runInput(s, line);
	return runInput(s, input);
}

/** Le LaTeX d'une réponse, ou l'échec du test. */
function latex(input: string, setup: readonly string[] = []): string | undefined {
	const outcome = run(input, setup);
	expect(outcome, input).toMatchObject({ kind: 'commande' });
	return outcome.kind === 'commande' ? outcome.latex : undefined;
}

function output(input: string, setup: readonly string[] = []): string {
	const outcome = run(input, setup);
	expect(outcome, input).toMatchObject({ kind: 'commande' });
	return outcome.kind === 'commande' ? outcome.output : '';
}

function refusal(input: string, setup: readonly string[] = []): string {
	const outcome = run(input, setup);
	expect(outcome, input).toMatchObject({ kind: 'refus' });
	return outcome.kind === 'refus' ? outcome.message : '';
}

describe('.intégrer EXPR de A à B', () => {
	it('x^2 de 0 à 1 vaut 1/3', () => {
		expect(latex('.intégrer x^2 de 0 à 1')).toBe('\\dfrac{1}{3}');
	});

	it('sans accents : .integrer x de 0 a 1 vaut 1/2', () => {
		expect(latex('.integrer x de 0 a 1')).toBe('\\dfrac{1}{2}');
	});

	it('une borne fraction : sqrt(x) de 0 à 1/4 vaut 1/12', () => {
		expect(latex('.intégrer sqrt(x) de 0 à 1/4')).toBe('\\dfrac{1}{12}');
	});

	it('une borne lettre : x de 3 à a', () => {
		expect(latex('.intégrer x de 3 à a')).toBe(latex('.intégrer x de 3 a a'));
		expect(latex('.intégrer x de 3 à a')?.replace(/\s/g, '')).toContain('a^2');
	});

	it('de 0 a a : de 0 à a (la borne a, pas le mot-clé)', () => {
		expect(latex('.intégrer 3x^2 de 0 a a')?.replace(/\s/g, '')).toBe('a^3');
	});

	it('de a a b : de a à b', () => {
		expect(latex('.intégrer 1 de a a b')?.replace(/\s/g, '')).toMatch(/b-a|-a\+b/);
	});

	it('pour t, avant ou après les bornes : même valeur', () => {
		const after = latex('.intégrer a*t^2 de 0 à 1 pour t');
		expect(after?.replace(/\s/g, '')).toMatch(/\\dfrac\{1\}\{3\}a|\\dfrac\{a\}\{3\}/);
		expect(latex('.intégrer a*t^2 pour t de 0 à 1')).toBe(after);
	});

	it('une borne est un objet de l’atelier : a = 2, de 0 à a vaut 8/3', () => {
		expect(latex('.intégrer x^2 de 0 à a', ['a = 2'])).toBe('\\dfrac{8}{3}');
		expect(latex('.intégrer x^2 de 0 a a', ['a = 2'])).toBe('\\dfrac{8}{3}');
	});

	it('primitive avec pour t', () => {
		expect(latex('.intégrer a t pour t')?.replace(/\s/g, '')).toContain('t^2');
	});

	it('« de » sans « à » : refus qui montre la forme', () => {
		expect(refusal('.intégrer x de 0 1')).toContain('de 0 à');
	});
});

describe('.taylor EXPR ordre N [en A] : ordre libre', () => {
	it('ordre 3 en 1 = en 1 ordre 3', () => {
		const a = latex('.taylor e^x ordre 3 en 1');
		expect(a).toBeDefined();
		expect(latex('.taylor e^x en 1 ordre 3')).toBe(a);
		// même chose que l'ancienne écriture positionnelle
		expect(latex('.taylor e^x 3 1')).toBe(a);
	});

	it('ordre seul : point 0', () => {
		expect(latex('.taylor sin(x) ordre 5')).toBe(latex('.taylor sin(x) 5 0'));
	});

	it('pour t, n’importe où', () => {
		expect(latex('.taylor e^t ordre 2 pour t')).toBe('1 + t + \\dfrac{1}{2} t^2');
		expect(latex('.taylor e^t pour t ordre 2')).toBe('1 + t + \\dfrac{1}{2} t^2');
	});
});

describe('.évaluer EXPR en VAR=VALEUR (ou pour)', () => {
	it('x^2 en x=3 vaut 9', () => {
		expect(output('.évaluer x^2 en x=3')).toContain('9');
		expect(output('.evaluer x^2 pour x=3')).toContain('9');
		expect(output('.évaluer x^2 en x = 3')).toContain('9');
	});

	it('ne touche pas aux autres lettres : a x en x=2', () => {
		expect(output('.évaluer x^2+1 en x=-2')).toContain('5');
	});

	it('ancienne écriture x^2 x=3 : refus qui propose la nouvelle forme', () => {
		expect(refusal('.évaluer x^2 x=3')).toContain('.évaluer x^2 en x=3');
	});
});

describe('.équivalent EXPR et EXPR', () => {
	it('(x+1)^2 et x^2+2x+1 : équivalentes', () => {
		expect(output('.équivalent (x+1)^2 et x^2+2x+1')).toMatch(/true|équivalent/i);
	});

	it('x+1 et x+2 : pas équivalentes', () => {
		expect(output('.equivalent x+1 et x+2')).toMatch(/false|pas/i);
	});

	it('sans « et » : refus qui montre la forme', () => {
		expect(refusal('.équivalent (x+1)^2 x^2+2x+1')).toContain(' et ');
	});
});

describe('.dériver / .résoudre : variable devinée ou exigée', () => {
	it('une seule lettre : elle (t^3 → 3t^2)', () => {
		expect(latex('.dériver t^3')?.replace(/\s/g, '')).toBe('3t^2');
	});

	it('x présent : x reste la variable (a x^2 → 2ax)', () => {
		expect(latex('.dériver a x^2')?.replace(/\s/g, '')).toBe('2ax');
	});

	it('plusieurs lettres sans x : « pour » exigé, message clair', () => {
		expect(refusal('.dériver a t^2')).toContain('pour');
	});

	it('pour t : a t^2 → 2at', () => {
		expect(latex('.dériver a t^2 pour t')?.replace(/\s/g, '')).toBe('2at');
		// `; t` reste synonyme
		expect(latex('.dériver a t^2 ; t')?.replace(/\s/g, '')).toBe('2at');
	});

	it('.résoudre 2t+1=7 : t deviné, t = 3', () => {
		expect(latex('.résoudre 2t+1=7')?.replace(/\s/g, '')).toContain('t=3');
	});

	it('.résoudre a t = 3 pour t', () => {
		expect(latex('.résoudre 2 t = 3 pour t')?.replace(/\s/g, '')).toMatch(/t=\\dfrac\{3\}\{2\}/);
	});
});

describe('Transition : ancienne écriture', () => {
	it('sans ambiguïté : .intégrer x^2 0 1 accepté', () => {
		expect(latex('.intégrer x^2 0 1')).toBe('\\dfrac{1}{3}');
	});

	it('sans ambiguïté : .taylor sin(x) 5 0 accepté', () => {
		expect(latex('.taylor sin(x) 5 0')).toBe('x - \\dfrac{1}{6} x^3 + \\dfrac{1}{120} x^5');
	});

	it('ambiguë : .intégrer x 3 a refusé, la nouvelle forme proposée', () => {
		expect(refusal('.intégrer x 3 a')).toContain('.intégrer x de 3 à a');
	});

	it('rejeu d’un historique ancien : .intégrer t^2 ; t 0 1', () => {
		expect(latex('.intégrer t^2 ; t 0 1')).toBe('\\dfrac{1}{3}');
	});
});

describe('.ajustement X1 ; X2 … : Y1 ; Y2 … en x = 8', () => {
	it('nouveau format : points-virgules et « en »', () => {
		const text = output('.ajustement 1 ; 2 ; 3 ; 4 ; 5 ; 6 : 12 ; 15 ; 19 ; 22 ; 27 ; 30 en x = 8');
		expect(text).toContain('Point moyen : G(3,5 ; 20,833)');
		expect(text).toContain('Pour x = 8 : y ≈ 37,419 (extrapolation)');
	});

	it('nouveau format : virgules décimales', () => {
		const text = output('.ajustement 0 ; 1 ; 2 : 1,5 ; 2,5 ; 3,5 en x = 3');
		expect(text).toContain('Pour x = 3 : y');
		expect(text).toMatch(/4,5/);
	});

	// Décision de David (2026-10-09) : plusieurs virgules entre chiffres sans
	// « ; » sont refusées avec la forme corrigée — jamais une lecture devinée
	it('ancien format sans décimale : refus qui propose les points-virgules', () => {
		const outcome = run('.ajustement 1,2,3 : 12,15,19 ; x = 8');
		expect(outcome).toEqual({
			kind: 'refus',
			message:
				'Pour séparer des valeurs, utilise « ; » : .ajustement 1 ; 2 ; 3 : 12 ; 15 ; 19 ; x = 8'
		});
	});

	it('ancien format avec une décimale : refus qui propose les points-virgules', () => {
		// Le moteur répond « Erreur : … » (comme toute erreur de `.ajustement`)
		const outcome = run('.ajustement 0,1,2 : 1.5,2.5,3.5');
		const text =
			outcome.kind === 'refus'
				? outcome.message
				: outcome.kind === 'commande'
					? outcome.output
					: '';
		expect(text).toContain('.ajustement 0 ; 1 ; 2 : 1,5 ; 2,5 ; 3,5');
	});
});

describe('.résoudre … dans INTERVALLE : ordre libre', () => {
	it('sin(x)=0 dans [0;2\\pi] : 0, π, 2π', () => {
		const text = latex('.résoudre sin(x)=0 dans [0;2\\pi]')?.replace(/\s/g, '');
		expect(text).toBe('S=\\left\\{0\\,;\\,\\pi\\,;\\,2\\pi\\right\\}');
	});

	it('pour t avant ou après dans : même réponse', () => {
		const a = latex('.résoudre sin(t)=0 pour t dans [0;2\\pi]');
		expect(a?.replace(/\s/g, '')).toContain('2\\pi');
		expect(latex('.resoudre sin(t)=0 dans [0;2\\pi] pour t')).toBe(a);
	});

	it('intervalle ouvert : ]0;2\\pi[ ne garde que π', () => {
		expect(latex('.résoudre sin(x)=0 dans ]0;2\\pi[')?.replace(/\s/g, '')).toBe('x=\\pi');
	});

	it('x^2=4 dans [0;5] : x = 2', () => {
		expect(latex('.résoudre x^2=4 dans [0;5]')?.replace(/\s/g, '')).toBe('x=2');
	});
});
