/**
 * La saisie de la vue Calcul — §2 et §4 de la Phase 0.
 *
 * Un seul champ : ce que l'élève tape est soit une **définition** (ça crée ou
 * met à jour un objet), soit un **calcul** (ça produit une ligne d'historique),
 * soit une **commande** (ça commence par un point).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, promote, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('ce que la saisie produit', () => {
	it('crée un objet quand c’est une définition', () => {
		const s = session();

		const result = runInput(s, 'f(x) = x^2 - 3x + 1');

		expect(result.kind).toBe('definition');
		expect(s.atelier.get('f')?.kind).toBe('function');
	});

	it('crée une valeur avec son curseur', () => {
		const s = session();

		runInput(s, 'a = 3');

		const a = s.atelier.get('a');
		expect(a?.kind).toBe('value');
		expect(a && 'slider' in a && a.slider).toBeTruthy();
	});

	// §2 N2 : un calcul jeté n'encombre pas le panneau
	it('n’enregistre aucun objet pour un simple calcul', () => {
		const s = session();

		const result = runInput(s, '2 + 3');

		expect(result.kind).toBe('calcul');
		expect(result.kind === 'calcul' && result.output).toBe('5');
		expect(s.atelier.names).toEqual([]);
	});

	// §2 N3 — LE point du lot : l'élève ne redéclare rien
	it('évalue une fonction définie dans le panneau', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' });

		const result = runInput(s, 'f(2)');

		expect(result.kind === 'calcul' && result.output).toBe('-1');
	});

	it('évalue une valeur définie dans le panneau', () => {
		const s = session();
		s.atelier.create({ kind: 'value', name: 'a', definition: '3' });

		const result = runInput(s, 'a + 1');

		expect(result.kind === 'calcul' && result.output).toBe('4');
	});

	it('met à jour un objet qui existe déjà, sans en créer un second', () => {
		const s = session();
		runInput(s, 'f(x) = x^2');

		runInput(s, 'f(x) = x^3');

		expect(s.atelier.names).toEqual(['f']);
		expect(s.atelier.get('f')?.definition).toContain('x^3');
	});

	// §3 N1 : une fraction doit se voir comme une fraction, pas en font-mono
	it('rend le résultat d’un calcul en mathématiques', () => {
		const s = session();

		const result = runInput(s, '1/3 + 1/6');

		expect(result.kind === 'calcul' && result.latex).toBe('\\dfrac{1}{2}');
	});

	it('exécute une commande française', () => {
		const s = session();

		const result = runInput(s, '.dériver x^2');

		expect(result.kind).toBe('commande');
		expect(result.kind === 'commande' && result.output).toContain('2x');
	});

	it('exécute encore les commandes anglaises', () => {
		const s = session();

		expect(runInput(s, '.diff x^2').kind).toBe('commande');
	});
});

describe('les cas limites de la saisie', () => {
	// §2 L1 : un test d'égalité n'est pas une définition
	it('ne crée rien pour « 3 = 3 »', () => {
		const s = session();

		runInput(s, '3 = 3');

		expect(s.atelier.names).toEqual([]);
	});

	// §2 L3 : pas de ligne d'historique vide
	it('ne fait rien sur une saisie vide', () => {
		const s = session();

		expect(runInput(s, '   ').kind).toBe('vide');
		expect(s.atelier.names).toEqual([]);
	});

	// §2 L2 : `x` est réservé
	it('refuse « x = 3 » en disant pourquoi', () => {
		const s = session();

		const result = runInput(s, 'x = 3');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toMatch(/x/);
		expect(s.atelier.names).toEqual([]);
	});

	// §2 E1 : l'objet existe et PORTE son erreur
	it('crée quand même l’objet quand la définition ne se lit pas', () => {
		const s = session();

		runInput(s, 'f(x) = x^^2');

		expect(s.atelier.get('f')).toBeDefined();
		expect(s.atelier.get('f')?.status).toBe('error');
	});

	// §2 E2 : nommer les plus proches, pas « unknown command »
	it('propose les commandes proches d’une commande inconnue', () => {
		const s = session();

		const result = runInput(s, '.dériiver x^2');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toContain('dériver');
	});

	it('dit en français qu’une commande n’existe pas, même sans voisine', () => {
		const s = session();

		const result = runInput(s, '.xyzzy');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).not.toMatch(/unknown|Unknown/);
	});

	// L'atelier reste utilisable après une erreur
	it('laisse l’atelier intact quand un calcul échoue', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		runInput(s, '1/0 +');

		expect(s.atelier.get('f')?.status).toBe('ok');
	});
});

/**
 * §4 et décision D5 — le geste « je tiens quelque chose » de la recherche.
 */
