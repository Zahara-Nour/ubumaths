/**
 * `.développer` — une commande que l'atelier sert lui-même, comme `.factoriser`
 * (phase 0 `docs/wip/atelier-developper-phase0.md`, décisions de David du
 * 2026-10-14).
 *
 * ⚠️ PR 1 : la RÉPONSE seule. Les étapes que rend aujourd'hui l'intention
 * `developper` ne sont pas montrables (produits collés « 2x1 », la même ligne
 * jusqu'à 13 fois, distribution cachée) : pas de « Comment ? » tant qu'elles ne
 * sont pas rédigées (PR 2).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { expandExpression } from '../expand';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function run(input: string, s: CalcSession = session()) {
	return runInput(s, input);
}

function commande(input: string, s: CalcSession = session()) {
	const result = run(input, s);
	expect(result.kind, `« ${input} » n'a pas rendu une commande`).toBe('commande');
	return result.kind === 'commande' ? result : null!;
}

function refus(input: string): string {
	const result = run(input);
	expect(result.kind, `« ${input} » n'a pas été refusé`).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
}

describe('la commande existe et se découvre', () => {
	it('elle est au catalogue, juste après « factoriser », dans « Calculer »', () => {
		const catalog = commandCatalog(new WebReplEngine());
		const index = catalog.findIndex((c) => c.french === 'développer');

		expect(index, '« développer » absente du catalogue').toBeGreaterThan(-1);
		expect(catalog[index - 1].french).toBe('factoriser');
		expect(catalog[index].section).toBe('calculer');
	});

	it('son exemple marche vraiment', () => {
		const command = commandCatalog(new WebReplEngine()).find((c) => c.french === 'développer')!;

		expect(command.example).toBe('.développer (2x-1)(x+3)');
		expect(commande(command.example!).latex).toBe('2 x^2 + 5 x - 3');
	});

	it('sans accent et sous son nom moteur, la même réponse', () => {
		expect(commande('.developper (x+1)^2').latex).toBe('x^2 + 2 x + 1');
		expect(commande('.expand (x+1)^2').latex).toBe('x^2 + 2 x + 1');
	});

	it('elle n’est PAS envoyée au moteur, qui ne la connaît pas', () => {
		const result = commande('.développer (x+1)^2');

		expect(result.output).not.toContain('Unknown');
		expect(result.output).not.toContain('Error');
	});

	it('pas de « Comment ? » tant que les étapes ne sont pas rédigées (PR 2)', () => {
		const result = commande('.développer (2x-1)(x+3)');

		expect(result.steps).toBeUndefined();
		expect(result.summary).toBeUndefined();
	});
});

describe('les réponses : développer ET réduire (tableau B)', () => {
	it.each([
		['(x+1)^2', 'x^2 + 2 x + 1'],
		['(x-3)^2', 'x^2 - 6 x + 9'],
		['(2x+5)^2', '4 x^2 + 20 x + 25'],
		['(x+2)(x-2)', 'x^2 - 4'],
		['(2x-1)(x+3)', '2 x^2 + 5 x - 3'],
		['3(x-2)-(x+1)', '2 x - 7'],
		['5-2(x-3)', '-2 x + 11'],
		['x(x-1)', 'x^2 - x'],
		['(3x-1)^2-(x+2)^2', '8 x^2 - 10 x - 3'],
		['(x+1)(x+2)(x+3)', 'x^3 + 6 x^2 + 11 x + 6'],
		['(x+1)^3', 'x^3 + 3 x^2 + 3 x + 1'],
		['(x+1)(x-1)/(x+2)', '\\dfrac{x^2 - 1}{x + 2}'],
		// Revue : le module rend 0 étape sur `-(…)` seul, et la ligne disait
		// « rien à développer » — un cas de collège
		['-(x+1)', '-x - 1'],
		['-(2x-3)', '-2 x + 3'],
		['-(x+1)(x-1)', '-x^2 + 1']
	])('%s → %s', (expression, attendu) => {
		expect(commande(`.développer ${expression}`).latex).toBe(attendu);
	});

	it('la forme texte suit (historique, export)', () => {
		expect(commande('.développer (2x-1)(x+3)').output).toBe('2x^2+5x-3');
	});
});

describe('l’ordre des termes : puissances décroissantes de x, sinon alphabétique', () => {
	it.each([
		// Aujourd'hui `2ab + a² + b²` : l'ordre du module, pas celui du tableau
		['(a+b)^2', 'a^2 + 2 a b + b^2'],
		['(a-b)^2', 'a^2 - 2 a b + b^2'],
		// Aujourd'hui `ab + ax` : les autres lettres sont des coefficients de x
		['a(x+b)', 'a x + a b'],
		['(x+y)^2', 'x^2 + 2 x y + y^2'],
		['(x+a)(x-a)', 'x^2 - a^2']
	])('%s → %s', (expression, attendu) => {
		expect(commande(`.développer ${expression}`).latex).toBe(attendu);
	});

	it('un facteur qui n’est pas une puissance de x ne dérange pas l’ordre', () => {
		expect(commande('.développer e^x(x+1)').latex).toBe('x \\exponentialE^x + \\exponentialE^x');
		expect(commande('.développer sqrt(x)(sqrt(x)+1)').latex).toBe('x + \\sqrt{x}');
	});

	it('un terme sans degré se range après les monômes, pas au milieu des constantes', () => {
		expect(commande('.développer (x+1)^2+sqrt(1+x)').latex).toBe('x^2 + 2 x + 1 + \\sqrt{x + 1}');
	});
});

/**
 * Comme `.limite` (décision de David du 2026-10-06, étendue à `.développer` le
 * 2026-10-14) : la réponse s'écrit comme l'élève a écrit. Un décimal tapé, ou
 * le mode décimal, donne des décimaux ; sinon des fractions.
 */
