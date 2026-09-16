/**
 * `f'` est une référence VIVANTE à la dérivée de `f` — décidé le 2026-09-16.
 *
 * Ce que l'élève écrit : `g = f'`. Ce qu'il attend : une fonction traçable qui
 * **suit** `f`. Avant ce travail, il obtenait un objet de type VALEUR, de
 * définition « f' », présenté comme sain — l'atelier lui proposait « Régler le
 * curseur », comme à un nombre.
 *
 * ⚠️ Le parseur savait déjà tout faire : `f'` produit
 * `{type:'function', name:'f', derivativeOrder:1}`, et `referencesOf` voyait
 * déjà la dépendance. Ce qui manquait tenait en deux points — la substitution
 * ignorait `derivativeOrder`, et le type était décidé sur la FORME de la
 * définition, pas sur son contenu.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { expressionOf } from '../engine';
import { runInput } from '../calcul';

function withF(definition = 'x^2-3x+1') {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	return atelier;
}

const session = () => ({ atelier: new Atelier(), engine: new WebReplEngine() });

describe('g = f’ crée une fonction', () => {
	it('et non une valeur', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' }, 'text');

		runInput(s, "g=f'");

		expect(s.atelier.get('g')?.kind).toBe('function');
	});

	it('qui vaut la dérivée', () => {
		const atelier = withF();
		atelier.create({ kind: 'function', name: 'g', definition: "f'" }, 'text');

		const expression = expressionOf(atelier, 'g');

		expect(expression.ok).toBe(true);
		expect(expression.ok && expression.expression.replace(/\s/g, '')).toContain('2x-3');
	});

	it('et qui est traçable', () => {
		const atelier = withF();
		atelier.create({ kind: 'function', name: 'g', definition: "f'" }, 'text');

		expect(atelier.get('g')?.status).toBe('ok');
		atelier.setPlotted('g', true);
		expect(atelier.get('g')?.plotted).toBe(true);
	});
});

describe('la référence est VIVANTE', () => {
	// ⚠️ LE point de la décision : `g` suit `f`, il ne fige pas sa dérivée
	it('g suit f quand f change', () => {
		const atelier = withF();
		atelier.create({ kind: 'function', name: 'g', definition: "f'" }, 'text');

		atelier.update('f', 'x^3', 'text');

		const expression = expressionOf(atelier, 'g');
		expect(expression.ok && expression.expression.replace(/\s/g, '')).toContain('3x^2');
	});

	it('g passe en attente si f disparaît', () => {
		const atelier = withF();
		atelier.create({ kind: 'function', name: 'g', definition: "f'" }, 'text');

		atelier.remove('f');

		expect(atelier.get('g')?.status).toBe('pending');
	});

	it('g revient quand f revient', () => {
		const atelier = withF();
		atelier.create({ kind: 'function', name: 'g', definition: "f'" }, 'text');
		atelier.remove('f');

		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');

		expect(atelier.get('g')?.status).toBe('ok');
	});
});

describe('f’ s’emploie partout où une fonction s’emploie', () => {
	it("dans un calcul : f'(2)", () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' }, 'text');

		const result = runInput(s, "f'(2)");

		// f' = 2x-3, donc f'(2) = 1
		expect(result.kind === 'calcul' && result.output).toBe('1');
	});

	it('dans une expression composée', () => {
		const atelier = withF();
		atelier.create({ kind: 'function', name: 'g', definition: "f'+1" }, 'text');

		const expression = expressionOf(atelier, 'g');

		expect(expression.ok && expression.expression.replace(/\s/g, '')).toContain('2x-3');
	});
});

describe('ce que ça ne doit pas casser', () => {
	it('une valeur reste une valeur', () => {
		const s = session();

		runInput(s, 'a = 3');

		expect(s.atelier.get('a')?.kind).toBe('value');
	});

	it('une grandeur reste une valeur', () => {
		const s = session();

		runInput(s, 'd = 12[km]');

		expect(s.atelier.get('d')?.kind).toBe('value');
	});

	it('une fonction déclarée avec sa variable reste une fonction', () => {
		const s = session();

		runInput(s, 'h(x) = x^2');

		expect(s.atelier.get('h')?.kind).toBe('function');
	});

	// ⚠️ Une LETTRE inconnue, pas « zzz » : aucun objet ne peut porter un nom de
	// trois lettres, donc `referencesOf` ne le retient jamais comme manquant.
	it('la dérivée d’un objet inconnu laisse l’objet en attente', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'function', name: 'g', definition: "h'" }, 'text');

		expect(atelier.get('g')?.status).toBe('pending');
		expect(atelier.get('g')?.message).toMatch(/h/);
	});
});
