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
	it('x sin x en +∞ : « je ne sais pas », sans formule', () => {
		const result = line('.limite x sin(x) en +∞');
		expect(result.output).toBe('Je ne sais pas calculer cette limite.');
		expect(result.latex).toBeUndefined();
	});

	// Le moteur conclut l'oscillation (noLimitReason « oscillation ») : plus de « je ne sais pas ».
	it('sin x en +∞ : pas de limite, avec sa raison (R3)', () => {
		expect(line('.limite sin(x) en +∞').output).toMatch(/^Pas de limite en \+∞ : /);
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

describe('revue : une fonction citée seule, dans SA lettre', () => {
	it('f(t) avec f(t) = 1/t : calcul en t', () => {
		expect(latex('.limite f(t) en 0+', ['f(t) = 1/t'])).toBe(
			'\\lim\\limits_{t\\to0^+}f(t)=+\\infty'
		);
	});

	it('f(t) avec f en x, sans ensemble : calcul en t, forme tapée', () => {
		expect(latex('.limite f(t) en 2', ['f(x) = x^2+1'])).toBe(
			'\\lim\\limits_{t\\to2}f\\left(t\\right)=5'
		);
	});

	it('f(2x) sans ensemble : la composée se calcule', () => {
		expect(latex('.limite f(2x) en 1', ['f(x) = x^2+1'])).toBe(
			'\\lim\\limits_{x\\to1}f\\left(2x\\right)=5'
		);
		expect(latex('.limite f(2x)+1 en 1', ['f(x) = x^2+1']).endsWith('=6')).toBe(true);
	});

	it('f(2x) avec un ensemble choisi : refus de la composée', () => {
		expect(refusal('.limite f(2x) en 1', ['f(x) = x^2 sur [0;+∞['])).toMatch(/2x/);
	});

	it("f' : f'(x)", () => {
		expect(latex(".limite f' en 2", ['f(x) = x^3'])).toBe("\\lim\\limits_{x\\to2}f'(x)=12");
	});

	it('le refus de lettre garde le côté', () => {
		expect(refusal('.limite g en x=0+', ['g(t) = t'])).toContain('en t=0+');
	});
});

describe('revue : un point fractionnaire', () => {
	it('en 1/2 : \\frac', () => {
		expect(latex('.limite x^2 en 1/2')).toBe('\\lim\\limits_{x\\to\\frac{1}{2}}x^2=\\dfrac{1}{4}');
		expect(line('.limite x^2 en 1/2').output).toBe('lim x→1/2 x^2 = 1/4');
	});

	it('en 1/2+ : le côté sans ambiguïté', () => {
		expect(latex('.limite x^2 en 1/2+')).toBe(
			'\\lim\\limits_{x\\to{\\tfrac{1}{2}}^+}x^2=\\dfrac{1}{4}'
		);
	});
});

describe('revue : les gardes de l’atelier', () => {
	const onHalfLine = ['f(x) = x^2 sur [0;+∞['];

	it('hors de l’ensemble de f : refus, comme .évaluer', () => {
		expect(refusal('.limite f en -1', onHalfLine)).toBe(
			"-1 n'est pas dans l'ensemble de définition de f, [0 ; +∞[."
		);
	});

	it('au bord : accepté, du côté intérieur', () => {
		expect(latex('.limite f en 0', onHalfLine)).toBe('\\lim\\limits_{x\\to0^+}f(x)=0');
	});

	it('au bord, du côté extérieur : refus', () => {
		expect(refusal('.limite f en 0-', onHalfLine)).toMatch(/gauche/);
	});

	it('vers −∞ hors de l’ensemble : refus ; vers +∞ : accepté', () => {
		expect(refusal('.limite f en -∞', onHalfLine)).toMatch(/ensemble/);
		expect(latex('.limite f en +∞', onHalfLine)).toBe('\\lim\\limits_{x\\to+\\infty}f(x)=+\\infty');
	});

	it('une liste citée : refus de l’atelier', () => {
		expect(refusal('.limite L en 0', ['L = 1 ; 2 ; 3'])).toBe('L est une liste : utilise .stats L');
	});
});

describe('revue : les suites', () => {
	it.each(['u', 'u_n', 'u(n)'])('.limite %s en +∞ : lim u_n = 0', (typed) => {
		expect(latex(`.limite ${typed} en +∞`, ['u(n) = 1/n'])).toBe(
			'\\lim\\limits_{n\\to+\\infty}u_n=0'
		);
	});

	it('une suite ailleurs qu’en +∞ : refus', () => {
		expect(refusal('.limite u en 3', ['u(n) = 1/n'])).toMatch(/\+∞/);
	});
});

describe('Q1 : un côté tapé, la raison du « pas de limite » s’écrit aussi', () => {
	it('sqrt(-x) en 0+ : pas définie à droite de 0', () => {
		const result = line('.limite sqrt(-x) en 0+');
		expect(result.output).toBe(
			"Pas de limite en 0+ : l'expression n'est pas définie à droite de 0."
		);
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}0^+\\text{:l'expressionn'estpasdéfinieàdroitede}0"
		);
	});

	it('sqrt(x) en 0- : pas définie à gauche de 0', () => {
		expect(line('.limite sqrt(x) en 0-').output).toBe(
			"Pas de limite en 0- : l'expression n'est pas définie à gauche de 0."
		);
	});

	it('sin(1/x) en 0+ : oscille', () => {
		const result = line('.limite sin(1/x) en 0+');
		expect(result.output).toBe(
			"Pas de limite en 0+ : l'expression oscille sans se rapprocher d'aucune valeur."
		);
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}0^+\\text{:l'expressionoscillesansserapprocherd'aucunevaleur}"
		);
	});

	it('une fonction citée : f en maths, hors de \\text', () => {
		const result = line('.limite f en 0+', ['f(x) = sqrt(-x)']);
		expect(result.output).toBe("Pas de limite en 0+ : f n'est pas définie à droite de 0.");
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}0^+\\text{:}f\\text{n'estpasdéfinieàdroitede}0"
		);
	});
});