describe('garder un résultat sous un nom', () => {
	it('propose un nom et crée l’objet', () => {
		const s = session();
		const result = runInput(s, '1/3 + 1/6');

		const kept = promote(s, result);

		expect(kept.ok).toBe(true);
		expect(s.atelier.names.length).toBe(1);
	});

	it('accepte un nom choisi par l’élève', () => {
		const s = session();
		const result = runInput(s, '1/3 + 1/6');

		promote(s, result, 'r');

		expect(s.atelier.get('r')?.definition).toContain('1/2');
	});

	// §4 N2 : le type suit le CONTENU, pas le geste
	it('garde une expression en x comme fonction, donc traçable', () => {
		const s = session();
		const result = runInput(s, '(x^2-1)/(x+1)');

		const kept = promote(s, result, 'g');

		expect(kept.ok).toBe(true);
		expect(s.atelier.get('g')?.kind).toBe('function');
	});

	/**
	 * ⚠️ Le défaut que ça répare, mesuré le 2026-09-16 — trois objets faux
	 * créés avec un message de SUCCÈS, parce que `promote` relisait la sortie
	 * TEXTE de la commande :
	 *
	 * | `.résoudre x^2-4=0`     | gardait « 0 », pas les racines                |
	 * | `.variations x^2-3x+1`  | créait une FONCTION « Expression : x^2-3x+1 » |
	 * | `.aide`                 | gardait « MathAST CAS - Commandes… »          |
	 *
	 * Une commande ne porte pas l'arbre de son résultat : on refuse, plutôt que
	 * de deviner.
	 */
	it('refuse de garder le résultat d’une commande, plutôt que d’en deviner un', () => {
		const s = session();

		for (const input of ['.résoudre x^2-4=0', '.variations x^2-3x+1', '.aide']) {
			const kept = promote(s, runInput(s, input));
			expect(kept.ok, input).toBe(false);
		}
		expect(s.atelier.names).toEqual([]);
	});

	it('dit en français pourquoi le résultat d’une commande ne se garde pas', () => {
		const s = session();

		const kept = promote(s, runInput(s, '.variations x^2-3x+1'));

		expect(kept.ok === false && kept.message).toContain('commande');
	});

	it('garde deux résultats sous deux noms distincts', () => {
		const s = session();

		promote(s, runInput(s, '2+3'));
		promote(s, runInput(s, '4+5'));

		expect(new Set(s.atelier.names).size).toBe(2);
	});

	// §4 L1 : ni fusion, ni écrasement
	it('refuse un nom déjà pris', () => {
		const s = session();
		s.atelier.create({ kind: 'value', name: 'a', definition: '7' });
		const result = runInput(s, '2+3');

		const kept = promote(s, result, 'a');

		expect(kept.ok).toBe(false);
		expect(s.atelier.get('a')?.definition).toBe('7');
	});

	// §4 L2 : il n'y a rien à garder
	it('refuse de garder une ligne en erreur', () => {
		const s = session();
		const result = runInput(s, '1/0 +');

		expect(promote(s, result).ok).toBe(false);
	});

	it('refuse de garder une définition — l’objet existe déjà', () => {
		const s = session();
		const result = runInput(s, 'f(x) = x^2');

		expect(promote(s, result).ok).toBe(false);
	});
});
