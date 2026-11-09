/**
 * `.résoudre` : équations trigonométriques d'argument fractionnaire, équations
 * en aˣ par changement de variable, et `P(X ⩽ 3)` tapé seul (retours du
 * 2026-10-09, mesurés sur main avec `runInput`).
 *
 * ⚠️ Réponse FAUSSE relevée : `.résoudre sin(x/3)=0` affichait
 * « x = 0 ou x = 3π », sans « + 6kπ » — la période 2π/(1/3) était calculée
 * en flottant (6.000000000000001·π) et refusée par l'écriture LaTeX.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** La réponse d'une commande, LaTeX sans espaces et texte. */
function solved(input: string): { latex: string; output: string } {
	const result = runInput(session(), input);
	expect(result.kind, JSON.stringify(result)).toBe('commande');
	if (result.kind !== 'commande') return { latex: '', output: '' };
	return { latex: (result.latex ?? '').replace(/\s/g, ''), output: result.output };
}

/** Dernière ligne non vide : la conclusion du texte. */
function conclusion(output: string): string {
	const lines = output.split('\n').filter((l) => l.trim() !== '');
	return lines[lines.length - 1].trim();
}

const Z = ',\\;k\\in\\mathbb{Z}';

describe('équations trigonométriques : la période n’est jamais perdue', () => {
	it.each([
		['sin(x/3)=0', `S=\\left\\{3k\\pi${Z}\\right\\}`],
		['cos(x/3)=1/2', `S=\\left\\{-\\pi+6k\\pi\\,;\\,\\pi+6k\\pi${Z}\\right\\}`],
		['sin(x/2)=1', `S=\\left\\{\\pi+4k\\pi${Z}\\right\\}`],
		['tan(x/3)=1', `S=\\left\\{\\dfrac{3\\pi}{4}+3k\\pi${Z}\\right\\}`],
		['cos(3x)=0', `S=\\left\\{\\dfrac{\\pi}{6}+\\dfrac{k\\pi}{3}${Z}\\right\\}`],
		['sin(\\pi x)=0', `S=\\left\\{k${Z}\\right\\}`],
		['sin(x)=0', `S=\\left\\{k\\pi${Z}\\right\\}`],
		[
			'sin(2x)=1/2',
			`S=\\left\\{\\dfrac{\\pi}{12}+k\\pi\\,;\\,\\dfrac{5\\pi}{12}+k\\pi${Z}\\right\\}`
		]
	])('.résoudre %s → %s', (equation, expected) => {
		expect(solved(`.résoudre ${equation}`).latex).toBe(expected);
	});

	it.each([
		['sin(x/3)=0', '3k\\pi'],
		['cos(x/3)=1/2', '6k\\pi'],
		['sin(2x)=1/2', 'k\\pi'],
		['sin(\\pi x)=0', 'S = {k, k']
	])('le texte de %s dit aussi la période (%s) et k ∈ ℤ', (equation, term) => {
		const text = conclusion(solved(`.résoudre ${equation}`).output);
		expect(text).toContain(term);
		expect(text).toContain('k ∈ ℤ');
	});
});

describe('équations en aˣ : changement de variable X = aˣ', () => {
	it.each([
		['4^x-3*2^x+2=0', 'S=\\left\\{0\\,;\\,1\\right\\}'],
		['9^x-4*3^x+3=0', 'S=\\left\\{0\\,;\\,1\\right\\}'],
		['4^x-2^x-2=0', 'S=\\left\\{1\\right\\}'],
		['2^(2x)-5*2^x+4=0', 'S=\\left\\{0\\,;\\,2\\right\\}'],
		['8^x-2^x=0', 'S=\\left\\{0\\right\\}']
	])('.résoudre %s → %s', (equation, expected) => {
		expect(solved(`.résoudre ${equation}`).latex).toBe(expected);
	});

	it('la base e reste résolue (x = 0 ou ln 2)', () => {
		expect(solved('.résoudre e^(2x)-3e^x+2=0').latex).toBe(
			'S=\\left\\{0\\,;\\,\\ln\\left(2\\right)\\right\\}'
		);
	});

	it('des bases sans lien (2ˣ et 3ˣ) : refus ou x = 0, jamais une substitution fausse', () => {
		const result = runInput(session(), '.résoudre 2^x+3^x-2=0');
		const answer = result.kind === 'commande' ? (result.latex ?? '').replace(/\s/g, '') : 'refus';
		expect(['refus', 'x=0']).toContain(answer);
	});
});