describe('fonctions usuelles sans parenthèses : refus, comme les autres commandes', () => {
	it.each([
		['.limite ln x en 0', '« ln x » : écris ln(x) avec des parenthèses.'],
		['.limite sin x en 0', '« sin x » : écris sin(x) avec des parenthèses.'],
		['.limite cos x en 0', '« cos x » : écris cos(x) avec des parenthèses.'],
		['.limite sqrt x en 4', '« sqrt x » : écris sqrt(x) avec des parenthèses.'],
		['.limite exp x en 0', '« exp x » : écris exp(x) avec des parenthèses.']
	])('%s', (input, message) => {
		expect(refusal(input)).toBe(message);
	});

	it('e^x se lit bien : 1 en 0', () => {
		expect(latex('.limite e^x en 0')).toBe('\\lim\\limits_{x\\to0}\\exponentialE^x=1');
	});
});

describe('texte de la ligne lisible', () => {
	it('e^{1/x} en 0- : e^(1/x), jamais e^{1:/x}', () => {
		expect(line('.limite e^{1/x} en 0^-').output).toBe('lim x→0- e^(1/x) = 0');
	});

	it.each([
		['.limite 1/(x-1)^2 en 1', 'lim x→1 1/(x-1)^2 = +∞'],
		['.limite e^x/x^2 en +inf', 'lim x→+∞ e^x/x^2 = +∞'],
		['.limite (x+2)/x^2 en 0', 'lim x→0 (x+2)/x^2 = +∞'],
		['.limite 1/(2x) en 0+', 'lim x→0+ 1/(2x) = +∞']
	])('%s : sans accolades, parenthèses où le sens l’exige', (input, text) => {
		expect(line(input).output).toBe(text);
	});

	it('e^x garde son écriture', () => {
		expect(line('.limite e^x en 0').output).toBe('lim x→0 e^x = 1');
	});
});

describe('contre-revue : la lettre tapée doit être celle de l’expression', () => {
	it('f(t) en x=0 : refus, l’expression s’écrit avec t', () => {
		expect(refusal('.limite f(t) en x=0', ['f(x) = 1/x'])).toBe(
			"L'expression s'écrit avec t : .limite f(t) en t=0."
		);
	});

	it('t^2 en x=1 : refus', () => {
		expect(refusal('.limite t^2 en x=1')).toBe("L'expression s'écrit avec t : .limite t^2 en t=1.");
	});

	it('une constante reste acceptée : 5 en x=1', () => {
		expect(latex('.limite 5 en x=1')).toBe('\\lim\\limits_{x\\to1}5=5');
	});
});

describe('contre-revue : une suite dans une expression', () => {
	it('u_n + 1 en +∞ : 1', () => {
		expect(latex('.limite u_n + 1 en +∞', ['u(n) = 1/n'])).toBe(
			'\\lim\\limits_{n\\to+\\infty}\\left(u_n+1\\right)=1'
		);
	});

	it('u_k : comme u(k)', () => {
		expect(latex('.limite u_k en +∞', ['u(n) = 1/n'])).toBe('\\lim\\limits_{k\\to+\\infty}u_k=0');
	});
});