describe('les décimaux : la réponse s’écrit comme l’élève a écrit', () => {
	it('un décimal tapé donne des décimaux, même en mode exact', () => {
		const result = commande('.développer (0,5x+1)^2');

		expect(result.latex).toBe('0{,}25 x^2 + x + 1');
		expect(result.output).toBe('0,25x^2+x+1');
	});

	it('des fractions tapées en mode exact donnent des fractions', () => {
		expect(commande('.développer (x/2+1)^2').latex).toBe('\\dfrac{1}{4} x^2 + x + 1');
	});

	it('le mode décimal donne des décimaux, même pour des fractions tapées', () => {
		const s = session();
		run('.mode décimal', s);

		expect(commande('.développer (x/2+1)^2', s).latex).toBe('0{,}25 x^2 + x + 1');
		expect(commande('.développer (0,5x+1)^2', s).latex).toBe('0{,}25 x^2 + x + 1');
	});

	it('une fraction sans écriture décimale finie reste une fraction', () => {
		const s = session();
		run('.mode décimal', s);

		// 1/9 n'a pas d'écriture décimale finie : un arrondi ferait d'une
		// égalité une approximation
		expect(commande('.développer (x/3+1)^2', s).latex).toBe(
			'\\dfrac{1}{9} x^2 + \\dfrac{2}{3} x + 1'
		);
		expect(commande('.développer (0,5x+1/3)^2').latex).toBe(
			'0{,}25 x^2 + \\dfrac{1}{3} x + \\dfrac{1}{9}'
		);
	});
});

describe('les noms d’objets', () => {
	it('développer f et développer f(x) : l’expression de la carte', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: '(x+1)^2' });

		expect(commande('.développer f', s).latex).toBe('x^2 + 2 x + 1');
		expect(commande('.développer f(x)', s).latex).toBe('x^2 + 2 x + 1');
	});

	it('une valeur de l’atelier est remplacée', () => {
		const s = session();
		s.atelier.create({ kind: 'value', name: 'a', definition: '3' });

		expect(commande('.développer a(x+2)', s).latex).toBe('3 x + 6');
	});
});

