/**
 * `.limite` dans l'atelier : la commande RÉPOND (PR 2 de `.limite`,
 * syntaxe tranchée par David le 2026-10-14, L1-L6). Les étapes (« Comment ? »)
 * viendront avec la PR 3.
 *
 * La réponse est une FORMULE : `\lim\limits_{x\to 1}\dfrac{x^2-1}{x-1} = 2` ;
 * jamais une valeur approchée présentée comme une limite.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { studentHelpText } from '../help';

function session(setup: readonly string[] = []): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	for (const line of setup) runInput(s, line);
	return s;
}

function commande(result: CalcResult) {
	if (result.kind !== 'commande') {
		throw new Error(`attendu une commande, reçu ${result.kind} ${JSON.stringify(result)}`);
	}
	return result;
}

function line(input: string, setup: readonly string[] = []) {
	return commande(runInput(session(setup), input));
}

function latex(input: string, setup: readonly string[] = []): string {
	return (line(input, setup).latex ?? '').replace(/\s/g, '');
}

function refusal(input: string, setup: readonly string[] = []): string {
	const result = runInput(session(setup), input);
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

describe('L1 et L5 : la réponse est une formule', () => {
	it('une fonction rationnelle en 1 : lim (x²−1)/(x−1) = 2', () => {
		expect(latex('.limite (x^2-1)/(x-1) en 1')).toBe('\\lim\\limits_{x\\to1}\\dfrac{x^2-1}{x-1}=2');
	});

	it('`en x=1` est toléré', () => {
		expect(latex('.limite (x^2-1)/(x-1) en x=1')).toBe(
			'\\lim\\limits_{x\\to1}\\dfrac{x^2-1}{x-1}=2'
		);
	});

	it('le texte de la ligne dit la même chose', () => {
		expect(line('.limite (x^2-1)/(x-1) en 1').output).toBe('lim x→1 (x^2-1)/(x-1) = 2');
	});

	it('sin(x)/x en 0 : 1', () => {
		const written = latex('.limite sin(x)/x en 0');
		expect(written.startsWith('\\lim\\limits_{x\\to0}\\dfrac{\\sin')).toBe(true);
		expect(written.endsWith('=1')).toBe(true);
	});

	it('une somme se met entre parenthèses, dans la lettre de l’expression', () => {
		expect(latex('.limite t^2+1 en 2')).toBe('\\lim\\limits_{t\\to2}\\left(t^2+1\\right)=5');
	});

	it('valeur exacte : e et non exp(1)', () => {
		const written = latex('.limite (1+1/x)^x en +∞');
		expect(written).not.toContain('\\exp\\left');
		expect(written.endsWith('=\\exponentialE')).toBe(true);
	});

	it('valeur exacte : √2', () => {
		expect(latex('.limite sqrt(x+2) en 0').endsWith('=\\sqrt{2}')).toBe(true);
	});

	it('la virgule décimale : en 0,5', () => {
		const written = latex('.limite x^2 en 0,5');
		expect(written).toContain('\\to0{,}5');
		expect(written.endsWith('=\\dfrac{1}{4}')).toBe(true);
	});

	it('une valeur de l’atelier comme point : en a, sans parenthèses', () => {
		expect(latex('.limite 1/x en a', ['a = 2'])).toBe(
			'\\lim\\limits_{x\\to2}\\dfrac{1}{x}=\\dfrac{1}{2}'
		);
	});

	it('une valeur de l’atelier dans l’expression', () => {
		expect(latex('.limite a x en 1', ['a = 3']).endsWith('=3')).toBe(true);
	});
});

describe('L3 : l’infini', () => {
	it('e^x en −∞ : 0', () => {
		const written = latex('.limite e^x en -∞');
		expect(written.startsWith('\\lim\\limits_{x\\to-\\infty}')).toBe(true);
		expect(written.endsWith('=0')).toBe(true);
	});

	it.each(['+∞', '+inf', '∞', 'inf', '+\\infty'])('1/x en %s : 0, en +∞', (point) => {
		expect(latex(`.limite 1/x en ${point}`)).toBe('\\lim\\limits_{x\\to+\\infty}\\dfrac{1}{x}=0');
	});

	it('-inf : −∞', () => {
		expect(latex('.limite x^3 en -inf')).toBe('\\lim\\limits_{x\\to-\\infty}x^3=-\\infty');
	});
});

describe('L2 : le côté', () => {
	it.each(['0+', '0^+', '0^{+}', '0 à droite', '0 a droite'])('1/x en %s : +∞', (point) => {
		expect(latex(`.limite 1/x en ${point}`)).toBe('\\lim\\limits_{x\\to0^+}\\dfrac{1}{x}=+\\infty');
	});

	it.each(['0-', '0^-', '0 à gauche'])('1/x en %s : −∞', (point) => {
		expect(latex(`.limite 1/x en ${point}`)).toBe('\\lim\\limits_{x\\to0^-}\\dfrac{1}{x}=-\\infty');
	});

	it('un point négatif n’est pas un côté : en -1', () => {
		expect(latex('.limite x^2 en -1')).toBe('\\lim\\limits_{x\\to-1}x^2=1');
	});

	it('pas de côté à l’infini', () => {
		expect(refusal('.limite 1/x en +∞ à droite')).toMatch(/côté/);
	});
});

describe('L4 : sans côté, les deux limites diffèrent', () => {
	it('1/x en 0 : pas de limite, à gauche −∞, à droite +∞', () => {
		const result = line('.limite 1/x en 0');
		expect(result.output).toBe('Pas de limite en 0 : à gauche -∞, à droite +∞.');
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			'\\text{Pasdelimiteen}0\\text{:àgauche}-\\infty\\text{,àdroite}+\\infty'
		);
	});

	it('|x|/x en 0 : des valeurs finies', () => {
		expect(line('.limite abs(x)/x en 0').output).toBe(
			'Pas de limite en 0 : à gauche -1, à droite 1.'
		);
	});
});

describe('L6 : une fonction de l’atelier garde son nom', () => {
	it('.limite f en +∞ : lim f(x) = +∞', () => {
		expect(latex('.limite f en +∞', ['f(x) = x^2+1'])).toBe(
			'\\lim\\limits_{x\\to+\\infty}f(x)=+\\infty'
		);
	});

	it('f(x) tapé avec sa variable', () => {
		expect(latex('.limite f(x) en 2', ['f(x) = x^2+1'])).toBe('\\lim\\limits_{x\\to2}f(x)=5');
	});

	it('dans sa lettre : f(t) = 1/t, .limite f en +inf', () => {
		expect(latex('.limite f en +inf', ['f(t) = 1/t'])).toBe('\\lim\\limits_{t\\to+\\infty}f(t)=0');
	});
});

describe('ce que le moteur ne sait pas', () => {
	it('sin x en +∞ : « je ne sais pas », sans formule', () => {
		const result = line('.limite sin(x) en +∞');
		expect(result.output).toBe('Je ne sais pas calculer cette limite.');
		expect(result.latex).toBeUndefined();
	});
});

describe('les erreurs de saisie', () => {
	it('sans `en` : le message montre l’écriture', () => {
		expect(refusal('.limite 1/x')).toBe('Il manque le point : .limite 1/x en 0, par exemple.');
	});

	it('sans rien', () => {
		expect(refusal('.limite')).toMatch(/\.limite .* en /);
	});

	it('`en` sans point', () => {
		expect(refusal('.limite 1/x en')).toBe('Il manque le point : .limite 1/x en 0, par exemple.');
	});

	it('un point qui n’est pas un nombre', () => {
		expect(refusal('.limite 1/x en y')).toMatch(/point/);
		expect(refusal('.limite 1/x en (2')).toMatch(/point/);
	});

	it('plusieurs lettres sans x : la variable s’écrit après en', () => {
		expect(refusal('.limite a t en 1')).toMatch(/en t=1/);
	});
});

describe('l’aide', () => {
	it('.aide montre .limite', () => {
		const help = studentHelpText(new WebReplEngine());
		expect(help).toContain('.limite (x^2-1)/(x-1) en 1');
		expect(help).toContain('.limite 1/x en 0+');
	});

	it('sans accent ni majuscule : .limit (nom moteur) aussi', () => {
		expect(latex('.limit 1/x en +∞')).toBe('\\lim\\limits_{x\\to+\\infty}\\dfrac{1}{x}=0');
	});
});