describe('contre-revue : l’écriture du point', () => {
	it('en -1/2+ : {-\\tfrac12}^+ et -1/2+', () => {
		const result = line('.limite x^2 en -1/2+');
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			'\\lim\\limits_{x\\to{-\\tfrac{1}{2}}^+}x^2=\\dfrac{1}{4}'
		);
		expect(result.output).toBe('lim x→-1/2+ x^2 = 1/4');
	});

	it('en π+ : π+ dans le texte, \\pi^+ en LaTeX', () => {
		const result = line('.limite x en π+');
		expect(result.output).toBe('lim x→π+ x = π');
		expect((result.latex ?? '').replace(/\s/g, '')).toBe('\\lim\\limits_{x\\to\\pi^+}x=\\pi');
	});
});

describe('une suite dans une expression : en +∞ seulement', () => {
	it.each(['u_k + 1', '2u_n'])('%s en 3 : refus', (typed) => {
		expect(refusal(`.limite ${typed} en 3`, ['u(n) = 1/n'])).toBe(
			`u est une suite : sa limite se cherche en +∞ (.limite ${typed} en +∞).`
		);
	});

	it('2u_n en +∞ : 0', () => {
		expect(latex('.limite 2u_n en +∞', ['u(n) = 1/n']).endsWith('=0')).toBe(true);
	});
});

describe("R1 : sans côté, une fonction définie d'un seul côté écrit ce côté", () => {
	it('ln(x) en 0 : x → 0⁺', () => {
		const result = line('.limite ln(x) en 0');
		expect(result.output).toBe('lim x→0+ ln(x) = -∞');
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			'\\lim\\limits_{x\\to0^+}\\ln\\left(x\\right)=-\\infty'
		);
	});

	it('sqrt(x) en 0 : à droite, 0', () => {
		expect(latex('.limite sqrt(x) en 0')).toBe('\\lim\\limits_{x\\to0^+}\\sqrt{x}=0');
		expect(line('.limite sqrt(x) en 0').output).toBe('lim x→0+ sqrt(x) = 0');
	});

	it('sqrt(-x) en 0 : à gauche', () => {
		expect(latex('.limite sqrt(-x) en 0')).toBe('\\lim\\limits_{x\\to0^-}\\sqrt{-x}=0');
		expect(line('.limite sqrt(-x) en 0').output).toBe('lim x→0- sqrt(-x) = 0');
	});

	it('ln(x-1) en 1 : x → 1⁺', () => {
		expect(latex('.limite ln(x-1) en 1')).toBe(
			'\\lim\\limits_{x\\to1^+}\\ln\\left(x-1\\right)=-\\infty'
		);
	});

	it("une fonction de l'atelier garde son nom : f(x) = ln(x), en 0", () => {
		expect(latex('.limite f en 0', ['f(x) = ln(x)'])).toBe('\\lim\\limits_{x\\to0^+}f(x)=-\\infty');
	});

	it('le côté tapé ne change rien', () => {
		expect(latex('.limite ln(x) en 0+')).toBe(
			'\\lim\\limits_{x\\to0^+}\\ln\\left(x\\right)=-\\infty'
		);
	});

	it('une fonction définie des deux côtés ne prend pas de côté', () => {
		expect(latex('.limite sqrt(x+2) en 0').startsWith('\\lim\\limits_{x\\to0}\\sqrt')).toBe(true);
	});
});

describe('R2 : pas de limite, hors du domaine', () => {
	it('sqrt(x) en -1', () => {
		const result = line('.limite sqrt(x) en -1');
		expect(result.output).toBe(
			"Pas de limite en -1 : l'expression n'est pas définie au voisinage de -1."
		);
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}-1\\text{:l'expressionn'estpasdéfinieauvoisinagede}-1"
		);
	});

	it('ln(x) en −∞', () => {
		const result = line('.limite ln(x) en -∞');
		expect(result.output).toBe(
			"Pas de limite en -∞ : l'expression n'est pas définie au voisinage de -∞."
		);
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}-\\infty\\text{:l'expressionn'estpasdéfinieauvoisinagede}-\\infty"
		);
	});

	it("une fonction citée : f n'est pas définie au voisinage de -1", () => {
		const result = line('.limite f en -1', ['f(x) = sqrt(x)']);
		expect(result.output).toBe("Pas de limite en -1 : f n'est pas définie au voisinage de -1.");
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}-1\\text{:}f\\text{n'estpasdéfinieauvoisinagede}-1"
		);
	});
});

