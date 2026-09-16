/**
 * Le dispatch des commandes ne doit plus refuser un argument qui n'est pas une
 * expression.
 *
 * ⚠️ Défaut mesuré le 2026-09-16 : le dispatch parse **tout l'argument** comme
 * une expression mathématique avant d'appeler la commande. Une commande qui
 * attend `expr terms centre` ou `expr var a b` meurt donc sur le premier
 * nombre — sans jamais être appelée — alors qu'elle sait parfaitement lire ses
 * arguments elle-même.
 *
 * Le drapeau qui dit lesquelles savent le faire existe déjà : `requiresAst`,
 * `true` par défaut (`base-command.ts`), mis à `false` par celles qui relisent
 * `ctx.input`. Le dispatch l'ignorait.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function run(input: string) {
	return new WebReplEngine().execute(input);
}

describe('les commandes à arguments multiples aboutissent', () => {
	it('développe une série de Taylor', () => {
		const result = run('.taylor sin(x) 5 0');

		expect(result.success).toBe(true);
		expect(result.output.toLowerCase()).toContain('taylor');
	});

	it('accepte aussi la forme sans centre', () => {
		expect(run('.taylor sin(x) 5').success).toBe(true);
	});

	it('calcule une intégrale définie', () => {
		const result = run('.integrate x^2 x 0 1');

		expect(result.success).toBe(true);
		// ∫₀¹ x² dx = 1/3
		expect(result.output).toContain('1/3');
	});

	it('accepte une option en tirets', () => {
		expect(run('.solve x^2-1=0 --verbose').success).toBe(true);
	});
});

describe('ce qui marchait doit continuer de marcher', () => {
	it('dérive une expression', () => {
		expect(run('.diff x^2').output).toContain('2x');
	});

	it('dérive selon une variable nommée', () => {
		expect(run('.diff x^2 x').success).toBe(true);
	});

	it('intègre sans bornes', () => {
		expect(run('.integrate x^2').success).toBe(true);
	});

	it('simplifie', () => {
		expect(run('.simplify (x+1)^2').success).toBe(true);
	});

	it('résout sans option', () => {
		expect(run('.solve x^2-1=0').success).toBe(true);
	});

	it('étudie les variations', () => {
		expect(run('.variations x^2-3x+1').output).toContain('3/2');
	});
});

describe('une commande qui EXIGE un arbre garde son message de parse', () => {
	// ⚠️ Non-régression : `.simplify` (et `.latex`, `.tree`, `.hash`…) ne
	// relisent pas `ctx.input`. Leur passer une chaîne illisible sans rien dire
	// les ferait travailler sur l'arbre PRÉCÉDENT — un résultat juste pour une
	// question que l'élève n'a pas posée.
	it('refuse une expression illisible et dit pourquoi', () => {
		const result = run('.simplify x^^2');

		expect(result.success).toBe(false);
		expect(result.output.trim()).not.toBe('');
	});

	it('refuse aussi une suite d’arguments qu’elle ne saurait pas lire', () => {
		expect(run('.simplify x^2 3 0').success).toBe(false);
	});
});

describe('une commande tolérante prévient quand même quand elle ne peut rien faire', () => {
	it('ne prétend pas avoir réussi sur un argument absurde', () => {
		const result = run('.taylor ^^^ 5 0');

		expect(result.success).toBe(false);
	});
});
