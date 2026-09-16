/**
 * Une dérivée se calcule même quand un paramètre manque.
 *
 * ⚠️ **Signalé par David le 2026-09-16 : « on ne peut pas avoir k'(x)=b ? »**
 * Il avait raison, et mon garde confondait deux choses.
 *
 * `k(x) = bx` ne peut pas être **évalué** — on ne connaît pas `b`. Mais il se
 * **dérive** parfaitement : `k'(x) = b`. Mesuré, `mathAST` le fait déjà
 * (`b*x → b`, `a*x+b → a`, `b*sin(x) → b·cos(x)`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { expressionOf } from '../engine';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const outputOf = (r: ReturnType<typeof runInput>) =>
	r.kind === 'calcul' || r.kind === 'commande' ? r.output : r.kind === 'refus' ? r.message : '';

describe('dériver un objet dont un paramètre manque', () => {
	it("k(x) = bx donne k' = b", () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'k', definition: 'b*x' }, 'text');

		const result = runInput(s, "k'");

		expect(result.kind).not.toBe('refus');
		expect(outputOf(result).replace(/\s/g, '')).toBe('b');
	});

	it('et a*x+b donne a', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'k', definition: 'a*x+b' }, 'text');

		expect(outputOf(runInput(s, "k'")).replace(/\s/g, '')).toBe('a');
	});

	it('la dérivée gardée est un objet, lui aussi en attente', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'k', definition: 'b*x' }, 'text');

		atelier.create({ kind: 'function', name: 'm', definition: "k'" }, 'text');

		// `m` vaut `b` : il attend `b`, pas `k`
		expect(atelier.get('m')?.status).toBe('pending');
		expect(atelier.get('m')?.message).toMatch(/b/);
	});

	it('et devient exploitable dès que le paramètre arrive', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'k', definition: 'b*x' }, 'text');
		atelier.create({ kind: 'function', name: 'm', definition: "k'" }, 'text');

		atelier.create({ kind: 'value', name: 'b', definition: '7' }, 'text');

		const expression = expressionOf(atelier, 'm');
		expect(expression.ok && expression.expression.replace(/\s/g, '')).toBe('7');
	});
});

describe('ce qui reste refusé, et pour de bonnes raisons', () => {
	// Une définition illisible n'a pas de dérivée : on ne sait même pas la lire
	it('la dérivée d’un objet en erreur', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'k', definition: 'x^^2' }, 'text');

		expect(runInput(s, "k'").kind).toBe('refus');
	});

	it('la dérivée d’un nom qui n’existe pas', () => {
		const s = session();

		const result = runInput(s, "z'");

		expect(result.kind).toBe('refus');
		expect(outputOf(result)).toMatch(/z/);
	});

	it('et le message reste en français', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'k', definition: 'x^^2' }, 'text');

		expect(outputOf(runInput(s, "k'"))).not.toMatch(/Unexpected token|Evaluation error/);
	});
});

describe('ce que ça ne casse pas', () => {
	it('la dérivée d’un objet sain', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' }, 'text');

		expect(outputOf(runInput(s, "f'(2)"))).toBe('1');
	});

	it('un objet en attente ne s’évalue toujours pas', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'k', definition: 'b*x' }, 'text');

		// `k(2)` vaut `2b` : le moteur ne peut pas en faire un nombre
		expect(outputOf(runInput(s, 'k(2)'))).not.toBe('2');
	});
});
