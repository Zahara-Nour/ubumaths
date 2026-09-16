/**
 * Le moteur reflète l'atelier — Q1 option B, tranchée le 2026-09-16.
 *
 * L'atelier détient les noms ; `WebReplEngine` est un calculateur sans mémoire
 * propre, qu'on remet en accord avant chaque évaluation. Sans ça, `f` défini
 * dans le panneau et `f` défini au clavier sont deux `f` différents — le défaut
 * n° 2 du cadrage, reproduit à l'intérieur de l'atelier.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { syncEngine, expressionOf } from '../engine';

describe('report des objets vers le moteur', () => {
	it('rend une fonction du panneau évaluable au clavier', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' });

		syncEngine(atelier, engine);

		// LE point du lot : l'élève ne redéclare rien pour évaluer ce qu'il a nommé
		expect(engine.execute('f(2)').output).toBe('-1');
	});

	it('rend une valeur du panneau utilisable dans un calcul', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'value', name: 'a', definition: '3' });

		syncEngine(atelier, engine);

		expect(engine.execute('a + 1').output).toBe('4');
	});

	it('suit la définition quand elle change', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		syncEngine(atelier, engine);

		atelier.update('f', 'x^3');
		syncEngine(atelier, engine);

		expect(engine.execute('f(2)').output).toBe('8');
	});

	it('oublie un objet supprimé', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'value', name: 'a', definition: '3' });
		syncEngine(atelier, engine);

		atelier.remove('a');
		syncEngine(atelier, engine);

		// `a` ne doit plus valoir 3 : un nom supprimé qui continue de répondre est
		// pire qu'une erreur, l'élève croit avoir effacé
		expect(engine.execute('a + 1').output).not.toBe('4');
	});

	// Un objet qui ne peut rien produire ne doit pas entrer dans le moteur : le
	// panneau porte déjà le message en français, et c'est là que l'élève doit le
	// lire.
	//
	// ⚠️ Asserter que `f(2)` échoue ne prouve RIEN ici : mesuré le 2026-09-16,
	// un objet en attente poussé de force échoue aussi, mais sur « Evaluation
	// error: Cannot evaluate: free variables: a ». Ce qui distingue les deux cas,
	// c'est que le moteur ne connaisse pas le nom du tout.
	it('ne pousse pas un objet en erreur', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^^2' });

		syncEngine(atelier, engine);

		expect(engine.getFunctions().map((f) => f.name)).not.toContain('f');
	});

	it('ne pousse pas un objet en attente d’un nom inconnu', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		expect(atelier.get('f')?.status).toBe('pending');

		syncEngine(atelier, engine);

		expect(engine.getFunctions().map((f) => f.name)).not.toContain('f');
	});

	it('ne pousse pas une valeur en attente', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'value', name: 'b', definition: 'c + 1' });

		syncEngine(atelier, engine);

		expect([...engine.getState().bindings.keys()]).not.toContain('b');
	});

	// Même raison qu'au lot 2 : l'effet qui appellera cette fonction la rejoue
	it('est idempotente', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		syncEngine(atelier, engine);
		syncEngine(atelier, engine);

		expect(engine.execute('f(3)').output).toBe('9');
	});
});

/**
 * §6 bis — mesuré le 2026-09-16, et c'est le défaut le plus dangereux du lot.
 *
 * `.variations f(x)` rend « Derivee : f'(x) = f'(x) », « Points critiques :
 * aucun » : un tableau de variations d'apparence normale, sans erreur, qui ne
 * dit rien de la fonction. Avec l'expression substituée, le même appel trouve
 * le point critique x = 3/2.
 */
describe('substitution avant d’appeler une commande', () => {
	it('rend l’expression, pas le nom', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' });

		const result = expressionOf(atelier, 'f');

		expect(result.ok).toBe(true);
		expect(result.ok && result.expression).toBe('x^2-3x+1');
	});

	it('substitue récursivement un objet qui en cite un autre', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x^2' });
		atelier.create({ kind: 'function', name: 'f', definition: 'g(x) + 1' });

		const result = expressionOf(atelier, 'f');

		// Sans la récursion, `g(x)` repart au défaut du §6 bis un étage plus bas
		expect(result.ok).toBe(true);
		expect(result.ok && result.expression).not.toContain('g(');
	});

	it('substitue aussi une valeur citée', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '3' });
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });

		const result = expressionOf(atelier, 'f');

		expect(result.ok).toBe(true);
		expect(result.ok && result.expression).not.toMatch(/\ba\b/);
	});

	it('refuse un objet en attente, plutôt que de lancer une commande sur du vide', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'g(x) + 1' });

		const result = expressionOf(atelier, 'f');

		expect(result.ok).toBe(false);
		// Le message est celui du panneau, pas un second message qui divergerait
		expect(result.ok === false && result.message).toMatch(/g/);
	});

	// ⚠️ `zzz(x)` NE nomme PAS une fonction `zzz` : en syntaxe custom il se lit
	// `z·z·z(x)`, donc l'atelier attend `z`. Mesuré le 2026-09-16 — l'exemple
	// `zzz` du §2.5 N1 de la Phase 0 générale ne tient pas dans cette syntaxe.
	// Le comportement, lui, est le bon : l'objet est en attente, pas en erreur.
	it('met en attente une suite de lettres, sans la traiter comme un seul nom', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'zzz(x) + 1' });

		expect(atelier.get('f')?.status).toBe('pending');
		expect(expressionOf(atelier, 'f').ok).toBe(false);
	});

	it('refuse un objet en erreur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^^2' });

		expect(expressionOf(atelier, 'f').ok).toBe(false);
	});

	it('nomme une définition circulaire sans boucler', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		atelier.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });
		atelier.update('f', 'g(x) - 1');

		const result = expressionOf(atelier, 'f');

		expect(result.ok).toBe(false);
	});

	it('refuse un nom que l’atelier ne connaît pas', () => {
		const atelier = new Atelier();

		expect(expressionOf(atelier, 'f').ok).toBe(false);
	});
});

/**
 * La preuve que la substitution sert à quelque chose : le même appel, avec le
 * nom puis avec l'expression, sur le moteur réel.
 */
describe('ce que la substitution répare, sur le moteur réel', () => {
	it('donne un tableau de variations qui parle de la fonction', () => {
		const atelier = new Atelier();
		const engine = new WebReplEngine();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' });
		syncEngine(atelier, engine);

		const cite = engine.execute('.variations f(x)').output;
		const result = expressionOf(atelier, 'f');
		const substitue = engine.execute(`.variations ${result.ok ? result.expression : ''}`).output;

		// Citer le nom : « Points critiques : aucun », sans erreur — mesuré
		expect(cite).toContain('aucun');
		// Substituer : le point critique apparaît
		expect(substitue).toContain('3/2');
	});
});
