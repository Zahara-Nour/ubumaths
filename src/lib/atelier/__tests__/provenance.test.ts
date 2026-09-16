/**
 * D10 soldée : la provenance descend jusqu'à l'objet, et y reste.
 *
 * ⚠️ **Le piège que ce travail a révélé.** `'keyboard'` ne veut PAS dire « tapé
 * dans un champ texte » : il désigne la frappe **dans un champ MathLive**, dont
 * les raccourcis convertissent « sin » en `\sin`. Il est donc lu en LaTeX.
 *
 * Faire descendre `'keyboard'` depuis la vue Calcul — qui a un champ texte
 * ordinaire — aurait donc INTRODUIT le défaut que D10 prétend éviter :
 * `sin(x)` lu `s·i·n·(x)`. D'où la provenance `'text'`.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

describe('un champ texte lit du texte', () => {
	it('reconnaît sin(x) écrit à la main', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'function', name: 'f', definition: 'sin(x)' }, 'text');

		expect(atelier.get('f')?.status).toBe('ok');
	});

	it('reconnaît plusieurs fonctions usuelles', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'function', name: 'f', definition: 'cos(x) + ln(x)' }, 'text');

		expect(atelier.get('f')?.status).toBe('ok');
	});

	// ⚠️ LE test qui prouve la distinction
	it('alors que la même saisie lue en LaTeX y verrait un produit de lettres', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'function', name: 'f', definition: 'sin(x)' }, 'keyboard');

		expect(atelier.get('f')?.status).toBe('pending');
	});
});

describe('un champ MathLive lit du LaTeX', () => {
	it('accepte une fraction', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'function', name: 'f', definition: '\\frac{1}{x}' }, 'mathfield');

		expect(atelier.get('f')?.status).toBe('ok');
	});

	it('accepte une fonction en commande LaTeX', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'function', name: 'f', definition: '\\sin(x)' }, 'mathfield');

		expect(atelier.get('f')?.status).toBe('ok');
	});
});

describe('la provenance survit au recalcul', () => {
	// ⚠️ Sans mémoire sur l'objet, `recomputeAll` relirait la définition avec le
	// défaut — donc une saisie texte redeviendrait du LaTeX dès qu'un AUTRE
	// objet change.
	it('reste celle de la saisie quand un autre objet bouge', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'sin(x)' }, 'text');

		atelier.create({ kind: 'value', name: 'a', definition: '3' }, 'text');
		atelier.update('a', '4', 'text');

		expect(atelier.get('f')?.status).toBe('ok');
	});

	it('suit une modification', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');

		atelier.update('f', 'cos(x)', 'text');

		expect(atelier.get('f')?.status).toBe('ok');
	});
});

describe('la vue Calcul écrit bien du texte', () => {
	it('accepte sin(x) tapé au clavier', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };

		runInput(s, 'f(x) = sin(x)');

		expect(s.atelier.get('f')?.status).toBe('ok');
	});

	it('et l’évalue', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'f(x) = sin(x)');

		const result = runInput(s, 'f(0)');

		expect(result.kind === 'calcul' && result.output).toBe('0');
	});
});

describe('ce que la provenance ne change pas', () => {
	it('un nom réservé reste refusé', () => {
		const atelier = new Atelier();

		expect(atelier.create({ kind: 'value', name: 'x', definition: '3' }, 'mathfield').ok).toBe(
			false
		);
	});

	it('une définition illisible porte son erreur', () => {
		const atelier = new Atelier();

		atelier.create({ kind: 'function', name: 'f', definition: 'x^^2' }, 'text');

		expect(atelier.get('f')?.status).toBe('error');
	});
});
