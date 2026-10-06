/**
 * `.solve`, `.diff`, `.integrate` : la variable est x, sauf `; v`.
 *
 * Décision de David (2026-10-06) : plus aucune devinette. Ni « le dernier mot
 * est la variable » (`.solve 3 = 2 x` répondait « Pas de solution », le `x`
 * arraché ; `.integrate x^2 y` intégrait en y), ni « la seule variable libre »
 * (#880). La variable est x par défaut ; une autre se donne après un
 * point-virgule. Quand x n'apparaît pas, la réponse est calculée en x et la
 * ligne indique comment en choisir une autre.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';
import { otherVariableHint, variableHintOf } from '../../core/variable-argument';
import { parseLatex } from '../../../parser';

/** La sortie du moteur, sans les séquences de couleur d'un terminal. */
function run(command: string): { success: boolean; output: string; error?: string } {
	const result = new WebReplEngine().execute(command);
	return {
		success: result.success,
		// eslint-disable-next-line no-control-regex -- couleurs de chalk
		output: result.output.replace(/\u001b\[[0-9;]*m/g, ''),
		...(result.error?.message !== undefined && { error: result.error.message })
	};
}

/** Dernière ligne non vide d'une résolution : la conclusion. */
function conclusion(output: string): string {
	const lines = output.split('\n').filter((l) => l.trim() !== '');
	return lines[lines.length - 1].trim();
}

const HINT_T = 'Calcul par rapport à x. Pour une autre variable, écris « ; t ».';
const HINT_MANY = 'Calcul par rapport à x. Pour une autre variable, écris « ; » suivi de son nom.';

describe('.solve : x par défaut, une autre variable après « ; »', () => {
	it('`3 = 2 x` : le x final fait partie de l’équation', () => {
		const result = run('.solve 3 = 2 x');
		expect(result.success).toBe(true);
		expect(conclusion(result.output)).toBe('x = 3/2');
	});

	it('`3 = 2t ; t`', () => {
		const result = run('.solve 3 = 2t ; t');
		expect(result.success).toBe(true);
		expect(conclusion(result.output)).toBe('t = 3/2');
	});

	it('`x^2 = 4` : ±2', () => {
		const result = run('.solve x^2 = 4');
		expect(result.success).toBe(true);
		expect(result.output).toContain('x = -2');
		expect(result.output).toContain('x = 2');
	});

	it('`3 = 2t` sans « ; » : en x, avec l’indication', () => {
		const result = run('.solve 3 = 2t');
		expect(result.output).toContain(HINT_T);
		expect(result.output).not.toContain('t = 3/2');
	});

	it('`sin x = 0` : refus, des parenthèses', () => {
		const result = run('.solve sin x = 0');
		expect(result.success).toBe(false);
		expect(result.error).toBe('Écris sin(x) avec des parenthèses.');
	});
});

describe('.integrate : x par défaut, une autre variable après « ; »', () => {
	it('`x^2 y` : intégré en x, y est une constante', () => {
		const result = run('.integrate x^2 y');
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toBe('∫ x^2y dx = {1/3}x^3y + C');
	});

	it('`x^2 y ; y`', () => {
		const result = run('.integrate x^2 y ; y');
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toBe('∫ x^2y dy = {1/2}x^2y^2 + C');
	});

	it('`t ; t` donne t²/2, `t` sans « ; » s’intègre en x avec l’indication', () => {
		expect(run('.integrate t ; t').output.split('\n')[0]).toBe('∫ t dt = {1/2}t^2 + C');
		const inX = run('.integrate t');
		expect(inX.output.split('\n')[0]).toBe('∫ t dx = tx + C');
		expect(inX.output).toContain(
			'Calcul par rapport à x. Pour une autre variable, écris « ; t » ; les bornes se mettent à la fin : « ; t 0 1 ».'
		);
	});

	it('bornes : `x^2 0 1` et `x^2 ; x 0 1` valent 1/3', () => {
		expect(run('.integrate x^2 0 1').output).toContain('= 1/3');
		expect(run('.integrate x^2 ; x 0 1').output).toContain('= 1/3');
	});

	it('`sin x` : refus, des parenthèses', () => {
		const result = run('.integrate sin x');
		expect(result.success).toBe(false);
		expect(result.error).toBe('Écris sin(x) avec des parenthèses.');
	});
});

describe('.diff : x par défaut, une autre variable après « ; »', () => {
	it('`t^2` sans « ; » : 0, avec l’indication', () => {
		const result = run('.diff t^2');
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toBe('d/dx(t^2) = 0');
		expect(result.output).toContain(HINT_T);
	});

	it('`t^2 ; t` : 2t, sans indication', () => {
		const result = run('.diff t^2 ; t');
		expect(result.output.split('\n')[0]).toBe('d/dt(t^2) = 2t');
		expect(result.output).not.toContain('Calcul par rapport');
	});

	it.each([
		['a x^2 + b x', 'd/dx(ax^2+bx) = 2ax+b'],
		['x^2 y', 'd/dx(x^2y) = 2xy']
	])('`%s` : en x, sans indication', (input, expected) => {
		const result = run(`.diff ${input}`);
		expect(result.output.split('\n')[0]).toBe(expected);
		expect(result.output).not.toContain('Calcul par rapport');
	});

	it('`a t^2 + b t` : plus de refus, en x (0) ; plusieurs variables, aucune n’est choisie', () => {
		const result = run('.diff a t^2 + b t');
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toBe('d/dx(at^2+bt) = 0');
		expect(result.output).toContain(HINT_MANY);
		expect(result.output).not.toContain('« ; a »');
	});

	it('`sin x` : refus, des parenthèses', () => {
		const result = run('.diff sin x');
		expect(result.success).toBe(false);
		expect(result.error).toBe('Écris sin(x) avec des parenthèses.');
	});
});

describe('otherVariableHint', () => {
	it.each([
		['t^2', HINT_T],
		['x^2 + t', null],
		// Une constante : rien à indiquer
		['5', null],
		// e, i, pi ne sont pas des variables candidates
		['e^{2}', null],
		['e^{2t}', HINT_T]
	])('%s', (latex, expected) => {
		expect(otherVariableHint(parseLatex(latex))).toBe(expected);
	});

	it('plusieurs variables libres : aucune n’est nommée', () => {
		expect(otherVariableHint(parseLatex('a t^2 + b t'))).toBe(HINT_MANY);
	});

	it('les noms liés (`.let a = 2`) ne sont pas proposés', () => {
		expect(otherVariableHint(parseLatex('a t'), ['a'])).toBe(HINT_T);
	});
});

describe('les options ne mangent jamais l’expression', () => {
	// ⚠️ `.solve 3-v=1` lisait `-v` comme l'option « verbeux », résolvait
	// « 3 = 1 » et répondait « contradictoire ». Une option n'est reconnue que
	// séparée par des espaces, connue de la commande, en tête ou en fin.
	it('`.solve 3-v=1 ; v` → v = 2', () => {
		expect(conclusion(run('.solve 3-v=1 ; v').output)).toBe('v = 2');
	});

	it('`.solve 3-x=1` → x = 2', () => {
		expect(conclusion(run('.solve 3-x=1').output)).toBe('x = 2');
	});

	it('`.solve 3-q=1 ; q` → q = 2', () => {
		expect(conclusion(run('.solve 3-q=1 ; q').output)).toBe('q = 2');
	});

	it('`.diff 3-v ; v` → -1', () => {
		expect(run('.diff 3-v ; v').output.split('\n')[0]).toBe('d/dv(3-v) = -1');
	});

	it('les vraies options marchent toujours, en tête', () => {
		// Revue #888 : en tête seulement (en fin, `x = -v` perdait son -v)
		const quiet = run('.solve -q x^2-1=0');
		expect(quiet.success).toBe(true);
		expect(quiet.output).not.toContain('Equation');
		expect(run('.solve --quiet x^2-1=0').output).toBe(quiet.output);

		const verbose = run('.solve --verbose 2x+1=5');
		expect(verbose.success).toBe(true);
		expect(conclusion(verbose.output)).toBe('x = 2');
		expect(run('.solve -v 2x+1=5').output).toBe(verbose.output);
		expect(verbose.output).not.toBe(run('.solve 2x+1=5').output);
	});
});

describe('revue #888 : les options seulement EN TÊTE', () => {
	// ⚠️ Un `-v` en fin de saisie était encore pris pour l'option « verbeux »
	it('`.solve x = -v` → x = -v', () => {
		expect(conclusion(run('.solve x = -v').output)).toBe('x = -v');
	});

	it('`.solve x + v = 0` → x = -v', () => {
		expect(conclusion(run('.solve x + v = 0').output)).toBe('x = -v');
	});

	it('`.solve x = -q` → x = -q', () => {
		expect(conclusion(run('.solve x = -q').output)).toBe('x = -q');
	});

	it('une option en tête marche toujours', () => {
		expect(run('.solve -q x^2-1=0').output).not.toContain('Equation');
		expect(run('.solve --verbose 2x+1=5').output).toBe(run('.solve -v 2x+1=5').output);
	});
});

describe('revue #888 : `.integrate`, bornes avant ou après « ; t »', () => {
	it.each(['.integrate t^2 0 1 ; t', '.integrate t^2 ; t 0 1'])('%s → 1/3', (input) => {
		const result = run(input);
		expect(result.success).toBe(true);
		expect(result.output.split('\n')[0]).toBe('∫[0→1] t^2 dt = 1/3');
	});

	it('l’indication dit où mettre les bornes', () => {
		expect(run('.integrate t^2').output).toContain(
			'Calcul par rapport à x. Pour une autre variable, écris « ; t » ; les bornes se mettent à la fin : « ; t 0 1 ».'
		);
	});
});

describe('variableHintOf', () => {
	it('reçoit les noms liés, comme le moteur', () => {
		expect(variableHintOf('a t^2')).toBe(HINT_MANY);
		expect(variableHintOf('a t^2', { bound: ['a'] })).toBe(HINT_T);
	});

	it('`.integrate` : bornes ôtées, avant ou après « ; »', () => {
		expect(variableHintOf('t^2 0 1', { integral: true })).toContain('« ; t 0 1 »');
		expect(variableHintOf('t^2 0 1 ; t', { integral: true })).toBeNull();
	});
});
