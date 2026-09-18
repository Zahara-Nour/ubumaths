/**
 * Le bouton « Dériver » et la commande `.dériver` doivent dire la MÊME chose.
 *
 * ⚠️ C'est la leçon du lot `.résoudre` : quand un seul des deux chemins a été
 * branché, l'élève qui TAPE recevait le raisonnement et celui qui CLIQUE le
 * bloc de terminal. On câble les deux d'emblée.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('le bouton « Dériver »', () => {
	it('nomme la règle et détaille les facteurs', () => {
		const s = session();
		runInput(s, 'f(x) = x^2*sin(x)');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.latex).toBe("f'(x) = 2 x \\sin\\left( x \\right) + x^2 \\cos\\left( x \\right)");
		expect(outcome.steps?.[0].title).toBe('Règle du produit');
		expect(outcome.steps?.[0].subSteps?.length).toBe(2);
	});

	it('la réponse porte le nom de l’objet', () => {
		const s = session();
		runInput(s, 'g(x) = x^2-3x+2');

		const outcome = runAction(s, 'derive', 'g');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.latex).toBe("g'(x) = 2 x - 3");
	});

	it('plus de notation de terminal', () => {
		const s = session();
		runInput(s, 'f(x) = (2x+1)/(x-1)');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		// ⚠️ `d/dx(…)` et le `:/` parasite : exactement ce que rendait `.diff`.
		expect(outcome.latex).not.toContain('d/dx');
		expect(outcome.latex).not.toContain(':/');
		expect(outcome.steps?.[0].title).toBe('Règle du quotient');
	});
});

describe('la commande `.dériver`', () => {
	it('rend les mêmes étapes que le bouton', () => {
		const s = session();
		runInput(s, 'f(x) = x^2*sin(x)');

		const clic = runAction(s, 'derive', 'f');
		const frappe = runInput(s, '.dériver x^2*sin(x)');

		expect(clic.ok).toBe(true);
		if (!clic.ok || frappe.kind !== 'commande') return;
		// ⚠️ Sans cette ligne, le test passerait avec DEUX `undefined` — vert en
		// comparant deux absences.
		expect(clic.steps).toBeDefined();
		expect(clic.steps?.map((st) => st.title)).toEqual(frappe.steps?.map((st) => st.title));
	});

	it('sans objet à nommer, la dérivée seule', () => {
		const result = runInput(session(), '.dériver x^2-3x+2');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.latex).toBe('2 x - 3');
	});
});

describe('le repli', () => {
	/**
	 * ⚠️ **Le vrai cas de repli est `floor(x)`**, mesuré : le module pédagogique
	 * ne sait pas la dériver, le moteur si. C'est là que la sortie du moteur
	 * doit rester — et elle reste.
	 *
	 * (Ce que le moteur en dit, `d/dx(floor(x)) = floor`, est un défaut qui lui
	 * appartient et que ce lot ne touche pas.)
	 */
	it('le bouton garde la sortie du moteur', () => {
		const s = session();
		runInput(s, 'f(x) = floor(x)');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.steps).toBeUndefined();
		// ⚠️ La réponse ne disparaît jamais.
		expect(outcome.output.length).toBeGreaterThan(0);
	});

	it('la commande aussi', () => {
		const result = runInput(session(), '.dériver floor(x)');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.steps).toBeUndefined();
		expect(result.output.length).toBeGreaterThan(0);
	});

	/**
	 * ⚠️ Sur `abs(x)`, les DEUX échouent — le moteur rend une sortie vide et le
	 * module lève `PedagogicalDifferentiationNotImplemented`. Il n'y a donc rien
	 * à replier : la ligne dit un échec, exactement comme avant ce lot. Ce test
	 * garde l'absence de RÉGRESSION, pas une réussite.
	 */
	it('quand les deux échouent, la ligne échoue comme avant', () => {
		const s = session();
		runInput(s, 'f(x) = abs(x)');

		const outcome = runAction(s, 'derive', 'f');

		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.message.length).toBeGreaterThan(0);
	});
});

describe('la ligne d’historique reçoit les étapes', () => {
	it('par le panneau', () => {
		const desk = new CalcDesk(new Atelier());
		desk.atelier.create({ kind: 'function', name: 'f', definition: 'x^2*sin(x)' });

		desk.runFromPanel('derive', 'f');

		expect(desk.entries[0].steps).toBeDefined();
		expect(desk.entries[0].latex).toContain("f'(x) =");
	});

	it('par la saisie', () => {
		const desk = new CalcDesk(new Atelier());

		desk.submit('.dériver x^2*sin(x)');

		expect(desk.entries[0].steps).toBeDefined();
	});
});