describe('rien à développer : une réponse, pas une ligne rouge (C)', () => {
	it.each(['x^2+1', 'x^2+2x+1', '3x', '1/2x+3', 'sqrt(2)x+1', 'x_1+x_2'])(
		'%s est déjà développée et réduite',
		(expression) => {
			const result = commande(`.développer ${expression}`);

			expect(result.output).toContain('est déjà développée et réduite');
			expect(result.latex).toBeUndefined();
		}
	);

	it('le message cite l’expression telle que l’élève l’a tapée', () => {
		// Revue : `toCustom` écrivait « {1/2}x+3 », accolades comprises
		expect(commande('.développer 1/2x+3').output).toBe(
			'« 1/2x+3 » est déjà développée et réduite.'
		);
	});

	it.each(['1/(x+1)', '(x+1)^(-1)', 'sqrt(x+1)'])('%s : rien à développer', (expression) => {
		const result = commande(`.développer ${expression}`);

		expect(result.output).toContain('Il n’y a rien à développer dans');
		expect(result.latex).toBeUndefined();
	});

	it('une somme dans un exposant : « je ne sais pas », jamais une réponse mal écrite', () => {
		// Revue : la réponse affichait `e^{x^2 + 2 x 1 + 1^2}`, produit collé et
		// puissance non calculée — le défaut des étapes passé dans la réponse
		for (const expression of ['e^((x+1)^2)', '2^((x+1)^2)']) {
			const result = commande(`.développer ${expression}`);

			expect(result.output, expression).toBe(`Je ne sais pas développer « ${expression} ».`);
			expect(result.latex, expression).toBeUndefined();
		}
	});

	it('un résultat trop long est refusé avant le calcul, qui figerait la page', () => {
		// Revue : `(x+1)^2000` prenait 5 s, `(x+y+z+1)^25` 15 s
		for (const expression of ['(x+1)^2000', '(x+y+z+1)^25']) {
			const result = commande(`.développer ${expression}`);

			expect(result.output, expression).toContain('le calcul serait trop long');
			expect(result.latex, expression).toBeUndefined();
		}
		// En deçà, la réponse
		expect(commande('.développer (x+1)^100').latex).toMatch(/^x\^\{100\} \+ 100 x\^\{99\}/);
	});

	it('(x+1)^n : l’exposant n’est pas un nombre', () => {
		const result = commande('.développer (x+1)^n');

		expect(result.output).toContain('Je ne sais pas développer');
		expect(result.output).toContain('l’exposant n’est pas un nombre');
		expect(result.latex).toBeUndefined();
	});
});

describe('les refus, en français (D)', () => {
	it('sans expression : un exemple à recopier', () => {
		const message = refus('.développer');

		expect(message).toContain('Il manque l’expression à développer');
		expect(message).toContain('.développer (2x-1)(x+3)');
	});

	it('une équation : renvoi vers résoudre', () => {
		const message = refus('.développer (x+1)^2=4');

		expect(message).toContain('On développe une expression, pas une équation');
		expect(message).toContain('.résoudre (x+1)^2=4');
	});

	it('une inéquation : pareil', () => {
		const message = refus('.développer 2(x+1)<7');

		expect(message).toContain('pas une inéquation');
		expect(message).toContain('.résoudre 2(x+1)<7');
	});

	it('une liste n’est pas une expression qu’on développe', () => {
		const s = session();
		s.atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		const result = run('.développer L', s);

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toBe(
			'« L » n’est pas une expression qu’on sait développer.'
		);
	});

	it('une saisie illisible', () => {
		expect(refus('.développer ###')).toBe(
			'« ### » n’est pas une expression qu’on sait développer.'
		);
	});
});

describe('la fonction, hors de la commande', () => {
	it('elle ne jette jamais', () => {
		for (const entree of ['', '   ', '###', '2x+1<7', 'x=3', 'n’importe quoi', '(((', '[1;2]']) {
			expect(() => expandExpression(entree, 'exact'), entree).not.toThrow();
		}
	});
});