describe('P(X ⩽ 3) tapé seul : jamais un message de syntaxe hors sujet', () => {
	// Depuis le 2026-10-09, l'atelier RETIENT la loi (lois-retenues.test.ts) :
	// après `.binomiale X 10 0,3`, la probabilité se calcule au lieu d'être refusée
	it.each(['P(X ⩽ 3)', 'P(X\\leqslant 3)', 'P(X <= 3)'])(
		'%s après .binomiale X 10 0,3 : calculée',
		(input) => {
			const s = session();
			runInput(s, '.binomiale X 10 0,3');
			const result = runInput(s, input);
			expect(result.kind, JSON.stringify(result)).toBe('commande');
			expect(JSON.stringify(result)).toContain('≈ 0,650');
			expect(JSON.stringify(result)).not.toContain('facteur');
		}
	);

	it('la probabilité dans la ligne de la loi est bien calculée (0,6496 ≈ 0,650)', () => {
		const result = runInput(session(), '.binomiale X 10 0,3 P(X ⩽ 3)');
		expect(result.kind).toBe('commande');
		expect(JSON.stringify(result)).toContain('P(X ⩽ 3) ≈ 0,650');
	});

	it.each(['P(X<3)', 'P(X⩾3)', 'P(X>3)', 'P(2⩽X⩽5)', 'P(X ≤ 3)', 'P(X >= 3)', 'P(X\\leq 3)'])(
		'%s sans loi : le refus dit comment la définir',
		(input) => {
			const result = runInput(session(), input);
			expect(result.kind === 'refus' && result.message).toContain('X n’a pas de loi');
		}
	);

	it.each(['P(2)', 'P(x+1)', 'P(x)<3'])('%s n’est pas un événement : pas ce refus', (input) => {
		const result = runInput(session(), input);
		expect(result.kind === 'refus' ? result.message : '').not.toContain('pas de loi');
	});
});

describe('revue : coefficient négatif dans l’argument (famille conservée)', () => {
	it.each([
		['sin(-x/3)=0', `S=\\left\\{3k\\pi${Z}\\right\\}`],
		[
			'sin(-x)=1/2',
			`S=\\left\\{-\\dfrac{5\\pi}{6}+2k\\pi\\,;\\,-\\dfrac{\\pi}{6}+2k\\pi${Z}\\right\\}`
		],
		['cos(-2x)=0', `S=\\left\\{\\dfrac{\\pi}{4}+\\dfrac{k\\pi}{2}${Z}\\right\\}`],
		['tan(-x)=1', `S=\\left\\{-\\dfrac{\\pi}{4}+k\\pi${Z}\\right\\}`]
	])('.résoudre %s → %s', (equation, expected) => {
		expect(solved(`.résoudre ${equation}`).latex).toBe(expected);
	});
});

describe('revue : exposants affines de même pente (2^(x+1) = 2·2^x, 2^(−x) = 1/X)', () => {
	it.each([
		['2^x+2^(x+1)=12', 'S=\\left\\{2\\right\\}'],
		['2^(-x)+2^x=2', 'S=\\left\\{0\\right\\}'],
		['3^(x+1)-3^x=18', 'S=\\left\\{2\\right\\}'],
		['2^(x+2)=32', 'S=\\left\\{3\\right\\}'],
		['2^(x+1)+2^(x+2)=24', 'S=\\left\\{2\\right\\}'],
		['4^x-2^(x+1)-8=0', 'S=\\left\\{2\\right\\}']
	])('.résoudre %s → %s', (equation, expected) => {
		expect(solved(`.résoudre ${equation}`).latex).toBe(expected);
	});
});

describe('revue : sin x = ±cos x se ramène à tan x = ±1', () => {
	it.each([
		['sin(x)=cos(x)', `S=\\left\\{\\dfrac{\\pi}{4}+k\\pi${Z}\\right\\}`],
		['sin(x)=-cos(x)', `S=\\left\\{-\\dfrac{\\pi}{4}+k\\pi${Z}\\right\\}`]
	])('.résoudre %s → %s', (equation, expected) => {
		expect(solved(`.résoudre ${equation}`).latex).toBe(expected);
	});

	it('cos(2x) = cos(x) : réponse juste (2kπ/3) ou refus propre', () => {
		const result = runInput(session(), '.résoudre cos(2x)=cos(x)');
		if (result.kind === 'refus') {
			expect(result.message).toBe('Je ne sais pas encore résoudre cette équation.');
		} else {
			expect(result.kind === 'commande' && result.latex?.replace(/\s/g, '')).toBe(
				`S=\\left\\{\\dfrac{2k\\pi}{3}${Z}\\right\\}`
			);
		}
	});
});

describe('revue : un refus du moteur reste un refus du moteur avec « dans »', () => {
	it('x^5+x+1=0 dans [0 ; 2π] : « Je ne sais pas encore résoudre cette équation. »', () => {
		expect(runInput(session(), '.résoudre x^5+x+1=0 dans [0;2\\pi]')).toMatchObject({
			kind: 'refus',
			message: 'Je ne sais pas encore résoudre cette équation.'
		});
	});
});

describe('revue : la période s’écrit comme les solutions', () => {
	it('texte : kπ/2 (pas {1/2}kπ), comme \\pi/4', () => {
		const text = conclusion(solved('.résoudre cos(-2x)=0').output);
		expect(text).toBe('S = {\\pi/4 + k\\pi/2, k ∈ ℤ}');
	});

	it('texte : {2k\\pi}/3', () => {
		expect(conclusion(solved('.résoudre sin(3x)=1').output)).toBe(
			'S = {\\pi/6 + {2k\\pi}/3, k ∈ ℤ}'
		);
	});
});