describe("R3 : pas de limite, l'expression oscille", () => {
	it('sin(x) en +∞', () => {
		const result = line('.limite sin(x) en +∞');
		expect(result.output).toBe(
			"Pas de limite en +∞ : l'expression oscille sans se rapprocher d'aucune valeur."
		);
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}+\\infty\\text{:l'expressionoscillesansserapprocherd'aucunevaleur}"
		);
	});

	it('3sin(2x)+1 en −∞', () => {
		expect(line('.limite 3sin(2x)+1 en -∞').output).toBe(
			"Pas de limite en -∞ : l'expression oscille sans se rapprocher d'aucune valeur."
		);
	});

	it('sin(1/x) en 0', () => {
		expect(line('.limite sin(1/x) en 0').output).toBe(
			"Pas de limite en 0 : l'expression oscille sans se rapprocher d'aucune valeur."
		);
	});

	it('une fonction citée : f oscille', () => {
		expect(line('.limite f en +∞', ['f(x) = cos(x)']).output).toBe(
			"Pas de limite en +∞ : f oscille sans se rapprocher d'aucune valeur."
		);
	});
});

describe('revue : la raison avec un côté imposé par l’ensemble choisi', () => {
	it('f(x) = sin(1/x) sur ]0;+∞[, en 0 : le côté vient de l’ensemble, la raison reste', () => {
		const result = line('.limite f en 0', ['f(x) = sin(1/x) sur ]0;+∞[']);
		expect(result.output).toBe(
			"Pas de limite en 0+ : f oscille sans se rapprocher d'aucune valeur."
		);
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}0^+\\text{:}f\\text{oscillesansserapprocherd'aucunevaleur}"
		);
	});
});

describe('revue : le nom de la fonction s’écrit hors du texte', () => {
	it('f_1 oscille : f_1 en mathématiques, pas dans \\text', () => {
		const result = line('.limite f_1 en +∞', ['f_1(x) = sin(x)']);
		expect(result.output).toBe(
			"Pas de limite en +∞ : f_1 oscille sans se rapprocher d'aucune valeur."
		);
		expect((result.latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}+\\infty\\text{:}f_1\\text{oscillesansserapprocherd'aucunevaleur}"
		);
	});

	it('f_1 hors du domaine', () => {
		expect((line('.limite f_1 en -1', ['f_1(x) = sqrt(x)']).latex ?? '').replace(/\s/g, '')).toBe(
			"\\text{Pasdelimiteen}-1\\text{:}f_1\\text{n'estpasdéfinieauvoisinagede}-1"
		);
	});
});

describe('V60 : les fonctions en escalier', () => {
	it('floor(x) en 1 : pas de limite, à gauche 0, à droite 1', () => {
		expect(line('.limite floor(x) en 1').output).toBe(
			'Pas de limite en 1 : à gauche 0, à droite 1.'
		);
	});

	it.each([
		['floor(x) en 1^+', '\\lim\\limits_{x\\to1^+}\\lfloor x\\rfloor=1'],
		['floor(x) en 1^-', '\\lim\\limits_{x\\to1^-}\\lfloor x\\rfloor=0']
	])('%s', (typed, expected) => {
		expect(latex(`.limite ${typed}`)).toBe(expected.replace(/\s/g, ''));
	});

	it.each([
		['floor(x) en 1,5', '= 1'],
		['floor(x) en 1/2', '= 0'],
		['floor(x) en +∞', '= +∞'],
		['floor(x) en -∞', '= -∞']
	])('%s : %s', (typed, expected) => {
		expect(line(`.limite ${typed}`).output.endsWith(expected)).toBe(true);
	});

	it('sign(x) en 0 : à gauche -1, à droite 1', () => {
		expect(line('.limite sign(x) en 0').output).toBe(
			'Pas de limite en 0 : à gauche -1, à droite 1.'
		);
	});

	it('floor(2x) en 1/2 : pas de limite', () => {
		expect(line('.limite floor(2x) en 1/2').output).toMatch(
			/^Pas de limite en 1\/2 : à gauche 0, à droite 1\.$/
		);
	});

	it('floor(x)/x en +∞ : « je ne sais pas », jamais une réponse fausse', () => {
		expect(line('.limite floor(x)/x en +∞').output).toBe('Je ne sais pas calculer cette limite.');
	});
});

describe('V60, revue : π et u − L nul d’un côté', () => {
	it('.limite floor(x) en \\pi : 3', () => {
		expect(line('.limite floor(x) en \\pi').output).toBe('lim x→π floor(x) = 3');
	});

	it('.limite sign(x+abs(x)) en 0 : « je ne sais pas », pas 1', () => {
		expect(line('.limite sign(x+abs(x)) en 0').output).toBe(
			'Je ne sais pas calculer cette limite.'
		);
	});
});
