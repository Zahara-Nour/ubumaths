/**
 * Les quatre actions que la vue Calcul câble — §6 de la Phase 0.
 *
 * Le lot 2 avait laissé six actions « visibles, désactivées, avec leur raison ».
 * Celles qui produisent un calcul symbolique sont câblées ici : dériver,
 * résoudre, variations, image d'un nombre.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runAction, type CalcSession } from '../calcul';
import { actionsFor } from '../actions';

function withFunction(definition = 'x^2-3x+1'): CalcSession {
	const session = { atelier: new Atelier(), engine: new WebReplEngine() };
	session.atelier.create({ kind: 'function', name: 'f', definition });
	return session;
}

describe('dériver', () => {
	it('affiche la dérivée', () => {
		const s = withFunction();

		const result = runAction(s, 'derive', 'f');

		expect(result.ok).toBe(true);
		expect(result.ok && result.output).toContain('2x-3');
	});

	// D7 : les DEUX gestes, distincts — afficher, et garder
	it('ne crée aucun objet en affichant', () => {
		const s = withFunction();

		runAction(s, 'derive', 'f');

		expect(s.atelier.names).toEqual(['f']);
	});

	it('substitue avant d’appeler, même à travers un autre objet', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		s.atelier.create({ kind: 'function', name: 'g', definition: 'x^2' });
		s.atelier.create({ kind: 'function', name: 'f', definition: 'g(x) + 1' });

		const result = runAction(s, 'derive', 'f');

		// Sans substitution récursive, la dérivée citerait g' au lieu de valoir 2x
		expect(result.ok && result.output).toContain('2x');
	});
});

describe('résoudre f(x) = 0', () => {
	it('trouve les solutions', () => {
		const s = withFunction();

		const result = runAction(s, 'solve', 'f');

		expect(result.ok).toBe(true);
		// Le discriminant de x^2-3x+1 vaut 5 — mesuré
		expect(result.ok && result.output).toMatch(/5/);
	});

	// §6 : « aucune solution » est une RÉPONSE, pas une erreur
	it('répond « aucune solution » sans traiter ça comme un échec', () => {
		const s = withFunction('x^2+1');

		const result = runAction(s, 'solve', 'f');

		expect(result.ok).toBe(true);
	});
});

describe('variations', () => {
	// ⚠️ LE test du §6 bis : citer le nom rendait « Points critiques : aucun »
	it('parle vraiment de la fonction', () => {
		const s = withFunction();

		const result = runAction(s, 'variations', 'f');

		expect(result.ok).toBe(true);
		expect(result.ok && result.output).toContain('3/2');
		expect(result.ok && result.output).not.toContain('Points critiques : aucun');
	});
});

describe('image d’un nombre', () => {
	it('calcule f(2)', () => {
		const s = withFunction();

		const result = runAction(s, 'image', 'f', '2');

		expect(result.ok).toBe(true);
		expect(result.ok && result.output).toBe('-1');
	});

	it('accepte un nombre écrit à la française', () => {
		const s = withFunction('2x');

		const result = runAction(s, 'image', 'f', '1,5');

		expect(result.ok && result.output).toBe('3');
	});

	it('refuse ce qui n’est pas un nombre', () => {
		const s = withFunction();

		const result = runAction(s, 'image', 'f', 'bonjour');

		expect(result.ok).toBe(false);
	});
});

describe('quand l’action ne peut pas aboutir', () => {
	// §6 L2 : le message est celui du panneau, pas un second qui divergerait
	it('refuse sur un objet en attente, avec le message de l’objet', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		s.atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });

		const result = runAction(s, 'derive', 'f');

		expect(result.ok).toBe(false);
		expect(result.ok === false && result.message).toBe(s.atelier.get('f')?.message);
	});

	it('refuse sur un objet qui n’existe pas', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };

		expect(runAction(s, 'derive', 'f').ok).toBe(false);
	});

	// §6 E1 : l'atelier reste intact
	it('laisse l’atelier intact quand le calcul échoue', () => {
		const s = withFunction();

		runAction(s, 'image', 'f', 'bonjour');

		expect(s.atelier.get('f')?.status).toBe('ok');
		expect(s.atelier.names).toEqual(['f']);
	});
});

/**
 * La contrepartie visible dans le panneau : ces quatre actions ne doivent plus
 * annoncer qu'elles arrivent « dans un prochain lot ».
 */
describe('ce que le panneau propose désormais', () => {
	it('ne relègue plus les quatre actions câblées', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const actions = actionsFor(atelier.get('f')!);
		const reason = (id: string) => actions.find((a) => a.id === id)?.disabledReason;

		for (const id of ['derive', 'solve', 'variations', 'image']) {
			expect(reason(id)).toBeUndefined();
		}
	});

	it('laisse les autres annoncer leur lot', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const actions = actionsFor(atelier.get('f')!);

		expect(actions.find((a) => a.id === 'table')?.disabledReason).toBeTruthy();
	});
});
